import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'The database connection string.' },
	DATABASE_AUTH_TOKEN: {
		description: 'Auth token for the [Turso](https://turso.tech) database.'
	},
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description: 'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	}
});
