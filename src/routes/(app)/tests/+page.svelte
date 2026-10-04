<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.tests_title()} · {m.app_name()}</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">{m.tests_title()}</h1>

{#if data.tests.length === 0}
	<p class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
		{m.tests_empty()}
	</p>
{:else}
	<ul class="space-y-3">
		{#each data.tests as test (test.id)}
			<li>
				<a
					href={resolve('/(app)/tests/[id]', { id: test.id })}
					class="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition active:bg-gray-100"
				>
					<h2 class="font-semibold break-words">{test.title}</h2>
					<p class="mt-1 text-sm text-gray-500">
						{m.question_count({ count: test.questionCount })}
					</p>
				</a>
			</li>
		{/each}
	</ul>
{/if}
