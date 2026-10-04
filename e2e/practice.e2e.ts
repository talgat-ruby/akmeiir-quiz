import { expect, test, type Page } from '@playwright/test';
import { register, startSampleTest, visibleText } from './helpers.ts';

// The seeded sample test, in order: Q1 "Red Planet" (Mars), Q2 primary colors of light
// (Red, Green, Blue — multi-select), Q3 a Kazakh question (Фенолфталеин).

/** Pick the given answers and press Check. */
async function check(page: Page, answers: string[]) {
	for (const answer of answers) await page.getByLabel(answer, { exact: true }).check();
	await page.getByRole('button', { name: 'Check' }).click();
}

/** Answer Q1 wrong, Q2 right and Q3 wrong, then finish: 1 of 3. */
async function practiceOneOfThree(page: Page) {
	await startSampleTest(page, { count: 3 });
	await check(page, ['Venus']);
	await page.getByRole('link', { name: 'Next question' }).click();
	await check(page, ['Red', 'Green', 'Blue']);
	await page.getByRole('link', { name: 'Next question' }).click();
	await check(page, ['Лакмус']);
	await page.getByRole('link', { name: 'Finish' }).first().click();
	await page.getByRole('button', { name: 'Yes, finish' }).click();
	await expect(visibleText(page, 'Score: 1 of 3')).toBeVisible();
}

test('practice reveals each answer on Check, then ends like an exam', async ({ page }) => {
	await register(page);
	await startSampleTest(page, { count: 3 });

	await expect(visibleText(page, 'Question 1 of 3')).toBeVisible();
	await check(page, ['Venus']);
	await expect(page.getByRole('status')).toHaveText('✗ Wrong');
	await expect(page.getByRole('listitem').filter({ hasText: 'Mars' })).toContainText(
		'Correct answer'
	);
	await expect(page.getByRole('navigation', { name: 'All questions' })).toContainText(
		'Question 1 — ✗ Wrong'
	);
	await page.getByRole('link', { name: 'Next question' }).click();

	await expect(visibleText(page, 'Select all that apply.')).toBeVisible();
	await check(page, ['Red', 'Green', 'Blue']);
	await expect(page.getByRole('status')).toHaveText('✓ Correct');
	await page.getByRole('link', { name: 'Next question' }).click();

	await check(page, ['Лакмус']);
	await expect(page.getByRole('status')).toHaveText('✗ Wrong');

	// No auto-finish: the last answer leads to Finish and a confirmation.
	await page.getByRole('link', { name: 'Finish' }).first().click();
	await expect(page.getByRole('heading', { name: 'Finish the test?' })).toBeVisible();
	await page.getByRole('button', { name: 'Yes, finish' }).click();

	await expect(visibleText(page, 'Score: 1 of 3')).toBeVisible();
	await expect(visibleText(page, '33%')).toBeVisible();
	await expect(page.locator('section')).toHaveCount(2); // the mistakes review
	await page.goto('/tests');
	await expect(visibleText(page, 'Best: 33%')).toBeVisible();
});

test('a checked answer stays revealed and a reload keeps the current question', async ({
	page
}) => {
	await register(page);
	await startSampleTest(page, { count: 3 });
	await check(page, ['Mars']);
	await page.getByRole('link', { name: 'Next question' }).click();
	await expect(visibleText(page, 'Question 2 of 3')).toBeVisible();

	await page.reload();
	await expect(visibleText(page, 'Question 2 of 3')).toBeVisible();
	await expect(visibleText(page, 'Select all that apply.')).toBeVisible();

	await page.getByRole('link', { name: '← Previous' }).click();
	await expect(page.getByRole('status')).toHaveText('✓ Correct');
	await expect(page.getByRole('button', { name: 'Check' })).toHaveCount(0);
});

test('practice can have a time limit too', async ({ page }) => {
	await register(page);
	await startSampleTest(page, { count: 2, timeLimit: 5 });

	await expect(page.getByRole('timer')).toHaveText(/Time left: [45]:\d\d/);
});

test('history redoes only the mistakes of an attempt, in order', async ({ page }) => {
	await register(page);
	await practiceOneOfThree(page);

	await page.goto('/tests');
	await page
		.getByRole('listitem')
		.filter({ hasText: 'Sample test' })
		.getByRole('link', { name: 'History' })
		.click();
	await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
	await expect(visibleText(page, 'Sample test', { exact: true })).toBeVisible();
	await expect(page.getByRole('listitem')).toContainText('1 of 3 (33%)');
	await expect(page.getByRole('button', { name: 'Redo all' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Redo mistakes (2)' }).click();

	await expect(visibleText(page, 'Question 1 of 2')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Which planet is known as the Red Planet?'
	);
});
