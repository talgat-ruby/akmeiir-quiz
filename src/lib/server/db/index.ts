import { drizzle } from 'drizzle-orm/libsql/web';
import * as schema from './schema';
import { AttemptRepo } from './attempt-repo.ts';
import { TestRepo } from './test-repo.ts';
import { DATABASE_URL, DATABASE_AUTH_TOKEN } from '$app/env/private';

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const isLocalFile = DATABASE_URL.startsWith('file:');
// Only Turso needs a token; a local file database has none.
if (!isLocalFile && !DATABASE_AUTH_TOKEN) throw new Error('DATABASE_AUTH_TOKEN is not set');

// A local file (dev, tests) needs the native SQLite driver. Turso is reached over HTTP, which also
// works where native code can't run, like Cloudflare Workers.
const { createClient } = isLocalFile
	? await import('@libsql/client')
	: await import('@libsql/client/web');
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });

export const db = drizzle(client, { schema });

export const testRepo = new TestRepo(db);
export const attemptRepo = new AttemptRepo(db);
export type { NewTest, TestSummary } from './test-repo.ts';
export { AnswerError, type AttemptMode, type TestStats } from './attempt-repo.ts';
