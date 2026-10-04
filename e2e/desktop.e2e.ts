import { expect, test } from '@playwright/test';
import { register, startSampleTest, visibleText } from './helpers.ts';

// The other tests run on a phone; this one checks the desktop layout's own controls.
test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

test('on desktop: header, question card with sidebar, results, and the history table', async ({
	page
}) => {
	await register(page, 'Desk User');
	const header = page.getByRole('banner');
	await expect(header.getByText('Desk User')).toBeVisible();
	await expect(header.getByRole('button', { name: 'Log out' })).toBeVisible();
	await expect(header.getByRole('button', { name: 'Русский' })).toBeVisible();

	await startSampleTest(page, { count: 3 });
	const sidebar = page.getByRole('complementary');
	await expect(sidebar).toContainText('Answered 0 of 3');

	await page.getByLabel('Venus', { exact: true }).check();
	await page.getByRole('button', { name: 'Check' }).click();
	await expect(page.getByRole('status')).toHaveText('✗ Wrong');
	await expect(sidebar).toContainText('Answered 1 of 3');
	await page.getByRole('link', { name: 'Next question' }).click();
	await expect(visibleText(page, 'Question 2 of 3')).toBeVisible();

	await sidebar.getByRole('link', { name: 'Finish' }).click();
	await page.getByRole('button', { name: 'Yes, finish' }).click();
	await expect(visibleText(page, 'Score: 0 of 3')).toBeVisible();

	await page.getByRole('link', { name: 'History' }).click();
	const row = page.getByRole('row').filter({ hasText: '0 of 3 (0%)' });
	await expect(row).toContainText('Practice');
	await row.getByRole('button', { name: 'Redo mistakes (3)' }).click();
	await expect(visibleText(page, 'Question 1 of 3')).toBeVisible();
});
