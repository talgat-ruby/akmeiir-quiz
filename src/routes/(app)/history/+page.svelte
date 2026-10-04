<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();

	const modeName = {
		practice: m.mode_name_practice,
		exam: m.mode_name_exam,
		mistakes: m.mode_name_mistakes
	};
	const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head>
	<title>{m.history_title()} · {m.app_name()}</title>
</svelte:head>

<h1>{m.history_title()}</h1>

<ul>
	{#each data.attempts as a (a.id)}
		<li>
			<a href={resolve('/(app)/attempts/[id]', { id: a.id })}>{a.testTitle}</a>
			— {modeName[a.mode]()} —
			<time datetime={a.startedAt.toISOString()}>{when.format(a.startedAt)}</time>
			—
			{#if a.finished}
				{m.history_score({
					correct: a.correct,
					total: a.total,
					percent: a.total ? Math.round((a.correct / a.total) * 100) : 0
				})}
			{:else}
				{m.history_in_progress({ answered: a.answered, total: a.total })}
			{/if}
		</li>
	{:else}
		<li>{m.history_empty()}</li>
	{/each}
</ul>
