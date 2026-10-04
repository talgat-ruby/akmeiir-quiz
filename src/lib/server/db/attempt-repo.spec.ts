import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { asc, eq } from 'drizzle-orm';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnswerError, AttemptRepo, sameAnswers, shuffle } from './attempt-repo.ts';
import { attemptQuestion } from './attempts.schema.ts';
import { user } from './auth.schema.ts';
import { TestRepo, type NewTest } from './test-repo.ts';
import { answer, question } from './tests.schema.ts';

const fiveQuestions: NewTest = {
	title: 'Five',
	questions: Array.from({ length: 5 }, (_, i) => ({
		text: `Q${i + 1}`,
		answers: [
			{ text: `Q${i + 1} right`, correct: true },
			{ text: `Q${i + 1} wrong A`, correct: false },
			{ text: `Q${i + 1} wrong B`, correct: false }
		]
	}))
};

const multiChoice: NewTest = {
	title: 'Multi',
	questions: [
		{
			text: 'Primary colors?',
			answers: [
				{ text: 'Red', correct: true },
				{ text: 'Blue', correct: true },
				{ text: 'Green', correct: false }
			]
		}
	]
};

describe('shuffle', () => {
	it('returns a permutation and leaves the input alone', () => {
		const items = [1, 2, 3, 4, 5, 6];
		const result = shuffle(items);

		expect([...result].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5, 6]);
	});
});

describe('sameAnswers', () => {
	it('is all-or-nothing', () => {
		expect(sameAnswers(['a'], ['a'])).toBe(true);
		expect(sameAnswers(['b', 'a'], ['a', 'b'])).toBe(true);
		expect(sameAnswers(['a'], ['a', 'b'])).toBe(false);
		expect(sameAnswers(['a', 'c'], ['a'])).toBe(false);
	});
});

describe('AttemptRepo', () => {
	let dir: string;
	let client: Client;
	let db: LibSQLDatabase;
	let repo: AttemptRepo<Record<string, never>>;
	let tests: TestRepo<Record<string, never>>;

	beforeEach(async () => {
		dir = mkdtempSync(join(tmpdir(), 'akmeiir-quiz-'));
		client = createClient({ url: `file:${join(dir, 'test.db')}` });
		db = drizzle(client);
		await migrate(db, { migrationsFolder: 'drizzle' });
		await db.insert(user).values([
			{ id: 'alice', name: 'Alice', email: 'alice@example.com' },
			{ id: 'bob', name: 'Bob', email: 'bob@example.com' }
		]);
		repo = new AttemptRepo(db);
		tests = new TestRepo(db);
	});

	afterEach(() => {
		client.close();
		rmSync(dir, { recursive: true, force: true });
	});

	/** The correct / a wrong answer id of the question at `position` in the attempt. */
	async function answerIds(attemptId: string, position: number) {
		const [row] = await db
			.select({ questionId: attemptQuestion.questionId })
			.from(attemptQuestion)
			.where(eq(attemptQuestion.attemptId, attemptId))
			.orderBy(asc(attemptQuestion.position))
			.limit(1)
			.offset(position);
		const answers = await db.select().from(answer).where(eq(answer.questionId, row.questionId));
		return {
			right: answers.filter((a) => a.correct).map((a) => a.id),
			wrong: answers.find((a) => !a.correct)!.id
		};
	}

	it('picks distinct random questions, capped at the test size', async () => {
		const testId = await tests.create(fiveQuestions);

		const small = await repo.start('alice', testId, { questionCount: 3, random: true });
		const all = await repo.start('alice', testId, { questionCount: 10, random: true });

		expect((await repo.get(small, 'alice'))?.total).toBe(3);
		const rows = await db.select().from(attemptQuestion).where(eq(attemptQuestion.attemptId, all));
		expect(rows.map((r) => r.position).sort()).toEqual([0, 1, 2, 3, 4]);
		expect(new Set(rows.map((r) => r.questionId)).size).toBe(5);
	});

	it('takes the first questions in order when random is off', async () => {
		const testId = await tests.create(fiveQuestions);

		const attemptId = await repo.start('alice', testId, { questionCount: 3, random: false });

		const asked = await db
			.select({ text: question.text })
			.from(attemptQuestion)
			.innerJoin(question, eq(question.id, attemptQuestion.questionId))
			.where(eq(attemptQuestion.attemptId, attemptId))
			.orderBy(asc(attemptQuestion.position));
		expect(asked.map((q) => q.text)).toEqual(['Q1', 'Q2', 'Q3']);
	});

	it('stores each question’s answers in a shuffled order', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, { questionCount: 5, random: true });

		for (const row of await db
			.select()
			.from(attemptQuestion)
			.where(eq(attemptQuestion.attemptId, attemptId))) {
			const ids = (await db.select().from(answer).where(eq(answer.questionId, row.questionId))).map(
				(a) => a.id
			);
			expect([...row.answerOrder].sort()).toEqual([...ids].sort());
		}
	});

	it('shows the current question without revealing correct answers', async () => {
		const testId = await tests.create(multiChoice);
		const attemptId = await repo.start('alice', testId, { questionCount: 10, random: true });

		const current = await repo.currentQuestion(attemptId);

		expect(current).toMatchObject({ position: 0, text: 'Primary colors?', multiple: true });
		expect(current?.answers).toHaveLength(3);
		for (const a of current!.answers) expect(Object.keys(a).sort()).toEqual(['id', 'text']);
	});

	it('grades answers and reveals them only after answering', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, { questionCount: 2, random: true });
		const first = await answerIds(attemptId, 0);
		const second = await answerIds(attemptId, 1);

		expect(await repo.answeredQuestion(attemptId, 0)).toBeUndefined();
		expect(await repo.answer(attemptId, 0, first.right)).toEqual({ finished: false });
		expect(await repo.answer(attemptId, 1, [second.wrong])).toEqual({ finished: true });

		const review = await repo.answeredQuestion(attemptId, 1);
		expect(review?.correct).toBe(false);
		expect(review?.answers.find((a) => a.selected)?.id).toBe(second.wrong);
		expect(review?.answers.filter((a) => a.correct).map((a) => a.id)).toEqual(second.right);
		expect(await repo.get(attemptId, 'alice')).toMatchObject({
			finished: true,
			total: 2,
			answered: 2,
			correct: 1
		});
		expect(await repo.currentQuestion(attemptId)).toBeUndefined();
	});

	it('grades multi-select questions all-or-nothing', async () => {
		const testId = await tests.create(multiChoice);
		const attemptId = await repo.start('alice', testId, { questionCount: 1, random: true });
		const { right } = await answerIds(attemptId, 0);

		await repo.answer(attemptId, 0, [right[0]]);

		expect((await repo.answeredQuestion(attemptId, 0))?.correct).toBe(false);
	});

	it('rejects empty, foreign and repeated answers', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, { questionCount: 2, random: true });
		const first = await answerIds(attemptId, 0);
		const second = await answerIds(attemptId, 1);
		const reason = (p: Promise<unknown>) =>
			p.then(
				() => 'ok',
				(e: unknown) => (e instanceof AnswerError ? e.reason : 'other')
			);

		expect(await reason(repo.answer(attemptId, 0, []))).toBe('invalid');
		expect(await reason(repo.answer(attemptId, 0, [second.wrong]))).toBe('invalid');
		expect(await reason(repo.answer(attemptId, 7, first.right))).toBe('invalid');
		expect(await reason(repo.answer(attemptId, 0, first.right))).toBe('ok');
		expect(await reason(repo.answer(attemptId, 0, first.right))).toBe('answered');
	});

	it('keeps attempts private to their user', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, { questionCount: 2, random: true });

		expect(await repo.get(attemptId, 'bob')).toBeUndefined();
		expect(await repo.findUnfinished('bob', testId)).toBeUndefined();
		expect(await repo.findUnfinished('alice', testId)).toBe(attemptId);
	});

	it('forgets the unfinished attempt once it is finished', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, { questionCount: 1, random: true });
		const { right } = await answerIds(attemptId, 0);

		await repo.answer(attemptId, 0, right);

		expect(await repo.findUnfinished('alice', testId)).toBeUndefined();
	});

	it('refuses to start a test without questions', async () => {
		const testId = await tests.create({ title: 'Empty', questions: [] });

		await expect(repo.start('alice', testId, { questionCount: 10, random: true })).rejects.toThrow(
			'has no questions'
		);
		expect(await db.select().from(question)).toEqual([]);
	});
});
