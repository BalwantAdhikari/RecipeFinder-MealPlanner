<script lang="ts">
	import { on, setProps } from '$lib/components/stencil';
	import { mealPlan, favorites, userRecipes, DAYS, today, type Day } from '$lib/stores';
	import { lookupById, isExcludedCategory } from '$lib/api';
	import type { MealSlot, Recipe } from 'recipe-ui-components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currentDay = today();

	// Picker state: which (day, slot) the user is filling, if any.
	let picking = $state<{ day: Day; slot: MealSlot } | null>(null);
	let pickerQuery = $state('');

	/**
	 * Candidates for the picker: the user's own recipes plus favorites, since
	 * those are the recipes someone actually plans with. Falls back to the browse
	 * list from the load function so a first-time user has something to choose.
	 */
	let candidates = $state<Recipe[]>([]);

	$effect(() => {
		if (!picking) return;
		let cancelled = false;

		(async () => {
			const favs = await Promise.all(
				favorites.ids.map(async (id) => {
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
			if (cancelled) return;

			// Transient de-duplication, discarded when this block ends.
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const seen = new Set<string>();
			candidates = [...userRecipes.all, ...favs.filter((r): r is Recipe => !!r), ...data.browse]
				.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
				.slice(0, 60);
		})();

		return () => {
			cancelled = true;
		};
	});

	const filteredCandidates = $derived(
		pickerQuery.trim()
			? candidates.filter((r) => r.title.toLowerCase().includes(pickerQuery.trim().toLowerCase()))
			: candidates
	);

	function assign(recipe: Recipe) {
		if (!picking) return;
		mealPlan.assign(picking.day, picking.slot, recipe);
		picking = null;
		pickerQuery = '';
	}

	/**
	 * Resolve a dropped recipe id to something with a title.
	 *
	 * The drag only carries an id, so the title has to come from somewhere the
	 * page already knows about, or a lookup.
	 */
	async function resolveDropped(id: string): Promise<Recipe | null> {
		const local = userRecipes.get(id) ?? candidates.find((r) => r.id === id);
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
	<title>Weekly meal plan · Recipe Finder</title>
</svelte:head>

<header class="head">
	<div>
		<h1>Weekly meal plan</h1>
		<p class="lede">
			{planned === 0
				? 'Assign recipes to any day. Drag a card here, or use the + Add buttons.'
				: `${planned} of 21 slots planned.`}
		</p>
	</div>
	{#if planned > 0}
		<button class="ghost" onclick={() => mealPlan.clear()}>Clear week</button>
	{/if}
</header>

{#if picking}
	<div class="picker" role="dialog" aria-label="Choose a recipe">
		<div class="picker-head">
			<strong>
				Choose a recipe for {picking.slot} on {picking.day}
			</strong>
			<button class="icon" onclick={() => (picking = null)} aria-label="Close picker">✕</button>
		</div>

		<!-- Focused programmatically rather than with the autofocus attribute, which
		     is flagged for a11y: it steals focus on page load. Here the input only
		     appears in response to a click, so moving focus to it is expected. -->
		<input
			bind:value={pickerQuery}
			placeholder="Filter by name…"
			aria-label="Filter recipes"
			use:focusOnMount
		/>

		{#if filteredCandidates.length === 0}
			<p class="muted">
				No matches. {candidates.length === 0
					? 'Add a recipe or star some favorites first.'
					: 'Try a different name.'}
			</p>
		{:else}
			<ul class="candidates">
				{#each filteredCandidates as recipe (recipe.id)}
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
				addMealRequest: (e) => {
					picking = { day: e.detail.day as Day, slot: e.detail.slot };
					pickerQuery = '';
				},
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

<section class="drag-source">
	<h2>Drag any of these onto a slot</h2>
	<p class="lede">Or open a recipe and use “Add to meal plan”.</p>
	<div class="strip" role="list">
		{#each data.browse.slice(0, 8) as recipe (recipe.id)}
			<div
				class="chip-card"
				draggable="true"
				ondragstart={(e) => e.dataTransfer?.setData('text/plain', recipe.id)}
				role="listitem"
			>
				{#if recipe.image}<img src={recipe.image} alt="" />{/if}
				<span>{recipe.title}</span>
			</div>
		{/each}
	</div>
</section>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	h1 {
		margin: 0 0 0.25rem;
	}

	.lede {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--muted);
	}

	.week {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		align-items: start;
	}

	/* Pin all seven days to one row once there is room. With auto-fit alone the
	   last day wraps onto its own line, which breaks reading the week at a
	   glance — the whole point of the view. */
	@media (min-width: 1080px) {
		.week {
			grid-template-columns: repeat(7, minmax(0, 1fr));
		}
	}

	.day-summary {
		font-size: 0.6875rem;
		color: var(--muted);
	}

	.picker {
		position: sticky;
		top: 4rem;
		z-index: 5;
		display: grid;
		gap: 0.625rem;
		margin-bottom: 1.25rem;
		padding: 1rem;
		background: var(--surface);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
	}

	.picker-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.picker input {
		width: 100%;
		padding: 0.5rem 0.625rem;
		font: inherit;
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.candidates {
		display: grid;
		gap: 0.25rem;
		max-height: 16rem;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.candidates button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.5rem;
		font: inherit;
		font-size: 0.875rem;
		color: var(--text);
		text-align: left;
		cursor: pointer;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
	}

	.candidates button:hover {
		background: var(--bg);
		border-color: var(--border);
	}

	.candidates img,
	.thumb-placeholder {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		object-fit: cover;
		border-radius: 4px;
	}

	.thumb-placeholder {
		display: grid;
		place-items: center;
		background: var(--bg);
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
		padding: 0.0625rem 0.375rem;
		font-size: 0.625rem;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: 999px;
	}

	.icon {
		width: 1.75rem;
		height: 1.75rem;
		font: inherit;
		color: var(--muted);
		cursor: pointer;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 6px;
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
		color: var(--danger-text);
		border-color: #dc2626;
	}

	.drag-source {
		margin-top: 2.5rem;
	}

	.drag-source h2 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
	}

	.strip {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-bottom: 0.5rem;
		overflow-x: auto;
	}

	.chip-card {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		gap: 0.25rem;
		width: 7.5rem;
		padding: 0.5rem;
		font-size: 0.75rem;
		cursor: grab;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.chip-card:active {
		cursor: grabbing;
	}

	.chip-card img {
		width: 100%;
		height: 3.5rem;
		object-fit: cover;
		border-radius: 4px;
	}

	.muted {
		margin: 0;
		font-size: 0.875rem;
		color: var(--muted);
	}
</style>
