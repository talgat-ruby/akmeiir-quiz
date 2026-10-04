<script lang="ts">
	import { resolve } from '$app/paths';
	import ActionBar from '#lib/components/ActionBar.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
	let countInput = $state<HTMLInputElement>();

	const modes = [
		{ value: 'practice', name: m.mode_name_practice, hint: m.mode_practice_hint },
		{ value: 'exam', name: m.mode_name_exam, hint: m.mode_exam_hint }
	] as const;
	const selectedMode = $derived(form?.mode ?? 'practice');
</script>

<svelte:head>
	<title>{data.test.title} · {m.app_name()}</title>
</svelte:head>

<BackLink href={resolve('/(app)/tests')} class="-mt-3">{m.back_to_tests()}</BackLink>

<!-- Desktop: the test on the left, the setup form in a card on the right (below when narrow). -->
<div
	class="-mt-2 flex flex-1 flex-col gap-4 md:mt-0 md:flex-none md:flex-row md:flex-wrap md:items-start md:gap-8"
>
	<section class="flex flex-col gap-4 md:min-w-0 md:flex-[1_1_320px]">
		<div class="flex flex-col gap-1.5 md:gap-3">
			<h1 class="text-2xl/[30px] font-bold break-words md:text-[30px]/[38px]">{data.test.title}</h1>
			{#if data.test.description}
				<p class="break-words whitespace-pre-line text-ink-soft">{data.test.description}</p>
			{/if}
			<p class="text-sm text-muted md:text-[15px]">
				{m.question_count({ count: data.test.questionCount })}
				{#if data.bestPercent !== null}
					· {m.best_score({ percent: data.bestPercent })}
				{/if}
			</p>
		</div>

		{#if data.unfinishedAttemptId}
			<a
				href={resolve('/(app)/attempts/[id]', { id: data.unfinishedAttemptId })}
				class="flex items-center gap-3 rounded-2xl border border-primary-soft-line bg-primary-soft px-4 py-3.5 text-on-primary-soft"
			>
				<Icon name="play" size={22} />
				<span class="flex-1 text-[15px] font-semibold">{m.continue_attempt()}</span>
				<Icon name="chevron-right" />
			</a>
		{/if}

		<a
			href={resolve('/(app)/tests/[id]/history', { id: data.test.id })}
			class="inline-flex h-10 items-center gap-1.5 self-start text-[15px] font-medium text-link max-md:hidden"
		>
			<Icon name="history" />
			{m.history_link()}
		</a>
	</section>

	<form
		method="POST"
		action="?/start"
		class="flex flex-1 flex-col gap-5 md:min-w-0 md:flex-[999_1_520px] md:gap-6 md:card md:rounded-[20px] md:p-7"
	>
		<fieldset>
			<legend class="mb-2.5 text-sm font-semibold text-ink-soft md:mb-3 md:text-[15px]">
				{m.setup_mode()}
			</legend>
			<div
				class="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] md:gap-3"
			>
				{#each modes as mode (mode.value)}
					<label
						class="flex cursor-pointer items-start gap-3 card px-4 py-3.5 has-checked:border-primary has-checked:ring-1 has-checked:ring-primary"
					>
						<input
							type="radio"
							name="mode"
							value={mode.value}
							checked={selectedMode === mode.value}
							class="mt-0.5 size-5 flex-none accent-primary"
						/>
						<span class="flex flex-col gap-0.5">
							<span class="font-semibold">{mode.name()}</span>
							<span class="text-sm text-muted">{mode.hint()}</span>
						</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<!-- Desktop: count and time limit side by side, the random switch below them. -->
		<div class="flex flex-col gap-5 md:grid md:grid-cols-2">
			<div class="flex flex-col gap-2">
				<label for="question-count" class="text-sm font-semibold text-ink-soft md:text-[15px]">
					{m.setup_question_count()}
				</label>
				<div class="grid grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] gap-2">
					<button
						type="button"
						aria-label={m.setup_fewer()}
						onclick={() => countInput?.stepDown()}
						class="btn btn-secondary text-2xl font-normal">−</button
					>
					<input
						bind:this={countInput}
						id="question-count"
						type="number"
						name="questionCount"
						min="1"
						max={data.test.questionCount}
						value={form?.questionCount ?? data.defaultQuestionCount}
						inputmode="numeric"
						required
						aria-describedby="question-count-range"
						class="no-spinner h-13 field text-center text-lg font-semibold"
					/>
					<button
						type="button"
						aria-label={m.setup_more()}
						onclick={() => countInput?.stepUp()}
						class="btn btn-secondary text-2xl font-normal">+</button
					>
				</div>
				<p id="question-count-range" class="text-[13px] text-muted">1–{data.test.questionCount}</p>
			</div>

			<label
				class="flex cursor-pointer items-center gap-3 card px-4 py-3.5 md:order-last md:col-span-2"
			>
				<span class="flex flex-1 flex-col gap-0.5">
					<span class="font-semibold">{m.setup_random()}</span>
					<span class="text-sm text-muted">{m.setup_random_hint()}</span>
				</span>
				<input
					type="checkbox"
					role="switch"
					name="random"
					checked={form?.random ?? true}
					class="switch"
				/>
			</label>

			<div class="flex flex-col gap-2">
				<label for="time-limit" class="text-sm font-semibold text-ink-soft md:text-[15px]">
					{m.setup_time_limit()}
				</label>
				<input
					id="time-limit"
					type="number"
					name="timeLimitMinutes"
					min="1"
					max={data.maxTimeLimitMinutes}
					value={form?.timeLimitMinutes ?? ''}
					inputmode="numeric"
					placeholder={m.setup_no_time_limit()}
					aria-describedby="time-limit-hint"
					class="no-spinner h-13 field"
				/>
				<p id="time-limit-hint" class="text-[13px] text-muted">{m.setup_time_limit_hint()}</p>
			</div>
		</div>

		{#if form?.message}
			<Alert>{form.message}</Alert>
		{/if}

		<ActionBar class="md:flex md:justify-end">
			<button type="submit" class="btn w-full btn-primary md:w-auto md:min-w-50 md:px-7">
				{m.start_test()}
			</button>
		</ActionBar>
	</form>
</div>
