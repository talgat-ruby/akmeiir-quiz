import { requireUser } from '#lib/server/auth-guard.ts';
import { attemptRepo, testRepo } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [tests, stats] = await Promise.all([testRepo.list(), attemptRepo.statsByTest(user.id)]);
	return { tests, stats };
};
