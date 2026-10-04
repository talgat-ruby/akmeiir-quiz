<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let { children, class: className }: { children: Snippet; class?: ClassValue } = $props();
</script>

<!--
	The page's main actions. On a phone they stick to the bottom of the screen, within thumb
	reach; on wider screens they simply follow the content. The negative margins undo the
	padding of the layout's <main>.
-->
<div
	class={[
		'sticky bottom-0 z-10 -mx-4 mt-auto -mb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
		'md:static md:mx-0 md:mt-0 md:mb-0 md:border-0 md:bg-transparent md:p-0',
		className
	]}
>
	{@render children()}
</div>
