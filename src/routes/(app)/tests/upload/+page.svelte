<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ActionBar from '#lib/components/ActionBar.svelte';
	import Alert from '#lib/components/Alert.svelte';
	import BackLink from '#lib/components/BackLink.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
	let submitting = $state(false);

	let input = $state<HTMLInputElement>();
	let file = $state<File | null>(null);
	let dragging = $state(false);

	// A dropped file goes into the same file input, so the form sends it as if it was chosen.
	function drop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		const files = event.dataTransfer?.files;
		if (!input || !files?.length) return;
		input.files = files;
		file = files[0];
	}

	const size = (bytes: number) =>
		bytes < 1024 * 1024
			? `${Math.max(1, Math.round(bytes / 1024))} KB`
			: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
</script>

<svelte:head>
	<title>{m.upload_title()} · {m.app_name()}</title>
</svelte:head>

<div class="flex flex-1 flex-col gap-4 md:mx-auto md:w-full md:max-w-2xl md:flex-none">
	<BackLink href={resolve('/(app)/tests')} class="-mt-3">{m.back_to_tests()}</BackLink>

	<div class="-mt-2 flex flex-col gap-1.5">
		<h1 class="text-2xl/[30px] font-bold md:text-[30px]/[38px]">{m.upload_title()}</h1>
		<p class="text-sm text-muted">{m.upload_help({ max: data.maxFileMb })}</p>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		class="flex flex-1 flex-col gap-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		<label
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) dragging = false;
			}}
			ondrop={drop}
			class={[
				'flex cursor-pointer flex-col items-center gap-2.5 rounded-[20px] border-2 border-dashed px-4 py-7 text-center has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary',
				dragging ? 'border-primary bg-primary-soft' : 'border-primary-soft-line bg-surface'
			]}
		>
			<span class="grid size-13 place-items-center rounded-full bg-primary-soft text-primary">
				<Icon name="upload" size={24} />
			</span>
			<span class="font-semibold">{m.upload_drop()}</span>
			<span class="text-sm text-muted">{m.upload_or()}</span>
			<span class="btn-sm btn-secondary">{m.upload_choose()}</span>
			<input
				bind:this={input}
				type="file"
				name="file"
				accept=".json,application/json"
				required
				aria-label={m.upload_file_label()}
				onchange={() => (file = input?.files?.[0] ?? null)}
				class="sr-only"
			/>
		</label>

		{#if file}
			<p class="flex items-center gap-3 card rounded-[14px] px-3.5 py-3">
				<Icon name="file" size={20} class="text-muted" />
				<span class="min-w-0 flex-1 truncate text-[15px]">{file.name}</span>
				<span class="text-[13px] text-muted">{size(file.size)}</span>
			</p>
		{/if}

		{#if form?.message}
			<Alert>
				<p class="text-[15px] font-semibold">{form.message}</p>
				{#if form.issues.length > 0}
					<ul class="mt-2 flex list-disc flex-col gap-1 pl-5 font-mono text-[13px]/[18px]">
						{#each form.issues as issue, i (i)}
							<li>{issue}</li>
						{/each}
					</ul>
				{/if}
			</Alert>
		{/if}

		<ActionBar class="md:flex md:justify-end">
			<button
				type="submit"
				disabled={submitting}
				class="btn w-full btn-primary md:w-auto md:min-w-50 md:px-7"
			>
				{m.upload_submit()}
			</button>
		</ActionBar>
	</form>
</div>
