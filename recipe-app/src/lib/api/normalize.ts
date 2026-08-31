/**
 * Turns TheMealDB's wire format into our `Recipe` shape.
 *
 * The raw format takes some untangling: ingredients are 40 flat fields
 * (`strIngredient1..20` alongside `strMeasure1..20`, unused slots left null or
 * blank), instructions come as one newline-separated blob, and `strTags` is a
 * comma-joined string or null.
 */

import type { Recipe, RecipeIngredient } from 'recipe-ui-components';

/** Full record from `search.php` or `lookup.php` — 54 keys. */
export interface RawMealFull {
	idMeal: string;
	strMeal: string;
	strMealThumb: string | null;
	strCategory: string | null;
	strArea: string | null;
	strTags: string | null;
	strInstructions: string | null;
	strYoutube: string | null;
	strSource: string | null;
	// strIngredient1..20 and strMeasure1..20
	[key: string]: string | null;
}

/** Partial record from `filter.php`. No `strCategory` in this one. */
export interface RawMealPartial {
	idMeal: string;
	strMeal: string;
	strMealThumb: string | null;
	strArea?: string | null;
	strCountry?: string | null;
}

const MAX_INGREDIENTS = 20;

/** Null, empty and whitespace-only all count as absent. */
function clean(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

/** Zips the 40 flat ingredient/measure fields into a list, skipping blanks. */
export function extractIngredients(raw: Record<string, string | null>): RecipeIngredient[] {
	const out: RecipeIngredient[] = [];
	for (let i = 1; i <= MAX_INGREDIENTS; i++) {
		const name = clean(raw[`strIngredient${i}`]);
		if (!name) continue;
		const measure = clean(raw[`strMeasure${i}`]);
		out.push(measure ? { name, measure } : { name });
	}
	return out;
}

/** A line that's only a step marker: "2", "3.", "4)", "STEP 5". */
const STEP_MARKER_ONLY = /^(?:step\s*)?\d+\s*[.):-]?$/i;

/** Numbering on a line that also has content: "1. Boil water." */
const LEADING_NUMBER = /^(?:step\s*)?\d+\s*[.)]\s+/i;

/**
 * Splits the instructions blob into steps, on newlines rather than sentences —
 * sentence splitting mangles "Cook for 9 minutes." and any abbreviation.
 *
 * Source numbering comes in two flavours needing opposite treatment. A line
 * that's *only* a number is a marker on its own line (recipe 53322 has a bare
 * "2" between two real steps) and gets dropped, otherwise every other step
 * renders as a stray digit. A line that starts with a number and continues into
 * content keeps the content and loses the prefix, since the UI numbers the list
 * itself and would otherwise show "1. 1. Bring a pot...".
 *
 * "200g of flour, sifted." has to survive both, which is why the prefix pattern
 * insists on punctuation *and* a space after the digits.
 */
export function extractInstructions(blob: string | null | undefined): string[] {
	if (!blob) return [];
	return blob
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !STEP_MARKER_ONLY.test(line))
		.map((line) => line.replace(LEADING_NUMBER, '').trim())
		.filter(Boolean);
}

/** Comma-joined tags to an array. */
export function extractTags(raw: string | null | undefined): string[] | undefined {
	const tags = (raw ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
	return tags.length ? tags : undefined;
}

/** Full record to `Recipe`, ingredients and instructions included. */
export function normalizeFull(raw: RawMealFull): Recipe {
	return {
		id: raw.idMeal,
		title: raw.strMeal,
		image: clean(raw.strMealThumb),
		category: clean(raw.strCategory),
		area: clean(raw.strArea),
		tags: extractTags(raw.strTags),
		ingredients: extractIngredients(raw),
		instructions: extractInstructions(raw.strInstructions),
		source: 'api'
	};
}

/**
 * Partial record to `Recipe`. `filter.php` doesn't return `strCategory`, so
 * callers pass whatever they filtered on. No ingredients or instructions either
 * — the details page looks those up by id.
 */
export function normalizePartial(
	raw: RawMealPartial,
	known: { category?: string; area?: string } = {}
): Recipe {
	return {
		id: raw.idMeal,
		title: raw.strMeal,
		image: clean(raw.strMealThumb),
		category: known.category,
		area: clean(raw.strArea) ?? known.area,
		source: 'api'
	};
}
