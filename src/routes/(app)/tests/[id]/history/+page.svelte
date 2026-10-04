<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();

	const modeName = {
		practice: m.mode_name_practice,
		exam: m.mode_name_exam,
		mistakes: m.mode_name_mistakes
	};
	const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	const percent = (correct: number, total: number) =>
		total ? Math.round((correct / total) * 100) : 0;
</script>

<svelte:head>
	<title>{m.history_title()} · {data.test.title} · {m.app_name()}</title>
</svelte:head>

<p><a href={resolve('/(app)/tests')}>← {m.back_to_tests()}</a></p>

<h1>{m.history_of({ title: data.test.title })}</h1>

{#if form?.message}
	<p role="alert">{form.message}</p>
{/if}

<ul>
	{#each data.attempts as a (a.id)}
		{@const mistakes = a.total - a.correct}
		<li>
			<p>
				{modeName[a.mode]()} —
				<time datetime={a.startedAt.toISOString()}>{when.format(a.startedAt)}</time>
				—
				{#if a.finished}
					{m.history_score({
						correct: a.correct,
						total: a.total,
						percent: percent(a.correct, a.total)
					})}
				{:else}
					{m.history_in_progress({ answered: a.answered, total: a.total })}
				{/if}
			</p>
			<p>
				<a href={resolve('/(app)/attempts/[id]', { id: a.id })}>
					{a.finished ? m.history_open() : m.continue_attempt()}
				</a>
			</p>
			{#if a.finished}
				<form method="POST" action="?/redo">
					<input type="hidden" name="attemptId" value={a.id} />
					<button type="submit" name="scope" value="all">{m.redo_all()}</button>
					{#if mistakes > 0}
						<button type="submit" name="scope" value="mistakes">
							{m.redo_mistakes({ count: mistakes })}
						</button>
					{/if}
				</form>
			{/if}
		</li>
	{:else}
		<li>{m.history_empty()}</li>
	{/each}
</ul>
