import { APIError } from 'better-auth/api';
import { m } from '#lib/paraglide/messages.js';
import { MIN_PASSWORD_LENGTH } from '#lib/auth-rules.ts';

/** Turn a failed sign-in/sign-up into an HTTP status and a message we can show on the form. */
export function authFailure(error: unknown): { status: number; message: string } {
	if (!(error instanceof APIError)) {
		console.error(error);
		return { status: 500, message: m.auth_error_generic() };
	}

	switch (error.body?.code) {
		case 'INVALID_EMAIL_OR_PASSWORD':
			return { status: 400, message: m.auth_error_invalid_credentials() };
		case 'USER_ALREADY_EXISTS':
		case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
			return { status: 400, message: m.auth_error_email_taken() };
		case 'INVALID_EMAIL':
			return { status: 400, message: m.auth_error_invalid_email() };
		case 'PASSWORD_TOO_SHORT':
			return {
				status: 400,
				message: m.auth_error_password_too_short({ min: MIN_PASSWORD_LENGTH })
			};
		case 'PASSWORD_TOO_LONG':
			return { status: 400, message: m.auth_error_password_too_long() };
		default:
			return { status: 400, message: m.auth_error_generic() };
	}
}
