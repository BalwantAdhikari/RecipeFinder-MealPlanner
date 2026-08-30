import { error } from '@sveltejs/kit';
import { lookupById, isExcludedCategory, MealDbError } from '$lib/api';
import { isUserRecipeId } from '$lib/stores';
import type { PageLoad } from './$types';

/**
 * Recipe details.
 *
 * Handles both sources behind one route. User recipes live in `localStorage`, so
 * the server cannot resolve them — for those ids this returns nothing and the
 * page reads the store on the client. API recipes are fetched here so they
 * server-render and are crawlable.
 */
export const load: PageLoad = async ({ fetch, params }) => {
	if (isUserRecipeId(params.id)) {
		return { recipe: null, isUserRecipe: true, error: null };
	}

	try {
		const recipe = await lookupById(fetch, params.id);
		if (!recipe) {
			error(404, `No recipe found with id ${params.id}`);
		}
		// Excluded categories are hidden app-wide, so a direct link must not be a
		// way around the filter.
		if (isExcludedCategory(recipe.category)) {
			error(404, 'That recipe is not available.');
		}
		return { recipe, isUserRecipe: false, error: null };
	} catch (err) {
		if (err instanceof MealDbError) {
			return { recipe: null, isUserRecipe: false, error: err.message };
		}
		throw err;
	}
};
