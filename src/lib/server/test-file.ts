import * as v from 'valibot';
import type { NewTest } from '#lib/server/db/test-repo.ts';

// The one file format the app accepts (see docs/test-file-format.md). Converting other
// formats into it is the admin's job. Strict: unknown fields are errors, so typos surface.

/** A JSON object (not an array) whose fields are exactly `entries`. */
function record<const T extends v.ObjectEntries>(entries: T, message: string) {
	return v.pipe(
		v.custom<object>((x) => typeof x === 'object' && x !== null && !Array.isArray(x), message),
		v.strictObject(entries)
	);
}

const text = v.pipe(v.string('must be text'), v.trim(), v.nonEmpty('must not be empty'));

const answerSchema = record(
	{
		text,
		correct: v.optional(v.boolean('must be true or false'), false)
	},
	'must be an object with "text" and optional "correct"'
);

const questionSchema = v.pipe(
	record(
		{
			text,
			answers: v.pipe(
				v.array(answerSchema, 'must be a list'),
				v.minLength(2, 'needs at least 2 answers')
			)
		},
		'must be an object with "text" and "answers"'
	),
	v.check((q) => q.answers.some((a) => a.correct), 'needs at least one correct answer')
);

const testFileSchema = record(
	{
		title: text,
		description: v.optional(v.pipe(v.string('must be text'), v.trim()), ''),
		questions: v.pipe(
			v.array(questionSchema, 'must be a list'),
			v.minLength(1, 'must contain at least one question')
		)
	},
	'must be a JSON object with "title" and "questions"'
);

/** A file that can't be imported; `issues` has one readable line per problem. */
export class TestFileError extends Error {
	readonly issues: string[];

	constructor(message: string, issues: string[] = []) {
		super(message);
		this.name = 'TestFileError';
		this.issues = issues;
	}
}

/** "questions.3.answers.0.text" → "question 4 › answer 1 › text" */
function formatPath(path: string): string {
	return path
		.replace(/questions\.(\d+)/, (_, i) => `question ${Number(i) + 1}`)
		.replace(/answers\.(\d+)/, (_, i) => `answer ${Number(i) + 1}`)
		.replaceAll('.', ' › ');
}

function formatIssue(issue: v.BaseIssue<unknown>): string {
	let message = issue.message;
	if (issue.type === 'strict_object') {
		message = issue.expected === 'never' ? 'unknown field' : 'is required';
	}
	const path = v.getDotPath(issue);
	return path ? `${formatPath(path)}: ${message}` : message;
}

/** Parse and validate a question set file's text. Throws `TestFileError` with all problems found. */
export function parseTestFile(source: string): NewTest {
	let data: unknown;
	try {
		data = JSON.parse(source.replace(/^\uFEFF/, ''));
	} catch (error) {
		throw new TestFileError('The file is not valid JSON', [(error as Error).message]);
	}

	const result = v.safeParse(testFileSchema, data);
	if (!result.success) {
		throw new TestFileError('The file has problems', result.issues.map(formatIssue));
	}
	return result.output;
}
