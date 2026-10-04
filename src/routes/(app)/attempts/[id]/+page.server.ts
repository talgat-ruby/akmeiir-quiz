import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireUser } from '#lib/server/auth-guard.ts';
import { AnswerError, attemptRepo, type AttemptMode } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** Practice and mistakes show right/wrong as soon as an answer is checked; an exam only at the end. */
const reveals = (mode: AttemptMode) => mode !== 'exam';

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
 * One flow for every mode:
 * - `?q=<n>` shows question n (default: the first unanswered one) — still open, or with its
 *   answer revealed once checked in practice/mistakes mode;
 * - `?finish` (or nothing left to answer) asks for confirmation;
 * - after finishing: the score and a review of the mistakes.
 * While it is open, phones show the page's own header instead of the app's (`hideAppHeaderOnPhone`).
 */
export const load: PageServerLoad = async (event) => {
	const attempt = await loadAttempt(event);
	if (attempt.finished) {
		return { attempt, view: 'results' as const, mistakes: await attemptRepo.mistakes(attempt.id) };
	}

	const reveal = reveals(attempt.mode);
	const questions = await attemptRepo.questionList(attempt.id, reveal);
	const secondsLeft = attempt.deadlineAt
		? Math.max(0, Math.ceil((attempt.deadlineAt.getTime() - Date.now()) / 1000))
		: null;
	const firstUnanswered = questions.find((x) => !x.answered);
	const q = questionNumber(event.url);

	if (event.url.searchParams.has('finish') || (q === null && !firstUnanswered)) {
		return {
			attempt,
			view: 'confirm' as const,
			questions,
			secondsLeft,
			hideAppHeaderOnPhone: true
		};
	}

	const position = q !== null && q <= questions.length ? q - 1 : (firstUnanswered?.position ?? 0);
	// Where "Next question" leads: the next unanswered question after this one, wrapping around.
	const nextUnanswered =
		[...questions.slice(position + 1), ...questions.slice(0, position)].find((x) => !x.answered)
			?.position ?? null;

	if (reveal && questions[position]?.answered) {
		const revealed = await attemptRepo.answeredQuestion(attempt.id, position);
		if (!revealed) error(404, m.attempt_not_found());
		return {
			attempt,
			view: 'revealed' as const,
			revealed,
			questions,
			secondsLeft,
			nextUnanswered,
			hideAppHeaderOnPhone: true
		};
	}

	const current = await attemptRepo.question(attempt.id, position);
	if (!current) error(404, m.attempt_not_found());
	return {
		attempt,
		view: 'question' as const,
		current,
		questions,
		secondsLeft,
		nextUnanswered,
		hideAppHeaderOnPhone: true
	};
};

function readAnswer(form: FormData) {
	return { position: Number(form.get('position')), selected: form.getAll('answer').map(String) };
}

export const actions: Actions = {
	// Practice and mistakes: grade one answer and show it revealed.
	answer: async (event) => {
		const attempt = await loadAttempt(event);
		if (!reveals(attempt.mode)) error(400, m.action_not_allowed());
		const { position, selected } = readAnswer(await event.request.formData());

		try {
			await attemptRepo.answer(attempt.id, position, selected);
		} catch (e) {
			if (!(e instanceof AnswerError)) throw e;
			if (e.reason === 'invalid') return fail(400, { message: m.answer_invalid() });
			if (e.reason === 'closed') redirect(303, `/attempts/${attempt.id}`);
			// 'answered' (e.g. a double tap): just show that question revealed.
		}
		redirect(303, `/attempts/${attempt.id}?q=${position + 1}`);
	},

	// Exam: save (or change) an answer without revealing anything, then go to the next question.
	save: async (event) => {
		const attempt = await loadAttempt(event);
		if (reveals(attempt.mode)) error(400, m.action_not_allowed());
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

	// Any mode: hand it in.
	finish: async (event) => {
		const attempt = await loadAttempt(event);
		await attemptRepo.finish(attempt.id);
		redirect(303, `/attempts/${attempt.id}`);
	}
};
