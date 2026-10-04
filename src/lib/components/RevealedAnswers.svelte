<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	type Answer = { id: string; text: string; correct: boolean; selected: boolean };

	/** `compact`: the smaller list of the mistakes review. */
	let { answers, compact = false }: { answers: Answer[]; compact?: boolean } = $props();

	const label = (a: Answer) =>
		[a.selected && m.your_answer(), a.correct && m.correct_answer()].filter(Boolean).join(' · ');
</script>

<!-- Right and wrong are never shown by color alone: there is always a ✓/✗ mark and a label. -->
<ul
	class={[
		'flex flex-col',
		compact
			? 'gap-1.5 text-[15px]'
			: 'gap-2.5 md:grid md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] md:gap-3'
	]}
>
	{#each answers as a (a.id)}
		{@const tone = a.correct ? 'correct' : a.selected ? 'wrong' : null}
		<li
			class={[
				'flex items-center',
				compact ? 'gap-2.5 rounded-xl px-3 py-2.5' : 'min-h-14 gap-3 rounded-2xl border px-4 py-3',
				compact && tone === 'correct' && 'border border-correct-soft-line bg-correct-soft',
				compact && tone === 'wrong' && 'border border-wrong-soft-line bg-wrong-soft',
				compact && !tone && 'pl-10 text-muted',
				!compact &&
					tone === 'correct' &&
					'border-correct-line bg-correct-soft ring-1 ring-correct-line',
				!compact && tone === 'wrong' && 'border-wrong-line bg-wrong-soft ring-1 ring-wrong-line',
				!compact && !tone && 'border-line bg-surface text-muted'
			]}
		>
			{#if compact}
				{#if tone}
					<Icon
						name={tone === 'correct' ? 'check' : 'x'}
						strokeWidth={3}
						class={tone === 'correct' ? 'text-correct' : 'text-wrong'}
					/>
				{/if}
			{:else}
				<span
					class={[
						'grid size-5.5 flex-none place-items-center rounded-full text-on-accent',
						tone === 'correct' && 'bg-correct-strong',
						tone === 'wrong' && 'bg-wrong-strong',
						!tone && 'border-2 border-line-strong'
					]}
				>
					{#if tone}
						<Icon name={tone === 'correct' ? 'check' : 'x'} size={13} strokeWidth={3.5} />
					{/if}
				</span>
			{/if}
			<span class="min-w-0 flex-1 break-words">{a.text}</span>
			{#if tone}
				<span
					class={[
						'flex-none text-xs font-semibold',
						tone === 'correct' ? 'text-correct' : 'text-wrong'
					]}
				>
					{label(a)}
				</span>
			{/if}
		</li>
	{/each}
</ul>
