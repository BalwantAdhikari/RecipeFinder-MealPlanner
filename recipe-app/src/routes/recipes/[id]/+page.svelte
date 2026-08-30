<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { on, setProps } from '$lib/components/stencil';
	import { favorites, userRecipes, mealPlan, today, isUserRecipeId } from '$lib/stores';
	import type { Recipe } from 'recipe-ui-components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// API recipes come from the load function; user recipes live in localStorage,
	// which the server cannot read, so they are resolved here instead. Uses the
	// route param rather than `location`, which does not exist during SSR — the
	// store returns undefined on the server and fills in on hydration.
	const recipe = $derived<Recipe | undefined>(
		data.isUserRecipe ? userRecipes.get(page.params.id ?? '') : (data.recipe ?? undefined)
	);

	const isFavorite = $derived(recipe ? favorites.has(recipe.id) : false);
</script>

<svelte:head>
	<title>{recipe?.title ?? 'Recipe'} · Recipe Finder</title>
</svelte:head>

<div class="container container--tight">
	{#if data.error}
		<p class="error" role="alert">{data.error}</p>
	{:else if !recipe}
		<div class="empty-state">
			<h1>Recipe not found</h1>
			<p>
				{#if data.isUserRecipe}
					This recipe was created on another browser, or has been deleted.
				{:else}
					We could not find that recipe.
				{/if}
			</p>
			<a class="btn btn--primary" href={resolve('/')}>Back to discovery</a>
		</div>
	{:else}
		<article class="card on-cream">
			<header class="head">
				{#if recipe.image}
					<img class="recipe-photo" src={recipe.image} alt={recipe.title} />
				{/if}

				<div class="meta">
					<h1>{recipe.title}</h1>

					<p class="chips">
						{#if recipe.category}<span class="chip">{recipe.category}</span>{/if}
						{#if recipe.area}<span class="chip">{recipe.area}</span>{/if}
						{#if recipe.source === 'user'}<span class="chip chip--mine">✎ mine</span>{/if}
					</p>

					{#if recipe.tags?.length}
						<p class="tags">{recipe.tags.join(' · ')}</p>
					{/if}

					<div class="actions">
						<button class:active={isFavorite} onclick={() => favorites.set(recipe.id, !isFavorite)}>
							{isFavorite ? '★ Favorited' : '☆ Add to favorites'}
						</button>

						<button
							class="btn"
							onclick={() => {
								mealPlan.assign(today(), 'dinner', recipe);
								goto(resolve('/meal-plan'));
							}}
						>
							Add to meal plan
						</button>

						{#if isUserRecipeId(recipe.id)}
							<a class="btn" href={resolve('/my-recipes/[id]/edit', { id: recipe.id })}>Edit</a>
						{/if}
					</div>

					<recipe-rating use:setProps={{ value: 4, readonly: true }} use:on={{ rate: () => {} }}
					></recipe-rating>
				</div>
			</header>

			<div class="body">
				<section>
					<h2>Ingredients</h2>
					{#if recipe.ingredients?.length}
						<ul class="ingredients">
							<!-- Keyed by index: ingredient names legitimately repeat (a flan lists
						     sugar for the caramel and again for the custard), and duplicate
						     keys are a runtime error. The list is static per render. -->
							{#each recipe.ingredients as ing, i (i)}
								<li>
									<span>{ing.name}</span>
									{#if ing.measure}<span class="measure">{ing.measure}</span>{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="muted">No ingredients listed.</p>
					{/if}
				</section>

				<section>
					<h2>Instructions</h2>
					{#if recipe.instructions?.length}
						<ol class="steps">
							{#each recipe.instructions as step, i (i)}
								<li>{step}</li>
							{/each}
						</ol>
					{:else}
						<p class="muted">No instructions listed.</p>
					{/if}
				</section>
			</div>
		</article>
	{/if}
</div>

<style>
	article {
		padding: var(--space-5);
	}

	.head {
		display: grid;
		gap: var(--space-5);
		margin-bottom: var(--space-6);
	}

	.recipe-photo {
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		border-radius: var(--radius);
		box-shadow: var(--shadow-2);
	}

	h1 {
		margin-bottom: var(--space-3);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.chip {
		padding: 0.1875rem 0.625rem;
		font-size: var(--step--1);
		font-weight: 500;
		color: var(--ink-muted);
		background: var(--surface-2);
		border-radius: var(--radius-full);
	}

	.chip--mine {
		color: var(--accent-contrast);
		background: var(--accent);
	}

	.tags {
		margin-bottom: var(--space-4);
		font-size: var(--step--1);
		color: var(--ink-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.actions .active {
		color: var(--accent-deep);
		border-color: var(--accent);
		background: var(--surface-2);
	}

	.body {
		display: grid;
		gap: var(--space-6);
	}

	@media (min-width: 760px) {
		.head {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}

		.body {
			grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		}
	}

	h2 {
		margin-bottom: var(--space-4);
		font-size: var(--step-1);
	}

	.ingredients {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--border-cream);
	}

	.ingredients li {
		display: flex;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--border-cream);
	}

	.measure {
		flex-shrink: 0;
		font-size: var(--step--1);
		font-variant-numeric: tabular-nums;
		color: var(--ink-muted);
	}

	.steps {
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: step;
	}

	.steps li {
		position: relative;
		margin-bottom: var(--space-4);
		padding-left: 2.25rem;
		counter-increment: step;
	}

	/* Numbered badges instead of a plain <ol> marker: recipe steps are the thing
	   you follow with your eyes while cooking, so they want a clear anchor. */
	.steps li::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: 0.125rem;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		font-size: var(--step--1);
		font-weight: 600;
		color: var(--accent-deep);
		background: var(--surface-2);
		border-radius: var(--radius-full);
	}

	.muted {
		color: var(--ink-muted);
	}

	.error {
		padding: var(--space-3) var(--space-4);
		color: var(--danger-text);
		background: var(--danger-soft);
		border: 1px solid var(--danger-border);
		border-radius: var(--radius);
	}
</style>
