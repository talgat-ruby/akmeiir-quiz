<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.upload_title()} · {m.app_name()}</title>
</svelte:head>

<p><a href={resolve('/(app)/tests')}>← {m.back_to_tests()}</a></p>

<h1>{m.upload_title()}</h1>
<p>{m.upload_help({ max: data.maxFileMb })}</p>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<p>
		<label>
			{m.upload_file_label()}
			<input type="file" name="file" accept=".json,application/json" required />
		</label>
	</p>

	{#if form?.message}
		<div role="alert">
			<p>{form.message}</p>
			{#if form.issues.length > 0}
				<ul>
					{#each form.issues as issue, i (i)}
						<li>{issue}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<p><button type="submit" disabled={submitting}>{m.upload_submit()}</button></p>
</form>
