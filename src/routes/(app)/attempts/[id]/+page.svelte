<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RevealedAnswers from '#lib/components/RevealedAnswers.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
	let submitting = $state(false);

	const testUrl = $derived(resolve('/(app)/tests/[id]', { id: data.attempt.testId }));
	const attemptUrl = $derived(resolve('/(app)/attempts/[id]', { id: data.attempt.id }));
	const questionUrl = (position: number) => `${attemptUrl}?q=${position + 1}`;

	const submit = () => {
		submitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			submitting = false;
		};
	};

	// Exam countdown. The server is the judge: at zero we reload, and it finishes the attempt.
	const serverSecondsLeft = $derived(
		data.view === 'exam' || data.view === 'confirm' ? data.secondsLeft : null
	);
	let elapsed = $state(0);
	const secondsLeft = $derived(
		serverSecondsLeft === null ? null : Math.max(0, serverSecondsLeft - elapsed)
	);
	$effect(() => {
		const start = serverSecondsLeft;
		if (start === null) return;
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

	const clock = (seconds: number) =>
		`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
</script>

<svelte:head>
	<title>{data.attempt.testTitle} · {m.app_name()}</title>
</svelte:head>

<p><a href={testUrl}>← {data.attempt.testTitle}</a></p>

{#if secondsLeft !== null}
	<p role="timer">{m.time_left({ time: clock(secondsLeft) })}</p>
{/if}

{#if data.view === 'question'}
	{@const q = data.current}
	<p>{m.question_progress({ n: q.position + 1, total: data.attempt.total })}</p>
	<h1>{q.text}</h1>

	<form method="POST" action="?/answer" use:enhance={submit}>
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
	<RevealedAnswers answers={q.answers} />
	<p>
		<a href={attemptUrl}>{data.attempt.finished ? m.see_results() : m.next_question()}</a>
	</p>
{:else if data.view === 'exam'}
	{@const q = data.current}
	<p>{m.question_progress({ n: q.position + 1, total: data.attempt.total })}</p>
	<h1>{q.text}</h1>

	<form method="POST" action="?/save" use:enhance={submit}>
		<input type="hidden" name="position" value={q.position} />
		<fieldset>
			<legend>{q.multiple ? m.select_all() : m.select_one()}</legend>
			{#each q.answers as a (a.id)}
				<p>
					<label>
						<input
							type={q.multiple ? 'checkbox' : 'radio'}
							name="answer"
							value={a.id}
							checked={q.selected.includes(a.id)}
						/>
						{a.text}
					</label>
				</p>
			{/each}
		</fieldset>
		{#if form?.message}
			<p role="alert">{form.message}</p>
		{/if}
		<p><button type="submit" disabled={submitting}>{m.exam_save()}</button></p>
	</form>

	<p>
		{#if q.position > 0}<a href={questionUrl(q.position - 1)}>{m.exam_previous()}</a>{/if}
		{#if q.position + 1 < data.attempt.total}
			<a href={questionUrl(q.position + 1)}>{m.exam_next()}</a>
		{/if}
	</p>

	<nav aria-labelledby="all-questions">
		<h2 id="all-questions">{m.exam_questions()}</h2>
		<ol>
			{#each data.questions as item (item.position)}
				<li>
					<a
						href={questionUrl(item.position)}
						aria-current={item.position === q.position ? 'step' : undefined}
					>
						{m.question_number({ n: item.position + 1 })}
					</a>
					— {item.answered ? m.exam_answered() : m.exam_not_answered()}
				</li>
			{/each}
		</ol>
	</nav>

	<p><a href={`${attemptUrl}?finish`}>{m.exam_finish()}</a></p>
{:else if data.view === 'confirm'}
	{@const unanswered = data.questions.filter((x) => !x.answered)}
	<h1>{m.exam_finish_title()}</h1>
	<p>{m.exam_finish_summary({ answered: data.attempt.answered, total: data.attempt.total })}</p>
	{#if unanswered.length > 0}
		<p>{m.exam_unanswered()}</p>
		<ul>
			{#each unanswered as item (item.position)}
				<li>
					<a href={questionUrl(item.position)}>{m.question_number({ n: item.position + 1 })}</a>
				</li>
			{/each}
		</ul>
	{/if}
	<form method="POST" action="?/finish" use:enhance={submit}>
		<button type="submit" disabled={submitting}>{m.exam_finish_confirm()}</button>
	</form>
	<p><a href={attemptUrl}>{m.exam_back()}</a></p>
{:else}
	{@const { correct, total } = data.attempt}
	<h1>{m.results_title()}</h1>
	<p>{m.score({ correct, total, percent: total ? Math.round((correct / total) * 100) : 0 })}</p>

	{#if data.attempt.mode === 'exam'}
		<h2>{m.review_title()}</h2>
		{#each data.mistakes as q (q.position)}
			<section>
				<h3>{m.question_number({ n: q.position + 1 })}: {q.text}</h3>
				{#if !q.answered}<p><em>{m.review_not_answered()}</em></p>{/if}
				<RevealedAnswers answers={q.answers} />
			</section>
		{:else}
			<p>{m.review_none()}</p>
		{/each}
	{/if}

	<p><a href={testUrl}>{m.back_to_test()}</a></p>
{/if}
