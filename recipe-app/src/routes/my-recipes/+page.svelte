<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { on, setProps } from '$lib/components/stencil';
	import { categoryColor, categoryTint } from '$lib/components/categories';
	import { userRecipes, mealPlan, favorites } from '$lib/stores';
	import type { UserRecipe } from '$lib/stores';

	// Confirm before destroying data. Holds the pending id rather than a boolean,
	// so the prompt names the recipe and cannot apply to the wrong row.
	let pendingDelete = $state<UserRecipe | null>(null);

	function confirmDelete() {
		const target = pendingDelete;
		if (!target) return;

		userRecipes.remove(target.id);
		// Clean up references so the planner does not point at a deleted recipe.
		mealPlan.removeRecipe(target.id);
		favorites.set(target.id, false);
		pendingDelete = null;
	}
</script>

<svelte:head>
	<title>My recipes · Smart Rasoi</title>
</svelte:head>

<div class="container">
	<div class="page-head">
		<div>
			<h1>My recipes</h1>
			<p class="lede">
				{userRecipes.count === 0
					? 'Recipes you create are stored in this browser.'
					: `${userRecipes.count} recipe${userRecipes.count === 1 ? '' : 's'}, stored in this browser.`}
			</p>
		</div>
		<a class="btn btn--primary" href={resolve('/my-recipes/new')}>+ New recipe</a>
	</div>

	{#if pendingDelete}
		<div class="confirm" role="alertdialog" aria-labelledby="confirm-title">
			<p id="confirm-title">
				Delete <strong>{pendingDelete.title}</strong>? This also removes it from your favorites and
				meal plan, and cannot be undone.
			</p>
			<div class="confirm-actions">
				<button class="btn btn--delete" onclick={confirmDelete}>Delete</button>
				<button class="btn" onclick={() => (pendingDelete = null)}>Keep it</button>
			</div>
		</div>
	{/if}

	{#if userRecipes.count === 0}
		<div class="empty-state">
			<p>You have not added any recipes yet.</p>
			<a class="btn btn--primary" href={resolve('/my-recipes/new')}>Add your first recipe</a>
		</div>
	{:else}
		<div class="card-grid">
			{#each userRecipes.all as recipe (recipe.id)}
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
					<span slot="badge" class="badge">Mine</span>
					<a
						slot="actions"
						class="btn btn--sm btn--on-cream"
						href={resolve('/my-recipes/[id]/edit', { id: recipe.id })}
					>
						Edit
					</a>
					<button
						slot="actions"
						class="btn btn--sm btn--on-cream btn--danger"
						onclick={() => (pendingDelete = recipe)}
					>
						Delete
					</button>
				</recipe-card>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* These cards carry three actions (View / Edit / Delete) rather than two, and
	   the library's footer shrinks its items instead of wrapping, which made
	   "View recipe" break onto two lines. A wider minimum gives them one row. */
	.card-grid {
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
	}

	h1 {
		margin-bottom: 0;
	}

	.badge {
		padding: 0.1875rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: var(--radius-full);
	}

	.confirm {
		margin-bottom: var(--space-5);
		padding: var(--space-4);
		background: var(--danger-soft);
		border: 1px solid var(--danger-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
	}

	.confirm p {
		margin-bottom: var(--space-3);
		color: var(--danger-text);
	}

	.confirm-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.btn--delete {
		color: #fff;
		background: var(--danger);
		border-color: var(--danger);
	}

	.btn--delete:hover {
		color: #fff;
		filter: brightness(1.08);
	}
</style>
