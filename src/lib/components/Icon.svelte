<script lang="ts" module>
	// Feather icons (MIT), as path data: https://feathericons.com
	const icons = {
		alert: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z', 'M12 8v4', 'M12 16h.01'],
		check: ['M20 6 9 17l-5-5'],
		'chevron-down': ['m6 9 6 6 6-6'],
		'chevron-left': ['m15 18-6-6 6-6'],
		'chevron-right': ['m9 18 6-6-6-6'],
		clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'M12 7v5l3 2'],
		file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'],
		history: ['M1 4v6h6', 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10'],
		'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
		play: ['M6 4l14 8-14 8z'],
		upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
		x: ['M18 6 6 18', 'm6 6 12 12']
	} satisfies Record<string, string[]>;

	export type IconName = keyof typeof icons;
</script>

<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	let {
		name,
		size = 18,
		strokeWidth = 2,
		class: className
	}: { name: IconName; size?: number; strokeWidth?: number; class?: ClassValue } = $props();
</script>

<!-- Decorative: the text next to an icon always says what it means. -->
<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class={['flex-none', className]}
>
	{#each icons[name] as d (d)}
		<path {d} />
	{/each}
</svg>
