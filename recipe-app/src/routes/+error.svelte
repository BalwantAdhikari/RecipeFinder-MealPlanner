<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	// Without an +error.svelte, SvelteKit's fallback page has no <title>, which is
	// a WCAG failure (2.4.2 Page Titled) — caught by auditing the 404 route.
	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? 'Something went wrong.');
</script>

<svelte:head>
	<title>{status} · Smart Rasoi</title>
</svelte:head>

<div class="container container--tight">
	<div class="wrap">
		<p class="status">{status}</p>
		<h1>
			{#if status === 404}
				We could not find that page
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p class="detail">{message}</p>

		<div class="actions">
			<a class="cta" href={resolve('/')}>Back to discovery</a>
			<a class="ghost" href={resolve('/my-recipes')}>My recipes</a>
		</div>
	</div>
</div>

<style>
	.wrap {
		max-width: 34rem;
		margin: 3rem auto;
		text-align: center;
	}

	.status {
		margin: 0;
		font-size: 3rem;
		font-weight: 700;
		line-height: 1;
		color: var(--muted);
	}

	h1 {
		margin: 0.5rem 0;
		font-size: 1.375rem;
	}

	.detail {
		color: var(--muted);
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	.cta,
	.ghost {
		padding: 0.5rem 1rem;
		font-size: 0.9375rem;
		text-decoration: none;
		border-radius: var(--radius-sm);
	}

	.cta {
		color: var(--accent-contrast);
		background: var(--accent);
	}

	.ghost {
		color: var(--text);
		border: 1px solid var(--border);
	}
</style>
