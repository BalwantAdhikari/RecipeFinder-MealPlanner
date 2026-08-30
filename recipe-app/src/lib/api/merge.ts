/**
 * Merge user-created recipes into API results.
 *
 * The assignment asks for one unified discovery experience, so a recipe the user
 * wrote must be findable alongside TheMealDB's. Search and filtering for user
 * recipes happen in memory here, since they only exist client-side.
 *
 * User recipes are placed first: they are the smaller, more relevant set, and
 * burying them under 25 API results would make them feel absent.
 */

import type { Recipe, RecipeFilters } from 'recipe-ui-components';
import { isExcludedCategory } from './themealdb';

/** Case-insensitive substring match on the title, matching the API's behaviour. */
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
			// Same exclusion as the API side, so a user recipe in a hidden category
			// does not reappear through the local path.
			!isExcludedCategory(r.category) && matchesQuery(r, trimmed) && matchesFilters(r, filters)
	);
}

/**
 * Combine local and remote results, user recipes first.
 *
 * De-duplicates by id so a user recipe never appears twice. Ids cannot actually
 * collide (user ids are `user-` prefixed) but the guard keeps this honest if the
 * id scheme ever changes.
 */
export function mergeResults(local: Recipe[], remote: Recipe[]): Recipe[] {
	const seen = new Set(local.map((r) => r.id));
	return [...local, ...remote.filter((r) => !seen.has(r.id))];
}
