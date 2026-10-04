import { error, redirect } from '@sveltejs/kit';
import { m } from '#lib/paraglide/messages.js';

const DEFAULT_AFTER_LOGIN = '/tests';

/** The signed-in user in a protected route (the hook already redirected anonymous users). */
export function requireUser(locals: App.Locals): NonNullable<App.Locals['user']> {
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

/** The signed-in user if they are an admin; everyone else gets a 403. */
export function requireAdmin(locals: App.Locals): NonNullable<App.Locals['user']> {
	const user = requireUser(locals);
	if (user.role !== 'admin') error(403, m.admin_only());
	return user;
}

/**
 * Routes anyone may open without signing in: the `(auth)` group (login, register, logout).
 * `null` is an unknown URL — let it fall through to the 404 page.
 */
export function isPublicRoute(routeId: string | null): boolean {
	return routeId === null || routeId.startsWith('/(auth)/');
}

/** `/login?redirectTo=…` so the user lands back where they were going. */
export function loginUrl(url: URL): string {
	const target = url.pathname + url.search;
	return target === '/' ? '/login' : `/login?redirectTo=${encodeURIComponent(target)}`;
}

/** Only same-site paths, so a crafted link can't send users to another site after login. */
export function afterLoginUrl(redirectTo: string | null): string {
	if (!redirectTo || !redirectTo.startsWith('/') || /^\/[/\\]/.test(redirectTo)) {
		return DEFAULT_AFTER_LOGIN;
	}
	return redirectTo;
}
