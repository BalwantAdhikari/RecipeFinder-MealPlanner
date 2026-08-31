<script lang="ts">
	import { on, setProps } from '$lib/components/stencil';
	import { mealPlan, favorites, userRecipes, DAYS, today, type Day } from '$lib/stores';
	import { discover, lookupById, isExcludedCategory, mergeResults } from '$lib/api';
	import type { MealSlot, Recipe } from 'recipe-ui-components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currentDay = today();

	/**
	 * Favorites, resolved to full recipes.
	 *
	 * Favorites are stored as ids, so each has to be looked up — from the user's
	 * own store, or the API. Resolved once for the page rather than per-picker,
	 * because both the drag strip and the picker need them.
	 */
	let favoriteRecipes = $state<Recipe[]>([]);

	$effect(() => {
		const ids = favorites.ids;
		let cancelled = false;

		(async () => {
			const resolved = await Promise.all(
				ids.map(async (id) => {
					const local = userRecipes.get(id);
					if (local) return local;
					try {
						const remote = await lookupById(fetch, id);
						return remote && !isExcludedCategory(remote.category) ? remote : null;
					} catch {
						return null;
					}
				})
			);
			if (!cancelled) favoriteRecipes = resolved.filter((r): r is Recipe => r !== null);
		})();

		return () => {
			cancelled = true;
		};
	});

	// Picker state: which (day, slot) the user is filling, if any.
	let picking = $state<{ day: Day; slot: MealSlot } | null>(null);
	let pickerQuery = $state('');
	let remoteResults = $state<Recipe[]>([]);
	let searching = $state(false);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	/** Recipes the page already holds: the user's own, plus their favorites. */
	const localPool = $derived(mergeResults(userRecipes.all, favoriteRecipes));

	const localMatches = $derived(
		pickerQuery.trim()
			? localPool.filter((r) => r.title.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
			: localPool
	);

	/**
	 * What the picker lists.
	 *
	 * With no query this is the local pool plus the browse set, so a first-time
	 * user is not staring at an empty list. Once they type, the query also goes
	 * to the API — otherwise the picker could only ever find the handful of
	 * recipes already loaded, which is not much of a search.
	 */
	const pickerResults = $derived(
		pickerQuery.trim()
			? mergeResults(localMatches, remoteResults)
			: mergeResults(localPool, data.browse)
	);

	/**
	 * Search the API for picker candidates.
	 *
	 * Debounced so typing does not fan out into a request per keystroke, and
	 * skipped under two characters where the result set is meaninglessly broad.
	 * Uses `discover` rather than `searchByName` so excluded categories stay
	 * excluded here too.
	 */
	function onPickerInput(value: string) {
		pickerQuery = value;
		clearTimeout(searchTimer);

		const query = value.trim();
		if (query.length < 2) {
			remoteResults = [];
			searching = false;
			return;
		}

		searching = true;
		searchTimer = setTimeout(async () => {
			try {
				remoteResults = await discover(fetch, query, {});
			} catch {
				remoteResults = [];
			} finally {
				searching = false;
			}
		}, 300);
	}

	/**
	 * A favourite armed for placement.
	 *
	 * HTML5 drag-and-drop only fires from mouse input — touch never produces a
	 * `dragstart` — so dragging is unavailable on phones and in device emulation.
	 * Arming a recipe and then choosing a slot works with any input, and makes the
	 * strip keyboard-operable too, which `<div draggable>` never was.
	 */
	let armed = $state<Recipe | null>(null);

	function toggleArmed(recipe: Recipe) {
		armed = armed?.id === recipe.id ? null : recipe;
	}

	/**
	 * A slot was activated.
	 *
	 * With a recipe armed this places it directly; otherwise it opens the picker,
	 * which is the original behaviour.
	 */
	function onSlotActivate(day: Day, slot: MealSlot) {
		if (armed) {
			mealPlan.assign(day, slot, armed);
			armed = null;
			return;
		}
		picking = { day, slot };
		closeSearch();
	}

	function closeSearch() {
		clearTimeout(searchTimer);
		pickerQuery = '';
		remoteResults = [];
		searching = false;
	}

	function assign(recipe: Recipe) {
		if (!picking) return;
		mealPlan.assign(picking.day, picking.slot, recipe);
		picking = null;
		closeSearch();
	}

	/**
	 * Resolve a dropped recipe id to something with a title.
	 *
	 * The drag only carries an id, so the title has to come from somewhere the
	 * page already knows about, or a lookup.
	 */
	async function resolveDropped(id: string): Promise<Recipe | null> {
		const local =
			userRecipes.get(id) ??
			favoriteRecipes.find((r) => r.id === id) ??
			data.browse.find((r) => r.id === id);
		if (local) return local;
		try {
			return await lookupById(fetch, id);
		} catch {
			return null;
		}
	}

	const planned = $derived(mealPlan.count);

	/** Move focus to the picker's filter input when it opens. */
	function focusOnMount(node: HTMLElement) {
		node.focus();
	}
</script>

<svelte:head>
	<title>Weekly meal plan · Smart Rasoi</title>
</svelte:head>

<div class="container">
	<div class="page-head">
		<div>
			<h1>Weekly meal plan</h1>
			<p class="lede">
				{planned === 0
					? 'Assign recipes to any day. Drag a card here, or use the + Add buttons.'
					: `${planned} of 21 slots planned.`}
			</p>
		</div>
		{#if planned > 0}
			<button class="btn btn--danger" onclick={() => mealPlan.clear()}>Clear week</button>
		{/if}
	</div>

	{#if picking}
		<div class="picker" role="dialog" aria-label="Choose a recipe">
			<div class="picker-head">
				<strong>
					Choose a recipe for {picking.slot} on {picking.day}
				</strong>
				<button class="btn btn--sm" onclick={() => (picking = null)} aria-label="Close picker"
					>Close</button
				>
			</div>

			<!-- Focused programmatically rather than with the autofocus attribute, which
		     is flagged for a11y: it steals focus on page load. Here the input only
		     appears in response to a click, so moving focus to it is expected. -->
			<input
				value={pickerQuery}
				oninput={(e) => onPickerInput(e.currentTarget.value)}
				placeholder="Search all recipes by name…"
				aria-label="Search recipes"
				use:focusOnMount
			/>

			{#if searching && pickerResults.length === 0}
				<p class="muted" role="status">Searching…</p>
			{:else if pickerResults.length === 0}
				<p class="muted">
					{pickerQuery.trim().length === 1
						? 'Keep typing to search.'
						: 'No recipes matched that name.'}
				</p>
			{:else}
				<ul class="candidates">
					{#each pickerResults as recipe (recipe.id)}
						<li>
							<button onclick={() => assign(recipe)}>
								{#if recipe.image}
									<img src={recipe.image} alt="" />
								{:else}
									<span class="thumb-placeholder" aria-hidden="true">🍽</span>
								{/if}
								<span class="cand-title">{recipe.title}</span>
								{#if recipe.source === 'user'}<span class="mine">mine</span>{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<h2 class="visually-hidden">Your week</h2>

	<div class="week">
		{#each DAYS as day (day)}
			<meal-plan-day
				use:setProps={{
					day,
					meals: mealPlan.forDay(day),
					isToday: day === currentDay
				}}
				use:on={{
					addMealRequest: (e) => onSlotActivate(e.detail.day as Day, e.detail.slot),
					removeMeal: (e) => mealPlan.unassign(e.detail.day as Day, e.detail.slot),
					mealDrop: async (e) => {
						const recipe = await resolveDropped(e.detail.recipeId);
						if (recipe) mealPlan.assign(e.detail.day as Day, e.detail.slot, recipe);
					}
				}}
			>
				<small slot="footer" class="day-summary">
					{mealPlan.filledCount(day)}/3 planned
				</small>
			</meal-plan-day>
		{/each}
	</div>

	{#if favoriteRecipes.length > 0}
		<section class="drag-source">
			<h2>Add a favourite to a slot</h2>
			<p class="lede">
				{#if armed}
					<strong>{armed.title}</strong> is selected — now choose a slot above.
				{:else}
					Select one, then choose a slot. On a mouse you can also drag it across.
				{/if}
			</p>

			{#if armed}
				<button class="btn btn--sm" onclick={() => (armed = null)}>Cancel selection</button>
			{/if}

			<!-- Buttons rather than `<div draggable>`: draggable divs are invisible to
			     the keyboard, and drag alone leaves touch users with no route at all.
			     The buttons also make the scroll region focusable, so axe's
			     scrollable-region-focusable rule is satisfied without a tabindex. -->
			<ul class="strip" aria-label="Favourite recipes">
				{#each favoriteRecipes as recipe (recipe.id)}
					<li>
						<button
							class="chip-card"
							class:chip-card--armed={armed?.id === recipe.id}
							aria-pressed={armed?.id === recipe.id}
							draggable="true"
							ondragstart={(e) => e.dataTransfer?.setData('text/plain', recipe.id)}
							onclick={() => toggleArmed(recipe)}
						>
							{#if recipe.image}<img src={recipe.image} alt="" />{/if}
							<span>{recipe.title}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	h1 {
		margin-bottom: 0;
	}

	/*
	 * Explicit column counts rather than auto-fit.
	 *
	 * Seven items never divide evenly, so auto-fit picks whatever fits and leaves
	 * a ragged orphan row — at 740px it chose four cramped ~150px columns with a
	 * row of three beneath. Stepping deliberately keeps each column wide enough
	 * to read a meal name, and only claims the full week-at-a-glance row when
	 * there is genuinely space for it.
	 *
	 * `align-items: stretch` (the default, stated for clarity) matters here: a day
	 * holding a meal is taller than an empty one, and without it the cards in a
	 * row end at different heights.
	 */
	.week {
		display: grid;
		gap: var(--space-3);
		grid-template-columns: 1fr;
		align-items: stretch;
	}

	/* Two up: columns stay wide enough that titles rarely truncate. */
	@media (min-width: 560px) {
		.week {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	/* Four up, wrapping 4 + 3. */
	@media (min-width: 900px) {
		.week {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	/* The whole week on one row — the point of the view — once seven columns can
	   each hold a name without shrinking to nothing. */
	@media (min-width: 1200px) {
		.week {
			grid-template-columns: repeat(7, minmax(0, 1fr));
		}
	}

	/* Projected into meal-plan-day's cream card via the footer slot, so this is
	   ink context even though the surrounding page is brown. */
	.day-summary {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--ink-muted);
	}

	.picker {
		position: sticky;
		top: 4.25rem;
		z-index: 10;
		display: grid;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
		padding: var(--space-4);
		background: var(--bg-soft);
		border: 1px solid var(--accent);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-3);
	}

	.picker-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.picker input {
		width: 100%;
		padding: 0.5rem 0.6875rem;
		font: inherit;
		font-size: var(--step-0);
		color: var(--cream);
		background: var(--bg);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
	}

	.candidates {
		display: grid;
		gap: var(--space-1);
		max-height: 17rem;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.candidates button {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2);
		font: inherit;
		font-size: var(--step-0);
		color: var(--cream);
		text-align: left;
		cursor: pointer;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		transition:
			background 120ms var(--ease),
			border-color 120ms var(--ease);
	}

	.candidates button:hover {
		background: var(--bg-soft);
		border-color: var(--border);
	}

	.candidates img,
	.thumb-placeholder {
		flex-shrink: 0;
		width: 2.25rem;
		height: 2.25rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
	}

	.thumb-placeholder {
		display: grid;
		place-items: center;
		background: var(--bg-soft);
	}

	.cand-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mine {
		flex-shrink: 0;
		padding: 0.125rem 0.4375rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: var(--radius-full);
	}

	.drag-source {
		margin-top: var(--space-7);
		padding-top: var(--space-5);
		border-top: 1px solid var(--border);
	}

	.strip {
		display: flex;
		gap: var(--space-3);
		margin: var(--space-4) 0 0;
		padding: 0 0 var(--space-2);
		overflow-x: auto;
		scrollbar-width: thin;
		list-style: none;
	}

	.strip li {
		flex-shrink: 0;
	}

	.chip-card {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		gap: var(--space-2);
		width: 8.5rem;
		padding: var(--space-2);
		/* These tiles are <button>s, so each of these resets an unwanted UA default:
		   without `font` they render in Arial rather than the app stack, without
		   `color` they take `buttontext` (pure black on the brown tile), and
		   without `text-align` the label is centred while every other card in the
		   app is left-aligned. */
		font: inherit;
		font-size: var(--step--1);
		font-weight: 500;
		color: var(--cream);
		text-align: left;
		cursor: grab;
		background: var(--bg-soft);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow-1);
		transition:
			box-shadow 160ms var(--ease),
			transform 160ms var(--ease);
	}

	.chip-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-2);
	}

	.chip-card:active {
		cursor: grabbing;
		transform: none;
	}

	.chip-card img {
		width: 100%;
		height: 4rem;
		object-fit: cover;
		border-radius: var(--radius-sm);
	}

	.chip-card span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.muted {
		font-size: var(--step-0);
		color: var(--cream-muted);
	}
</style>
