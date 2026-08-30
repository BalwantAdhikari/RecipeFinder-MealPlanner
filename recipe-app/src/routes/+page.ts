import { discover, listCategories, AREAS, MealDbError } from '$lib/api';
import type { RecipeFilters } from 'recipe-ui-components';
import type { PageLoad } from './$types';

/**
 * Discovery data.
 *
 * Runs on the server for the first render and in the browser on subsequent
 * navigations, using SvelteKit's `fetch` either way. Query and filters live in
 * the URL so a search is shareable and survives a reload.
 *
 * User recipes are *not* merged here — they live in `localStorage`, which the
 * server cannot see. The page merges them client-side (task 4.5).
 */
export const load: PageLoad = async ({ fetch, url }) => {
	const query = url.searchParams.get('q') ?? '';

	// Only include keys that are actually set. An object like
	// `{ category: undefined }` still has a key, and anything counting active
	// filters by key would report a filter that is not applied.
	const filters: RecipeFilters = {};
	const category = url.searchParams.get('category');
	const area = url.searchParams.get('area');
	if (category) filters.category = category;
	if (area) filters.area = area;

	try {
		const [recipes, categories] = await Promise.all([
			discover(fetch, query, filters),
			listCategories(fetch)
		]);
		return { recipes, categories, areas: [...AREAS], query, filters, error: null };
	} catch (err) {
		// A failed search should not blank the page — render the controls with an
		// inline error so the user can retry or change the query.
		const message =
			err instanceof MealDbError ? err.message : 'Something went wrong loading recipes.';
		return {
			recipes: [],
			categories: [],
			areas: [...AREAS],
			query,
			filters,
			error: message
		};
	}
};
