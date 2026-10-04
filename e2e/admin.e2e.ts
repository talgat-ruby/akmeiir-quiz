import { expect, test } from '@playwright/test';
import { makeAdmin, register, visibleText } from './helpers.ts';

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

test('regular users cannot upload', async ({ page }) => {
	await register(page);
	await expect(page.getByRole('link', { name: 'Upload a question set' })).toHaveCount(0);

	const response = await page.goto('/tests/upload');
	expect(response?.status()).toBe(403);
});

test('admins upload a question set and see file problems', async ({ page }) => {
	const email = await register(page, 'E2E Admin');
	makeAdmin(email);
	await page.reload();

	await page.getByRole('link', { name: 'Upload a question set' }).click();
	await page.getByLabel('File').setInputFiles(fixture('broken.json'));
	await page.getByRole('button', { name: 'Upload' }).click();
	const problems = page.getByRole('alert');
	await expect(problems).toContainText('broken.json was not imported:');
	await expect(problems).toContainText('question 1 › answer 1 › corect: unknown field');
	await expect(problems).toContainText('question 2 › answers: needs at least 2 answers');

	await page.getByLabel('File').setInputFiles(fixture('geography.json'));
	await page.getByRole('button', { name: 'Upload' }).click();
	await expect(page.getByRole('heading', { name: 'Geography (e2e)' })).toBeVisible();
	await expect(visibleText(page, 'Questions: 2')).toBeVisible();
	// Nobody can delete tests in the app.
	await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
});

test('admins can drop a file onto the upload area', async ({ page }) => {
	const email = await register(page, 'E2E Admin');
	makeAdmin(email);
	await page.goto('/tests/upload');
	await page.waitForLoadState('networkidle');

	const dataTransfer = await page.evaluateHandle(() => {
		const transfer = new DataTransfer();
		const set = {
			title: 'Dropped (e2e)',
			questions: [{ text: '1 + 1?', answers: [{ text: '2', correct: true }, { text: '3' }] }]
		};
		transfer.items.add(
			new File([JSON.stringify(set)], 'dropped.json', { type: 'application/json' })
		);
		return transfer;
	});
	await page
		.locator('label')
		.filter({ hasText: 'Drop a .json file here' })
		.dispatchEvent('drop', { dataTransfer });
	await expect(visibleText(page, 'dropped.json')).toBeVisible();

	await page.getByRole('button', { name: 'Upload' }).click();
	await expect(page.getByRole('heading', { name: 'Dropped (e2e)' })).toBeVisible();
});
