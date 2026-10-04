import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { asc, eq } from 'drizzle-orm';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AttemptRepo } from './attempt-repo.ts';
import { attempt, attemptQuestion } from './attempts.schema.ts';
import { user } from './auth.schema.ts';
import { TestRepo, type NewTest } from './test-repo.ts';
import { answer, question, test } from './tests.schema.ts';

const sample = (title: string, questionCount = 2): NewTest => ({
	title,
	questions: Array.from({ length: questionCount }, (_, i) => ({
		text: `Question ${i + 1}`,
		answers: [
			{ text: 'Right', correct: true },
			{ text: 'Wrong', correct: false }
		]
	}))
});

describe('TestRepo', () => {
	let dir: string;
	let client: Client;
	let db: LibSQLDatabase;
	let repo: TestRepo<Record<string, never>>;

	beforeEach(async () => {
		dir = mkdtempSync(join(tmpdir(), 'akmeiir-quiz-'));
		client = createClient({ url: `file:${join(dir, 'test.db')}` });
		db = drizzle(client);
		await migrate(db, { migrationsFolder: 'drizzle' });
		repo = new TestRepo(db);
	});

	afterEach(() => {
		client.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it('stores questions and answers in order', async () => {
		const id = await repo.create({
			title: 'Colors',
			description: 'Primary colors',
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
		});

		const [q] = await db.select().from(question).where(eq(question.testId, id));
		const answers = await db
			.select({ text: answer.text, correct: answer.correct, position: answer.position })
			.from(answer)
			.where(eq(answer.questionId, q.id))
			.orderBy(asc(answer.position));

		expect(q).toMatchObject({ position: 0, text: 'Primary colors?' });
		expect(answers).toEqual([
			{ text: 'Red', correct: true, position: 0 },
			{ text: 'Blue', correct: true, position: 1 },
			{ text: 'Green', correct: false, position: 2 }
		]);
	});

	it('handles large tests in one call', async () => {
		const id = await repo.create(sample('Big', 1200));

		expect((await repo.get(id))?.questionCount).toBe(1200);
	});

	it('lists tests newest first with question counts', async () => {
		await repo.create(sample('Older', 3));
		await new Promise((r) => setTimeout(r, 5));
		await repo.create(sample('Newer', 1));

		const tests = await repo.list();

		expect(tests.map((t) => [t.title, t.questionCount])).toEqual([
			['Newer', 1],
			['Older', 3]
		]);
		expect(tests[0]).not.toHaveProperty('questions');
	});

	it('gets one test by id, or undefined', async () => {
		const id = await repo.create({ ...sample('One'), description: 'Desc' });

		expect(await repo.get(id)).toMatchObject({
			id,
			title: 'One',
			description: 'Desc',
			questionCount: 2
		});
		expect(await repo.get('missing')).toBeUndefined();
	});

	it('writes nothing when part of the insert fails', async () => {
		const broken = sample('Broken');
		// @ts-expect-error -- a missing answer text violates NOT NULL
		broken.questions[1].answers[0].text = null;

		await expect(repo.create(broken)).rejects.toThrow();
		expect(await repo.list()).toEqual([]);
	});

	it('deletes a test with its questions, answers and everyone’s attempts', async () => {
		await db.insert(user).values({ id: 'alice', name: 'Alice', email: 'alice@example.com' });
		const attempts = new AttemptRepo(db);
		const doomed = await repo.create(sample('Doomed'));
		const kept = await repo.create(sample('Kept'));
		for (const testId of [doomed, kept]) {
			await attempts.start('alice', testId, {
				questionCount: 2,
				random: false,
				mode: 'practice',
				timeLimitMinutes: null
			});
		}
		const rows = async () => ({
			tests: (await db.select().from(test)).length,
			questions: (await db.select().from(question)).length,
			answers: (await db.select().from(answer)).length,
			attempts: (await db.select().from(attempt)).length,
			attemptQuestions: (await db.select().from(attemptQuestion)).length
		});
		expect(await rows()).toEqual({
			tests: 2,
			questions: 4,
			answers: 8,
			attempts: 2,
			attemptQuestions: 4
		});

		expect(await repo.delete(doomed)).toBe(true);

		expect(await rows()).toEqual({
			tests: 1,
			questions: 2,
			answers: 4,
			attempts: 1,
			attemptQuestions: 2
		});
		expect((await repo.list()).map((t) => t.id)).toEqual([kept]);
		expect(await repo.delete(doomed)).toBe(false);
	});
});
