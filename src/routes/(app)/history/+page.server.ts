import { requireUser } from '#lib/server/auth-guard.ts';
import { attemptRepo } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { attempts: await attemptRepo.history(user.id) };
};
