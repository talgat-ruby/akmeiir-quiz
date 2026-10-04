import { m } from '#lib/paraglide/messages.js';

export type Mode = 'practice' | 'exam' | 'mistakes';

const names = {
	practice: m.mode_name_practice,
	exam: m.mode_name_exam,
	mistakes: m.mode_name_mistakes
};

/** The attempt mode's name in the current language. */
export const modeName = (mode: Mode): string => names[mode]();
