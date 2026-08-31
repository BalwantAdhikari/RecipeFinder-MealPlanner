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
		<button type="button" class="btn btn--sm btn--ghost" onclick={addIngredient}
			>+ Add ingredient</button
		>
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
		<button type="button" class="btn btn--sm btn--ghost" onclick={addStep}>+ Add step</button>
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
		<button type="submit" class="btn btn--primary">{submitLabel}</button>
		<button type="button" class="btn" onclick={oncancel}>Cancel</button>
	</div>
</form>

<style>
	form {
		display: grid;
		gap: var(--space-5);
		max-width: 48rem;
	}

	.field {
		display: grid;
		gap: var(--space-1);
	}

	.row {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 560px) {
		.row {
			grid-template-columns: 1fr 1fr;
		}
	}

	label,
	legend {
		font-size: var(--step--1);
		font-weight: 600;
		letter-spacing: 0.01em;
		color: var(--muted);
	}

	.req {
		color: var(--accent-hover);
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 0.5625rem 0.6875rem;
		font: inherit;
		font-size: var(--step-0);
		color: var(--text);
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		transition:
			border-color 140ms var(--ease),
			box-shadow 140ms var(--ease);
	}

	input:focus,
	select:focus,
	textarea:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.18);
		outline: none;
	}

	textarea {
		resize: vertical;
		line-height: 1.5;
	}

	[aria-invalid='true'] {
		border-color: var(--danger);
	}

	[aria-invalid='true']:focus {
		border-color: var(--danger);
		box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.18);
	}

	.err {
		margin: 0;
		font-size: var(--step--1);
		color: var(--danger-text);
	}

	.err.summary {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		font-weight: 500;
		background: var(--danger-soft);
		border: 1px solid var(--danger-border);
		border-radius: var(--radius);
	}

	fieldset {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		box-shadow: none;
	}

	.ing-row {
		display: grid;
		grid-template-columns: 2fr 1fr auto;
		gap: var(--space-2);
	}

	.step-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: var(--space-2);
		align-items: start;
	}

	.step-no {
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-top: 0.4375rem;
		font-size: var(--step--1);
		font-weight: 600;
		color: var(--accent-hover);
		background: var(--surface-2);
		border-radius: var(--radius-full);
	}

	.step-actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.icon {
		width: 1.875rem;
		height: 1.875rem;
		display: grid;
		place-items: center;
		font: inherit;
		font-size: var(--step--1);
		color: var(--muted);
		cursor: pointer;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		transition:
			color 120ms var(--ease),
			border-color 120ms var(--ease);
	}

	.icon:hover:not(:disabled) {
		color: var(--accent-hover);
		border-color: var(--accent);
	}

	.icon:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
