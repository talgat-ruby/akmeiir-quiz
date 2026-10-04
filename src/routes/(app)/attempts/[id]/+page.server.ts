import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireUser } from '#lib/server/auth-guard.ts';
import { AnswerError, attemptRepo } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

/**
 * One page, three views:
 * - `?q=<n>` on an answered question → feedback for question n (1-based),
 * - otherwise the first unanswered question,
 * - and the results once everything is answered.
 */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = requireUser(locals);
	const attempt = await attemptRepo.get(params.id, user.id);
	if (!attempt) error(404, m.attempt_not_found());

	const q = Number(url.searchParams.get('q'));
	if (Number.isInteger(q) && q >= 1) {
		const answered = await attemptRepo.answeredQuestion(attempt.id, q - 1);
		if (answered) return { attempt, view: 'feedback' as const, answered };
	}

	const current = attempt.finished ? undefined : await attemptRepo.currentQuestion(attempt.id);
	if (current) return { attempt, view: 'question' as const, current };

	return { attempt, view: 'results' as const };
};

export const actions: Actions = {
	default: async ({ params, locals, request }) => {
		const user = requireUser(locals);
		const attempt = await attemptRepo.get(params.id, user.id);
		if (!attempt) error(404, m.attempt_not_found());

		const form = await request.formData();
		const position = Number(form.get('position'));
		const selected = form.getAll('answer').map(String);

		try {
			await attemptRepo.answer(attempt.id, position, selected);
		} catch (e) {
			if (!(e instanceof AnswerError)) throw e;
			if (e.reason === 'invalid') return fail(400, { message: m.answer_invalid() });
			// 'answered' (e.g. a double tap): just show that question's feedback.
		}

		redirect(303, `/attempts/${attempt.id}?q=${position + 1}`);
	}
};
