<script lang="ts">
	import { page } from '$app/state';
	const id = $derived(page.params.id);
</script>

<svelte:head>
	<title>Edit recipe · Recipe Finder</title>
</svelte:head>

<h1>Edit recipe</h1>
<p>Route param <code>id</code>: <strong>{id}</strong></p>
<p class="todo">Placeholder — implemented in <strong>Phase 5.3 / 5.4</strong>.</p>

<style>
	.todo {
		padding: 0.75rem 1rem;
		color: var(--muted);
		background: var(--surface);
		border: 1px dashed var(--border);
		border-radius: var(--radius-sm);
	}
</style>
