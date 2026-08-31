/**
 * Shared constants for the discovery gallery.
 *
 * These live here rather than in `+page.ts` because SvelteKit restricts what a
 * route module may export — anything beyond `load`, `prerender`, `ssr` and
 * friends fails the build unless it is `_`-prefixed. Both the load function and
 * the page component need them, so a plain module is the honest home.
 */

/** Sort orders the data can actually support. */
export const SORTS = ['found', 'name-asc', 'name-desc', 'category'] as const;

export type Sort = (typeof SORTS)[number];

/** Cards per page. */
export const PER_PAGE = 12;

/** Visible labels, in the order the select offers them. */
export const SORT_LABELS: Record<Sort, string> = {
	found: 'As found',
	'name-asc': 'Name A–Z',
	'name-desc': 'Name Z–A',
	category: 'Category'
};
