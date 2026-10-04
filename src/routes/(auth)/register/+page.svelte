<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import FormField from '#lib/components/FormField.svelte';
	import { MIN_PASSWORD_LENGTH } from '#lib/auth-rules.ts';
	import { m } from '#lib/paraglide/messages.js';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.register_title()} · {m.app_name()}</title>
</svelte:head>

<h1 class="mb-4 text-xl font-bold">{m.register_title()}</h1>

<form
	method="POST"
	class="space-y-4"
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
		<p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
	{/if}

	<button
		type="submit"
		disabled={submitting}
		class="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
	>
		{m.register_submit()}
	</button>
</form>

<p class="mt-4 text-center text-sm text-gray-600">
	{m.have_account()}
	<a href={resolve('/(auth)/login') + page.url.search} class="font-medium text-blue-700">
		{m.login_link()}
	</a>
</p>
