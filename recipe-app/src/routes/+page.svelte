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

<div class="page-head">
	<div>
		<p class="eyebrow">Recipe finder</p>
		<h1>Discover recipes</h1>
		<p class="lede">
			Search thousands of recipes, filter by category or cuisine, and save the ones you want to
			cook.
		</p>
	</div>
</div>

<div class="toolbar">
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
		<span>{data.error}</span>
		<button class="btn btn--sm" onclick={() => location.reload()}>Retry</button>
	</p>
{/if}

{#if results.length}
	<p class="summary">
		<strong>{results.length}</strong> recipe{results.length === 1 ? '' : 's'}
		{#if data.query}matching “{data.query}”{/if}
		{#if activeFilterCount}
			· {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
		{/if}
	</p>

	<div class="card-grid">
		{#each results as recipe (recipe.id)}
			<recipe-card
				use:setProps={{ recipe, isFavorite: favorites.has(recipe.id) }}
				use:on={{
					favoriteToggle: (e) => favorites.set(e.detail.recipeId, e.detail.isFavorite),
					viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
				}}
			>
				{#if recipe.source === 'user'}
					<span slot="badge" class="badge">Mine</span>
				{/if}
				<button class="btn btn--sm btn--ghost" slot="actions" onclick={() => addToPlan(recipe)}>
					Add to plan
				</button>
			</recipe-card>
		{/each}
	</div>
{:else if !data.error}
	<div class="empty-state">
		<h2>No recipes matched</h2>
		<p>Try a different search, clear the filters, or write your own recipe.</p>
		<a class="btn btn--primary" href={resolve('/my-recipes/new')}>Add a recipe</a>
	</div>
{/if}

<style>
	/* The search bar and filters read as one control surface rather than two
	   stacked boxes. The filter panel's own background and border are switched
	   off via custom properties in app.css so it sits inside this shell. */
	.toolbar {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-3);
		margin-bottom: var(--space-5);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
	}

	.summary {
		margin-bottom: var(--space-4);
		font-size: var(--step--1);
		color: var(--muted);
	}

	.summary strong {
		color: var(--text);
	}

	.error {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		margin-bottom: var(--space-4);
		color: var(--danger-text);
		background: var(--danger-soft);
		border: 1px solid var(--danger-border);
		border-radius: var(--radius);
	}

	.badge {
		padding: 0.1875rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: var(--radius-full);
		box-shadow: var(--shadow-1);
	}
</style>
