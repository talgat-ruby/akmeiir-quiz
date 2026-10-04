import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

export const test = sqliteTable('test', {
	id: id(),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const question = sqliteTable(
	'question',
	{
		id: id(),
		testId: text('test_id')
			.notNull()
			.references(() => test.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		text: text('text').notNull()
	},
	(t) => [uniqueIndex('question_test_position_idx').on(t.testId, t.position)]
);

export const answer = sqliteTable(
	'answer',
	{
		id: id(),
		questionId: text('question_id')
			.notNull()
			.references(() => question.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		text: text('text').notNull(),
		correct: integer('correct', { mode: 'boolean' }).notNull()
	},
	(t) => [uniqueIndex('answer_question_position_idx').on(t.questionId, t.position)]
);
