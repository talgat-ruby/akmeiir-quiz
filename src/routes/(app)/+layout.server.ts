import { requireUser } from '#lib/server/auth-guard.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user = requireUser(locals);

	return {
		user: {
			name: user.name,
			email: user.email,
			isAdmin: user.role === 'admin'
		}
	};
};
