<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data, children } = $props();
</script>

<div class="min-h-dvh bg-gray-50 text-gray-900">
	<header class="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
		<div class="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
			<a href={resolve('/(app)/tests')} class="shrink-0 text-lg font-semibold">{m.app_name()}</a>

			<div class="ml-auto flex min-w-0 items-center gap-2">
				{#if data.user.isAdmin}
					<span
						class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
					>
						{m.admin_badge()}
					</span>
				{/if}
				<span class="min-w-0 truncate text-sm text-gray-600" title={data.user.email}>
					{data.user.name}
				</span>
				<form method="POST" action={resolve('/(auth)/logout')} class="shrink-0">
					<button
						type="submit"
						class="min-h-10 rounded-lg px-3 text-sm font-medium text-blue-700 active:bg-gray-100"
					>
						{m.logout()}
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
		{@render children()}
	</main>
</div>
