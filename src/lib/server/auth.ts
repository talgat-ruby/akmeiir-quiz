import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { admin } from 'better-auth/plugins/admin';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.ts';
import { MIN_PASSWORD_LENGTH } from '#lib/auth-rules.ts';

export const auth = betterAuth({
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true, minPasswordLength: MIN_PASSWORD_LENGTH },
	plugins: [
		admin(), // adds user.role ('user' by default); promote with `pnpm make-admin <email>`
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
