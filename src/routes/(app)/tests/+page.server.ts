import { testRepo } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { tests: await testRepo.list() };
};
