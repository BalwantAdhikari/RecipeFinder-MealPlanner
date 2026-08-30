<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import { recipeToDraft, emptyDraft } from '$lib/validation';
	import { userRecipes, mealPlan } from '$lib/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const id = $derived(page.params.id ?? '');
	const existing = $derived(userRecipes.get(id));

	// The store reads localStorage, so on the server `existing` is always
	// undefined and the draft fills in on hydration. Keyed on the id below so the
	// form remounts with the right values once it resolves.
	let draft = $state(emptyDraft());
	let loadedFor = $state('');

	$effect(() => {
		if (existing && loadedFor !== existing.id) {
			draft = recipeToDraft(existing);
			loadedFor = existing.id;
		}
	});
</script>

<svelte:head>
	<title>{existing ? `Edit ${existing.title}` : 'Edit recipe'} · Recipe Finder</title>
</svelte:head>

<div class="container container--tight">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href={resolve('/my-recipes')}>My recipes</a> / Edit
	</nav>

	{#if !existing}
		<h1>Recipe not found</h1>
		<p class="muted">
			Only recipes you created can be edited, and they are stored in this browser. This one may have
			been deleted or created elsewhere.
		</p>
		<a class="cta" href={resolve('/my-recipes')}>Back to my recipes</a>
	{:else}
		<h1>Edit recipe</h1>

		<div class="card on-cream form-card">
			<RecipeForm
				bind:draft
				categories={data.categories}
				submitLabel="Save changes"
				onsubmit={(recipe) => {
					const updated = userRecipes.update(id, recipe);
					// Keep the planner's denormalised title/image in step.
					if (updated) mealPlan.syncRecipe(updated);
					goto(resolve('/recipes/[id]', { id }));
				}}
				oncancel={() => goto(resolve('/recipes/[id]', { id }))}
			/>
		</div>
	{/if}
</div>

<style>
	.crumbs {
		margin-bottom: 0.5rem;
		font-size: 0.8125rem;
		color: var(--muted);
	}

	h1 {
		margin-top: 0;
	}

	.muted {
		color: var(--muted);
	}

	.cta {
		display: inline-block;
		padding: 0.5rem 1rem;
		color: var(--accent-contrast);
		text-decoration: none;
		background: var(--accent);
		border-radius: var(--radius-sm);
	}

	.form-card {
		padding: var(--space-5);
	}

	.crumbs a {
		color: var(--cream-muted);
	}
</style>
