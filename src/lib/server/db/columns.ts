import { text } from 'drizzle-orm/sqlite-core';

/** Text primary key filled with a random UUID. */
export const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
