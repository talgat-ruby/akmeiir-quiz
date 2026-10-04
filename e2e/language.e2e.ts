import { expect, test } from '@playwright/test';
import { register } from './helpers.ts';

test('the interface is English by default and switches to Russian and Kazakh', async ({ page }) => {
	await register(page);
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.getByRole('heading', { name: 'Tests' })).toBeVisible();

	// The switcher needs JavaScript, so wait for the page to finish loading first.
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Русский' }).click();
	await expect(page.getByRole('heading', { name: 'Тесты' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
	await expect(page.getByRole('button', { name: 'Русский' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	// The choice sticks across pages.
	await page.getByRole('link', { name: /Sample test/ }).click();
	await expect(page.getByRole('button', { name: 'Начать' })).toBeVisible();

	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Қазақша' }).click();
	await expect(page.getByRole('button', { name: 'Бастау' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('lang', 'kk');

	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'English' }).click();
	await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
});

test('server messages follow the chosen language too', async ({ page }) => {
	await page.goto('/login');
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Русский' }).click();
	await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

	await page.getByLabel('Электронная почта').fill('nobody@example.com');
	await page.getByLabel('Пароль').fill('wrong-password');
	await page.getByRole('button', { name: 'Войти' }).click();
	await expect(page.getByRole('alert')).toHaveText('Неверная почта или пароль.');
});
