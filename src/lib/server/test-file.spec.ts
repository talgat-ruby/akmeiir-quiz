import { describe, expect, it } from 'vitest';
import { parseTestFile, TestFileError } from './test-file.ts';

const question = (text = 'Capital of France?') => ({
	text,
	answers: [
		{ text: 'Paris', correct: true },
		{ text: 'Lyon', correct: false }
	]
});

const parse = (data: unknown) => parseTestFile(JSON.stringify(data));

function issuesOf(data: unknown): string[] {
	try {
		parse(data);
	} catch (error) {
		if (error instanceof TestFileError) return error.issues;
		throw error;
	}
	throw new Error('expected the file to be rejected');
}

describe('parseTestFile', () => {
	it('parses a minimal file and fills in defaults', () => {
		const test = parse({
			title: 'Geography',
			questions: [{ text: 'Q', answers: [{ text: 'A', correct: true }, { text: 'B' }] }]
		});

		expect(test).toEqual({
			title: 'Geography',
			description: '',
			questions: [
				{
					text: 'Q',
					answers: [
						{ text: 'A', correct: true },
						{ text: 'B', correct: false }
					]
				}
			]
		});
	});

	it('trims texts and keeps the description', () => {
		const test = parse({
			title: '  ОФД ',
			description: ' Pharmacy ',
			questions: [{ ...question(), text: '  Capital of France?\n' }]
		});

		expect(test.title).toBe('ОФД');
		expect(test.description).toBe('Pharmacy');
		expect(test.questions[0].text).toBe('Capital of France?');
	});

	it('allows several correct answers', () => {
		const test = parse({
			title: 'Colors',
			questions: [
				{
					text: 'Primary colors?',
					answers: [
						{ text: 'Red', correct: true },
						{ text: 'Blue', correct: true },
						{ text: 'Green' }
					]
				}
			]
		});

		expect(test.questions[0].answers.filter((a) => a.correct)).toHaveLength(2);
	});

	it('accepts a UTF-8 byte order mark', () => {
		expect(
			parseTestFile('\uFEFF' + JSON.stringify({ title: 'T', questions: [question()] })).title
		).toBe('T');
	});

	it('rejects text that is not JSON', () => {
		expect(() => parseTestFile('{ nope')).toThrow('The file is not valid JSON');
	});

	it('rejects JSON that is not an object', () => {
		const expected = ['must be a JSON object with "title" and "questions"'];
		expect(issuesOf([question()])).toEqual(expected);
		expect(issuesOf('just text')).toEqual(expected);
	});

	it('requires a title and at least one question', () => {
		expect(issuesOf({ questions: [] })).toEqual([
			'title: is required',
			'questions: must contain at least one question'
		]);
	});

	it('points at every wrong question and answer', () => {
		const issues = issuesOf({
			title: 'T',
			questions: [
				question(),
				{ text: 'No correct answer', answers: [{ text: 'A' }, { text: 'B' }] },
				{ text: 'Too few answers', answers: [{ text: 'A', correct: true }] },
				{
					text: '  ',
					answers: [
						{ text: '', correct: true },
						{ text: 'B', correct: 'yes' }
					]
				}
			]
		});

		expect(issues).toEqual([
			'question 2: needs at least one correct answer',
			'question 3 › answers: needs at least 2 answers',
			'question 4 › text: must not be empty',
			'question 4 › answer 1 › text: must not be empty',
			'question 4 › answer 2 › correct: must be true or false'
		]);
	});

	it('reports unknown fields, so typos are caught', () => {
		const issues = issuesOf({
			title: 'T',
			source: 'ofd_quizz.mtx',
			questions: [{ text: 'Q', answers: [{ text: 'A', corect: true }, { text: 'B' }] }]
		});

		expect(issues).toContain('source: unknown field');
		expect(issues).toContain('question 1 › answer 1 › corect: unknown field');
	});
});
