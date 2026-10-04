<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>{data.test.title} · {m.app_name()}</title>
</svelte:head>

<a
	href={resolve('/(app)/tests')}
	class="-ml-2 inline-flex min-h-12 items-center px-2 text-sm font-medium text-blue-700"
>
	← {m.back_to_tests()}
</a>

<article class="mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
	<h1 class="text-xl font-bold break-words">{data.test.title}</h1>
	{#if data.test.description}
		<p class="mt-2 break-words whitespace-pre-line text-gray-700">{data.test.description}</p>
	{/if}
	<p class="mt-3 text-sm text-gray-500">{m.question_count({ count: data.test.questionCount })}</p>
</article>

{#if data.unfinishedAttemptId}
	<p>
		<a href={resolve('/(app)/attempts/[id]', { id: data.unfinishedAttemptId })}>
			{m.continue_attempt()}
		</a>
	</p>
{/if}

<form method="POST">
	<p>
		<label>
			{m.setup_question_count()}
			<input
				type="number"
				name="questionCount"
				min="1"
				max={data.test.questionCount}
				value={form?.questionCount ?? data.defaultQuestionCount}
				inputmode="numeric"
				required
			/>
		</label>
	</p>
	<p>
		<label>
			<input type="checkbox" name="random" checked={form?.random ?? true} />
			{m.setup_random()}
		</label>
	</p>
	{#if form?.message}
		<p role="alert">{form.message}</p>
	{/if}

	<button
		type="submit"
		class="mt-6 min-h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-semibold text-white disabled:opacity-50"
	>
		{m.start_test()}
	</button>
</form>
