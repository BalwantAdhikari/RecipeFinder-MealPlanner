/**
 * Convert TheMealDB's wire format into the internal `Recipe` shape.
 *
 * The raw format is awkward in three ways:
 *
 * 1. Ingredients are 40 flat fields — `strIngredient1..20` paired with
 *    `strMeasure1..20` — with unused slots as `null` or an empty/whitespace
 *    string. They need zipping into a list.
 * 2. Instructions arrive as one blob separated by `\r\n`, sometimes with blank
 *    lines and stray numbering.
 * 3. `strTags` is a comma-joined string or `null`.
 */

import type { Recipe, RecipeIngredient } from 'recipe-ui-components';

/** Full record from `search.php` / `lookup.php` (54 keys). */
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

/** Partial record from `filter.php`. Note: no `strCategory`. */
export interface RawMealPartial {
	idMeal: string;
	strMeal: string;
	strMealThumb: string | null;
	strArea?: string | null;
	strCountry?: string | null;
}

const MAX_INGREDIENTS = 20;

/** Treat null, empty and whitespace-only as absent. */
function clean(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

/** Zip the 40 flat ingredient/measure fields into a list, dropping blanks. */
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

/** A line that is nothing but a step marker: "2", "3.", "4)", "STEP 5". */
const STEP_MARKER_ONLY = /^(?:step\s*)?\d+\s*[.):-]?$/i;

/** Leading numbering on a line that also carries content: "1. Boil water." */
const LEADING_NUMBER = /^(?:step\s*)?\d+\s*[.)]\s+/i;

/**
 * Split the instructions blob into ordered steps.
 *
 * Splits on newlines rather than sentences: sentence splitting mangles
 * "Cook for 9 minutes." style text and abbreviations.
 *
 * Two kinds of source numbering have to be handled, and they need opposite
 * treatment:
 *
 * 1. **A line that is only a number** is a step marker sitting on its own line,
 *    which several TheMealDB records do (id 53322 reads
 *    `"...containers yield about 120 milliliters each."`, `""`, `"2"`,
 *    `"Preheat oven to 150 degrees..."`). Those lines must be dropped entirely,
 *    or every other rendered step is a stray digit.
 * 2. **A line that starts with a number and then has content** carries its own
 *    numbering inline. Only the prefix is stripped, since the UI numbers the
 *    list itself and would otherwise show "1. 1. Bring a pot...".
 *
 * A line like "200g of flour, sifted." must survive both rules untouched, which
 * is why the prefix pattern requires punctuation *and* whitespace after the
 * digits rather than matching any leading number.
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

/** Comma-joined tag string to array. */
export function extractTags(raw: string | null | undefined): string[] | undefined {
	const tags = (raw ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
	return tags.length ? tags : undefined;
}

/** Full record to `Recipe`, including ingredients and instructions. */
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
 * Partial record to `Recipe`.
 *
 * `filter.php` omits `strCategory`, so callers pass what they filtered on.
 * Ingredients and instructions are absent by design — the details page does a
 * `lookupById` for those.
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
