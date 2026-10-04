<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import FormField from '#lib/components/FormField.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<h1 class="text-2xl/[30px] font-bold">{m.login_title()}</h1>

<form
	method="POST"
	class="flex flex-col gap-4"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	<FormField
		label={m.email_label()}
		name="email"
		type="email"
		autocomplete="email"
		inputmode="email"
		required
		value={form?.email ?? ''}
	/>
	<FormField
		label={m.password_label()}
		name="password"
		type="password"
		autocomplete="current-password"
		required
	/>

	{#if form?.message}
		<Alert>{form.message}</Alert>
	{/if}

	<button type="submit" disabled={submitting} class="btn w-full btn-primary">
		{m.login_submit()}
	</button>
</form>

<p class="text-center text-sm text-muted">
	{m.no_account()}
	<a href={resolve('/(auth)/register') + page.url.search} class="font-semibold text-link">
		{m.register_link()}
	</a>
</p>
