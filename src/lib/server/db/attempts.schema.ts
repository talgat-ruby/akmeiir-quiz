import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema.ts';
import { id } from './columns.ts';
import { question, test } from './tests.schema.ts';

export const ATTEMPT_MODES = ['practice', 'exam', 'mistakes'] as const;
export type AttemptMode = (typeof ATTEMPT_MODES)[number];

/** One run through a test by one user. Unfinished while `finishedAt` is null. */
export const attempt = sqliteTable(
	'attempt',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		testId: text('test_id')
			.notNull()
			.references(() => test.id, { onDelete: 'cascade' }),
		mode: text('mode', { enum: ATTEMPT_MODES }).notNull().default('practice'),
		/** Exam time limit: after this moment no answers are accepted and the attempt is finished. */
		deadlineAt: integer('deadline_at', { mode: 'timestamp_ms' }),
		startedAt: integer('started_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		finishedAt: integer('finished_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('attempt_user_test_idx').on(t.userId, t.testId)]
);

/**
 * The questions picked for an attempt, in the order they are asked, with the shuffled answer
 * order. The answer columns stay null until the user answers.
 */
export const attemptQuestion = sqliteTable(
	'attempt_question',
	{
		attemptId: text('attempt_id')
			.notNull()
			.references(() => attempt.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		questionId: text('question_id')
			.notNull()
			.references(() => question.id, { onDelete: 'cascade' }),
		answerOrder: text('answer_order', { mode: 'json' }).$type<string[]>().notNull(),
		selectedAnswerIds: text('selected_answer_ids', { mode: 'json' }).$type<string[]>(),
		correct: integer('correct', { mode: 'boolean' }),
		answeredAt: integer('answered_at', { mode: 'timestamp_ms' })
	},
	(t) => [primaryKey({ columns: [t.attemptId, t.position] })]
);
