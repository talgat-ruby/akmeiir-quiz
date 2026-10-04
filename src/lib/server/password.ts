import { constantTimeEqual, verifyPassword as verifyScrypt } from 'better-auth/crypto';

/*
 * Password hashing that fits Cloudflare Workers' free plan, which allows 10 ms of CPU per
 * request: PBKDF2-SHA256 through Web Crypto, which runs natively. Better Auth's default scrypt
 * takes about 40 ms. The trade-off: OWASP suggests 600,000 iterations for PBKDF2; this uses far
 * fewer to stay inside the limit (Workers also cap PBKDF2 at 100,000).
 *
 * Stored as `pbkdf2-sha256$<iterations>$<salt>$<hash>` (hex), so the count can be raised later
 * without breaking existing passwords.
 */
const ALGORITHM = 'pbkdf2-sha256';
const ITERATIONS = 40_000;

const toHex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
		key,
		256
	);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const hash = await derive(password, salt, ITERATIONS);
	return [ALGORITHM, ITERATIONS, toHex(salt), toHex(hash)].join('$');
}

export async function verifyPassword({
	password,
	hash
}: {
	password: string;
	hash: string;
}): Promise<boolean> {
	const [algorithm, iterations, salt, expected] = hash.split('$');
	// Accounts created before the switch keep Better Auth's scrypt hash (`salt:key`).
	if (algorithm !== ALGORITHM) return verifyScrypt({ password, hash });

	const count = Number(iterations);
	if (!Number.isInteger(count) || count < 1 || !salt || !expected) return false;
	return constantTimeEqual(await derive(password, fromHex(salt), count), fromHex(expected));
}
