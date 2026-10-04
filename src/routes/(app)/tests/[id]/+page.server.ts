import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireUser } from '#lib/server/auth-guard.ts';
import { attemptRepo, testRepo } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

const DEFAULT_QUESTION_COUNT = 10;

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireUser(locals);
	const test = await testRepo.get(params.id);
	if (!test) error(404, m.test_not_found());

	return {
		test,
		defaultQuestionCount: Math.min(DEFAULT_QUESTION_COUNT, test.questionCount),
		unfinishedAttemptId: (await attemptRepo.findUnfinished(user.id, test.id)) ?? null
	};
};

export const actions: Actions = {
	// The setup form: how many questions, and whether to pick them at random.
	default: async ({ params, locals, request }) => {
		const user = requireUser(locals);
		const test = await testRepo.get(params.id);
		if (!test) error(404, m.test_not_found());

		const form = await request.formData();
		const questionCount = Number(form.get('questionCount'));
		const random = form.get('random') === 'on';
		if (
			!Number.isInteger(questionCount) ||
			questionCount < 1 ||
			questionCount > test.questionCount
		) {
			return fail(400, {
				questionCount: String(form.get('questionCount') ?? ''),
				random,
				message: m.setup_count_invalid({ max: test.questionCount })
			});
		}

		const attemptId = await attemptRepo.start(user.id, test.id, { questionCount, random });
		redirect(303, `/attempts/${attemptId}`);
	}
};
