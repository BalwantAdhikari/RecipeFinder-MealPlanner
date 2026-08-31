/**
 * TheMealDB client, on the public test key `1` — no registration, no documented
 * rate limit.
 *
 * The endpoints have a few quirks worth knowing, all handled in here. No results
 * comes back as `{"meals": null}` rather than an empty array or a 404.
 * `search.php` gives full 54-key records while `filter.php` gives partial ones
 * with no `strCategory` at all. `filter.php` only takes one dimension at a time,
 * so category *and* area means two calls intersected by id. An empty
 * `search.php?s=` conveniently returns 25 meals, which is our default browse.
 * And there's no pagination anywhere — every response is the whole result set.
 */

import type { Recipe, RecipeFilters } from 'recipe-ui-components';
import {
	normalizeFull,
	normalizePartial,
	type RawMealFull,
	type RawMealPartial
} from './normalize';

const BASE = 'https://www.themealdb.com/api/json/v1/1';

/** SvelteKit's load `fetch`, so calls work during SSR and keep request context. */
export type Fetch = typeof globalThis.fetch;

/**
 * The 37 cuisines that actually have recipes.
 *
 * `list.php?a=list` gives 195 — every country TheMealDB knows of, not every one
 * it has meals for. About 85% come back empty, so a dropdown built from it is
 * mostly dead options.
 *
 * These came from scanning all 14 category endpoints (793 meals) and collecting
 * the distinct areas. Hardcoded because doing that at runtime is 14 requests per
 * page load. Worth re-deriving if the dataset grows.
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

/**
 * Categories hidden app-wide, not just removed from the filter dropdown — the
 * default browse and any area filter would still surface them otherwise.
 *
 * Filtering by category name isn't enough on its own, because `filter.php`
 * returns partial records with no category to test. So we fetch the ids in each
 * excluded category once and subtract them from every result set, which works
 * however the records were obtained.
 */
export const EXCLUDED_CATEGORIES: readonly string[] = ['Beef', 'Pork'];

/**
 * Cached at module level, since the mapping never changes — the extra requests
 * happen once per server process rather than on every navigation.
 */
let excludedIdsCache: Promise<Set<string>> | null = null;

/** Every recipe id sitting in an excluded category. */
export function excludedIds(fetchFn: Fetch): Promise<Set<string>> {
	excludedIdsCache ??= Promise.all(
		EXCLUDED_CATEGORIES.map((category) => filterByCategory(fetchFn, category))
	)
		.then((lists) => new Set(lists.flat().map((r) => r.id)))
		.catch(() => {
			// A failed lookup shouldn't blank the page, and shouldn't cache an empty
			// set forever either, so reset and let the next call retry.
			excludedIdsCache = null;
			return new Set<string>();
		});
	return excludedIdsCache;
}

/** Whether a category is one of the hidden ones. */
export function isExcludedCategory(category: string | undefined): boolean {
	return !!category && EXCLUDED_CATEGORIES.includes(category);
}

/** Thrown on a non-2xx response, so load functions can turn it into an error page. */
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
		// Offline, DNS failure, connection refused — there's no status to report.
		throw new MealDbError(`Could not reach TheMealDB: ${(cause as Error).message}`, 503);
	}
	if (!res.ok) {
		throw new MealDbError(`TheMealDB responded ${res.status}`, res.status);
	}
	return (await res.json()) as T;
}

/** Search by name. An empty query gives TheMealDB's default 25. */
export async function searchByName(fetchFn: Fetch, query: string): Promise<Recipe[]> {
	const data = await getJson<{ meals: RawMealFull[] | null }>(
		fetchFn,
		`/search.php?s=${encodeURIComponent(query)}`
	);
	return (data.meals ?? []).map(normalizeFull);
}

/** Filter by one category. Comes back as partial records. */
export async function filterByCategory(fetchFn: Fetch, category: string): Promise<Recipe[]> {
	const data = await getJson<{ meals: RawMealPartial[] | null }>(
		fetchFn,
		`/filter.php?c=${encodeURIComponent(category)}`
	);
	// filter.php drops strCategory, so pass the one we asked for straight through.
	return (data.meals ?? []).map((m) => normalizePartial(m, { category }));
}

/** Filter by one area. Partial records again. */
export async function filterByArea(fetchFn: Fetch, area: string): Promise<Recipe[]> {
	const data = await getJson<{ meals: RawMealPartial[] | null }>(
		fetchFn,
		`/filter.php?a=${encodeURIComponent(area)}`
	);
	return (data.meals ?? []).map((m) => normalizePartial(m, { area }));
}

/** Full lookup by id. Null if there's no such recipe. */
export async function lookupById(fetchFn: Fetch, id: string): Promise<Recipe | null> {
	const data = await getJson<{ meals: RawMealFull[] | null }>(
		fetchFn,
		`/lookup.php?i=${encodeURIComponent(id)}`
	);
	const meal = data.meals?.[0];
	return meal ? normalizeFull(meal) : null;
}

/** The 14 categories — all of these have recipes, unlike the areas. */
export async function listCategories(fetchFn: Fetch): Promise<string[]> {
	const data = await getJson<{ meals: { strCategory: string }[] | null }>(
		fetchFn,
		'/list.php?c=list'
	);
	return (data.meals ?? [])
		.map((m) => m.strCategory)
		.filter((c) => !EXCLUDED_CATEGORIES.includes(c))
		.sort((a, b) => a.localeCompare(b));
}

/**
 * Search and filter together, around the API's one-filter-at-a-time limit.
 *
 * With a query we use `search.php` and narrow in memory — full records carry
 * both category and area, so that's exact. With both filters and no query it
 * takes two `filter.php` calls intersected by id, since no endpoint accepts
 * both. One filter is a single call, and nothing at all falls back to the
 * default 25.
 */
export async function discover(
	fetchFn: Fetch,
	query: string,
	filters: RecipeFilters
): Promise<Recipe[]> {
	const { category, area } = filters;
	const trimmed = query.trim();

	// A hidden category can't be an active filter, so bail out instead of fetching
	// a set we'd throw away.
	if (isExcludedCategory(category)) return [];

	const [results, blocked] = await Promise.all([
		discoverRaw(fetchFn, trimmed, { category, area }),
		excludedIds(fetchFn)
	]);
	return results.filter((r) => !blocked.has(r.id) && !isExcludedCategory(r.category));
}

/** Picks the right endpoints for the query and filters. {@link discover} handles exclusions. */
async function discoverRaw(
	fetchFn: Fetch,
	trimmed: string,
	filters: RecipeFilters
): Promise<Recipe[]> {
	const { category, area } = filters;

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
		// Prefer the category-sourced records — they already know their category, and
		// being in the other set proves the area.
		return byCategory.filter((r) => areaIds.has(r.id)).map((r) => ({ ...r, area }));
	}

	if (category) return filterByCategory(fetchFn, category);
	if (area) return filterByArea(fetchFn, area);

	return searchByName(fetchFn, '');
}
