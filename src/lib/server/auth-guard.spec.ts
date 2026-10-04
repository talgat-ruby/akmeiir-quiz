import { describe, it, expect } from 'vitest';
import { afterLoginUrl, isPublicRoute, loginUrl, requireAdmin } from './auth-guard.ts';

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

describe('requireAdmin', () => {
	const locals = (role?: string) =>
		(role === undefined ? {} : { user: { id: 'u1', role } }) as unknown as App.Locals;
	const thrown = (fn: () => unknown) => {
		try {
			fn();
		} catch (e) {
			return e as { status?: number; location?: string };
		}
		return undefined;
	};

	it('lets admins through', () => {
		expect(requireAdmin(locals('admin')).id).toBe('u1');
	});

	it('refuses other users with 403', () => {
		expect(thrown(() => requireAdmin(locals('user')))?.status).toBe(403);
	});

	it('sends anonymous users to log in', () => {
		expect(thrown(() => requireAdmin(locals()))).toMatchObject({ status: 303, location: '/login' });
	});
});
