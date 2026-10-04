<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js';
	import Icon from './Icon.svelte';

	/**
	 * `buttons`: one wide button per language (login, register). `inline`: small buttons for the
	 * desktop header. `select`: a compact select for the phone header.
	 */
	let { variant = 'buttons' }: { variant?: 'buttons' | 'inline' | 'select' } = $props();

	// Each language is named in itself, so it is recognisable whatever the current language.
	const names: Record<Locale, string> = {
		en: 'English',
		kk: 'Қазақша',
		ru: 'Русский'
	};
	const current = getLocale();
</script>

<!-- The choice is kept in a cookie; setLocale stores it and reloads the page. -->
{#if variant === 'select'}
	<span class="relative inline-flex">
		<select
			aria-label={m.language()}
			value={current}
			onchange={(e) => setLocale(e.currentTarget.value as Locale)}
			class="h-9 cursor-pointer appearance-none rounded-[10px] border border-line bg-surface pr-8 pl-2.5 text-sm text-ink"
		>
			{#each locales as locale (locale)}
				<option value={locale} lang={locale}>{names[locale]}</option>
			{/each}
		</select>
		<Icon
			name="chevron-down"
			size={16}
			class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted"
		/>
	</span>
{:else}
	<nav
		aria-label={m.language()}
		class={variant === 'inline'
			? 'flex gap-0.5 rounded-[10px] bg-track p-[3px]'
			: 'grid grid-cols-3 gap-1 rounded-xl bg-track p-1'}
	>
		{#each locales as locale (locale)}
			<button
				type="button"
				lang={locale}
				aria-pressed={locale === current}
				onclick={() => setLocale(locale)}
				class={[
					'cursor-pointer text-ink-soft aria-pressed:bg-surface aria-pressed:font-semibold aria-pressed:text-ink aria-pressed:shadow-sm',
					variant === 'inline'
						? 'h-8 rounded-lg px-3 text-[13px]'
						: 'h-10 rounded-[9px] text-sm font-medium'
				]}
			>
				{names[locale]}
			</button>
		{/each}
	</nav>
{/if}
