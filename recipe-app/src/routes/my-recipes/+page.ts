import { listCategories } from '$lib/api';
import type { PageLoad } from './$types';

/**
 * Categories for the create/edit forms.
 *
 * Fetched here rather than hardcoded so the form offers the same vocabulary the
 * API uses, and so excluded categories are filtered out in one place.
 */
export const load: PageLoad = async ({ fetch }) => {
	try {
		return { categories: await listCategories(fetch) };
	} catch {
		// The form is still usable without the list; the category select falls back
		// to whatever the recipe already had.
		return { categories: [] };
	}
};
