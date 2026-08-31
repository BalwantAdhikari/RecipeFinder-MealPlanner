/**
 * Folds the user's own recipes into the API results so discovery covers both.
 *
 * Filtering happens in memory here because user recipes only exist client-side.
 * They go first — there are few of them, and under 25 API results they'd feel
 * missing.
 */

import type { Recipe, RecipeFilters } from 'recipe-ui-components';
import { isExcludedCategory } from './themealdb';

/** Substring match on the title, case-insensitive, same as the API does. */
function matchesQuery(recipe: Recipe, query: string): boolean {
	if (!query) return true;
	return recipe.title.toLowerCase().includes(query.toLowerCase());
}

function matchesFilters(recipe: Recipe, filters: RecipeFilters): boolean {
	if (filters.category && recipe.category !== filters.category) return false;
	if (filters.area && recipe.area !== filters.area) return false;
	return true;
}

/** Apply the same query/filter criteria to a local recipe list. */
export function filterLocal(recipes: Recipe[], query: string, filters: RecipeFilters): Recipe[] {
	const trimmed = query.trim();
	return recipes.filter(
		(r) =>
			// Excluded categories are dropped here too, or a user recipe in one
			// would sneak back in through the local path.
			!isExcludedCategory(r.category) && matchesQuery(r, trimmed) && matchesFilters(r, filters)
	);
}

/**
 * Local results first, then remote, de-duplicated by id.
 *
 * Ids can't collide today — user ids are `user-` prefixed — but the check keeps
 * this correct if that ever changes.
 */
export function mergeResults(local: Recipe[], remote: Recipe[]): Recipe[] {
	const seen = new Set(local.map((r) => r.id));
	return [...local, ...remote.filter((r) => !seen.has(r.id))];
}
