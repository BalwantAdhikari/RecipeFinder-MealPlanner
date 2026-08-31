/**
 * Validation for the recipe form. Plain functions over a draft object, with no
 * Svelte in sight, so the rules can be tested without mounting anything. The
 * form maps the errors it gets back onto the right fields.
 */

import type { RecipeIngredient } from 'recipe-ui-components';

/** What the form edits. Rows can be blank while someone's still typing. */
export interface RecipeDraft {
	title: string;
	category: string;
	area: string;
	image: string;
	tags: string;
	ingredients: RecipeIngredient[];
	instructions: string[];
}

/** Field name to message. Absent key means the field is valid. */
export type FieldErrors = Partial<Record<keyof RecipeDraft, string>>;

export const LIMITS = {
	titleMax: 120,
	areaMax: 60,
	instructionMax: 1000
} as const;

export function emptyDraft(): RecipeDraft {
	// A blank row of each, so the form opens with somewhere to type.
	return {
		title: '',
		category: '',
		area: '',
		image: '',
		tags: '',
		ingredients: [{ name: '', measure: '' }],
		instructions: ['']
	};
}

/** Only the rows someone actually filled in. Blank ones are ignored, not errors. */
export function filledIngredients(rows: RecipeIngredient[]): RecipeIngredient[] {
	return rows
		.map((r) => ({ name: r.name.trim(), measure: r.measure?.trim() }))
		.filter((r) => r.name.length > 0)
		.map((r) => (r.measure ? r : { name: r.name }));
}

export function filledInstructions(steps: string[]): string[] {
	return steps.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * http(s) only. Other schemes are rejected rather than trusted — `javascript:`
 * in an `src` is an XSS vector and `data:` URLs would bloat localStorage. Empty
 * is fine, since the image is optional and the card has a placeholder.
 */
export function isValidImageUrl(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed) return true;

	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return false;
	}
	return url.protocol === 'http:' || url.protocol === 'https:';
}

/** One message per bad field. An empty object means it's good to save. */
export function validateDraft(draft: RecipeDraft): FieldErrors {
	const errors: FieldErrors = {};

	const title = draft.title.trim();
	if (!title) {
		errors.title = 'A title is required.';
	} else if (title.length > LIMITS.titleMax) {
		errors.title = `Keep the title under ${LIMITS.titleMax} characters.`;
	}

	if (!draft.category.trim()) {
		errors.category = 'Pick a category.';
	}

	if (draft.area.trim().length > LIMITS.areaMax) {
		errors.area = `Keep the cuisine under ${LIMITS.areaMax} characters.`;
	}

	if (!isValidImageUrl(draft.image)) {
		errors.image = 'Enter a full http(s) image URL, or leave it blank.';
	}

	if (filledIngredients(draft.ingredients).length === 0) {
		errors.ingredients = 'Add at least one ingredient.';
	}

	const steps = filledInstructions(draft.instructions);
	if (steps.length === 0) {
		errors.instructions = 'Add at least one instruction step.';
	} else if (steps.some((s) => s.length > LIMITS.instructionMax)) {
		errors.instructions = `Keep each step under ${LIMITS.instructionMax} characters.`;
	}

	return errors;
}

export function isValid(errors: FieldErrors): boolean {
	return Object.keys(errors).length === 0;
}

/** Turns a valid draft into the shape the store keeps. */
export function draftToRecipe(draft: RecipeDraft) {
	const tags = draft.tags
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);

	return {
		title: draft.title.trim(),
		category: draft.category.trim() || undefined,
		area: draft.area.trim() || undefined,
		image: draft.image.trim() || undefined,
		tags: tags.length ? tags : undefined,
		ingredients: filledIngredients(draft.ingredients),
		instructions: filledInstructions(draft.instructions)
	};
}

/** The other direction, for filling in the edit form. */
export function recipeToDraft(recipe: {
	title: string;
	category?: string;
	area?: string;
	image?: string;
	tags?: string[];
	ingredients?: RecipeIngredient[];
	instructions?: string[];
}): RecipeDraft {
	return {
		title: recipe.title,
		category: recipe.category ?? '',
		area: recipe.area ?? '',
		image: recipe.image ?? '',
		tags: (recipe.tags ?? []).join(', '),
		ingredients: recipe.ingredients?.length
			? recipe.ingredients.map((i) => ({ name: i.name, measure: i.measure ?? '' }))
			: [{ name: '', measure: '' }],
		instructions: recipe.instructions?.length ? [...recipe.instructions] : ['']
	};
}
