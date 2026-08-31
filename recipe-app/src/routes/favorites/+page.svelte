<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { on, setProps } from '$lib/components/stencil';
	import { favorites, userRecipes, mealPlan, today } from '$lib/stores';
	import { lookupById, isExcludedCategory } from '$lib/api';
	import type { Recipe } from 'recipe-ui-components';

	// Favorites are stored as ids, not whole recipes, so titles and images can
	// never go stale. That means resolving them here: user recipes come from the
	// store, API recipes from a lookup per id.
	//
	// Client-side rather than in a load function because the id list lives in
	// localStorage, which the server cannot read.
	let resolved = $state<Recipe[]>([]);
	let loading = $state(true);
	let failed = $state<string[]>([]);

	$effect(() => {
		const ids = favorites.ids;
		let cancelled = false;
		loading = true;
		failed = [];

		(async () => {
			const results = await Promise.all(
				ids.map(async (id) => {
					const local = userRecipes.get(id);
					if (local) return local;
					try {
						const remote = await lookupById(fetch, id);
						// A favorited recipe could since have been excluded.
						return remote && !isExcludedCategory(remote.category) ? remote : null;
					} catch {
						return null;
					}
				})
			);

			if (cancelled) return;
			resolved = results.filter((r): r is Recipe => r !== null);
			failed = ids.filter((id, i) => results[i] === null);
			loading = false;
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>Favorites · Smart Rasoi</title>
</svelte:head>

<div class="container">
	<div class="page-head">
		<div>
			<h1>Favorites</h1>
			<p class="lede">
				{favorites.count === 0
					? 'Recipes you star appear here.'
					: `${favorites.count} saved recipe${favorites.count === 1 ? '' : 's'}.`}
			</p>
		</div>
		{#if favorites.count > 0}
			<button class="btn btn--danger" onclick={() => favorites.clear()}>Clear all</button>
		{/if}
	</div>

	{#if favorites.count === 0}
		<div class="empty-state">
			<p>Nothing saved yet. Star a recipe to keep it here.</p>
			<a class="btn btn--primary" href={resolve('/')}>Browse recipes</a>
		</div>
	{:else if loading}
		<p class="lede">Loading your favorites…</p>
	{:else}
		{#if failed.length}
			<p class="warn" role="status">
				{failed.length} favorite{failed.length === 1 ? '' : 's'} could not be loaded. They may have been
				removed upstream.
				<button class="link-btn" onclick={() => failed.forEach((id) => favorites.set(id, false))}>
					Remove them
				</button>
			</p>
		{/if}

		<div class="card-grid">
			{#each resolved as recipe (recipe.id)}
				<recipe-card
					use:setProps={{ recipe, isFavorite: true }}
					use:on={{
						favoriteToggle: (e) => favorites.set(e.detail.recipeId, e.detail.isFavorite),
						viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
					}}
				>
					{#if recipe.source === 'user'}
						<span slot="badge" class="badge">Mine</span>
					{/if}
					<button
						slot="actions"
						class="btn btn--sm btn--on-cream"
						onclick={() => {
							mealPlan.assign(today(), 'dinner', recipe);
							goto(resolve('/meal-plan'));
						}}
					>
						Add to plan
					</button>
				</recipe-card>
			{/each}
		</div>
	{/if}
</div>

<style>
	h1 {
		margin-bottom: 0;
	}

	.badge {
		padding: 0.1875rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: var(--radius-full);
	}

	.warn {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-4);
		font-size: var(--step--1);
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.link-btn {
		padding: 0;
		font: inherit;
		color: var(--text);
		text-decoration: underline;
		cursor: pointer;
		background: none;
		border: none;
	}
</style>
