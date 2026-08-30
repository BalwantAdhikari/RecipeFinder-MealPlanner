import { discover } from '$lib/api';
import type { PageLoad } from './$types';

/**
 * A browse list for the drag strip and as a picker fallback.
 *
 * The plan itself lives in localStorage and is read client-side; this only
 * supplies recipes to choose *from*, so a first-time user is not looking at an
 * empty picker.
 */
export const load: PageLoad = async ({ fetch }) => {
	try {
		return { browse: await discover(fetch, '', {}) };
	} catch {
		return { browse: [] };
	}
};
