import { hashPassword as hashScrypt } from 'better-auth/crypto';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.ts';

describe('passwords', () => {
	it('verifies the right password and rejects a wrong one', async () => {
		const hash = await hashPassword('correct-horse-1');
		expect(hash).toMatch(/^pbkdf2-sha256\$40000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
		expect(await verifyPassword({ password: 'correct-horse-1', hash })).toBe(true);
		expect(await verifyPassword({ password: 'correct-horse-2', hash })).toBe(false);
	});

	it('salts every hash', async () => {
		expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
	});

	it('still accepts passwords hashed before the switch (Better Auth scrypt)', async () => {
		const hash = await hashScrypt('correct-horse-1');
		expect(await verifyPassword({ password: 'correct-horse-1', hash })).toBe(true);
		expect(await verifyPassword({ password: 'wrong-password', hash })).toBe(false);
	});

	it('rejects malformed hashes', async () => {
		for (const hash of ['pbkdf2-sha256$x$00$00', 'pbkdf2-sha256$1000', 'pbkdf2-sha256$0$00$00']) {
			expect(await verifyPassword({ password: 'anything', hash })).toBe(false);
		}
	});
});
