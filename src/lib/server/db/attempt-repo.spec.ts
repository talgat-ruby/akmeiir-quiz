import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { asc, eq } from 'drizzle-orm';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	AnswerError,
	AttemptRepo,
	sameAnswers,
	shuffle,
	type AttemptSetup
} from './attempt-repo.ts';
import { attempt, attemptQuestion } from './attempts.schema.ts';
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

const practice = (questionCount: number, random = true): AttemptSetup => ({
	questionCount,
	random,
	mode: 'practice',
	timeLimitMinutes: null
});

const exam = (questionCount: number, timeLimitMinutes: number | null = null): AttemptSetup => ({
	questionCount,
	random: false,
	mode: 'exam',
	timeLimitMinutes
});

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

		const small = await repo.start('alice', testId, practice(3));
		const all = await repo.start('alice', testId, practice(10));

		expect((await repo.get(small, 'alice'))?.total).toBe(3);
		const rows = await db.select().from(attemptQuestion).where(eq(attemptQuestion.attemptId, all));
		expect(rows.map((r) => r.position).sort()).toEqual([0, 1, 2, 3, 4]);
		expect(new Set(rows.map((r) => r.questionId)).size).toBe(5);
	});

	it('takes the first questions in order when random is off', async () => {
		const testId = await tests.create(fiveQuestions);

		const attemptId = await repo.start('alice', testId, practice(3, false));

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
		const attemptId = await repo.start('alice', testId, practice(5));

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

	it('shows a question without revealing correct answers', async () => {
		const testId = await tests.create(multiChoice);
		const attemptId = await repo.start('alice', testId, practice(10));

		const current = await repo.question(attemptId, 0);

		expect(current).toMatchObject({ position: 0, text: 'Primary colors?', multiple: true });
		expect(current?.answers).toHaveLength(3);
		for (const a of current!.answers) expect(Object.keys(a).sort()).toEqual(['id', 'text']);
	});

	it('grades answers and reveals them only after answering', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, practice(2));
		const first = await answerIds(attemptId, 0);
		const second = await answerIds(attemptId, 1);

		expect(await repo.answeredQuestion(attemptId, 0)).toBeUndefined();
		await repo.answer(attemptId, 0, first.right);
		await repo.answer(attemptId, 1, [second.wrong]);

		const review = await repo.answeredQuestion(attemptId, 1);
		expect(review?.correct).toBe(false);
		expect(review?.answers.find((a) => a.selected)?.id).toBe(second.wrong);
		expect(review?.answers.filter((a) => a.correct).map((a) => a.id)).toEqual(second.right);
		expect(await repo.questionList(attemptId, true)).toEqual([
			{ position: 0, answered: true, correct: true },
			{ position: 1, answered: true, correct: false }
		]);
		// Practice doesn't finish by itself: the user presses Finish.
		expect(await repo.get(attemptId, 'alice')).toMatchObject({ finished: false, answered: 2 });
		await repo.finish(attemptId);
		expect(await repo.get(attemptId, 'alice')).toMatchObject({
			finished: true,
			total: 2,
			answered: 2,
			correct: 1
		});
	});

	it('grades multi-select questions all-or-nothing', async () => {
		const testId = await tests.create(multiChoice);
		const attemptId = await repo.start('alice', testId, practice(1));
		const { right } = await answerIds(attemptId, 0);

		await repo.answer(attemptId, 0, [right[0]]);

		expect((await repo.answeredQuestion(attemptId, 0))?.correct).toBe(false);
	});

	it('rejects empty, foreign and repeated answers', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, practice(2));
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
		const attemptId = await repo.start('alice', testId, practice(2));

		expect(await repo.get(attemptId, 'bob')).toBeUndefined();
		expect(await repo.findUnfinished('bob', testId)).toBeUndefined();
		expect(await repo.findUnfinished('alice', testId)).toBe(attemptId);
	});

	it('forgets the unfinished attempt once it is finished', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, practice(1));
		const { right } = await answerIds(attemptId, 0);

		await repo.answer(attemptId, 0, right);
		expect(await repo.findUnfinished('alice', testId)).toBe(attemptId);

		await repo.finish(attemptId);
		expect(await repo.findUnfinished('alice', testId)).toBeUndefined();
	});

	it('refuses practice answers once the time is up', async () => {
		const testId = await tests.create(fiveQuestions);
		const attemptId = await repo.start('alice', testId, { ...practice(2), timeLimitMinutes: 1 });
		const { right } = await answerIds(attemptId, 0);
		await db
			.update(attempt)
			.set({ deadlineAt: new Date(Date.now() - 1000) })
			.where(eq(attempt.id, attemptId));

		await expect(repo.answer(attemptId, 0, right)).rejects.toMatchObject({ reason: 'closed' });
	});

	it('refuses to start a test without questions', async () => {
		const testId = await tests.create({ title: 'Empty', questions: [] });

		await expect(repo.start('alice', testId, practice(10))).rejects.toThrow('has no questions');
		expect(await db.select().from(question)).toEqual([]);
	});

	describe('exam', () => {
		it('stores the mode, and a deadline whenever there is a time limit', async () => {
			const testId = await tests.create(fiveQuestions);

			const timed = await repo.get(await repo.start('alice', testId, exam(2, 30)), 'alice');
			const untimed = await repo.get(await repo.start('alice', testId, exam(2)), 'alice');
			const practiceRun = await repo.get(
				await repo.start('alice', testId, { ...practice(2), timeLimitMinutes: 30 }),
				'alice'
			);

			expect(timed?.mode).toBe('exam');
			const minutesLeft = (timed!.deadlineAt!.getTime() - Date.now()) / 60_000;
			expect(minutesLeft).toBeGreaterThan(29);
			expect(minutesLeft).toBeLessThanOrEqual(30);
			expect(untimed?.deadlineAt).toBeNull();
			expect(practiceRun?.mode).toBe('practice');
			expect(practiceRun?.deadlineAt).toBeInstanceOf(Date);
		});

		it('lets answers change until the end, keeping grades hidden', async () => {
			const testId = await tests.create(fiveQuestions);
			const attemptId = await repo.start('alice', testId, exam(2));
			const first = await answerIds(attemptId, 0);

			await repo.saveExamAnswer(attemptId, 0, [first.wrong]);
			await repo.saveExamAnswer(attemptId, 0, first.right);

			const shown = await repo.question(attemptId, 0);
			expect(shown?.selected).toEqual(first.right);
			for (const a of shown!.answers) expect(Object.keys(a).sort()).toEqual(['id', 'text']);
			expect(await repo.questionList(attemptId, false)).toEqual([
				{ position: 0, answered: true },
				{ position: 1, answered: false }
			]);
			expect((await repo.get(attemptId, 'alice'))?.finished).toBe(false);
		});

		it('scores on finish and reviews wrong and unanswered questions', async () => {
			const testId = await tests.create(fiveQuestions);
			const attemptId = await repo.start('alice', testId, exam(3));
			await repo.saveExamAnswer(attemptId, 0, (await answerIds(attemptId, 0)).right);
			await repo.saveExamAnswer(attemptId, 1, [(await answerIds(attemptId, 1)).wrong]);

			await repo.finish(attemptId);

			expect(await repo.get(attemptId, 'alice')).toMatchObject({
				finished: true,
				answered: 2,
				correct: 1
			});
			const mistakes = await repo.mistakes(attemptId);
			expect(mistakes.map((q) => [q.position, q.answered])).toEqual([
				[1, true],
				[2, false]
			]);
			expect(mistakes[1].answers.filter((a) => a.correct)).toHaveLength(1);
		});

		it('refuses answers after finishing', async () => {
			const testId = await tests.create(fiveQuestions);
			const attemptId = await repo.start('alice', testId, exam(2));
			await repo.finish(attemptId);

			await expect(
				repo.saveExamAnswer(attemptId, 0, (await answerIds(attemptId, 0)).right)
			).rejects.toMatchObject({ reason: 'closed' });
		});

		it('finishes at the deadline once the time is up', async () => {
			const testId = await tests.create(fiveQuestions);
			const attemptId = await repo.start('alice', testId, exam(2, 1));
			const { right } = await answerIds(attemptId, 0);

			await repo.finishExpired(attemptId);
			expect((await repo.get(attemptId, 'alice'))?.finished).toBe(false);
			expect(await repo.findUnfinished('alice', testId)).toBe(attemptId);

			const past = new Date(Date.now() - 1000);
			await db.update(attempt).set({ deadlineAt: past }).where(eq(attempt.id, attemptId));

			expect(await repo.findUnfinished('alice', testId)).toBeUndefined();
			await expect(repo.saveExamAnswer(attemptId, 0, right)).rejects.toMatchObject({
				reason: 'closed'
			});
			await repo.finishExpired(attemptId);
			const [row] = await db.select().from(attempt).where(eq(attempt.id, attemptId));
			expect(row.finishedAt?.getTime()).toBe(past.getTime());
		});
	});

	describe('history and redo', () => {
		const tick = () => new Promise((r) => setTimeout(r, 5));

		/** Practice the first questions in order, answering right where `pattern` says so. */
		async function practiceRun(testId: string, pattern: boolean[], userId = 'alice') {
			const attemptId = await repo.start(userId, testId, practice(pattern.length, false));
			for (const [position, right] of pattern.entries()) {
				const ids = await answerIds(attemptId, position);
				await repo.answer(attemptId, position, right ? ids.right : [ids.wrong]);
			}
			await repo.finish(attemptId);
			return attemptId;
		}

		const asked = async (attemptId: string) =>
			(
				await db
					.select({ text: question.text })
					.from(attemptQuestion)
					.innerJoin(question, eq(question.id, attemptQuestion.questionId))
					.where(eq(attemptQuestion.attemptId, attemptId))
					.orderBy(asc(attemptQuestion.position))
			).map((q) => q.text);

		it('lists the user’s attempts on one test, newest first', async () => {
			const testId = await tests.create(fiveQuestions);
			const otherTest = await tests.create({ ...fiveQuestions, title: 'Other' });
			const first = await practiceRun(testId, [true, false]);
			await tick();
			const second = await repo.start('alice', testId, exam(3));
			await repo.start('alice', otherTest, exam(1));
			await repo.start('bob', testId, exam(1));

			const history = await repo.history('alice', testId);

			expect(history.map((a) => [a.id, a.mode, a.finished, a.correct, a.total])).toEqual([
				[second, 'exam', false, 0, 3],
				[first, 'practice', true, 1, 2]
			]);
		});

		it('redoes only the wrong and unanswered questions, with feedback', async () => {
			const testId = await tests.create(fiveQuestions);
			const source = await repo.start('alice', testId, exam(3));
			await repo.saveExamAnswer(source, 0, (await answerIds(source, 0)).right);
			await repo.saveExamAnswer(source, 1, [(await answerIds(source, 1)).wrong]);
			await repo.finish(source); // Q3 left unanswered

			const redoId = await repo.redoMistakes('alice', source);

			expect(await asked(redoId!)).toEqual(['Q2', 'Q3']);
			expect(await repo.get(redoId!, 'alice')).toMatchObject({
				mode: 'mistakes',
				deadlineAt: null
			});
			expect((await repo.question(redoId!, 0))?.text).toBe('Q2');
		});

		it('has nothing to redo without mistakes, or on someone else’s attempt', async () => {
			const testId = await tests.create(fiveQuestions);
			const perfect = await practiceRun(testId, [true, true]);

			const weak = await practiceRun(testId, [false]);

			expect(await repo.redoMistakes('alice', perfect)).toBeUndefined();
			expect(await repo.redoMistakes('bob', weak)).toBeUndefined();
			expect(await repo.redoMistakes('alice', 'missing')).toBeUndefined();
			expect(await repo.redoMistakes('alice', weak)).toBeDefined();
		});

		it('reports the best finished practice or exam score per test', async () => {
			const testId = await tests.create(fiveQuestions);
			const otherId = await tests.create({ ...fiveQuestions, title: 'Other' });
			const weak = await practiceRun(testId, [true, false, false, false]); // 25%
			await practiceRun(testId, [true, true, true, false]); //               75%
			await repo.start('alice', testId, exam(5)); //                           unfinished
			const redoId = await repo.redoMistakes('alice', weak); //                a redo isn't a score
			for (const position of [0, 1, 2]) {
				await repo.answer(redoId!, position, (await answerIds(redoId!, position)).right);
			}
			await repo.finish(redoId!);

			const stats = await repo.statsByTest('alice');

			expect(stats).toEqual({ [testId]: { bestPercent: 75 } });
			expect(stats[otherId]).toBeUndefined();
		});
	});
});
