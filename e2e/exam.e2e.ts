import { expect, test } from '@playwright/test';
import { register, startSampleTest, visibleText } from './helpers.ts';

test('an exam hides feedback, lets answers change, and reviews mistakes at the end', async ({
	page
}) => {
	await register(page);
	await startSampleTest(page, { mode: 'Exam', count: 3 });

	// Q1: save a wrong answer, then come back and change it.
	await page.getByRole('radio', { name: 'Venus' }).check();
	await page.getByRole('button', { name: 'Save answer' }).click();
	await expect(visibleText(page, 'Question 2 of 3')).toBeVisible();
	await expect(page.getByRole('status')).toHaveCount(0); // no feedback in an exam
	await page.getByRole('link', { name: '← Previous' }).click();
	await expect(page.getByRole('radio', { name: 'Venus' })).toBeChecked();
	await page.getByRole('radio', { name: 'Mars' }).check();
	await page.getByRole('button', { name: 'Save answer' }).click();

	// Skip Q2, answer Q3 wrong.
	await page.getByRole('link', { name: /^Question 3 —/ }).click();
	await page.getByRole('radio', { name: 'Лакмус' }).check();
	await page.getByRole('button', { name: 'Save answer' }).click();

	await expect(page.getByRole('heading', { name: 'Finish the test?' })).toBeVisible();
	await expect(visibleText(page, 'You answered 2 of 3 questions.')).toBeVisible();
	await page.getByRole('button', { name: 'Yes, finish' }).click();

	await expect(visibleText(page, 'Score: 1 of 3')).toBeVisible();
	const mistakes = page.locator('section');
	await expect(mistakes).toHaveCount(2);
	await expect(mistakes.first()).toContainText('Not answered');
	const answer = (text: string) => mistakes.last().getByRole('listitem').filter({ hasText: text });
	await expect(answer('Лакмус')).toContainText('Your answer');
	await expect(answer('Фенолфталеин')).toContainText('Correct answer');
});

test('an exam with a time limit shows the time left', async ({ page }) => {
	await register(page);
	await startSampleTest(page, { mode: 'Exam', count: 2, timeLimit: 5 });

	await expect(page.getByRole('timer')).toHaveText(/Time left: [45]:\d\d/);
});
