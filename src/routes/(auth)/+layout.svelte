<script lang="ts">
	import LocaleSwitcher from '#lib/components/LocaleSwitcher.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col items-center gap-6 px-4 py-6">
	<div class="w-full max-w-sm">
		<LocaleSwitcher variant="buttons" />
	</div>
	<div class="mt-8 flex flex-col items-center gap-3">
		<span
			aria-hidden="true"
			class="grid size-14 place-items-center rounded-2xl bg-primary text-[28px] font-bold text-on-accent"
		>
			A
		</span>
		<p class="text-xl font-bold">{m.app_name()}</p>
	</div>
	<main class="flex w-full max-w-sm flex-col gap-4.5 card rounded-[20px] px-5 py-6">
		{@render children()}
	</main>
</div>
