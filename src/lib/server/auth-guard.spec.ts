import { describe, it, expect } from 'vitest';
import { afterLoginUrl, isPublicRoute, loginUrl } from './auth-guard.ts';

describe('isPublicRoute', () => {
	it('allows the (auth) pages and unknown URLs', () => {
		expect(isPublicRoute('/(auth)/login')).toBe(true);
		expect(isPublicRoute('/(auth)/register')).toBe(true);
		expect(isPublicRoute('/(auth)/logout')).toBe(true);
		expect(isPublicRoute(null)).toBe(true);
	});

	it('protects everything else', () => {
		expect(isPublicRoute('/(app)/tests')).toBe(false);
		expect(isPublicRoute('/(app)/tests/[id]')).toBe(false);
		expect(isPublicRoute('/')).toBe(false);
	});
});

describe('loginUrl', () => {
	it('remembers where the user was going', () => {
		expect(loginUrl(new URL('http://x/tests/abc?mode=exam'))).toBe(
			'/login?redirectTo=%2Ftests%2Fabc%3Fmode%3Dexam'
		);
	});

	it('skips redirectTo for the home page', () => {
		expect(loginUrl(new URL('http://x/'))).toBe('/login');
	});
});

describe('afterLoginUrl', () => {
	it('returns same-site paths as they are', () => {
		expect(afterLoginUrl('/tests/abc?mode=exam')).toBe('/tests/abc?mode=exam');
	});

	it('falls back to /tests for missing or off-site targets', () => {
		for (const target of [null, '', 'tests', 'https://evil.example', '//evil.example', '/\\evil']) {
			expect(afterLoginUrl(target)).toBe('/tests');
		}
	});
});
