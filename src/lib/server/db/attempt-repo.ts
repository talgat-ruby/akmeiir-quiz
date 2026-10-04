import { and, asc, count, desc, eq, inArray, isNull, isNotNull, sql } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { attempt, attemptQuestion } from './attempts.schema.ts';
import { answer, question, test } from './tests.schema.ts';

export interface AttemptSummary {
	id: string;
	testId: string;
	testTitle: string;
	finished: boolean;
	total: number;
	answered: number;
	correct: number;
}

/** A question before it is answered: no information about which answers are correct. */
export interface OpenQuestion {
	position: number;
	text: string;
	/** More than one correct answer — the user may pick several. */
	multiple: boolean;
	answers: { id: string; text: string }[];
}

/** A question after it was answered, with the correct answers revealed. */
export interface AnsweredQuestion {
	position: number;
	text: string;
	correct: boolean;
	answers: { id: string; text: string; correct: boolean; selected: boolean }[];
}

/** `invalid`: unknown question or answer, or nothing picked. `answered`: already answered. */
export class AnswerError extends Error {
	readonly reason: 'invalid' | 'answered';

	constructor(reason: 'invalid' | 'answered') {
		super(reason === 'invalid' ? 'Invalid answer' : 'Question already answered');
		this.name = 'AnswerError';
		this.reason = reason;
	}
}

export function shuffle<T>(items: readonly T[]): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/** All-or-nothing: right only if exactly the correct answers were picked. */
export function sameAnswers(selected: readonly string[], correct: readonly string[]): boolean {
	const picked = new Set(selected);
	return picked.size === correct.length && correct.every((id) => picked.has(id));
}

export class AttemptRepo<TSchema extends Record<string, unknown>> {
	readonly #db: LibSQLDatabase<TSchema>;

	constructor(db: LibSQLDatabase<TSchema>) {
		this.#db = db;
	}

	/** Start an attempt with up to `questionCount` random questions; returns the attempt id. */
	async start(userId: string, testId: string, questionCount: number): Promise<string> {
		const picked = await this.#db
			.select({ id: question.id })
			.from(question)
			.where(eq(question.testId, testId))
			.orderBy(sql`random()`)
			.limit(questionCount);
		if (picked.length === 0) throw new Error(`Test ${testId} has no questions`);

		const answers = await this.#db
			.select({ id: answer.id, questionId: answer.questionId })
			.from(answer)
			.where(
				inArray(
					answer.questionId,
					picked.map((q) => q.id)
				)
			);
		const answersByQuestion = Map.groupBy(answers, (a) => a.questionId);

		const attemptId = crypto.randomUUID();
		await this.#db.batch([
			this.#db.insert(attempt).values({ id: attemptId, userId, testId }),
			this.#db.insert(attemptQuestion).values(
				picked.map((q, position) => ({
					attemptId,
					position,
					questionId: q.id,
					answerOrder: shuffle((answersByQuestion.get(q.id) ?? []).map((a) => a.id))
				}))
			)
		]);
		return attemptId;
	}

	/** The user's attempt with progress counts; undefined if missing or someone else's. */
	async get(attemptId: string, userId: string): Promise<AttemptSummary | undefined> {
		const [row] = await this.#db
			.select({
				id: attempt.id,
				testId: attempt.testId,
				testTitle: test.title,
				finishedAt: attempt.finishedAt,
				total: count(attemptQuestion.position),
				answered: count(attemptQuestion.answeredAt),
				correct: sql<number>`coalesce(sum(${attemptQuestion.correct}), 0)`.mapWith(Number)
			})
			.from(attempt)
			.innerJoin(test, eq(test.id, attempt.testId))
			.leftJoin(attemptQuestion, eq(attemptQuestion.attemptId, attempt.id))
			.where(and(eq(attempt.id, attemptId), eq(attempt.userId, userId)))
			.groupBy(attempt.id);
		if (!row) return undefined;

		const { finishedAt, ...summary } = row;
		return { ...summary, finished: finishedAt !== null };
	}

	/** The user's most recent unfinished attempt on a test, if any. */
	async findUnfinished(userId: string, testId: string): Promise<string | undefined> {
		const [row] = await this.#db
			.select({ id: attempt.id })
			.from(attempt)
			.where(
				and(eq(attempt.userId, userId), eq(attempt.testId, testId), isNull(attempt.finishedAt))
			)
			.orderBy(desc(attempt.startedAt))
			.limit(1);
		return row?.id;
	}

	/** The first unanswered question, without correctness information. */
	async currentQuestion(attemptId: string): Promise<OpenQuestion | undefined> {
		const [row] = await this.#db
			.select({
				position: attemptQuestion.position,
				questionId: attemptQuestion.questionId,
				answerOrder: attemptQuestion.answerOrder,
				text: question.text
			})
			.from(attemptQuestion)
			.innerJoin(question, eq(question.id, attemptQuestion.questionId))
			.where(and(eq(attemptQuestion.attemptId, attemptId), isNull(attemptQuestion.answeredAt)))
			.orderBy(asc(attemptQuestion.position))
			.limit(1);
		if (!row) return undefined;

		const answers = await this.#answersInOrder(row.questionId, row.answerOrder);
		return {
			position: row.position,
			text: row.text,
			multiple: answers.filter((a) => a.correct).length > 1,
			answers: answers.map(({ id, text }) => ({ id, text }))
		};
	}

	/** An answered question with the correct answers revealed; undefined if not answered yet. */
	async answeredQuestion(
		attemptId: string,
		position: number
	): Promise<AnsweredQuestion | undefined> {
		const [row] = await this.#db
			.select({
				questionId: attemptQuestion.questionId,
				answerOrder: attemptQuestion.answerOrder,
				selectedAnswerIds: attemptQuestion.selectedAnswerIds,
				correct: attemptQuestion.correct,
				text: question.text
			})
			.from(attemptQuestion)
			.innerJoin(question, eq(question.id, attemptQuestion.questionId))
			.where(
				and(
					eq(attemptQuestion.attemptId, attemptId),
					eq(attemptQuestion.position, position),
					isNotNull(attemptQuestion.answeredAt)
				)
			);
		if (!row) return undefined;

		const selected = new Set(row.selectedAnswerIds);
		const answers = await this.#answersInOrder(row.questionId, row.answerOrder);
		return {
			position,
			text: row.text,
			correct: row.correct === true,
			answers: answers.map((a) => ({ ...a, selected: selected.has(a.id) }))
		};
	}

	/** Grade and store an answer; finishes the attempt after its last question. */
	async answer(
		attemptId: string,
		position: number,
		selectedAnswerIds: string[]
	): Promise<{ finished: boolean }> {
		const [row] = await this.#db
			.select({ questionId: attemptQuestion.questionId, answeredAt: attemptQuestion.answeredAt })
			.from(attemptQuestion)
			.where(and(eq(attemptQuestion.attemptId, attemptId), eq(attemptQuestion.position, position)));
		if (!row) throw new AnswerError('invalid');
		if (row.answeredAt) throw new AnswerError('answered');

		const answers = await this.#db
			.select({ id: answer.id, correct: answer.correct })
			.from(answer)
			.where(eq(answer.questionId, row.questionId));
		const known = new Set(answers.map((a) => a.id));
		const selected = [...new Set(selectedAnswerIds)];
		if (selected.length === 0 || selected.some((id) => !known.has(id))) {
			throw new AnswerError('invalid');
		}

		const correctIds = answers.filter((a) => a.correct).map((a) => a.id);
		const updated = await this.#db
			.update(attemptQuestion)
			.set({
				selectedAnswerIds: selected,
				correct: sameAnswers(selected, correctIds),
				answeredAt: new Date()
			})
			.where(
				and(
					eq(attemptQuestion.attemptId, attemptId),
					eq(attemptQuestion.position, position),
					isNull(attemptQuestion.answeredAt)
				)
			)
			.returning({ position: attemptQuestion.position });
		if (updated.length === 0) throw new AnswerError('answered'); // lost a race with a double submit

		const [{ remaining }] = await this.#db
			.select({ remaining: count() })
			.from(attemptQuestion)
			.where(and(eq(attemptQuestion.attemptId, attemptId), isNull(attemptQuestion.answeredAt)));
		if (remaining > 0) return { finished: false };

		await this.#db
			.update(attempt)
			.set({ finishedAt: new Date() })
			.where(and(eq(attempt.id, attemptId), isNull(attempt.finishedAt)));
		return { finished: true };
	}

	async #answersInOrder(questionId: string, order: string[]) {
		const answers = await this.#db
			.select({ id: answer.id, text: answer.text, correct: answer.correct })
			.from(answer)
			.where(eq(answer.questionId, questionId));
		const byId = new Map(answers.map((a) => [a.id, a]));
		return order.flatMap((id) => byId.get(id) ?? []);
	}
}
