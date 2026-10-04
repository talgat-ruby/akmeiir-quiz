<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import FormField from '#lib/components/FormField.svelte';
	import { MIN_PASSWORD_LENGTH } from '#lib/auth-rules.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.register_title()} · {m.app_name()}</title>
</svelte:head>

<h1 class="text-2xl/[30px] font-bold">{m.register_title()}</h1>

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
		label={m.name_label()}
		name="name"
		autocomplete="name"
		required
		value={form?.name ?? ''}
	/>
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
		hint={m.password_hint({ min: MIN_PASSWORD_LENGTH })}
		name="password"
		type="password"
		autocomplete="new-password"
		minlength={MIN_PASSWORD_LENGTH}
		required
	/>

	{#if form?.message}
		<Alert>{form.message}</Alert>
	{/if}

	<button type="submit" disabled={submitting} class="btn w-full btn-primary">
		{m.register_submit()}
	</button>
</form>

<p class="text-center text-sm text-muted">
	{m.have_account()}
	<a href={resolve('/(auth)/login') + page.url.search} class="font-semibold text-link">
		{m.login_link()}
	</a>
</p>
