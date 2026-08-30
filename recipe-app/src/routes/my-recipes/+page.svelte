<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { on, setProps } from '$lib/components/stencil';
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
	<title>My recipes · Recipe Finder</title>
</svelte:head>

<header class="head">
	<div>
		<h1>My recipes</h1>
		<p class="lede">
			{userRecipes.count === 0
				? 'Recipes you create are stored in this browser.'
				: `${userRecipes.count} recipe${userRecipes.count === 1 ? '' : 's'}, stored in this browser.`}
		</p>
	</div>
	<a class="cta" href={resolve('/my-recipes/new')}>+ New recipe</a>
</header>

{#if pendingDelete}
	<div class="confirm" role="alertdialog" aria-labelledby="confirm-title">
		<p id="confirm-title">
			Delete <strong>{pendingDelete.title}</strong>? This also removes it from your favorites and
			meal plan, and cannot be undone.
		</p>
		<div class="confirm-actions">
			<button class="danger" onclick={confirmDelete}>Delete</button>
			<button onclick={() => (pendingDelete = null)}>Keep it</button>
		</div>
	</div>
{/if}

{#if userRecipes.count === 0}
	<div class="empty">
		<p>You have not added any recipes yet.</p>
		<a class="cta" href={resolve('/my-recipes/new')}>Add your first recipe</a>
	</div>
{:else}
	<div class="grid">
		{#each userRecipes.all as recipe (recipe.id)}
			<recipe-card
				use:setProps={{ recipe, isFavorite: favorites.has(recipe.id) }}
				use:on={{
					favoriteToggle: (e) => favorites.set(e.detail.recipeId, e.detail.isFavorite),
					viewDetails: (e) => goto(resolve('/recipes/[id]', { id: e.detail.recipeId }))
				}}
			>
				<span slot="badge" class="badge">✎ mine</span>
				<a slot="actions" class="ghost" href={resolve('/my-recipes/[id]/edit', { id: recipe.id })}>
					Edit
				</a>
				<button slot="actions" class="ghost ghost--danger" onclick={() => (pendingDelete = recipe)}>
					Delete
				</button>
			</recipe-card>
		{/each}
	</div>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0 0 0.25rem;
	}

	.lede {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--muted);
	}

	.cta {
		padding: 0.5rem 1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--accent-contrast);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}

	.confirm {
		margin-bottom: 1.25rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius);
	}

	.confirm p {
		margin: 0 0 0.75rem;
		color: #7f1d1d;
	}

	.confirm-actions {
		display: flex;
		gap: 0.5rem;
	}

	.confirm-actions button {
		padding: 0.4375rem 0.875rem;
		font: inherit;
		font-size: 0.875rem;
		cursor: pointer;
		background: #fff;
		border: 1px solid #fecaca;
		border-radius: var(--radius-sm);
	}

	.confirm-actions .danger {
		color: #fff;
		background: #dc2626;
		border-color: #dc2626;
	}

	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	}

	.badge {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		color: var(--accent-contrast);
		background: var(--accent);
		border-radius: 999px;
	}

	.ghost {
		padding: 0.4rem 0.6rem;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text);
		text-decoration: none;
		cursor: pointer;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.ghost:hover {
		color: var(--accent-text);
		border-color: var(--accent);
	}

	.ghost--danger:hover {
		color: var(--danger-text);
		border-color: #dc2626;
	}

	.empty {
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--muted);
		background: var(--surface);
		border: 1px dashed var(--border);
		border-radius: var(--radius);
	}

	@media (prefers-color-scheme: dark) {
		.confirm {
			background: #450a0a;
			border-color: #7f1d1d;
		}

		.confirm p {
			color: #fecaca;
		}

		.confirm-actions button {
			color: #fecaca;
			background: #7f1d1d;
			border-color: #991b1b;
		}
	}
</style>
