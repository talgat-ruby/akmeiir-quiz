<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js';

	// Each language is named in itself, so it is recognisable whatever the current language.
	const names: Record<Locale, string> = {
		en: 'English',
		kk: 'Қазақша',
		ru: 'Русский'
	};
	const current = getLocale();
</script>

<!-- The choice is kept in a cookie; setLocale stores it and reloads the page. -->
<nav aria-label={m.language()}>
	{#each locales as locale (locale)}
		<button
			type="button"
			lang={locale}
			aria-pressed={locale === current}
			onclick={() => setLocale(locale)}
		>
			{names[locale]}
		</button>
	{/each}
</nav>
