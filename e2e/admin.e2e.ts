import { expect, test } from '@playwright/test';
import { makeAdmin, register } from './helpers.ts';

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

test('regular users cannot upload or delete', async ({ page }) => {
	await register(page);
	await expect(page.getByRole('link', { name: 'Upload a question set' })).toHaveCount(0);

	const response = await page.goto('/tests/upload');
	expect(response?.status()).toBe(403);

	await page.goto('/tests');
	await page.getByRole('link', { name: /Sample test/ }).click();
	await expect(page.getByRole('button', { name: 'Delete this test' })).toHaveCount(0);
});

test('admins upload a question set, see file problems, and delete a set', async ({ page }) => {
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
	await expect(page.getByText('Questions: 2')).toBeVisible();

	await page.getByLabel(/Yes, delete/).check();
	await page.getByRole('button', { name: 'Delete this test' }).click();
	await expect(page).toHaveURL(/\/tests$/);
	await expect(page.getByRole('link', { name: /Geography \(e2e\)/ })).toHaveCount(0);
	await expect(page.getByRole('link', { name: /Sample test/ })).toBeVisible();
});
