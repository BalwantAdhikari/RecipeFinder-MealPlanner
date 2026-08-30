<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { on, setProps } from '$lib/components/stencil';
	import { filterLocal, mergeResults } from '$lib/api';
	import { favorites, userRecipes, mealPlan, today } from '$lib/stores';
	import type { Recipe, RecipeFilters } from 'recipe-ui-components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// User recipes come from localStorage, which the server cannot read, so the
	// merge happens here rather than in the load function.
	const results = $derived(
		mergeResults(filterLocal(userRecipes.all, data.query, data.filters), data.recipes)
	);

	/**
	 * Push search/filter state into the URL.
	 *
	 * The URL is the single source of truth, so the load function re-runs and the
	 * result is shareable and back-button friendly. `keepFocus` stops the search
	 * input losing focus mid-typing; `noScroll` avoids jumping to the top on every
	 * keystroke.
	 */
	function navigate(next: { q?: string; filters?: RecipeFilters }) {
		// A throwaway builder, serialised to a string below and never held as
		// state, so the reactive wrapper buys nothing.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.searchParams);
		const q = next.q ?? data.query;
		const filters = next.filters ?? data.filters;

		if (q.trim()) params.set('q', q.trim());
		else params.delete('q');
		if (filters.category) params.set('category', filters.category);
		else params.delete('category');
		if (filters.area) params.set('area', filters.area);
		else params.delete('area');

		const qs = params.toString();
		const base = resolve('/');
		// The pathname is resolved above; only a query string is appended, which
		// the rule cannot see through a template literal.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(qs ? `${base}?${qs}` : base, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	function addToPlan(recipe: Recipe) {
		mealPlan.assign(today(), 'dinner', recipe);
		goto(resolve('/meal-plan'));
	}

	const activeFilterCount = $derived(Object.values(data.filters).filter(Boolean).length);
</script>

<svelte:head>
	<title>Discover recipes · Recipe Finder</title>
	<meta name="description" content="Search and browse recipes from TheMealDB." />
</svelte:head>

<h1>Discover recipes</h1>

<div class="controls">
	<recipe-search-bar
		use:setProps={{ value: data.query, placeholder: 'Search recipes by name…' }}
		use:on={{
			searchChange: (e) => navigate({ q: e.detail.query }),
			searchClear: () => navigate({ q: '' })
		}}
	></recipe-search-bar>

	<recipe-filter-panel
		use:setProps={{ categories: data.categories, areas: data.areas, selected: data.filters }}
		use:on={{
			filterChange: (e) => navigate({ filters: e.detail }),
			filterClear: () => navigate({ filters: {} })
		}}
	></recipe-filter-panel>
</div>

{#if data.error}
	<p class="error" role="alert">
		{data.error}
		<button onclick={() => location.reload()}>Retry</button>
	</p>
{/if}

<p class="summary">
	{#if results.length}
		{results.length} recipe{results.length === 1 ? '' : 's'}
		{#if data.query}matching “{data.query}”{/if}
		{#if activeFilterCount}with {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}{/if}
	{:else if !data.error}
		No recipes found.
	{/if}
</p>

{#if results.length}
	<div class="grid">
		{#each results as recipe (recipe.id)}
			<recipe-card
				use:setProps={{ recipe, isFavorite: favorites.has(recipe.id) }}
				use:on={{
					favoriteToggle: (e) => favorites.set(e.detail.recipeId, e.detail.isFavorite),
					viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
				}}
			>
				{#if recipe.source === 'user'}
					<span slot="badge" class="badge badge--mine">✎ mine</span>
				{/if}
				<button slot="actions" class="ghost" onclick={() => addToPlan(recipe)}>
					Add to plan
				</button>
			</recipe-card>
		{/each}
	</div>
{:else if !data.error}
	<div class="empty">
		<p>Nothing matched. Try a different search, clear the filters, or add your own recipe.</p>
		<a class="cta" href={resolve('/my-recipes/new')}>Add a recipe</a>
	</div>
{/if}

<style>
	.controls {
		display: grid;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.summary {
		font-size: 0.875rem;
		color: var(--muted);
	}

	.error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		color: #7f1d1d;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-sm);
	}

	.error button {
		padding: 0.25rem 0.625rem;
		font: inherit;
		font-size: 0.8125rem;
		cursor: pointer;
		background: #fff;
		border: 1px solid #fecaca;
		border-radius: 6px;
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	}

	.badge {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		color: #fff;
		background: #18181b;
		border-radius: 999px;
	}

	.badge--mine {
		background: var(--accent);
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
		color: var(--accent);
		border-color: var(--accent);
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
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--accent-contrast);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}

	@media (prefers-color-scheme: dark) {
		.error {
			color: #fecaca;
			background: #450a0a;
			border-color: #7f1d1d;
		}

		.error button {
			color: #fecaca;
			background: #7f1d1d;
			border-color: #991b1b;
		}
	}
</style>
