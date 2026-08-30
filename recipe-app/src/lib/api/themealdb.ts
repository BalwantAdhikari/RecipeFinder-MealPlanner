/**
 * TheMealDB client.
 *
 * Base URL uses the public test key `1`, which needs no registration and has no
 * documented rate limit.
 *
 * Endpoint quirks this module hides from callers:
 *
 * - No results is `{"meals": null}`, not an empty array or a 404.
 * - `search.php` returns full 54-key records (ingredients + instructions).
 *   `filter.php` returns partial records: `idMeal`, `strMeal`, `strMealThumb`,
 *   `strArea`, `strCountry` — note **no** `strCategory`.
 * - `filter.php` accepts only one dimension at a time, so filtering by category
 *   *and* area requires two calls intersected by id.
 * - `search.php?s=` (empty query) returns 25 meals, which makes a reasonable
 *   default browse without a separate endpoint.
 * - There is no pagination. Every response is the full result set.
 */

import type { Recipe, RecipeFilters } from 'recipe-ui-components';
import {
	normalizeFull,
	normalizePartial,
	type RawMealFull,
	type RawMealPartial
} from './normalize';

const BASE = 'https://www.themealdb.com/api/json/v1/1';

/** SvelteKit's load `fetch`, so calls are SSR-safe and get request context. */
export type Fetch = typeof globalThis.fetch;

/**
 * The 37 cuisines that actually have recipes.
 *
 * `list.php?a=list` returns 195 entries — every country TheMealDB knows, not
 * every country it has meals for. Roughly 85% return zero results, which makes
 * a dropdown built from it mostly dead options.
 *
 * Derived by scanning all 14 category endpoints (793 meals) and collecting the
 * distinct `strArea` values. Hardcoded because deriving it at runtime costs 14
 * requests per page load. Re-derive if the dataset grows.
 */
export const AREAS: readonly string[] = [
	'Algerian',
	'Argentina',
	'Australian',
	'British',
	'Canadian',
	'Chinese',
	'Croatian',
	'Egyptian',
	'Filipino',
	'France',
	'Greek',
	'India',
	'Irish',
	'Italian',
	'Jamaican',
	'Japanese',
	'Kenyan',
	'Malaysian',
	'Mexican',
	'Moroccan',
	'Netherlands',
	'Norway',
	'Polish',
	'Portuguese',
	'Russian',
	'Saudi Arabian',
	'Slovakia',
	'Spanish',
	'Syrian',
	'Thai',
	'Tunisian',
	'Turkish',
	'Ukrainian',
	'United States',
	'Uruguayan',
	'Venezuela',
	'Vietnamese'
];

/** Raised on a non-2xx response so load functions can map it to an error page. */
export class MealDbError extends Error {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
		this.name = 'MealDbError';
	}
}

async function getJson<T>(fetchFn: Fetch, path: string): Promise<T> {
	let res: Response;
	try {
		res = await fetchFn(`${BASE}${path}`);
	} catch (cause) {
		// Network failure, DNS, offline — no HTTP status to report.
		throw new MealDbError(`Could not reach TheMealDB: ${(cause as Error).message}`, 503);
	}
	if (!res.ok) {
		throw new MealDbError(`TheMealDB responded ${res.status}`, res.status);
	}
	return (await res.json()) as T;
}

/** Search by name. Empty query returns TheMealDB's default set of 25. */
export async function searchByName(fetchFn: Fetch, query: string): Promise<Recipe[]> {
	const data = await getJson<{ meals: RawMealFull[] | null }>(
		fetchFn,
		`/search.php?s=${encodeURIComponent(query)}`
	);
	return (data.meals ?? []).map(normalizeFull);
}

/** Filter by a single category. Results are partial records. */
export async function filterByCategory(fetchFn: Fetch, category: string): Promise<Recipe[]> {
	const data = await getJson<{ meals: RawMealPartial[] | null }>(
		fetchFn,
		`/filter.php?c=${encodeURIComponent(category)}`
	);
	// filter.php omits strCategory, so carry the requested value through.
	return (data.meals ?? []).map((m) => normalizePartial(m, { category }));
}

/** Filter by a single area. Results are partial records. */
export async function filterByArea(fetchFn: Fetch, area: string): Promise<Recipe[]> {
	const data = await getJson<{ meals: RawMealPartial[] | null }>(
		fetchFn,
		`/filter.php?a=${encodeURIComponent(area)}`
	);
	return (data.meals ?? []).map((m) => normalizePartial(m, { area }));
}

/** Full detail lookup. Returns null when the id is unknown. */
export async function lookupById(fetchFn: Fetch, id: string): Promise<Recipe | null> {
	const data = await getJson<{ meals: RawMealFull[] | null }>(
		fetchFn,
		`/lookup.php?i=${encodeURIComponent(id)}`
	);
	const meal = data.meals?.[0];
	return meal ? normalizeFull(meal) : null;
}

/** The 14 categories. All of them have recipes, unlike the areas list. */
export async function listCategories(fetchFn: Fetch): Promise<string[]> {
	const data = await getJson<{ meals: { strCategory: string }[] | null }>(
		fetchFn,
		'/list.php?c=list'
	);
	return (data.meals ?? []).map((m) => m.strCategory).sort((a, b) => a.localeCompare(b));
}

/**
 * Search and filter in one call, working around the API's one-filter limit.
 *
 * - **Query present:** use `search.php`, then narrow by category/area in memory.
 *   Full records carry both fields, so this is exact.
 * - **Both filters, no query:** two `filter.php` calls intersected by id. Needed
 *   because neither endpoint accepts both dimensions.
 * - **One filter, no query:** a single `filter.php` call.
 * - **Nothing:** the default 25 from an empty search.
 */
export async function discover(
	fetchFn: Fetch,
	query: string,
	filters: RecipeFilters
): Promise<Recipe[]> {
	const { category, area } = filters;
	const trimmed = query.trim();

	if (trimmed) {
		const results = await searchByName(fetchFn, trimmed);
		return results.filter(
			(r) => (!category || r.category === category) && (!area || r.area === area)
		);
	}

	if (category && area) {
		const [byCategory, byArea] = await Promise.all([
			filterByCategory(fetchFn, category),
			filterByArea(fetchFn, area)
		]);
		const areaIds = new Set(byArea.map((r) => r.id));
		// Keep the category-sourced records: they already carry `category`, and we
		// add `area` since membership in the other set proves it.
		return byCategory.filter((r) => areaIds.has(r.id)).map((r) => ({ ...r, area }));
	}

	if (category) return filterByCategory(fetchFn, category);
	if (area) return filterByArea(fetchFn, area);

	return searchByName(fetchFn, '');
}
