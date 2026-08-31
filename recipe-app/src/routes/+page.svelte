<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { on, setProps } from '$lib/components/stencil';
	import { categoryColor, categoryTint } from '$lib/components/categories';
	import { filterLocal, mergeResults } from '$lib/api';
	import { favorites, userRecipes } from '$lib/stores';
	import type { RecipeFilters } from 'recipe-ui-components';
	import { onMount } from 'svelte';
	import { PER_PAGE, SORT_LABELS, type Sort } from '$lib/gallery';
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
	function buildUrl(next: { q?: string; filters?: RecipeFilters; sort?: Sort; page?: number }) {
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

		const sort = next.sort ?? data.sort;
		if (sort !== 'found') params.set('sort', sort);
		else params.delete('sort');

		// Anything that changes which recipes match invalidates the page number, so
		// an explicit page only survives when it is the thing being changed.
		// Named pageNum, not page: `page` is the imported $app/state store read at
		// the top of this function, and shadowing it is a use-before-declaration.
		const pageNum = next.page ?? (next.sort !== undefined ? data.page : 1);
		if (pageNum > 1) params.set('page', String(pageNum));
		else params.delete('page');

		const qs = params.toString();
		const base = resolve('/');
		return qs ? `${base}?${qs}` : base;
	}

	function navigate(next: { q?: string; filters?: RecipeFilters; sort?: Sort; page?: number }) {
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

	const activeFilterCount = $derived(Object.values(data.filters).filter(Boolean).length);

	/**
	 * Sorted results.
	 *
	 * `localeCompare` rather than `<`, so accented titles order the way a reader
	 * expects instead of by code point. Sorting a copy keeps `results` — which
	 * other derivations read — in the order the merge produced.
	 */
	const sorted = $derived.by(() => {
		const list = [...results];
		switch (data.sort) {
			case 'name-asc':
				return list.sort((a, b) => a.title.localeCompare(b.title));
			case 'name-desc':
				return list.sort((a, b) => b.title.localeCompare(a.title));
			case 'category':
				// Ties inside a category still read alphabetically.
				return list.sort(
					(a, b) =>
						(a.category ?? '').localeCompare(b.category ?? '') || a.title.localeCompare(b.title)
				);
			default:
				return list;
		}
	});

	const totalPages = $derived(Math.max(1, Math.ceil(sorted.length / PER_PAGE)));

	/**
	 * The page actually shown.
	 *
	 * Clamped, because the page number comes from the URL while the result count
	 * comes from the API: ?page=9 on a two-page result, or narrowing the filters
	 * while deep in a list, would otherwise render nothing at all.
	 */
	const currentPage = $derived(Math.min(Math.max(1, data.page), totalPages));
	const pageItems = $derived(sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE));

	function pageHref(n: number) {
		return buildUrl({ page: n, sort: data.sort });
	}

	/* --------------------------------------------- the chip row's overflow */

	let chipsEl = $state<HTMLElement | null>(null);
	let chipsOverflowRight = $state(false);
	let chipsOverflowLeft = $state(false);

	/**
	 * Whether the chip row has more to show in either direction.
	 *
	 * CSS cannot ask "am I overflowing", and an always-on fade would dim the last
	 * chip even when every category fits — which is what a wider viewport or a
	 * shorter category list gives you.
	 */
	function measureChips() {
		if (!chipsEl) return;
		const max = chipsEl.scrollWidth - chipsEl.clientWidth;
		// A sub-pixel tolerance: fractional layout widths otherwise leave the fade
		// on permanently at some zoom levels.
		chipsOverflowLeft = chipsEl.scrollLeft > 1;
		chipsOverflowRight = chipsEl.scrollLeft < max - 1;
	}

	$effect(() => {
		// Re-measure when the category list changes, not just on scroll.
		void data.categories;
		measureChips();
	});

	/* ------------------------------------------------ the filters popover */

	let filtersOpen = $state(false);
	let filterWrap = $state<HTMLElement | null>(null);

	function closeFilters() {
		filtersOpen = false;
	}

	/**
	 * Dismiss on outside click and on Escape.
	 *
	 * Deliberately not a modal dialog: it holds one select, and trapping focus
	 * for that would be heavier than the content warrants. Escape and
	 * click-outside are what a non-modal popover owes the user.
	 */
	function onDocumentPointer(event: MouseEvent) {
		if (filtersOpen && filterWrap && !filterWrap.contains(event.target as Node)) {
			closeFilters();
		}
	}

	function onDocumentKey(event: KeyboardEvent) {
		if (event.key === 'Escape' && filtersOpen) {
			closeFilters();
			// Return focus to the trigger, or it lands nowhere after the panel goes.
			filterWrap?.querySelector<HTMLButtonElement>('.filterbtn')?.focus();
		}
	}

	/* ----------------------------------------- the search keyboard shortcut */

	let searchBar = $state<HTMLElement | null>(null);

	/**
	 * Ctrl/⌘ K focuses the search field.
	 *
	 * No visible hint any more — the shortcut is a shortcut, not an advertisement.
	 * That also removes the platform detection the chip needed, since the handler
	 * accepts either modifier.
	 */
	onMount(() => {
		const onKeydown = async (event: KeyboardEvent) => {
			if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
			// Ctrl+K is a shell binding and Cmd+K is used by some browsers, so this
			// only takes over once the element can actually take focus.
			const el = searchBar as (HTMLElement & { setFocus?: () => Promise<void> }) | null;
			if (!el) return;
			await customElements.whenDefined('recipe-search-bar');
			event.preventDefault();
			await el.setFocus?.();
		};

		document.addEventListener('keydown', onKeydown);
		return () => document.removeEventListener('keydown', onKeydown);
	});

	// Hero image comes from the current results rather than a hardcoded asset, so
	// it always resolves and always reflects what the app can actually show.
	const heroImage = $derived(data.recipes.find((r) => r.image)?.image);
</script>

<svelte:head>
	<title>Discover recipes · Smart Rasoi</title>
	<meta name="description" content="Search and browse recipes from TheMealDB." />
</svelte:head>

<!-- Top level: svelte:document cannot sit inside an element or block. -->
<svelte:document onclick={onDocumentPointer} onkeydown={onDocumentKey} />
<svelte:window onresize={measureChips} />

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

	<div class="searchrow">
		<recipe-search-bar
			bind:this={searchBar}
			use:setProps={{
				value: data.query,
				placeholder: 'Search recipes by name…',
				iconSubmit: true
			}}
			use:on={{
				searchChange: (e) => navigate({ q: e.detail.query }),
				searchClear: () => navigate({ q: '' })
			}}
		></recipe-search-bar>

		<div class="filterwrap" bind:this={filterWrap}>
			<button
				type="button"
				class="filterbtn"
				class:filterbtn--on={filtersOpen || activeFilterCount > 0}
				aria-expanded={filtersOpen}
				aria-controls="filters-panel"
				onclick={() => (filtersOpen = !filtersOpen)}
			>
				<svg
					viewBox="0 0 24 24"
					aria-hidden="true"
					focusable="false"
					fill="none"
					stroke="currentColor"
					stroke-width="1.9"
					stroke-linecap="round"
				>
					<path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
					<circle cx="16" cy="7" r="2" />
					<circle cx="8" cy="17" r="2" />
				</svg>
				Filters
				{#if activeFilterCount}
					<span class="filterbtn__count">{activeFilterCount}</span>
				{/if}
			</button>

			{#if filtersOpen}
				<div class="filterpanel" id="filters-panel">
					<recipe-filter-panel
						use:setProps={{
							categories: [],
							areas: data.areas,
							selected: data.filters,
							hideClear: true
						}}
						use:on={{ filterChange: (e) => navigate({ filters: e.detail }) }}
					></recipe-filter-panel>

					<div class="filterpanel__foot">
						<button
							type="button"
							class="btn btn--sm"
							disabled={activeFilterCount === 0}
							onclick={() => navigate({ filters: {} })}
						>
							Reset
						</button>
						<button type="button" class="btn btn--sm btn--primary" onclick={closeFilters}>
							Done
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="chipsblock">
		<p class="chipsblock__label">Popular</p>

		<!--
			The pathname in every href below comes from resolve() inside buildUrl(), but
			the rule only inspects the attribute expression and cannot follow the helper.
			Scoped to this row rather than the file so a genuinely unresolved link
			elsewhere still fails the build.
		-->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<div
			class="pills"
			class:pills--more-right={chipsOverflowRight}
			class:pills--more-left={chipsOverflowLeft}
			role="group"
			aria-label="Filter by category"
			bind:this={chipsEl}
			onscroll={measureChips}
		>
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
					<span class="pill__dot" aria-hidden="true"></span>
					{category}
				</a>
			{/each}
		</div>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>

	{#if data.error}
		<p class="error" role="alert">
			<span>{data.error}</span>
			<button class="btn btn--sm" onclick={() => location.reload()}>Retry</button>
		</p>
	{/if}

	{#if results.length}
		<div class="resultshead">
			<p class="summary">
				<strong>{results.length}</strong> recipe{results.length === 1 ? '' : 's'}
				{#if data.query}matching “{data.query}”{/if}
				{#if activeFilterCount}
					· {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
				{/if}
				{#if totalPages > 1}
					· page {currentPage} of {totalPages}
				{/if}
			</p>

			<label class="sort">
				<span>Sort by</span>
				<select
					value={data.sort}
					onchange={(e) => navigate({ sort: e.currentTarget.value as Sort, page: 1 })}
				>
					{#each Object.entries(SORT_LABELS) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="card-grid">
			{#each pageItems as recipe (recipe.id)}
				<recipe-card
					style="--recipe-card-category-color: {categoryColor(
						recipe.category
					)}; --recipe-card-category-bg: {categoryTint(recipe.category)}"
					use:setProps={{ recipe, isFavorite: favorites.has(recipe.id) }}
					use:on={{
						favoriteToggle: (e) => favorites.set(e.detail.recipeId, e.detail.isFavorite),
						viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
					}}
				>
					{#if recipe.source === 'user'}
						<span slot="badge" class="badge">Mine</span>
					{/if}
				</recipe-card>
			{/each}
		</div>

		{#if totalPages > 1}
			<!-- Links again, for the same reason the category chips are links. -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<nav class="pager" aria-label="Pagination">
				<a
					class="pager__step"
					class:pager__step--off={currentPage === 1}
					href={pageHref(currentPage - 1)}
					aria-disabled={currentPage === 1}
					tabindex={currentPage === 1 ? -1 : undefined}
					data-sveltekit-noscroll
				>
					<span aria-hidden="true">‹</span>
					<span class="visually-hidden">Previous page</span>
				</a>

				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as n (n)}
					<a
						class="pager__num"
						class:pager__num--on={n === currentPage}
						href={pageHref(n)}
						aria-current={n === currentPage ? 'page' : undefined}
						aria-label="Page {n}"
						data-sveltekit-noscroll
					>
						{n}
					</a>
				{/each}

				<a
					class="pager__step"
					class:pager__step--off={currentPage === totalPages}
					href={pageHref(currentPage + 1)}
					aria-disabled={currentPage === totalPages}
					tabindex={currentPage === totalPages ? -1 : undefined}
					data-sveltekit-noscroll
				>
					<span aria-hidden="true">›</span>
					<span class="visually-hidden">Next page</span>
				</a>
			</nav>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	{:else if !data.error}
		<div class="empty-state">
			<h2>No recipes matched</h2>
			<p>Try a different search, clear the filters, or write your own recipe.</p>
			<a class="btn btn--primary" href={resolve('/my-recipes/new')}>Add a recipe</a>
		</div>
	{/if}
</div>

<style>
	/*
	 * The header is sticky, so the "Browse Recipes" anchor would otherwise scroll
	 * the gallery heading underneath it. Sized to the header plus a little air.
	 */
	#gallery {
		scroll-margin-top: 5.5rem;
	}

	/*
	 * Search is the page's primary control, so it stands alone on the background
	 * rather than inside a bordered panel with the filters. The old panel put a
	 * box around a box around a control.
	 */
	.searchrow {
		display: flex;
		gap: var(--space-3);
		align-items: stretch;
		margin-bottom: var(--space-4);
	}

	.searchrow recipe-search-bar {
		flex: 1;
		min-width: 0;
		/* Taller and softer than the component's default, which is sized for a
		   toolbar rather than for being the thing you look at first. */
		--search-radius: 16px;
		--search-pad-y: 0.625rem;
		--search-border: var(--border);
		--search-shadow: 0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px rgba(28, 25, 23, 0.05);
	}

	/* ------------------------------------------------- the filters popover */

	.filterwrap {
		position: relative;
		flex: 0 0 auto;
	}

	.filterbtn {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
		height: 100%;
		padding: 0 var(--space-4);
		font: inherit;
		font-size: var(--step--1);
		font-weight: 600;
		color: var(--text);
		cursor: pointer;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 16px;
	}

	.filterbtn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.filterbtn:hover {
		border-color: var(--accent-on-soft);
		color: var(--accent-on-soft);
	}

	.filterbtn--on {
		color: var(--accent-on-soft);
		background: var(--accent-soft);
		border-color: var(--accent-on-soft);
	}

	.filterbtn__count {
		display: grid;
		place-items: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.25rem;
		font-size: 0.75rem;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: 999px;
	}

	.filterpanel {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: 30;
		width: min(20rem, calc(100vw - 2rem));
		padding: var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: 0 12px 32px rgba(28, 25, 23, 0.12);
	}

	.filterpanel__foot {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
		margin-top: var(--space-3);
	}

	/* ------------------------------------------------------ category chips */

	.chipsblock {
		margin-bottom: var(--space-5);
	}

	/*
	 * The fades are masks rather than overlaid gradients, so they work over the
	 * page background whatever it is and never intercept a pointer heading for a
	 * chip underneath.
	 */
	.pills--more-right {
		mask-image: linear-gradient(to right, #000 calc(100% - 3rem), transparent);
	}

	.pills--more-left {
		mask-image: linear-gradient(to left, #000 calc(100% - 3rem), transparent);
	}

	.pills--more-left.pills--more-right {
		mask-image: linear-gradient(
			to right,
			transparent,
			#000 3rem,
			#000 calc(100% - 3rem),
			transparent
		);
	}

	.chipsblock__label {
		margin: 0 0 var(--space-2);
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--muted-strong);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	/* --------------------------------------------------- results and pager */

	.resultshead {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: baseline;
		justify-content: space-between;
		padding-bottom: var(--space-3);
		margin-bottom: var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.sort {
		display: inline-flex;
		gap: 0.5rem;
		align-items: center;
		font-size: var(--step--1);
		color: var(--muted-strong);
	}

	.sort select {
		padding: 0.375rem 0.5rem;
		font: inherit;
		font-size: var(--step--1);
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 8px;
	}

	.pager {
		display: flex;
		gap: 0.375rem;
		align-items: center;
		justify-content: center;
		margin-top: var(--space-5);
	}

	.pager__num,
	.pager__step {
		display: grid;
		place-items: center;
		min-width: 2.25rem;
		height: 2.25rem;
		padding: 0 0.5rem;
		font-size: var(--step--1);
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: 10px;
	}

	.pager__num:hover,
	.pager__step:hover {
		color: var(--accent-on-soft);
		border-color: var(--accent-on-soft);
		background: var(--surface-2);
	}

	.pager__num--on,
	.pager__num--on:hover {
		color: var(--accent-contrast);
		background: var(--accent);
		border-color: var(--accent);
	}

	/*
	 * The ends of the range stay in the DOM rather than disappearing, so the
	 * control does not reflow as you page through. aria-disabled plus
	 * tabindex="-1" is set in the markup; pointer-events keeps the click dead to
	 * match.
	 */
	.pager__step--off {
		color: var(--muted);
		border-color: var(--border);
		pointer-events: none;
	}

	/*
	 * Below this the search field and the Filters button cannot share a row
	 * without the field becoming too narrow to read a recipe name in.
	 */
	@media (max-width: 34rem) {
		.searchrow {
			flex-direction: column;
		}

		.filterbtn {
			width: 100%;
			height: auto;
			padding: 0.625rem var(--space-4);
			justify-content: center;
		}

		.filterpanel {
			right: auto;
			left: 0;
		}

		.resultshead {
			align-items: flex-start;
		}
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

	/*
	 * A dot in the category's colour rather than a pictogram. Twelve API
	 * categories do not have twelve legible glyphs at 17px — the first attempt
	 * had Chicken reading as a magnifying glass next to the search bar, and Goat,
	 * Lamb and Dessert reading as nothing. The dot carries the same colour the
	 * card label uses, so the two views agree.
	 */
	.pill__dot {
		width: 0.5rem;
		height: 0.5rem;
		flex: 0 0 auto;
		background: var(--pill-accent, var(--muted-strong));
		border-radius: 50%;
	}

	/* The "All recipes" pill keeps a glyph, since it is a reset rather than a
	   category and has no colour of its own. */
	.pill__icon {
		width: 1.05rem;
		height: 1.05rem;
		color: var(--muted-strong);
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

	/* Separate rules: `background` on the glyph would fill its box and render the
	   icon as a solid square. */
	.pill--on .pill__icon {
		color: currentColor;
	}

	.pill--on .pill__dot {
		background: currentColor;
	}

	.summary {
		margin: 0;
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
