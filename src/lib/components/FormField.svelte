<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { label, hint, ...input }: { label: string; hint?: string } & HTMLInputAttributes = $props();
</script>

<label class="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
	{label}
	<input {...input} class="h-12 field font-normal" />
	{#if hint}
		<span class="text-[13px] font-normal text-muted">{hint}</span>
	{/if}
</label>
