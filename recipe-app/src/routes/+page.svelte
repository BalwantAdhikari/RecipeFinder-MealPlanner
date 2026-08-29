<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import { on, props } from '$lib/components/stencil';
	import type { Recipe } from 'recipe-ui-components';

	// Phase 3 is the skeleton: these are placeholders so the Stencil integration
	// can be proven before the TheMealDB client lands in Phase 4.
	const sample: Recipe[] = [
		{
			id: '52772',
			title: 'Teriyaki Chicken Casserole',
			image: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
			category: 'Chicken',
			area: 'Japanese',
			source: 'api'
		},
		{
			id: '52771',
			title: 'Spicy Arrabiata Penne',
			image: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
			category: 'Vegetarian',
			area: 'Italian',
			source: 'api'
		}
	];

	let query = $state('');
	let lastEvent = $state<string>('none yet');

	// SvelteSet is reactive on mutation, so add/delete alone re-renders. A plain
	// Set would need reassigning to be tracked.
	const favorites = new SvelteSet<string>();

	function toggleFavorite(id: string, next: boolean) {
		if (next) favorites.add(id);
		else favorites.delete(id);
	}
</script>

<svelte:head>
	<title>Discover recipes · Recipe Finder</title>
</svelte:head>

<h1>Discover recipes</h1>
<p class="lede">
	Skeleton wiring for Phase 3. The search bar and cards below are Stencil web components consumed
	from the published npm package.
</p>

<recipe-search-bar
	use:props={{ value: query, placeholder: 'Search recipes…' }}
	use:on={{
		searchChange: (e) => {
			query = e.detail.query;
			lastEvent = `searchChange → ${JSON.stringify(e.detail)}`;
		},
		searchClear: () => {
			lastEvent = 'searchClear';
		}
	}}
></recipe-search-bar>

<p class="status">
	Query: <code>{query || '(empty)'}</code> · Favorites: <code>{favorites.size}</code> · Last event:
	<code>{lastEvent}</code>
</p>

<div class="grid">
	{#each sample as recipe (recipe.id)}
		<recipe-card
			use:props={{ recipe, isFavorite: favorites.has(recipe.id) }}
			use:on={{
				favoriteToggle: (e) => {
					toggleFavorite(e.detail.recipeId, e.detail.isFavorite);
					lastEvent = `favoriteToggle → ${JSON.stringify(e.detail)}`;
				},
				viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
			}}
		>
			<span slot="badge" class="badge">{recipe.source === 'user' ? '✎ mine' : 'API'}</span>
			<button slot="actions" class="ghost" onclick={() => goto(resolve('/meal-plan'))}
				>Add to plan</button
			>
		</recipe-card>
	{/each}
</div>

<style>
	.lede {
		max-width: 60ch;
		color: var(--muted);
	}

	.status {
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.status code {
		color: var(--text);
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		margin-top: 1rem;
	}

	.badge {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		color: #fff;
		background: #18181b;
		border-radius: 999px;
	}

	.ghost {
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
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
