<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let {
		answers
	}: { answers: { id: string; text: string; correct: boolean; selected: boolean }[] } = $props();
</script>

<!-- ✓ the correct answers, ✗ a wrong pick, · the rest -->
<ul>
	{#each answers as a (a.id)}
		<li>
			{a.correct ? '✓' : a.selected ? '✗' : '·'}
			{a.text}
			{#if a.selected}<em>({m.your_answer()})</em>{/if}
			{#if a.correct}<strong>({m.correct_answer()})</strong>{/if}
		</li>
	{/each}
</ul>
