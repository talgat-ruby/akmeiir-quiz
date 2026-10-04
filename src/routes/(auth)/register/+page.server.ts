import { fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { auth } from '#lib/server/auth.ts';
import { authFailure } from '#lib/server/auth-errors.ts';
import { afterLoginUrl } from '#lib/server/auth-guard.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, afterLoginUrl(url.searchParams.get('redirectTo')));
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!name) return fail(400, { name, email, message: m.auth_error_name_required() });

		try {
			// Signs the new user in right away (Better Auth's autoSignIn).
			await auth.api.signUpEmail({ body: { name, email, password } });
		} catch (error) {
			const { status, message } = authFailure(error);
			return fail(status, { name, email, message });
		}

		redirect(303, afterLoginUrl(url.searchParams.get('redirectTo')));
	}
};
