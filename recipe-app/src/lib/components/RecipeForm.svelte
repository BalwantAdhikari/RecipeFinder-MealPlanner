<script lang="ts">
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		validateDraft,
		isValid,
		draftToRecipe,
		LIMITS,
		type RecipeDraft,
		type FieldErrors
	} from '$lib/validation';

	interface Props {
		draft: RecipeDraft;
		categories: string[];
		submitLabel: string;
		onsubmit: (recipe: ReturnType<typeof draftToRecipe>) => void;
		oncancel: () => void;
	}

	let { draft = $bindable(), categories, submitLabel, onsubmit, oncancel }: Props = $props();

	// Errors are computed continuously but only *shown* for fields the user has
	// touched, or after a submit attempt. Otherwise a pristine form is covered in
	// red before they have typed anything.
	const errors = $derived<FieldErrors>(validateDraft(draft));
	const valid = $derived(isValid(errors));

	// SvelteSet is reactive on mutation, so `.add()` alone re-renders.
	const touched = new SvelteSet<string>();
	let submitAttempted = $state(false);

	function markTouched(field: string) {
		touched.add(field);
	}

	function showError(field: keyof RecipeDraft): string | undefined {
		return submitAttempted || touched.has(field) ? errors[field] : undefined;
	}

	function addIngredient() {
		draft.ingredients = [...draft.ingredients, { name: '', measure: '' }];
	}

	function removeIngredient(index: number) {
		// Always leave one row so the field cannot disappear entirely.
		draft.ingredients =
			draft.ingredients.length === 1
				? [{ name: '', measure: '' }]
				: draft.ingredients.filter((_, i) => i !== index);
	}

	function addStep() {
		draft.instructions = [...draft.instructions, ''];
	}

	function removeStep(index: number) {
		draft.instructions =
			draft.instructions.length === 1 ? [''] : draft.instructions.filter((_, i) => i !== index);
	}

	function moveStep(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= draft.instructions.length) return;
		const next = [...draft.instructions];
		[next[index], next[target]] = [next[target], next[index]];
		draft.instructions = next;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		submitAttempted = true;

		if (!valid) {
			// Move focus to the first invalid control so keyboard and screen-reader
			// users are told what to fix rather than left on a dead button.
			//
			// `await tick()` is required: setting submitAttempted is what causes the
			// aria-invalid attributes to render, and without waiting for that flush
			// the query finds nothing and focus stays on the submit button.
			await tick();
			form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
			return;
		}

		onsubmit(draftToRecipe(draft));
	}

	// Scope the focus query to this form rather than the document, so a second
	// form on the page could never steal it.
	let form: HTMLFormElement | undefined = $state();
</script>

<form bind:this={form} onsubmit={handleSubmit} novalidate>
	<div class="field">
		<label for="title">Title <span class="req">*</span></label>
		<input
			id="title"
			bind:value={draft.title}
			onblur={() => markTouched('title')}
			maxlength={LIMITS.titleMax + 1}
			aria-invalid={showError('title') ? 'true' : undefined}
			aria-describedby={showError('title') ? 'title-error' : undefined}
		/>
		{#if showError('title')}<p class="err" id="title-error">{showError('title')}</p>{/if}
	</div>

	<div class="row">
		<div class="field">
			<label for="category">Category <span class="req">*</span></label>
			<select
				id="category"
				bind:value={draft.category}
				onblur={() => markTouched('category')}
				aria-invalid={showError('category') ? 'true' : undefined}
				aria-describedby={showError('category') ? 'category-error' : undefined}
			>
				<option value="">Choose…</option>
				{#each categories as category (category)}
					<option value={category}>{category}</option>
				{/each}
			</select>
			{#if showError('category')}
				<p class="err" id="category-error">{showError('category')}</p>
			{/if}
		</div>

		<div class="field">
			<label for="area">Cuisine</label>
			<input
				id="area"
				bind:value={draft.area}
				onblur={() => markTouched('area')}
				placeholder="e.g. Italian"
				aria-invalid={showError('area') ? 'true' : undefined}
			/>
			{#if showError('area')}<p class="err">{showError('area')}</p>{/if}
		</div>
	</div>

	<div class="field">
		<label for="image">Image URL</label>
		<input
			id="image"
			type="url"
			bind:value={draft.image}
			onblur={() => markTouched('image')}
			placeholder="https://…"
			aria-invalid={showError('image') ? 'true' : undefined}
			aria-describedby={showError('image') ? 'image-error' : undefined}
		/>
		{#if showError('image')}<p class="err" id="image-error">{showError('image')}</p>{/if}
	</div>

	<div class="field">
		<label for="tags">Tags</label>
		<input id="tags" bind:value={draft.tags} placeholder="comma, separated" />
	</div>

	<fieldset>
		<legend>Ingredients <span class="req">*</span></legend>

		{#each draft.ingredients as ingredient, i (i)}
			<div class="ing-row">
				<input
					bind:value={ingredient.name}
					onblur={() => markTouched('ingredients')}
					placeholder="Ingredient"
					aria-label={`Ingredient ${i + 1} name`}
					aria-invalid={showError('ingredients') ? 'true' : undefined}
				/>
				<input
					bind:value={ingredient.measure}
					placeholder="Amount"
					aria-label={`Ingredient ${i + 1} amount`}
				/>
				<button
					type="button"
					class="icon"
					onclick={() => removeIngredient(i)}
					aria-label={`Remove ingredient ${i + 1}`}
				>
					✕
				</button>
			</div>
		{/each}

		{#if showError('ingredients')}<p class="err">{showError('ingredients')}</p>{/if}
		<button type="button" class="add" onclick={addIngredient}>+ Add ingredient</button>
	</fieldset>

	<fieldset>
		<legend>Instructions <span class="req">*</span></legend>

		{#each draft.instructions as _step, i (i)}
			<div class="step-row">
				<span class="step-no" aria-hidden="true">{i + 1}</span>
				<textarea
					bind:value={draft.instructions[i]}
					onblur={() => markTouched('instructions')}
					rows="2"
					placeholder="Describe this step"
					aria-label={`Step ${i + 1}`}
					aria-invalid={showError('instructions') ? 'true' : undefined}></textarea>
				<div class="step-actions">
					<button
						type="button"
						class="icon"
						onclick={() => moveStep(i, -1)}
						disabled={i === 0}
						aria-label={`Move step ${i + 1} up`}
					>
						↑
					</button>
					<button
						type="button"
						class="icon"
						onclick={() => moveStep(i, 1)}
						disabled={i === draft.instructions.length - 1}
						aria-label={`Move step ${i + 1} down`}
					>
						↓
					</button>
					<button
						type="button"
						class="icon"
						onclick={() => removeStep(i)}
						aria-label={`Remove step ${i + 1}`}
					>
						✕
					</button>
				</div>
			</div>
		{/each}

		{#if showError('instructions')}<p class="err">{showError('instructions')}</p>{/if}
		<button type="button" class="add" onclick={addStep}>+ Add step</button>
	</fieldset>

	{#if submitAttempted && !valid}
		<p class="err summary" role="alert">
			Please fix {Object.keys(errors).length} field{Object.keys(errors).length === 1 ? '' : 's'}
			before saving.
		</p>
	{/if}

	<div class="actions">
		<!-- Not disabled: a disabled button gives no feedback about *why*. Submit
		     instead reveals every error and focuses the first one. -->
		<button type="submit" class="primary">{submitLabel}</button>
		<button type="button" onclick={oncancel}>Cancel</button>
	</div>
</form>

<style>
	form {
		display: grid;
		gap: 1.25rem;
		max-width: 46rem;
	}

	.field {
		display: grid;
		gap: 0.3125rem;
	}

	.row {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 560px) {
		.row {
			grid-template-columns: 1fr 1fr;
		}
	}

	label,
	legend {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.req {
		color: var(--accent);
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 0.5rem 0.625rem;
		font: inherit;
		font-size: 0.9375rem;
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	textarea {
		resize: vertical;
	}

	input:focus-visible,
	select:focus-visible,
	textarea:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	[aria-invalid='true'] {
		border-color: #dc2626;
	}

	.err {
		margin: 0;
		font-size: 0.8125rem;
		color: #dc2626;
	}

	.err.summary {
		padding: 0.625rem 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-sm);
	}

	fieldset {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.ing-row {
		display: grid;
		grid-template-columns: 2fr 1fr auto;
		gap: 0.5rem;
	}

	.step-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.5rem;
		align-items: start;
	}

	.step-no {
		padding-top: 0.5rem;
		font-size: 0.8125rem;
		color: var(--muted);
	}

	.step-actions {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.icon {
		width: 1.75rem;
		height: 1.75rem;
		display: grid;
		place-items: center;
		font: inherit;
		font-size: 0.75rem;
		color: var(--muted);
		cursor: pointer;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 6px;
	}

	.icon:hover:not(:disabled) {
		color: var(--accent);
		border-color: var(--accent);
	}

	.icon:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.add {
		justify-self: start;
		padding: 0.375rem 0.75rem;
		font: inherit;
		font-size: 0.8125rem;
		color: var(--text);
		cursor: pointer;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.actions button {
		padding: 0.5rem 1rem;
		font: inherit;
		font-size: 0.9375rem;
		color: var(--text);
		cursor: pointer;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.actions .primary {
		color: var(--accent-contrast);
		background: var(--accent);
		border-color: var(--accent);
	}

	@media (prefers-color-scheme: dark) {
		.err.summary {
			color: #fecaca;
			background: #450a0a;
			border-color: #7f1d1d;
		}
	}
</style>
