<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { label, hint, ...input }: { label: string; hint?: string } & HTMLInputAttributes = $props();
</script>

<!-- text-base (16px) keeps iOS from zooming in when the field gets focus -->
<label class="block">
	<span class="text-sm font-medium text-gray-700">{label}</span>
	<input
		{...input}
		class="mt-1 block min-h-12 w-full rounded-lg border-gray-300 text-base shadow-sm focus:border-blue-500 focus:ring-blue-500"
	/>
	{#if hint}
		<span class="mt-1 block text-xs text-gray-500">{hint}</span>
	{/if}
</label>
