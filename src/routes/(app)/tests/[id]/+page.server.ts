import { error } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { testRepo } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const test = await testRepo.get(params.id);
	if (!test) error(404, m.test_not_found());

	return { test };
};
