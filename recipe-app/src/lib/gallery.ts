/**
 * Constants shared by the gallery's load function and its component.
 *
 * They're here rather than in `+page.ts` because SvelteKit only lets a route
 * module export a fixed set of names — anything else fails the build unless it
 * starts with an underscore.
 */

/** The sort orders our data can actually back up. */
export const SORTS = ['found', 'name-asc', 'name-desc', 'category'] as const;

export type Sort = (typeof SORTS)[number];

/** Cards per page. */
export const PER_PAGE = 12;

/** Labels, in the order the select shows them. */
export const SORT_LABELS: Record<Sort, string> = {
	found: 'As found',
	'name-asc': 'Name A–Z',
	'name-desc': 'Name Z–A',
	category: 'Category'
};
