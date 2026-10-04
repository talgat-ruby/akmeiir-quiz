<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import LocaleSwitcher from '#lib/components/LocaleSwitcher.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { data, children } = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<!-- On a phone, an attempt in progress has its own header (test, timer, progress) instead. -->
	<header
		class={[
			'sticky top-0 z-20 border-b border-line bg-surface',
			page.data.hideAppHeaderOnPhone && 'max-md:hidden'
		]}
	>
		<div
			class="mx-auto flex h-14 max-w-2xl items-center gap-2 pr-2 pl-4 md:h-16 md:max-w-[1200px] md:gap-5 md:px-8"
		>
			<a
				href={resolve('/(app)/tests')}
				class="flex items-center gap-2 text-[17px] font-bold md:gap-2.5 md:text-lg"
			>
				<span
					aria-hidden="true"
					class="grid size-7 place-items-center rounded-lg bg-primary text-[15px] text-on-accent md:size-8 md:rounded-[9px] md:text-base"
				>
					A
				</span>
				{m.app_name()}
			</a>
			<div class="ml-auto md:hidden">
				<LocaleSwitcher variant="select" />
			</div>
			<div class="ml-auto max-md:hidden">
				<LocaleSwitcher variant="inline" />
			</div>
			<p class="flex min-w-0 items-center gap-2 text-sm text-ink-soft max-md:hidden">
				<span class="truncate" title={data.user.email}>{data.user.name}</span>
				{#if data.user.isAdmin}
					<span class="pill bg-attention-soft text-attention">{m.admin_badge()}</span>
				{/if}
			</p>
			<form method="POST" action={resolve('/(auth)/logout')}>
				<button
					type="submit"
					title={m.logout()}
					class="grid size-11 cursor-pointer place-items-center rounded-lg text-muted hover:bg-ground hover:text-ink md:flex md:h-10 md:w-auto md:gap-1.5 md:rounded-[10px] md:border md:border-line md:bg-surface md:px-3 md:text-sm md:text-ink-soft"
				>
					<Icon name="log-out" size={20} class="md:size-4" />
					<span class="max-md:sr-only">{m.logout()}</span>
				</button>
			</form>
		</div>
	</header>

	<main
		class="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:max-w-[1200px] md:gap-5 md:px-8 md:pt-8 md:pb-16"
	>
		{@render children()}
	</main>
</div>
