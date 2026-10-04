import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every language must have every message, with the same {placeholders} as English.

const load = (locale: string): Record<string, string> => {
	const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
	delete messages.$schema;
	return messages;
};
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = load('en');

describe.each(['kk', 'ru'])('messages/%s.json', (locale) => {
	const translated = load(locale);

	it('has exactly the English keys', () => {
		expect(Object.keys(translated).sort()).toEqual(Object.keys(en).sort());
	});

	it('keeps every placeholder and leaves nothing empty', () => {
		for (const [key, text] of Object.entries(en)) {
			expect(translated[key]?.trim(), key).toBeTruthy();
			expect(placeholders(translated[key] ?? ''), key).toEqual(placeholders(text));
		}
	});
});
