<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import Icon from './Icon.svelte';

	let {
		href,
		children,
		class: className
	}: { href: string; children: Snippet; class?: ClassValue } = $props();
</script>

<a
	{href}
	class={[
		'-ml-1 inline-flex h-11 min-w-0 items-center gap-1 self-start text-[15px] font-medium text-link',
		className
	]}
>
	<Icon name="chevron-left" />
	<span class="truncate">{@render children()}</span>
</a>
