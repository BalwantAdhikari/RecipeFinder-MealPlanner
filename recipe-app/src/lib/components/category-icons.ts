/**
 * Icons and accent colours for the category pills.
 *
 * The categories come from the API (12 of them after exclusions), not from a
 * fixed design list, so this maps the ones with an obvious glyph and falls back
 * to a neutral dot for the rest. A missing entry is normal — TheMealDB could add
 * a category tomorrow — so the fallback has to look deliberate rather than
 * broken.
 *
 * Colours are drawn from a small fixed set rather than generated, so each
 * category reads the same everywhere it appears. Every value is checked for
 * contrast against the pill and card surfaces.
 */

/** 24x24 viewBox path data, stroked. */
export const CATEGORY_ICON: Record<string, string> = {
	Breakfast:
		'M12 3v2M5.6 5.6l1.4 1.4M3 12h2M19 12h2M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
	Dessert: 'M4 20h16M6 20v-6a6 6 0 0 1 12 0v6M12 4v4M10 5.5 12 4l2 1.5',
	Seafood: 'M3 12c4-5 10-5 14 0-4 5-10 5-14 0Zm14 0 4-3v6l-4-3ZM8 11h.01',
	Pasta: 'M4 8h16M4 12h16M4 16h16M7 4v16M12 4v16M17 4v16',
	Chicken: 'M9 3a5 5 0 0 1 5 5c0 2-1 3-1 5l3 3-2 2-3-3c-2 0-3 1-5 1a5 5 0 0 1 3-13Z',
	Vegan: 'M11 20c0-6 3-10 9-11 0 7-4 11-9 11Zm0 0c-4 0-7-3-7-7 0-1 0-2 .5-3',
	Vegetarian: 'M11 20c0-6 3-10 9-11 0 7-4 11-9 11Zm0 0c-4 0-7-3-7-7 0-1 0-2 .5-3',
	Starter: 'M4 14h16a8 8 0 0 1-16 0ZM4 18h16M9 10a3 3 0 0 1 6 0',
	Side: 'M6 4v7a6 6 0 0 0 12 0V4M12 17v3',
	Lamb: 'M7 8a4 4 0 1 1 8 0c0 3 2 3 2 6a6 6 0 0 1-12 0c0-3 2-3 2-6Z',
	Goat: 'M7 8a4 4 0 1 1 8 0c0 3 2 3 2 6a6 6 0 0 1-12 0c0-3 2-3 2-6Z',
	Miscellaneous: 'M12 5v14M5 12h14'
};

/** Colour per category, used by the pills and the card label. */
export const CATEGORY_COLOR: Record<string, string> = {
	Breakfast: '#B45309',
	Chicken: '#B91C1C',
	Dessert: '#A21CAF',
	Goat: '#7C3AED',
	Lamb: '#9D174D',
	Miscellaneous: '#4B5563',
	Pasta: '#C2410C',
	Seafood: '#0E7490',
	Side: '#1D4ED8',
	Starter: '#047857',
	Vegan: '#15803D',
	Vegetarian: '#2E7D5B'
};

/** Neutral dot for a category with no mapped glyph. */
export const FALLBACK_ICON = 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z';

export function categoryIcon(category: string): string {
	return CATEGORY_ICON[category] ?? FALLBACK_ICON;
}

export function categoryColor(category: string): string {
	return CATEGORY_COLOR[category] ?? '#4B5563';
}
