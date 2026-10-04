// Inserts a small sample test so the pages have something to show.
// Run with `pnpm db:seed` (plain Node; reads DATABASE_URL from .env). Safe to run repeatedly.
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { TestRepo, type NewTest } from '#lib/server/db/test-repo.ts';
import { test } from '#lib/server/db/tests.schema.ts';

const SAMPLE: NewTest = {
	title: 'Sample test',
	description: 'A tiny test to try the app with until real tests are imported.',
	questions: [
		{
			text: 'Which planet is known as the Red Planet?',
			answers: [
				{ text: 'Venus', correct: false },
				{ text: 'Mars', correct: true },
				{ text: 'Jupiter', correct: false },
				{ text: 'Mercury', correct: false }
			]
		},
		{
			text: 'Which of these are primary colors of light? (Select all that apply)',
			answers: [
				{ text: 'Red', correct: true },
				{ text: 'Green', correct: true },
				{ text: 'Blue', correct: true },
				{ text: 'Yellow', correct: false }
			]
		},
		{
			text: 'Дәріхана ыдыстарындағы жуғыш заттарының толық жуылғанын анықтау үшін қолданылады.',
			answers: [
				{ text: 'Метил қызыл', correct: false },
				{ text: 'Лакмус', correct: false },
				{ text: 'Фенолфталеин', correct: true },
				{ text: 'Тимол көк', correct: false }
			]
		}
	]
};

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const db = drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }));

const [existing] = await db.select({ id: test.id }).from(test).where(eq(test.title, SAMPLE.title));
if (existing) {
	console.log(`"${SAMPLE.title}" already exists (${existing.id}), nothing to do.`);
} else {
	const id = await new TestRepo(db).create(SAMPLE);
	console.log(`Inserted "${SAMPLE.title}" (${id}).`);
}
