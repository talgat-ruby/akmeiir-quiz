import { execFileSync } from 'node:child_process';
import { expect, type Locator, type Page } from '@playwright/test';
import { E2E_DATABASE_URL } from './env.ts';

export const PASSWORD = 'correct-horse-1';

let counter = 0;

/** Register a brand-new user (each test gets its own) and land on the test list. */
export async function register(page: Page, name = 'E2E User'): Promise<string> {
	const email = `e2e-${Date.now()}-${counter++}@example.com`;
	await page.goto('/register');
	await page.getByLabel('Name').fill(name);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/tests$/);
	return email;
}

/** Give a user the admin role in the e2e database. */
export function makeAdmin(email: string): void {
	execFileSync('pnpm', ['-s', 'make-admin', email], {
		env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
		stdio: 'ignore'
	});
}

/** Open the seeded sample test (3 questions) and start it with the given setup. */
export async function startSampleTest(
	page: Page,
	{
		mode = 'Practice',
		count = 3,
		timeLimit
	}: { mode?: 'Practice' | 'Exam'; count?: number; timeLimit?: number } = {}
): Promise<void> {
	await page.goto('/tests');
	await page.getByRole('link', { name: /Sample test/ }).click();
	await page.getByRole('radio', { name: new RegExp(`^${mode}`) }).check();
	if (timeLimit !== undefined) await page.getByLabel(/Time limit/).fill(String(timeLimit));
	await page.getByLabel('Number of questions').fill(String(count));
	await page.getByLabel(/Random questions/).uncheck();
	await page.getByRole('button', { name: 'Start' }).click();
	await expect(page).toHaveURL(/\/attempts\//);
}

/**
 * Text that is on screen. Some things are in the page twice, once for the phone layout and
 * once for desktop, with the other one hidden; getByText alone would find both.
 */
export function visibleText(page: Page, text: string, options?: { exact?: boolean }): Locator {
	return page.getByText(text, options).filter({ visible: true });
}
