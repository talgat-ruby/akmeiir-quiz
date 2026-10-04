<script lang="ts">
	import LocaleSwitcher from '#lib/components/LocaleSwitcher.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col bg-gray-50 px-4 py-10 text-gray-900">
	<LocaleSwitcher />
	<p class="mb-6 text-center text-lg font-semibold">{m.app_name()}</p>
	<main class="mx-auto w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
		{@render children()}
	</main>
</div>
