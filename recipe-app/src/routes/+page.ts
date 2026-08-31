import { discover, listCategories, AREAS, MealDbError } from '$lib/api';
import { SORTS, type Sort } from '$lib/gallery';
import type { RecipeFilters } from 'recipe-ui-components';
import type { PageLoad } from './$types';

/**
 * Loads the discovery data — on the server for the first render, in the browser
 * after that, through SvelteKit's `fetch` either way. Query and filters come
 * from the URL, so a search can be shared and survives a reload.
 *
 * User recipes aren't merged here; they're in `localStorage`, which the server
 * can't see, so the page adds them once it's running.
 */
export const load: PageLoad = async ({ fetch, url }) => {
	const query = url.searchParams.get('q') ?? '';

	// Anything unrecognised falls back instead of erroring — this comes from the
	// query string, so it can contain literally anything.
	const requested = url.searchParams.get('sort');
	const sort: Sort = SORTS.includes(requested as Sort) ? (requested as Sort) : 'found';
	const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

	// Only set keys that actually have values: `{ category: undefined }` still has
	// a key, and counting active filters by key would then count it.
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
		return { recipes, categories, areas: [...AREAS], query, filters, sort, page, error: null };
	} catch (err) {
		// A failed search shouldn't blank the page. Keep the controls and show the
		// error inline so it can be retried or reworded.
		const message =
			err instanceof MealDbError ? err.message : 'Something went wrong loading recipes.';
		return {
			recipes: [],
			categories: [],
			areas: [...AREAS],
			query,
			filters,
			sort,
			page,
			error: message
		};
	}
};
