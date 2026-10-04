import { building } from '$app/env';
import { redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.ts';
import { isPublicRoute, loginUrl } from '#lib/server/auth-guard.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { type Handle, sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';

const handleParaglide: Handle = ({ event, resolve }) => paraglideMiddleware(event.request, ({ request, locale }) => {
	return resolve({ ...event, request }, {
		transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale).replace('%paraglide.dir%', getTextDirection(locale))
	});
});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// Every page except the (auth) group requires a signed-in user.
const handleAuthGuard: Handle = ({ event, resolve }) => {
	if (!event.locals.user && !isPublicRoute(event.route.id)) {
		redirect(303, loginUrl(event.url));
	}
	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleBetterAuth, handleAuthGuard);
