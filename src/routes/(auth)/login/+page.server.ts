import { fail, redirect } from '@sveltejs/kit';
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
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (error) {
			const { status, message } = authFailure(error);
			return fail(status, { email, message });
		}

		redirect(303, afterLoginUrl(url.searchParams.get('redirectTo')));
	}
};
