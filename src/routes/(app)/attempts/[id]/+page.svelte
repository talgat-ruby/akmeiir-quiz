<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ActionBar from '#lib/components/ActionBar.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import Countdown from '#lib/components/Countdown.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ModeBadge from '#lib/components/ModeBadge.svelte';
	import QuestionGrid from '#lib/components/QuestionGrid.svelte';
	import RevealedAnswers from '#lib/components/RevealedAnswers.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
	let submitting = $state(false);

	// Practice and mistakes reveal each answer when it is checked; an exam reveals nothing until the end.
	const reveals = $derived(data.attempt.mode !== 'exam');

	const testUrl = $derived(resolve('/(app)/tests/[id]', { id: data.attempt.testId }));
	const historyUrl = $derived(resolve('/(app)/tests/[id]/history', { id: data.attempt.testId }));
	const attemptUrl = $derived(resolve('/(app)/attempts/[id]', { id: data.attempt.id }));
	const finishUrl = $derived(`${attemptUrl}?finish`);
	const questionUrl = (position: number) => `${attemptUrl}?q=${position + 1}`;

	type QuestionStatus = { position: number; answered: boolean; correct?: boolean };

	const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
	const answeredPercent = $derived(percent(data.attempt.answered, data.attempt.total));

	const submit = () => {
		submitting = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			submitting = false;
		};
	};
</script>

<svelte:head>
	<title>{data.attempt.testTitle} · {m.app_name()}</title>
</svelte:head>

<!--
	While the attempt is open. Phone: a sticky header with the test, the timer and where you are.
	Desktop: the test and the timer above the page; the rest is in the question card and sidebar.
-->
{#snippet top(position: number | null, secondsLeft: number | null)}
	<header
		class="sticky top-0 z-20 -mx-4 -mt-5 flex flex-col gap-2 border-b border-line bg-surface px-4 pt-2 pb-3.5 md:static md:m-0 md:border-0 md:bg-transparent md:p-0"
	>
		<div class="flex items-center justify-between gap-2">
			<BackLink href={testUrl}>{data.attempt.testTitle}</BackLink>
			{#if secondsLeft !== null}
				<Countdown seconds={secondsLeft} />
			{/if}
		</div>
		{#if position !== null}
			<div class="flex flex-col gap-2 md:hidden">
				<div class="flex items-center justify-between gap-2">
					<p class="text-[13px] font-medium text-muted">
						{m.question_progress({ n: position + 1, total: data.attempt.total })}
					</p>
					<ModeBadge mode={data.attempt.mode} />
				</div>
				{@render progress('h-1.5')}
			</div>
		{/if}
	</header>
{/snippet}

{#snippet progress(height: string)}
	<div aria-hidden="true" class={['overflow-hidden rounded-full bg-track', height]}>
		<div class="h-full rounded-full bg-primary" style:width="{answeredPercent}%"></div>
	</div>
{/snippet}

{#snippet pager(position: number)}
	{#if position > 0}
		<a href={questionUrl(position - 1)} class="btn-sm btn-secondary">{m.previous()}</a>
	{:else}
		<span class="max-md:block md:hidden"></span>
	{/if}
	{#if position + 1 < data.attempt.total}
		<a href={questionUrl(position + 1)} class="btn-sm btn-secondary">{m.next()}</a>
	{/if}
{/snippet}

<!--
	The question card and the sidebar. Phone: one column, then the bottom bar. Desktop: side by
	side, the sidebar dropping below the card when the window is narrow.
-->
{#snippet layout(position: number, questions: QuestionStatus[], card: Snippet, primary: Snippet)}
	<div class="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:gap-6">
		<div
			class="flex flex-col gap-4 md:min-w-0 md:flex-[999_1_560px] md:gap-5 md:card md:rounded-[20px] md:p-7"
		>
			<p class="text-sm font-medium text-muted max-md:hidden">
				{m.question_progress({ n: position + 1, total: data.attempt.total })}
			</p>
			{@render card()}
			<div class="flex flex-wrap items-center gap-2.5 pt-1 max-md:hidden">
				{@render pager(position)}
				<div class="ml-auto">{@render primary()}</div>
			</div>
		</div>

		<aside
			class="flex flex-col gap-4 md:min-w-0 md:flex-[1_1_300px] md:card md:rounded-[20px] md:p-[22px]"
		>
			<div class="flex flex-col gap-4 max-md:hidden">
				<div class="flex items-center justify-between gap-2">
					<ModeBadge mode={data.attempt.mode} />
					<span class="text-sm text-muted">
						{m.answered_count({ answered: data.attempt.answered, total: data.attempt.total })}
					</span>
				</div>
				{@render progress('h-2')}
			</div>
			<div class="grid grid-cols-2 gap-2.5 md:hidden">{@render pager(position)}</div>
			<QuestionGrid {questions} current={position} href={questionUrl} />
			<a href={finishUrl} class="btn-sm min-h-12 btn-secondary max-md:hidden">{m.finish()}</a>
		</aside>
	</div>

	<ActionBar class="grid grid-cols-[2fr_3fr] gap-2.5 md:hidden">
		<a href={finishUrl} class="btn btn-secondary">{m.finish()}</a>
		{@render primary()}
	</ActionBar>
{/snippet}

{#if data.view === 'question'}
	{@const q = data.current}
	{@render top(q.position, data.secondsLeft)}

	{#snippet card()}
		<h1 class="text-xl/7 font-semibold break-words md:-mt-2 md:text-2xl/[33px]">{q.text}</h1>
		<form id="answer" method="POST" action={reveals ? '?/answer' : '?/save'} use:enhance={submit}>
			<input type="hidden" name="position" value={q.position} />
			<fieldset>
				<legend class="mb-2.5 text-sm text-muted">
					{q.multiple ? m.select_all() : m.select_one()}
				</legend>
				<div
					class="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] md:gap-3"
				>
					{#each q.answers as a (a.id)}
						<label
							class="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-3 has-checked:border-primary has-checked:bg-primary-soft has-checked:ring-1 has-checked:ring-primary"
						>
							<input
								type={q.multiple ? 'checkbox' : 'radio'}
								name="answer"
								value={a.id}
								checked={q.selected.includes(a.id)}
								class="size-5.5 flex-none accent-primary"
							/>
							<span class="min-w-0 flex-1 break-words">{a.text}</span>
						</label>
					{/each}
				</div>
			</fieldset>
			{#if form?.message}
				<div class="mt-4"><Alert>{form.message}</Alert></div>
			{/if}
		</form>
	{/snippet}

	{#snippet primary()}
		<button
			type="submit"
			form="answer"
			disabled={submitting}
			class="btn w-full btn-primary md:min-h-12 md:px-6"
		>
			{reveals ? m.check_answer() : m.save_answer()}
		</button>
	{/snippet}

	{@render layout(q.position, data.questions, card, primary)}
{:else if data.view === 'revealed'}
	{@const q = data.revealed}
	{@const next = data.nextUnanswered}
	{@render top(q.position, data.secondsLeft)}

	{#snippet card()}
		<h1 class="text-xl/7 font-semibold break-words md:-mt-2 md:text-2xl/[33px]">{q.text}</h1>
		<p
			role="status"
			class={[
				'flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 font-bold',
				q.correct ? 'bg-correct-soft text-correct' : 'bg-wrong-soft text-wrong'
			]}
		>
			<span
				class={[
					'grid size-7 place-items-center rounded-full text-on-accent',
					q.correct ? 'bg-correct-strong' : 'bg-wrong-strong'
				]}
			>
				<Icon name={q.correct ? 'check' : 'x'} size={16} strokeWidth={3} />
			</span>
			{q.correct ? m.feedback_correct() : m.feedback_wrong()}
		</p>
		<RevealedAnswers answers={q.answers} />
	{/snippet}

	<!-- Next unanswered question, or Finish when none is left. -->
	{#snippet primary()}
		<a
			href={next !== null ? questionUrl(next) : finishUrl}
			class="btn w-full btn-primary md:min-h-12 md:px-6"
		>
			{next !== null ? m.next_question() : m.finish()}
		</a>
	{/snippet}

	{@render layout(q.position, data.questions, card, primary)}
{:else if data.view === 'confirm'}
	{@const unanswered = data.questions.filter((x) => !x.answered)}
	{@render top(null, data.secondsLeft)}

	<div class="flex flex-1 flex-col gap-4 md:mx-auto md:w-full md:max-w-xl md:flex-none">
		<div class="mt-3 flex flex-col gap-4 card rounded-[20px] px-5 py-6 md:mt-0 md:p-7">
			<h1 class="text-2xl/[30px] font-bold">{m.finish_title()}</h1>
			<div class="flex flex-col gap-2">
				<p class="text-ink-soft">
					{m.finish_summary({ answered: data.attempt.answered, total: data.attempt.total })}
				</p>
				{@render progress('h-2')}
			</div>
			{#if unanswered.length > 0}
				<div class="flex flex-col gap-2.5">
					<p class="text-sm font-semibold text-attention">{m.finish_unanswered()}</p>
					<ul class="flex flex-wrap gap-2">
						{#each unanswered as item (item.position)}
							<li>
								<a
									href={questionUrl(item.position)}
									class="inline-flex h-10 items-center rounded-full border border-attention-line bg-attention-soft px-3.5 text-sm font-semibold text-attention"
								>
									{m.question_number({ n: item.position + 1 })}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<ActionBar class="flex flex-col gap-2.5 md:flex-row-reverse">
			<form method="POST" action="?/finish" use:enhance={submit}>
				<button type="submit" disabled={submitting} class="btn w-full btn-primary md:px-7">
					{m.finish_confirm()}
				</button>
			</form>
			<!-- To the first unanswered question, or the first one when all are answered. -->
			<a href={questionUrl(unanswered[0]?.position ?? 0)} class="btn btn-ghost">
				{m.back_to_questions()}
			</a>
		</ActionBar>
	</div>
{:else}
	{@const { answered, correct, total } = data.attempt}

	{#snippet resultActions()}
		<a href={historyUrl} class="btn btn-secondary md:min-h-12">
			<Icon name="history" />
			{m.history_link()}
		</a>
		<a href={testUrl} class="btn btn-primary md:min-h-12 md:px-[22px]">{m.back_to_test()}</a>
	{/snippet}

	<div
		class="flex flex-wrap items-center gap-4 card rounded-[20px] p-5 md:gap-x-10 md:gap-y-6 md:p-7"
	>
		<p class="text-5xl/14 font-bold tabular-nums md:text-[64px]/[72px]">
			{percent(correct, total)}%
		</p>
		<div class="flex min-w-0 flex-[1_1_10rem] flex-col gap-1.5 md:flex-[1_1_280px] md:gap-2.5">
			<h1
				class="flex items-center gap-2.5 font-semibold text-muted md:text-[22px] md:font-bold md:text-ink"
			>
				{m.results_title()}
				<ModeBadge mode={data.attempt.mode} />
			</h1>
			<p class="text-ink-soft">{m.score({ correct, total })}</p>
			<!-- Right, wrong, and (grey) not answered. -->
			<div aria-hidden="true" class="flex h-2 overflow-hidden rounded-full bg-track md:h-2.5">
				<div class="bg-correct-line" style:width="{percent(correct, total)}%"></div>
				<div class="bg-wrong-line" style:width="{percent(answered - correct, total)}%"></div>
			</div>
		</div>
		<div class="flex flex-wrap gap-2.5 max-md:hidden">{@render resultActions()}</div>
	</div>

	<h2 class="mt-1 text-lg font-bold md:mt-3 md:text-[22px]">{m.review_title()}</h2>
	<div
		class="flex flex-col gap-4 md:grid md:grid-cols-[repeat(auto-fill,minmax(440px,1fr))] md:items-start md:gap-5"
	>
		{#each data.mistakes as q (q.position)}
			<section class="flex flex-col gap-3 card p-4 md:rounded-[18px] md:p-5">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-[13px] font-semibold text-muted">
						{m.question_number({ n: q.position + 1 })}
					</h3>
					{#if !q.answered}
						<span class="pill bg-attention-soft text-attention">{m.review_not_answered()}</span>
					{/if}
				</div>
				<p class="font-semibold break-words md:text-[17px]/6">{q.text}</p>
				<RevealedAnswers answers={q.answers} compact />
			</section>
		{:else}
			<p class="card p-6 text-center text-muted md:col-span-full">{m.review_none()}</p>
		{/each}
	</div>

	<ActionBar class="grid grid-cols-2 gap-2.5 md:hidden">{@render resultActions()}</ActionBar>
{/if}
