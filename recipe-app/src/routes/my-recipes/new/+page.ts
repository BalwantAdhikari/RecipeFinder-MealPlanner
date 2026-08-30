import { listCategories } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		return { categories: await listCategories(fetch) };
	} catch {
		return { categories: [] };
	}
};
