<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div
	role="alert"
	class="flex items-start gap-2 rounded-xl border border-wrong-soft-line bg-wrong-soft p-3 text-sm text-wrong"
>
	<Icon name="alert" class="mt-px" />
	<div class="min-w-0 flex-1">{@render children()}</div>
</div>
