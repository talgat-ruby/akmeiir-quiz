<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import FormField from '#lib/components/FormField.svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<h1 class="mb-4 text-xl font-bold">{m.login_title()}</h1>

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
		<p role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
	{/if}

	<button
		type="submit"
		disabled={submitting}
		class="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-base font-semibold text-white active:bg-blue-700 disabled:opacity-60"
	>
		{m.login_submit()}
	</button>
</form>

<p class="mt-4 text-center text-sm text-gray-600">
	{m.no_account()}
	<a href={resolve('/(auth)/register') + page.url.search} class="font-medium text-blue-700">
		{m.register_link()}
	</a>
</p>
