import { count, desc, eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { answer, question, test } from './tests.schema.ts';

/** A whole test as a parser produces it — the input of `TestRepo.create`. */
export interface NewTest {
	title: string;
	description?: string;
	questions: {
		text: string;
		answers: { text: string; correct: boolean }[];
	}[];
}

/** What the library pages show; never includes answers. */
export interface TestSummary {
	id: string;
	title: string;
	description: string;
	questionCount: number;
	createdAt: Date;
}

/** Keeps each insert well under SQLite's bound-parameter limit. */
const CHUNK_SIZE = 500;

function chunk<T>(rows: T[]): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < rows.length; i += CHUNK_SIZE) chunks.push(rows.slice(i, i + CHUNK_SIZE));
	return chunks;
}

export class TestRepo<TSchema extends Record<string, unknown>> {
	readonly #db: LibSQLDatabase<TSchema>;

	constructor(db: LibSQLDatabase<TSchema>) {
		this.#db = db;
	}

	/** Insert a test with its questions and answers atomically (one batch); returns the test id. */
	async create(input: NewTest): Promise<string> {
		const testId = crypto.randomUUID();
		const questionRows = input.questions.map((q, position) => ({
			id: crypto.randomUUID(),
			testId,
			position,
			text: q.text
		}));
		const answerRows = input.questions.flatMap((q, qi) =>
			q.answers.map((a, position) => ({
				questionId: questionRows[qi].id,
				position,
				text: a.text,
				correct: a.correct
			}))
		);

		await this.#db.batch([
			this.#db
				.insert(test)
				.values({ id: testId, title: input.title, description: input.description ?? '' }),
			...chunk(questionRows).map((rows) => this.#db.insert(question).values(rows)),
			...chunk(answerRows).map((rows) => this.#db.insert(answer).values(rows))
		]);
		return testId;
	}

	list(): Promise<TestSummary[]> {
		return this.#summaries().orderBy(desc(test.createdAt));
	}

	async get(id: string): Promise<TestSummary | undefined> {
		const [summary] = await this.#summaries().where(eq(test.id, id));
		return summary;
	}

	/**
	 * Delete a test. Foreign keys cascade to its questions and answers and to everyone's
	 * attempts on it. Returns false if there was no such test.
	 */
	async delete(id: string): Promise<boolean> {
		const deleted = await this.#db.delete(test).where(eq(test.id, id)).returning({ id: test.id });
		return deleted.length > 0;
	}

	#summaries() {
		return this.#db
			.select({
				id: test.id,
				title: test.title,
				description: test.description,
				questionCount: count(question.id),
				createdAt: test.createdAt
			})
			.from(test)
			.leftJoin(question, eq(question.testId, test.id))
			.groupBy(test.id)
			.$dynamic();
	}
}
