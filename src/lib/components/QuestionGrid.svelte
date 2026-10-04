<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	type QuestionStatus = { position: number; answered: boolean; correct?: boolean };

	let {
		questions,
		current,
		href
	}: {
		questions: QuestionStatus[];
		/** The position of the question on screen. */
		current: number;
		href: (position: number) => string;
	} = $props();

	// `correct` is only there when right/wrong may be shown (practice and mistakes).
	const status = (item: QuestionStatus) => {
		if (item.correct === true) return m.feedback_correct();
		if (item.correct === false) return m.feedback_wrong();
		return item.answered ? m.answered() : m.not_answered();
	};
	const mark = (item: QuestionStatus) =>
		item.correct === true ? ' ✓' : item.correct === false ? ' ✗' : '';
</script>

<nav aria-labelledby="all-questions" class="flex flex-col gap-2.5">
	<h2 id="all-questions" class="text-sm font-semibold text-ink-soft">{m.all_questions()}</h2>
	<ol class="grid grid-cols-6 gap-2 md:grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))]">
		{#each questions as item (item.position)}
			<li>
				<a
					href={href(item.position)}
					aria-current={item.position === current ? 'step' : undefined}
					class={[
						'flex h-11 items-center justify-center rounded-xl border text-[15px] tabular-nums',
						'aria-[current=step]:font-bold aria-[current=step]:ring-2 aria-[current=step]:ring-ink aria-[current=step]:ring-offset-2 aria-[current=step]:ring-offset-ground',
						item.correct === true &&
							'border-correct-strong bg-correct-strong font-semibold text-on-accent',
						item.correct === false &&
							'border-wrong-strong bg-wrong-strong font-semibold text-on-accent',
						item.correct === undefined &&
							item.answered &&
							'border-primary bg-primary font-semibold text-on-accent',
						!item.answered && 'border-line-strong bg-surface text-ink-soft'
					]}
				>
					<span aria-hidden="true">{item.position + 1}{mark(item)}</span>
					<span class="sr-only">{m.question_number({ n: item.position + 1 })} — {status(item)}</span
					>
				</a>
			</li>
		{/each}
	</ol>
</nav>
