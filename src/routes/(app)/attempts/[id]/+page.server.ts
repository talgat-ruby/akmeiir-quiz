import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireUser } from '#lib/server/auth-guard.ts';
import { AnswerError, attemptRepo } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** `?q=<n>`: a 1-based question number, or null. */
function questionNumber(url: URL): number | null {
	const q = Number(url.searchParams.get('q'));
	return Number.isInteger(q) && q >= 1 ? q : null;
}

/** The signed-in user's attempt, finished first if its time limit has passed. */
async function loadAttempt({ params, locals }: Pick<RequestEvent, 'params' | 'locals'>) {
	const user = requireUser(locals);
	await attemptRepo.finishExpired(params.id);
	const attempt = await attemptRepo.get(params.id, user.id);
	if (!attempt) error(404, m.attempt_not_found());
	return attempt;
}

/**
 * Practice: `?q=<n>` on an answered question shows its feedback, otherwise the first
 * unanswered question, and the results once everything is answered.
 *
 * Exam: any question (`?q=<n>`, default the first unanswered) with the saved answer,
 * `?finish` asks for confirmation, and after finishing the results with a review of mistakes.
 */
export const load: PageServerLoad = async (event) => {
	const attempt = await loadAttempt(event);
	const q = questionNumber(event.url);

	if (attempt.mode === 'practice') {
		if (q !== null) {
			const answered = await attemptRepo.answeredQuestion(attempt.id, q - 1);
			if (answered) return { attempt, view: 'feedback' as const, answered };
		}
		const current = attempt.finished ? undefined : await attemptRepo.currentQuestion(attempt.id);
		if (current) return { attempt, view: 'question' as const, current };
		return { attempt, view: 'results' as const, mistakes: [] };
	}

	if (attempt.finished) {
		return { attempt, view: 'results' as const, mistakes: await attemptRepo.mistakes(attempt.id) };
	}

	const questions = await attemptRepo.questionList(attempt.id);
	const secondsLeft = attempt.deadlineAt
		? Math.max(0, Math.ceil((attempt.deadlineAt.getTime() - Date.now()) / 1000))
		: null;
	if (event.url.searchParams.has('finish')) {
		return { attempt, view: 'confirm' as const, questions, secondsLeft };
	}

	const position =
		q !== null && q <= questions.length
			? q - 1
			: (questions.find((x) => !x.answered)?.position ?? 0);
	const current = await attemptRepo.examQuestion(attempt.id, position);
	if (!current) error(404, m.attempt_not_found());
	return { attempt, view: 'exam' as const, current, questions, secondsLeft };
};

function readAnswer(form: FormData) {
	return { position: Number(form.get('position')), selected: form.getAll('answer').map(String) };
}

export const actions: Actions = {
	// Practice: grade one answer and show its feedback.
	answer: async (event) => {
		const attempt = await loadAttempt(event);
		const { position, selected } = readAnswer(await event.request.formData());

		try {
			await attemptRepo.answer(attempt.id, position, selected);
		} catch (e) {
			if (!(e instanceof AnswerError)) throw e;
			if (e.reason === 'invalid') return fail(400, { message: m.answer_invalid() });
			// 'answered' (e.g. a double tap): just show that question's feedback.
		}
		redirect(303, `/attempts/${attempt.id}?q=${position + 1}`);
	},

	// Exam: save (or change) an answer without feedback, then go to the next question.
	save: async (event) => {
		const attempt = await loadAttempt(event);
		const { position, selected } = readAnswer(await event.request.formData());

		try {
			await attemptRepo.saveExamAnswer(attempt.id, position, selected);
		} catch (e) {
			if (!(e instanceof AnswerError)) throw e;
			if (e.reason === 'invalid') return fail(400, { message: m.answer_invalid() });
			redirect(303, `/attempts/${attempt.id}`); // closed: time is up or already finished
		}
		const isLast = position + 1 >= attempt.total;
		redirect(303, `/attempts/${attempt.id}${isLast ? '?finish' : `?q=${position + 2}`}`);
	},

	// Exam: hand it in.
	finish: async (event) => {
		const attempt = await loadAttempt(event);
		await attemptRepo.finish(attempt.id);
		redirect(303, `/attempts/${attempt.id}`);
	}
};
