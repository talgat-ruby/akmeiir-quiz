import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireUser } from '#lib/server/auth-guard.ts';
import { attemptRepo, testRepo } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireUser(locals);
	const test = await testRepo.get(params.id);
	if (!test) error(404, m.test_not_found());

	return { test, attempts: await attemptRepo.history(user.id, test.id) };
};

export const actions: Actions = {
	// Start a new attempt with only the questions a past attempt got wrong or left unanswered.
	redo: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();

		const attemptId = await attemptRepo.redoMistakes(user.id, String(form.get('attemptId')));
		if (!attemptId) return fail(400, { message: m.redo_nothing() });
		redirect(303, `/attempts/${attemptId}`);
	}
};
