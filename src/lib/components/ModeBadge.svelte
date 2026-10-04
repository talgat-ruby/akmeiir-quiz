<script lang="ts">
	import { modeName, type Mode } from '#lib/mode-name.ts';

	let { mode }: { mode: Mode } = $props();

	const tones = {
		practice: 'bg-primary-soft text-on-primary-soft',
		exam: 'bg-chip text-on-chip',
		mistakes: 'bg-attention-soft text-attention'
	};
</script>

<span class={['pill', tones[mode]]}>{modeName(mode)}</span>
