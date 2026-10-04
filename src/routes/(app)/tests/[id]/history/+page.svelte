<script lang="ts">
	import { resolve } from '$app/paths';
	import Alert from '#lib/components/Alert.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ModeBadge from '#lib/components/ModeBadge.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';

	let { data, form } = $props();

	type Attempt = (typeof data.attempts)[number];

	const when = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
	const percent = (a: Attempt) => (a.total ? Math.round((a.correct / a.total) * 100) : 0);
	const attemptUrl = (a: Attempt) => resolve('/(app)/attempts/[id]', { id: a.id });
</script>

<svelte:head>
	<title>{m.history_title()} · {data.test.title} · {m.app_name()}</title>
</svelte:head>

{#snippet started(a: Attempt)}
	<time datetime={a.startedAt.toISOString()}>{when.format(a.startedAt)}</time>
{/snippet}

{#snippet score(a: Attempt, barClass: string)}
	<span class="text-[15px] font-semibold">
		{m.history_score({ correct: a.correct, total: a.total, percent: percent(a) })}
	</span>
	<span aria-hidden="true" class={['h-1.5 overflow-hidden rounded-full bg-track', barClass]}>
		<span class="block h-full bg-correct-line" style:width="{percent(a)}%"></span>
	</span>
{/snippet}

{#snippet actions(a: Attempt)}
	{@const mistakes = a.total - a.correct}
	<a href={attemptUrl(a)} class="btn-sm btn-secondary">{m.history_open()}</a>
	{#if mistakes > 0}
		<form method="POST" action="?/redo">
			<input type="hidden" name="attemptId" value={a.id} />
			<button type="submit" class="btn-sm btn-primary">
				{m.redo_mistakes({ count: mistakes })}
			</button>
		</form>
	{/if}
{/snippet}

<BackLink href={resolve('/(app)/tests')} class="-mt-3">{m.back_to_tests()}</BackLink>

<div class="-mt-1.5 flex flex-col gap-1 md:-mt-2">
	<h1 class="text-2xl/[30px] font-bold md:text-[30px]/[38px]">{m.history_title()}</h1>
	<p class="text-sm break-words text-muted md:text-[15px]">{data.test.title}</p>
</div>

{#if form?.message}
	<Alert>{form.message}</Alert>
{/if}

<!-- Phone: one card per attempt. -->
<ul class="flex flex-col gap-3.5 md:hidden">
	{#each data.attempts as a (a.id)}
		<li class="flex flex-col gap-2.5 card px-4 py-3.5">
			<div class="flex items-center justify-between gap-2">
				<ModeBadge mode={a.mode} />
				<span class="text-[13px] text-muted">{@render started(a)}</span>
			</div>
			{#if a.finished}
				<div class="flex items-center gap-2.5">{@render score(a, 'flex-1')}</div>
				<div class="flex flex-wrap gap-2">{@render actions(a)}</div>
			{:else}
				<p class="text-[15px] text-ink-soft">
					{m.history_in_progress({ answered: a.answered, total: a.total })}
				</p>
				<a href={attemptUrl(a)} class="btn-sm w-full btn-soft">
					<Icon name="play" size={16} />
					{m.continue_attempt()}
				</a>
			{/if}
		</li>
	{:else}
		<li class="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">
			{m.history_empty()}
		</li>
	{/each}
</ul>

<!-- Desktop: a table. -->
<div class="overflow-x-auto card rounded-[18px] max-md:hidden">
	<table class="w-full min-w-[720px] text-[15px]">
		<thead>
			<tr class="border-b border-line text-left text-[13px] text-muted">
				<th class="px-5 py-3.5 font-semibold">{m.history_mode()}</th>
				<th class="px-5 py-3.5 font-semibold">{m.history_started()}</th>
				<th class="px-5 py-3.5 font-semibold">{m.history_result()}</th>
				<th class="px-5 py-3.5 text-right font-semibold">{m.history_actions()}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.attempts as a (a.id)}
				<tr class="border-b border-line last:border-0">
					<td class="px-5 py-3.5"><ModeBadge mode={a.mode} /></td>
					<td class="px-5 py-3.5 text-ink-soft">{@render started(a)}</td>
					<td class="px-5 py-3.5">
						{#if a.finished}
							<span class="inline-flex items-center gap-2.5">{@render score(a, 'w-30')}</span>
						{:else}
							<span class="text-ink-soft">
								{m.history_in_progress({ answered: a.answered, total: a.total })}
							</span>
						{/if}
					</td>
					<td class="px-5 py-3.5">
						<div class="flex justify-end gap-2 whitespace-nowrap">
							{#if a.finished}
								{@render actions(a)}
							{:else}
								<a href={attemptUrl(a)} class="btn-sm btn-soft">{m.continue_attempt()}</a>
							{/if}
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="4" class="p-6 text-center text-muted">{m.history_empty()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
