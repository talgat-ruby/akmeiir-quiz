<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
	let submitting = $state(false);

	const testUrl = $derived(resolve('/(app)/tests/[id]', { id: data.attempt.testId }));
	const attemptUrl = $derived(resolve('/(app)/attempts/[id]', { id: data.attempt.id }));
</script>

<svelte:head>
	<title>{data.attempt.testTitle} · {m.app_name()}</title>
</svelte:head>

<p><a href={testUrl}>← {data.attempt.testTitle}</a></p>

{#if data.view === 'question'}
	{@const q = data.current}
	<p>{m.question_progress({ n: q.position + 1, total: data.attempt.total })}</p>
	<h1>{q.text}</h1>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<input type="hidden" name="position" value={q.position} />

		{#if q.multiple}
			<fieldset>
				<legend>{m.select_all()}</legend>
				{#each q.answers as a (a.id)}
					<p>
						<label><input type="checkbox" name="answer" value={a.id} /> {a.text}</label>
					</p>
				{/each}
			</fieldset>
			<p><button type="submit" disabled={submitting}>{m.check_answer()}</button></p>
		{:else}
			<ul>
				{#each q.answers as a (a.id)}
					<li>
						<button type="submit" name="answer" value={a.id} disabled={submitting}>
							{a.text}
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if form?.message}
			<p role="alert">{form.message}</p>
		{/if}
	</form>
{:else if data.view === 'feedback'}
	{@const q = data.answered}
	<p>{m.question_progress({ n: q.position + 1, total: data.attempt.total })}</p>
	<h1>{q.text}</h1>
	<p role="status"><strong>{q.correct ? m.feedback_correct() : m.feedback_wrong()}</strong></p>

	<ul>
		{#each q.answers as a (a.id)}
			<li>
				{a.correct ? '✓' : a.selected ? '✗' : '·'}
				{a.text}
				{#if a.selected}<em>({m.your_answer()})</em>{/if}
				{#if a.correct}<strong>({m.correct_answer()})</strong>{/if}
			</li>
		{/each}
	</ul>

	<p>
		<a href={attemptUrl}>{data.attempt.finished ? m.see_results() : m.next_question()}</a>
	</p>
{:else}
	{@const { correct, total } = data.attempt}
	<h1>{m.results_title()}</h1>
	<p>{m.score({ correct, total, percent: total ? Math.round((correct / total) * 100) : 0 })}</p>
	<p><a href={testUrl}>{m.back_to_test()}</a></p>
{/if}
