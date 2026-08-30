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
	<title>Favorites · Recipe Finder</title>
</svelte:head>

<header class="head">
	<div>
		<h1>Favorites</h1>
		<p class="lede">
			{favorites.count === 0
				? 'Recipes you star appear here.'
				: `${favorites.count} saved recipe${favorites.count === 1 ? '' : 's'}.`}
		</p>
	</div>
	{#if favorites.count > 0}
		<button class="ghost" onclick={() => favorites.clear()}>Clear all</button>
	{/if}
</header>

{#if favorites.count === 0}
	<div class="empty">
		<p>Nothing saved yet. Star a recipe to keep it here.</p>
		<a class="cta" href={resolve('/')}>Browse recipes</a>
	</div>
{:else if loading}
	<p class="lede">Loading your favorites…</p>
{:else}
	{#if failed.length}
		<p class="warn" role="status">
			{failed.length} favorite{failed.length === 1 ? '' : 's'} could not be loaded. They may have been
			removed upstream.
			<button class="link" onclick={() => failed.forEach((id) => favorites.set(id, false))}>
				Remove them
			</button>
		</p>
	{/if}

	<div class="grid">
		{#each resolved as recipe (recipe.id)}
			<recipe-card
				use:setProps={{ recipe, isFavorite: true }}
				use:on={{
					favoriteToggle: (e) => favorites.set(e.detail.recipeId, e.detail.isFavorite),
					viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
				}}
			>
				{#if recipe.source === 'user'}
					<span slot="badge" class="badge">✎ mine</span>
				{/if}
				<button
					slot="actions"
					class="ghost"
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

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0 0 0.25rem;
	}

	.lede {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--muted);
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	}

	.badge {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: 999px;
	}

	.ghost,
	.link {
		padding: 0.4rem 0.75rem;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text);
		cursor: pointer;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.ghost:hover {
		color: var(--accent-text);
		border-color: var(--accent);
	}

	.link {
		padding: 0;
		color: inherit;
		text-decoration: underline;
		border: none;
	}

	.warn {
		padding: 0.625rem 0.875rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.empty {
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--muted);
		background: var(--surface);
		border: 1px dashed var(--border);
		border-radius: var(--radius);
	}

	.cta {
		display: inline-block;
		padding: 0.5rem 1rem;
		color: var(--accent-contrast);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}
</style>
