<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	/** Seconds left when the page was loaded. */
	let { seconds }: { seconds: number } = $props();

	// The server is the judge: at zero we reload, and it finishes the attempt.
	let elapsed = $state(0);
	const left = $derived(Math.max(0, seconds - elapsed));
	$effect(() => {
		const start = seconds;
		elapsed = 0;
		const startedAt = Date.now();
		const timer = setInterval(() => {
			elapsed = Math.floor((Date.now() - startedAt) / 1000);
			if (elapsed > start) {
				clearInterval(timer);
				invalidateAll();
			}
		}, 1000);
		return () => clearInterval(timer);
	});

	const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<!-- The last minute is highlighted. -->
<p
	role="timer"
	class={[
		'inline-flex h-8 flex-none items-center gap-1.5 rounded-full px-3 text-sm tabular-nums',
		left > 60
			? 'bg-ink font-semibold text-surface'
			: 'border border-attention-line bg-attention-soft font-bold text-attention'
	]}
>
	<Icon name="clock" size={16} />
	{m.time_left({ time: clock(left) })}
</p>
