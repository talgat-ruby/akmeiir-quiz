import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	isNull,
	isNotNull,
	lte,
	ne,
	not,
	or,
	sql
} from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { attempt, attemptQuestion, type AttemptMode } from './attempts.schema.ts';
import { answer, question, test } from './tests.schema.ts';

export type { AttemptMode } from './attempts.schema.ts';

/** What the user chose on the setup screen. */
export interface AttemptSetup {
	questionCount: number;
	random: boolean;
	mode: 'practice' | 'exam';
	/** Null means no limit. */
	timeLimitMinutes: number | null;
}

export interface AttemptSummary {
	id: string;
	testId: string;
	testTitle: string;
	mode: AttemptMode;
	startedAt: Date;
	deadlineAt: Date | null;
	finished: boolean;
	total: number;
	answered: number;
	correct: number;
}

/** The user's track record on one test, for the test list. */
export interface TestStats {
	/** Best score of a finished practice or exam attempt, in percent. */
	bestPercent: number;
}

/** A question's state in the "All questions" list. `correct` is only set when it may be shown. */
export interface QuestionStatus {
	position: number;
	answered: boolean;
	correct?: boolean;
}

/** A question before grading is shown: no information about which answers are correct. */
export interface OpenQuestion {
	position: number;
	text: string;
	/** More than one correct answer — the user may pick several. */
	multiple: boolean;
	answers: { id: string; text: string }[];
	/** The answer saved so far (exam answers can be changed until the end). */
	selected: string[];
}

/** A question with the correct answers revealed: practice feedback, or the exam review. */
export interface RevealedQuestion {
	position: number;
	text: string;
	answered: boolean;
	correct: boolean;
	answers: { id: string; text: string; correct: boolean; selected: boolean }[];
}

type AnswerErrorReason = 'invalid' | 'answered' | 'closed';

/**
 * `invalid`: unknown question or answer, or nothing picked. `answered`: already answered
 * (practice and mistakes). `closed`: the attempt is finished or its time is up.
 */
export class AnswerError extends Error {
	readonly reason: AnswerErrorReason;

	constructor(reason: AnswerErrorReason) {
		super(`Answer rejected: ${reason}`);
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

	/**
	 * Start an attempt with up to `questionCount` questions — a random selection in random order,
	 * or the first ones in the set's order. Returns the attempt id.
	 */
	async start(userId: string, testId: string, setup: AttemptSetup): Promise<string> {
		const picked = await this.#db
			.select({ id: question.id })
			.from(question)
			.where(eq(question.testId, testId))
			.orderBy(setup.random ? sql`random()` : asc(question.position))
			.limit(setup.questionCount);
		if (picked.length === 0) throw new Error(`Test ${testId} has no questions`);

		const deadlineAt = setup.timeLimitMinutes
			? new Date(Date.now() + setup.timeLimitMinutes * 60_000)
			: null;
		return this.#create(
			{ userId, testId, mode: setup.mode, deadlineAt },
			picked.map((q) => q.id)
		);
	}

	/**
	 * Start a new attempt asking only the questions a past attempt of the user's got wrong or left
	 * unanswered, in the same order, with feedback after each (mode `mistakes`). Returns the new
	 * attempt id, or undefined if the attempt isn't the user's or had no mistakes.
	 */
	async redoMistakes(userId: string, attemptId: string): Promise<string | undefined> {
		const [source] = await this.#db
			.select({ testId: attempt.testId })
			.from(attempt)
			.where(and(eq(attempt.id, attemptId), eq(attempt.userId, userId)));
		if (!source) return undefined;

		const rows = await this.#db
			.select({ questionId: attemptQuestion.questionId })
			.from(attemptQuestion)
			.where(
				and(
					eq(attemptQuestion.attemptId, attemptId),
					or(isNull(attemptQuestion.correct), not(attemptQuestion.correct))
				)
			)
			.orderBy(asc(attemptQuestion.position));
		if (rows.length === 0) return undefined;

		return this.#create(
			{ userId, testId: source.testId, mode: 'mistakes', deadlineAt: null },
			rows.map((r) => r.questionId)
		);
	}

	/** The user's attempt with progress counts; undefined if missing or someone else's. */
	async get(attemptId: string, userId: string): Promise<AttemptSummary | undefined> {
		const [summary] = await this.#summaries().where(
			and(eq(attempt.id, attemptId), eq(attempt.userId, userId))
		);
		return summary && withFinished(summary);
	}

	/** The user's attempts on one test, newest first. */
	async history(userId: string, testId: string): Promise<AttemptSummary[]> {
		const rows = await this.#summaries()
			.where(and(eq(attempt.userId, userId), eq(attempt.testId, testId)))
			.orderBy(desc(attempt.startedAt));
		return rows.map(withFinished);
	}

	/** Best score for every test the user has finished, keyed by test id. */
	async statsByTest(userId: string): Promise<Record<string, TestStats>> {
		const finished = await this.#db
			.select({
				testId: attempt.testId,
				total: count(attemptQuestion.position),
				correct: sql<number>`coalesce(sum(${attemptQuestion.correct}), 0)`.mapWith(Number)
			})
			.from(attempt)
			.innerJoin(attemptQuestion, eq(attemptQuestion.attemptId, attempt.id))
			.where(
				and(
					eq(attempt.userId, userId),
					isNotNull(attempt.finishedAt),
					ne(attempt.mode, 'mistakes') // a re-quiz of mistakes isn't a fair score
				)
			)
			.groupBy(attempt.id);

		const stats: Record<string, TestStats> = {};
		for (const { testId, total, correct } of finished) {
			const percent = Math.round((correct / total) * 100);
			stats[testId] = { bestPercent: Math.max(stats[testId]?.bestPercent ?? 0, percent) };
		}
		return stats;
	}

	/** The user's most recent attempt on a test that can still be continued, if any. */
	async findUnfinished(userId: string, testId: string): Promise<string | undefined> {
		const [row] = await this.#db
			.select({ id: attempt.id })
			.from(attempt)
			.where(
				and(
					eq(attempt.userId, userId),
					eq(attempt.testId, testId),
					isNull(attempt.finishedAt),
					or(isNull(attempt.deadlineAt), gt(attempt.deadlineAt, new Date()))
				)
			)
			.orderBy(desc(attempt.startedAt))
			.limit(1);
		return row?.id;
	}

	/** Finish the attempt if its time limit has passed (at the deadline, not now). */
	async finishExpired(attemptId: string): Promise<void> {
		await this.#db
			.update(attempt)
			.set({ finishedAt: sql`${attempt.deadlineAt}` })
			.where(
				and(
					eq(attempt.id, attemptId),
					isNull(attempt.finishedAt),
					lte(attempt.deadlineAt, new Date())
				)
			);
	}

	async finish(attemptId: string): Promise<void> {
		await this.#db
			.update(attempt)
			.set({ finishedAt: new Date() })
			.where(and(eq(attempt.id, attemptId), isNull(attempt.finishedAt)));
	}

	/** Any question, with the answer saved so far but nothing about which answers are correct. */
	async question(attemptId: string, position: number): Promise<OpenQuestion | undefined> {
		const [row] = await this.#questionRows().where(
			and(eq(attemptQuestion.attemptId, attemptId), eq(attemptQuestion.position, position))
		);
		return row && this.#open(row);
	}

	/**
	 * Every question's state for the "All questions" list. With `reveal` (practice and mistakes
	 * modes) answered questions also say whether they were right; an exam must not pass it.
	 */
	async questionList(attemptId: string, reveal: boolean): Promise<QuestionStatus[]> {
		const rows = await this.#db
			.select({
				position: attemptQuestion.position,
				answeredAt: attemptQuestion.answeredAt,
				correct: attemptQuestion.correct
			})
			.from(attemptQuestion)
			.where(eq(attemptQuestion.attemptId, attemptId))
			.orderBy(asc(attemptQuestion.position));
		return rows.map((r) => {
			const answered = r.answeredAt !== null;
			return reveal && answered
				? { position: r.position, answered, correct: r.correct === true }
				: { position: r.position, answered };
		});
	}

	/** Practice and mistakes feedback: an answered question with the correct answers revealed. */
	async answeredQuestion(
		attemptId: string,
		position: number
	): Promise<RevealedQuestion | undefined> {
		const [row] = await this.#questionRows().where(
			and(
				eq(attemptQuestion.attemptId, attemptId),
				eq(attemptQuestion.position, position),
				isNotNull(attemptQuestion.answeredAt)
			)
		);
		return row && this.#reveal(row);
	}

	/** The results review: every question answered wrong or not at all, answers revealed. */
	async mistakes(attemptId: string): Promise<RevealedQuestion[]> {
		const rows = await this.#questionRows()
			.where(
				and(
					eq(attemptQuestion.attemptId, attemptId),
					or(isNull(attemptQuestion.correct), not(attemptQuestion.correct))
				)
			)
			.orderBy(asc(attemptQuestion.position));
		return Promise.all(rows.map((row) => this.#reveal(row)));
	}

	/** Practice and mistakes: grade and store an answer once; it can't be changed afterwards. */
	async answer(attemptId: string, position: number, selectedAnswerIds: string[]): Promise<void> {
		const row = await this.#openQuestionRow(attemptId, position);
		if (row.answeredAt) throw new AnswerError('answered');

		const graded = await this.#grade(row.questionId, selectedAnswerIds);
		const updated = await this.#db
			.update(attemptQuestion)
			.set({ ...graded, answeredAt: new Date() })
			.where(
				and(
					eq(attemptQuestion.attemptId, attemptId),
					eq(attemptQuestion.position, position),
					isNull(attemptQuestion.answeredAt)
				)
			)
			.returning({ position: attemptQuestion.position });
		if (updated.length === 0) throw new AnswerError('answered'); // lost a race with a double submit
	}

	/** Exam: store (or replace) an answer while the attempt is open; the grade stays hidden. */
	async saveExamAnswer(
		attemptId: string,
		position: number,
		selectedAnswerIds: string[]
	): Promise<void> {
		const row = await this.#openQuestionRow(attemptId, position);
		const graded = await this.#grade(row.questionId, selectedAnswerIds);
		await this.#db
			.update(attemptQuestion)
			.set({ ...graded, answeredAt: new Date() })
			.where(and(eq(attemptQuestion.attemptId, attemptId), eq(attemptQuestion.position, position)));
	}

	/** The question at `position`, if the attempt still takes answers (not finished, time not up). */
	async #openQuestionRow(attemptId: string, position: number) {
		const [row] = await this.#db
			.select({
				questionId: attemptQuestion.questionId,
				answeredAt: attemptQuestion.answeredAt,
				finishedAt: attempt.finishedAt,
				deadlineAt: attempt.deadlineAt
			})
			.from(attemptQuestion)
			.innerJoin(attempt, eq(attempt.id, attemptQuestion.attemptId))
			.where(and(eq(attemptQuestion.attemptId, attemptId), eq(attemptQuestion.position, position)));
		if (!row) throw new AnswerError('invalid');
		if (row.finishedAt || (row.deadlineAt && row.deadlineAt <= new Date())) {
			throw new AnswerError('closed');
		}
		return row;
	}

	/** Check the picked answers belong to the question, and grade them. */
	async #grade(questionId: string, selectedAnswerIds: string[]) {
		const answers = await this.#db
			.select({ id: answer.id, correct: answer.correct })
			.from(answer)
			.where(eq(answer.questionId, questionId));
		const known = new Set(answers.map((a) => a.id));
		const selected = [...new Set(selectedAnswerIds)];
		if (selected.length === 0 || selected.some((id) => !known.has(id))) {
			throw new AnswerError('invalid');
		}
		const correctIds = answers.filter((a) => a.correct).map((a) => a.id);
		return { selectedAnswerIds: selected, correct: sameAnswers(selected, correctIds) };
	}

	/** Attempts with their test title and progress counts; callers add the `where`. */
	#summaries() {
		return this.#db
			.select({
				id: attempt.id,
				testId: attempt.testId,
				testTitle: test.title,
				mode: attempt.mode,
				startedAt: attempt.startedAt,
				deadlineAt: attempt.deadlineAt,
				finishedAt: attempt.finishedAt,
				total: count(attemptQuestion.position),
				answered: count(attemptQuestion.answeredAt),
				correct: sql<number>`coalesce(sum(${attemptQuestion.correct}), 0)`.mapWith(Number)
			})
			.from(attempt)
			.innerJoin(test, eq(test.id, attempt.testId))
			.leftJoin(attemptQuestion, eq(attemptQuestion.attemptId, attempt.id))
			.groupBy(attempt.id)
			.$dynamic();
	}

	/** Insert an attempt asking `questionIds` in that order, each with freshly shuffled answers. */
	async #create(
		values: { userId: string; testId: string; mode: AttemptMode; deadlineAt: Date | null },
		questionIds: string[]
	): Promise<string> {
		const answers = await this.#db
			.select({ id: answer.id, questionId: answer.questionId })
			.from(answer)
			.where(inArray(answer.questionId, questionIds));
		const answersByQuestion = Map.groupBy(answers, (a) => a.questionId);

		const attemptId = crypto.randomUUID();
		await this.#db.batch([
			this.#db.insert(attempt).values({ id: attemptId, ...values }),
			this.#db.insert(attemptQuestion).values(
				questionIds.map((questionId, position) => ({
					attemptId,
					position,
					questionId,
					answerOrder: shuffle((answersByQuestion.get(questionId) ?? []).map((a) => a.id))
				}))
			)
		]);
		return attemptId;
	}

	/** Question rows of attempts; callers add the full `where`. */
	#questionRows() {
		return this.#db
			.select({
				position: attemptQuestion.position,
				questionId: attemptQuestion.questionId,
				answerOrder: attemptQuestion.answerOrder,
				selectedAnswerIds: attemptQuestion.selectedAnswerIds,
				answeredAt: attemptQuestion.answeredAt,
				correct: attemptQuestion.correct,
				text: question.text
			})
			.from(attemptQuestion)
			.innerJoin(question, eq(question.id, attemptQuestion.questionId))
			.$dynamic();
	}

	async #open(row: QuestionRow): Promise<OpenQuestion> {
		const answers = await this.#answersInOrder(row.questionId, row.answerOrder);
		return {
			position: row.position,
			text: row.text,
			multiple: answers.filter((a) => a.correct).length > 1,
			answers: answers.map(({ id, text }) => ({ id, text })),
			selected: row.selectedAnswerIds ?? []
		};
	}

	async #reveal(row: QuestionRow): Promise<RevealedQuestion> {
		const selected = new Set(row.selectedAnswerIds);
		const answers = await this.#answersInOrder(row.questionId, row.answerOrder);
		return {
			position: row.position,
			text: row.text,
			answered: row.answeredAt !== null,
			correct: row.correct === true,
			answers: answers.map((a) => ({ ...a, selected: selected.has(a.id) }))
		};
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

function withFinished({
	finishedAt,
	...summary
}: Omit<AttemptSummary, 'finished'> & { finishedAt: Date | null }): AttemptSummary {
	return { ...summary, finished: finishedAt !== null };
}

interface QuestionRow {
	position: number;
	questionId: string;
	answerOrder: string[];
	selectedAnswerIds: string[] | null;
	answeredAt: Date | null;
	correct: boolean | null;
	text: string;
}
