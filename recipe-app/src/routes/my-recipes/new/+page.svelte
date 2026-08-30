<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import RecipeForm from '$lib/components/RecipeForm.svelte';
	import { emptyDraft } from '$lib/validation';
	import { userRecipes } from '$lib/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let draft = $state(emptyDraft());
</script>

<svelte:head>
	<title>New recipe · Recipe Finder</title>
</svelte:head>

<nav class="crumbs" aria-label="Breadcrumb">
	<a href={resolve('/my-recipes')}>My recipes</a> / New
</nav>

<h1>New recipe</h1>

<RecipeForm
	bind:draft
	categories={data.categories}
	submitLabel="Save recipe"
	onsubmit={(recipe) => {
		const created = userRecipes.create(recipe);
		goto(resolve('/recipes/[id]', { id: created.id }));
	}}
	oncancel={() => goto(resolve('/my-recipes'))}
/>

<style>
	.crumbs {
		margin-bottom: 0.5rem;
		font-size: 0.8125rem;
		color: var(--muted);
	}

	h1 {
		margin-top: 0;
	}
</style>
