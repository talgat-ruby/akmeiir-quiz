import { expect, test } from '@playwright/test';
import { register, startSampleTest } from './helpers.ts';

// The seeded sample test, in order: Q1 "Red Planet" (Mars), Q2 primary colors of light
// (Red, Green, Blue — multi-select), Q3 a Kazakh question (Фенолфталеин).

test('practice shows feedback after each answer, a score, and the best score', async ({ page }) => {
	await register(page);
	await startSampleTest(page, { count: 3 });

	await expect(page.getByText('Question 1 of 3')).toBeVisible();
	await page.getByRole('button', { name: 'Venus' }).click();
	await expect(page.getByRole('status')).toHaveText('✗ Wrong');
	await expect(page.getByText('Mars (correct answer)')).toBeVisible();
	await page.getByRole('link', { name: 'Next question' }).click();

	await expect(page.getByText('Select all that apply.')).toBeVisible();
	for (const color of ['Red', 'Green', 'Blue']) await page.getByLabel(color).check();
	await page.getByRole('button', { name: 'Check' }).click();
	await expect(page.getByRole('status')).toHaveText('✓ Correct');
	await page.getByRole('link', { name: 'Next question' }).click();

	await page.getByRole('button', { name: 'Лакмус' }).click();
	await expect(page.getByRole('status')).toHaveText('✗ Wrong');
	await page.getByRole('link', { name: 'See results' }).click();

	await expect(page.getByText('Score: 1 of 3 (33%)')).toBeVisible();
	await page.goto('/tests');
	await expect(page.getByText('Best: 33%')).toBeVisible();
});

test('a reload keeps the current question', async ({ page }) => {
	await register(page);
	await startSampleTest(page, { count: 3 });
	await page.getByRole('button', { name: 'Mars' }).click();
	await page.getByRole('link', { name: 'Next question' }).click();
	await expect(page.getByText('Question 2 of 3')).toBeVisible();

	await page.reload();
	await expect(page.getByText('Question 2 of 3')).toBeVisible();
	await expect(page.getByText('Select all that apply.')).toBeVisible();
});

test('history redoes only the mistakes of an attempt, in order', async ({ page }) => {
	await register(page);
	await startSampleTest(page, { count: 3 });
	await page.getByRole('button', { name: 'Venus' }).click();
	await page.getByRole('link', { name: 'Next question' }).click();
	for (const color of ['Red', 'Green', 'Blue']) await page.getByLabel(color).check();
	await page.getByRole('button', { name: 'Check' }).click();
	await page.getByRole('link', { name: 'Next question' }).click();
	await page.getByRole('button', { name: 'Лакмус' }).click();
	await page.getByRole('link', { name: 'See results' }).click();

	await page.goto('/tests');
	await page.getByRole('link', { name: 'History' }).click();
	await expect(page.getByRole('listitem')).toContainText('Practice');
	await expect(page.getByRole('listitem')).toContainText('1 of 3 (33%)');
	await page.getByRole('button', { name: 'Redo mistakes (2)' }).click();

	await expect(page.getByText('Question 1 of 2')).toBeVisible();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Which planet is known as the Red Planet?'
	);
});
