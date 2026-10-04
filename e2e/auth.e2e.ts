import { expect, test } from '@playwright/test';
import { PASSWORD, register } from './helpers.ts';

test('signed-out visitors are sent to log in, then back to where they were going', async ({
	page
}) => {
	await page.goto('/tests');
	await expect(page).toHaveURL(/\/login\?redirectTo=%2Ftests$/);
	await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});

test('register, log out, and log back in', async ({ page }) => {
	const email = await register(page, 'Aigerim');
	await expect(page.getByText('Aigerim')).toBeVisible();

	await page.getByRole('button', { name: 'Log out' }).click();
	await expect(page).toHaveURL(/\/login$/);

	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('wrong-password');
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page.getByRole('alert')).toHaveText('Wrong email or password.');

	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/tests$/);
});

test('an email can only register once', async ({ page, browser }) => {
	const email = await register(page);

	const other = await browser.newPage();
	await other.goto('/register');
	await other.getByLabel('Name').fill('Someone else');
	await other.getByLabel('Email').fill(email);
	await other.getByLabel('Password').fill(PASSWORD);
	await other.getByRole('button', { name: 'Create account' }).click();
	await expect(other.getByRole('alert')).toHaveText('An account with this email already exists.');
});
