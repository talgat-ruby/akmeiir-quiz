import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	// The auth guard in hooks.server.ts already redirects anonymous users; this keeps the types honest.
	if (!locals.user) redirect(303, '/login');

	return {
		user: {
			name: locals.user.name,
			email: locals.user.email,
			isAdmin: locals.user.role === 'admin'
		}
	};
};
