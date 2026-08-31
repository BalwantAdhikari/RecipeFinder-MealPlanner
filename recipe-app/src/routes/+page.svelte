<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { on, setProps } from '$lib/components/stencil';
	import { categoryIcon, categoryColor } from '$lib/components/category-icons';
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
	function buildUrl(next: { q?: string; filters?: RecipeFilters }) {
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
		return qs ? `${base}?${qs}` : base;
	}

	function navigate(next: { q?: string; filters?: RecipeFilters }) {
		// The pathname comes from resolve() inside buildUrl; the rule cannot see
		// through the helper, and only a query string is appended.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(buildUrl(next), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	/** The category pills are real links, so they need an href, not a handler. */
	const categoryHref = (category: string) =>
		buildUrl({ filters: { ...data.filters, category: category || undefined } });

	function addToPlan(recipe: Recipe) {
		mealPlan.assign(today(), 'dinner', recipe);
		goto(resolve('/meal-plan'));
	}

	const activeFilterCount = $derived(Object.values(data.filters).filter(Boolean).length);

	// Hero image comes from the current results rather than a hardcoded asset, so
	// it always resolves and always reflects what the app can actually show.
	const heroImage = $derived(data.recipes.find((r) => r.image)?.image);
</script>

<svelte:head>
	<title>Discover recipes · Smart Rasoi</title>
	<meta name="description" content="Search and browse recipes from TheMealDB." />
</svelte:head>

<section class="hero">
	<div class="hero__inner">
		<p class="eyebrow">Welcome to Smart Rasoi</p>
		<h1>Delicious recipes, made for you</h1>
		<p class="lede">
			Discover easy, healthy and mouthwatering recipes for every moment of your day.
		</p>

		<a class="btn btn--primary" href="#gallery">Browse Recipes</a>
	</div>

	<div class="hero__media">
		{#if heroImage}
			<img class="hero__img" src={heroImage} alt="" aria-hidden="true" />
		{/if}
	</div>
</section>

<div class="features">
	<div class="feature">
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z"
			/>
		</svg>
		<strong>Save favourites</strong>
		<span>Keep recipes for later</span>
	</div>

	<div class="feature">
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="4" width="18" height="17" rx="2" />
			<path d="M8 2v4M16 2v4M3 10h18" />
		</svg>
		<strong>Plan your week</strong>
		<span>Seven days, three meals</span>
	</div>

	<div class="feature">
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M4 4v7a4 4 0 0 0 8 0V4M8 15v5M17 4c0 3-2 4-2 7s2 4 2 4M17 15v5" />
		</svg>
		<strong>Write your own</strong>
		<span>Add and edit recipes</span>
	</div>

	<div class="feature">
		<svg
			viewBox="0 0 24 24"
			width="26"
			height="26"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</svg>
		<strong>Search &amp; filter</strong>
		<span>By name, category, cuisine</span>
	</div>
</div>

<div class="container" id="gallery">
	<div class="section-head">
		<h2>Recipe Gallery</h2>
		<p class="lede">Search by name, or narrow things down by category and cuisine.</p>
	</div>

	<div class="toolbar">
		<recipe-search-bar
			use:setProps={{ value: data.query, placeholder: 'Search recipes by name…' }}
			use:on={{
				searchChange: (e) => navigate({ q: e.detail.query }),
				searchClear: () => navigate({ q: '' })
			}}
		></recipe-search-bar>

		<!--
			Links rather than buttons: the filter lives in the URL, so these are real
			navigations and get middle-click, open-in-new-tab and copy-link for free.
			The data-sveltekit-* attributes keep the behaviour the search bar has.
		-->
		<!--
			The pathname in every href below comes from resolve() inside buildUrl(), but
			the rule only inspects the attribute expression and cannot follow the helper.
			Scoped to this row rather than the file so a genuinely unresolved link
			elsewhere still fails the build.
		-->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<div class="pills" role="group" aria-label="Filter by category">
			<a
				class="pill"
				class:pill--on={!data.filters.category}
				aria-current={!data.filters.category ? 'true' : undefined}
				href={categoryHref('')}
				data-sveltekit-noscroll
				data-sveltekit-replacestate
			>
				<svg class="pill__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
					<path d="M4 6h16M4 12h16M4 18h10" />
				</svg>
				All recipes
			</a>

			{#each data.categories as category (category)}
				<a
					class="pill"
					class:pill--on={data.filters.category === category}
					aria-current={data.filters.category === category ? 'true' : undefined}
					style="--pill-accent: {categoryColor(category)}"
					href={categoryHref(category)}
					data-sveltekit-noscroll
					data-sveltekit-replacestate
				>
					<svg class="pill__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path d={categoryIcon(category)} />
					</svg>
					{category}
				</a>
			{/each}
		</div>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->

		<!--
			Categories moved to the pill row above, so only the cuisine select is left.
			The component drops a select whose option list is empty, so passing [] is
			enough — no library change needed.
		-->
		<recipe-filter-panel
			use:setProps={{ categories: [], areas: data.areas, selected: data.filters }}
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
					<button
						class="btn btn--sm btn--on-cream"
						slot="actions"
						onclick={() => addToPlan(recipe)}
					>
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
</div>

<style>
	/* Search and filters read as one control surface floating on the page. */
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

	/*
	 * Scrolls horizontally rather than wrapping: the category count comes from the
	 * API, so the row has to survive more entries than the design anticipated
	 * without pushing the grid down the page.
	 */
	.pills {
		display: flex;
		gap: var(--space-2);
		overflow-x: auto;
		padding-bottom: 2px;
		scrollbar-width: thin;
		-webkit-overflow-scrolling: touch;
	}

	.pill {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.9rem;
		font-size: var(--step--1);
		font-weight: 600;
		line-height: 1;
		color: var(--text);
		text-decoration: none;
		white-space: nowrap;
		background: var(--surface);
		/*
		 * --border-strong, not --border: the pill sits on the white toolbar, so its
		 * own white fill gives no edge and the boundary is doing all the work of
		 * showing where the control is. --border measures 1.24:1 here, which is
		 * effectively invisible; this clears the 3:1 that 1.4.11 asks of a control
		 * boundary.
		 */
		border: 1px solid var(--border-strong);
		border-radius: 999px;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.pill__icon {
		width: 1.05rem;
		height: 1.05rem;
		/* Each category's own colour, set inline; falls back for the "All" pill. */
		color: var(--pill-accent, var(--muted-strong));
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* Hover now has to move the border somewhere else, since the resting state
	   already uses --border-strong. */
	.pill:hover {
		color: var(--accent-on-soft);
		border-color: var(--accent-on-soft);
		background: var(--surface-2);
	}

	/*
	 * The active pill uses the shared accent pair, not the category colour: a
	 * per-category tint would need 12 separately verified fg/bg combinations, and
	 * the icon still carries the category identity.
	 */
	.pill--on,
	.pill--on:hover {
		color: var(--accent-on-soft);
		background: var(--accent-soft);
		border-color: var(--accent-on-soft);
	}

	.pill--on .pill__icon {
		color: currentColor;
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

	.error .btn {
		color: var(--danger-text);
		border-color: var(--danger-border);
	}

	.badge {
		padding: 0.1875rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: var(--radius-full);
	}
</style>
