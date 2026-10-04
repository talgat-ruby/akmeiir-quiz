import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireUser } from '#lib/server/auth-guard.ts';
import { attemptRepo, testRepo } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

/** Questions per practice attempt; becomes a per-test setting in Iteration 5. */
const QUESTION_COUNT = 10;

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireUser(locals);
	const test = await testRepo.get(params.id);
	if (!test) error(404, m.test_not_found());

	return {
		test,
		unfinishedAttemptId: (await attemptRepo.findUnfinished(user.id, test.id)) ?? null
	};
};

export const actions: Actions = {
	default: async ({ params, locals }) => {
		const user = requireUser(locals);
		const test = await testRepo.get(params.id);
		if (!test) error(404, m.test_not_found());

		const attemptId = await attemptRepo.start(user.id, test.id, QUESTION_COUNT);
		redirect(303, `/attempts/${attemptId}`);
	}
};
