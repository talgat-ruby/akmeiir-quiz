<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { children } = $props();
</script>

<div class="min-h-dvh bg-gray-50 text-gray-900">
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
		<div class="mx-auto flex h-14 max-w-2xl items-center px-4">
			<a href={resolve('/(app)/tests')} class="text-lg font-semibold">{m.app_name()}</a>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
		{@render children()}
	</main>
</div>
