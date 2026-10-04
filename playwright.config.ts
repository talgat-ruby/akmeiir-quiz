import { defineConfig, devices } from '@playwright/test';
import { E2E_DATABASE_URL, E2E_PORT } from './e2e/env.ts';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}',
	// One SQLite file is shared by all tests, so run them one at a time.
	workers: 1,
	use: { ...devices['Pixel 7'], baseURL: `http://localhost:${E2E_PORT}` },
	webServer: {
		// A fresh database every run: migrate, seed the sample test, then build and serve the app.
		command:
			'rm -f e2e.db && pnpm db:migrate && pnpm db:seed && pnpm build && pnpm preview --strictPort',
		port: E2E_PORT,
		env: { DATABASE_URL: E2E_DATABASE_URL, ORIGIN: `http://localhost:${E2E_PORT}` }
	}
});
