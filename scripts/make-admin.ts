// Gives a registered user the admin role.
// Usage: pnpm make-admin <email>   (plain Node; reads DATABASE_URL from .env)
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { user } from '#lib/server/db/auth.schema.ts';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
	console.error('Usage: pnpm make-admin <email>');
	process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }));

const [updated] = await db
	.update(user)
	.set({ role: 'admin' })
	.where(eq(user.email, email))
	.returning({ name: user.name, email: user.email });

if (!updated) {
	console.error(`No user with email ${email}. They need to register first.`);
	process.exit(1);
}
console.log(`${updated.name} <${updated.email}> is now an admin.`);
