import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireAdmin } from '#lib/server/auth-guard.ts';
import { testRepo } from '#lib/server/db/index.ts';
import { parseTestFile, TestFileError } from '#lib/server/test-file.ts';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_MB = 5;

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals);
	return { maxFileMb: MAX_FILE_MB };
};

export const actions: Actions = {
	// Admins upload a question set file (docs/test-file-format.md); it is available to everyone.
	default: async ({ locals, request }) => {
		requireAdmin(locals);
		const file = (await request.formData()).get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { message: m.upload_no_file(), issues: [] });
		}
		if (file.size > MAX_FILE_MB * 1024 * 1024) {
			return fail(400, { message: m.upload_too_large({ max: MAX_FILE_MB }), issues: [] });
		}

		let parsed;
		try {
			parsed = parseTestFile(await file.text());
		} catch (e) {
			if (!(e instanceof TestFileError)) throw e;
			return fail(400, { message: m.upload_rejected({ name: file.name }), issues: e.issues });
		}

		const testId = await testRepo.create(parsed);
		redirect(303, `/tests/${testId}`);
	}
};
