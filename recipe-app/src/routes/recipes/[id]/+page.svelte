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

{#if data.error}
	<p class="error" role="alert">{data.error}</p>
{:else if !recipe}
	<div class="empty">
		<h1>Recipe not found</h1>
		<p>
			{#if data.isUserRecipe}
				This recipe was created on another browser, or has been deleted.
			{:else}
				We could not find that recipe.
			{/if}
		</p>
		<a class="cta" href={resolve('/')}>Back to discovery</a>
	</div>
{:else}
	<article>
		<header class="head">
			{#if recipe.image}
				<img class="hero" src={recipe.image} alt={recipe.title} />
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
						onclick={() => {
							mealPlan.assign(today(), 'dinner', recipe);
							goto(resolve('/meal-plan'));
						}}
					>
						Add to meal plan
					</button>

					{#if isUserRecipeId(recipe.id)}
						<a href={resolve('/my-recipes/[id]/edit', { id: recipe.id })}>Edit</a>
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

<style>
	.head {
		display: grid;
		gap: 1.25rem;
		margin-bottom: 2rem;
	}

	.hero {
		width: 100%;
		max-height: 340px;
		object-fit: cover;
		border-radius: var(--radius);
	}

	h1 {
		margin: 0 0 0.5rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin: 0 0 0.5rem;
	}

	.chip {
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: var(--muted);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 999px;
	}

	.chip--mine {
		color: var(--accent-contrast);
		background: var(--accent);
		border-color: var(--accent);
	}

	.tags {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: var(--muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.actions button,
	.actions a {
		padding: 0.4375rem 0.875rem;
		font: inherit;
		font-size: 0.875rem;
		color: var(--text);
		text-decoration: none;
		cursor: pointer;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.actions button.active {
		color: var(--accent);
		border-color: var(--accent);
	}

	.body {
		display: grid;
		gap: 2rem;
	}

	@media (min-width: 720px) {
		.head {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}

		.body {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
		}
	}

	h2 {
		font-size: 1rem;
		margin: 0 0 0.75rem;
	}

	.ingredients {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ingredients li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.4375rem 0;
		border-bottom: 1px solid var(--border);
	}

	.measure {
		flex-shrink: 0;
		font-size: 0.875rem;
		color: var(--muted);
	}

	.steps {
		margin: 0;
		padding-left: 1.25rem;
	}

	.steps li {
		margin-bottom: 0.75rem;
	}

	.muted {
		color: var(--muted);
	}

	.error {
		padding: 0.75rem 1rem;
		color: #7f1d1d;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-sm);
	}

	.empty {
		padding: 3rem 1rem;
		text-align: center;
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
