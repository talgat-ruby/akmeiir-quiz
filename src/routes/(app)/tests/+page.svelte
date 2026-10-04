<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.tests_title()} · {m.app_name()}</title>
</svelte:head>

<div class="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
	<div class="flex flex-col gap-1">
		<!-- On desktop the name is in the header. -->
		<p class="flex min-w-0 items-center gap-2 text-sm text-muted md:hidden">
			<span class="truncate" title={data.user.email}>{data.user.name}</span>
			{#if data.user.isAdmin}
				<span class="pill bg-attention-soft text-attention">{m.admin_badge()}</span>
			{/if}
		</p>
		<h1 class="text-[26px]/8 font-bold md:text-[32px]/10">{m.tests_title()}</h1>
	</div>

	{#if data.user.isAdmin}
		<a
			href={resolve('/(app)/tests/upload')}
			class="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-primary-soft-line bg-primary-soft text-[15px] font-semibold text-on-primary-soft md:h-11 md:px-[18px]"
		>
			<Icon name="upload" />
			{m.upload_link()}
		</a>
	{/if}
</div>

{#if data.tests.length === 0}
	<p class="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">
		{m.tests_empty()}
	</p>
{:else}
	<ul class="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] md:gap-5">
		{#each data.tests as test (test.id)}
			{@const stats = data.stats[test.id]}
			<li class="flex flex-col gap-3 card p-4 md:gap-4 md:rounded-[18px] md:p-[22px]">
				<a
					href={resolve('/(app)/tests/[id]', { id: test.id })}
					class="flex flex-col gap-1.5 md:gap-2"
				>
					<span class="text-lg/6 font-semibold break-words md:text-[19px]/[26px]">{test.title}</span
					>
					<span class="text-sm text-muted">{m.question_count({ count: test.questionCount })}</span>
				</a>
				<div
					class="mt-auto flex items-center justify-between gap-3 border-t border-line pt-1 md:pt-3"
				>
					{#if stats}
						<span class="pill h-7 bg-correct-soft text-[13px] text-correct">
							{m.best_score({ percent: stats.bestPercent })}
						</span>
					{/if}
					<a
						href={resolve('/(app)/tests/[id]/history', { id: test.id })}
						class="ml-auto inline-flex h-11 items-center gap-1.5 text-[15px] font-medium text-link"
					>
						<Icon name="history" />
						{m.history_link()}
					</a>
				</div>
			</li>
		{/each}
	</ul>
{/if}
