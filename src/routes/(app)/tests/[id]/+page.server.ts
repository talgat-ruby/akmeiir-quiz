import { error, fail, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';
import { requireAdmin, requireUser } from '#lib/server/auth-guard.ts';
import { attemptRepo, testRepo } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

const DEFAULT_QUESTION_COUNT = 10;
const MAX_TIME_LIMIT_MINUTES = 600;

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireUser(locals);
	const test = await testRepo.get(params.id);
	if (!test) error(404, m.test_not_found());

	return {
		test,
		defaultQuestionCount: Math.min(DEFAULT_QUESTION_COUNT, test.questionCount),
		maxTimeLimitMinutes: MAX_TIME_LIMIT_MINUTES,
		unfinishedAttemptId: (await attemptRepo.findUnfinished(user.id, test.id)) ?? null
	};
};

export const actions: Actions = {
	// The setup form: mode, time limit (exam only), how many questions, random or in order.
	start: async ({ params, locals, request }) => {
		const user = requireUser(locals);
		const test = await testRepo.get(params.id);
		if (!test) error(404, m.test_not_found());

		const form = await request.formData();
		const values = {
			mode: form.get('mode') === 'exam' ? ('exam' as const) : ('practice' as const),
			questionCount: String(form.get('questionCount') ?? '').trim(),
			random: form.get('random') === 'on',
			timeLimitMinutes: String(form.get('timeLimitMinutes') ?? '').trim()
		};

		const questionCount = Number(values.questionCount);
		if (
			!Number.isInteger(questionCount) ||
			questionCount < 1 ||
			questionCount > test.questionCount
		) {
			return fail(400, { ...values, message: m.setup_count_invalid({ max: test.questionCount }) });
		}

		let timeLimitMinutes: number | null = null;
		if (values.mode === 'exam' && values.timeLimitMinutes !== '') {
			timeLimitMinutes = Number(values.timeLimitMinutes);
			if (
				!Number.isInteger(timeLimitMinutes) ||
				timeLimitMinutes < 1 ||
				timeLimitMinutes > MAX_TIME_LIMIT_MINUTES
			) {
				return fail(400, {
					...values,
					message: m.setup_time_limit_invalid({ max: MAX_TIME_LIMIT_MINUTES })
				});
			}
		}

		const attemptId = await attemptRepo.start(user.id, test.id, {
			mode: values.mode,
			questionCount,
			random: values.random,
			timeLimitMinutes
		});
		redirect(303, `/attempts/${attemptId}`);
	},

	// Admins only: delete the test together with everyone's attempts on it.
	delete: async ({ params, locals, request }) => {
		requireAdmin(locals);
		if ((await request.formData()).get('confirm') !== 'on') {
			return fail(400, { deleteMessage: m.delete_confirm_required() });
		}
		await testRepo.delete(params.id);
		redirect(303, '/tests');
	}
};
