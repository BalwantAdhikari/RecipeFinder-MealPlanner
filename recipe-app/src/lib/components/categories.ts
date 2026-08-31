/**
 * Accent colours for the recipe categories.
 *
 * Used in two places that must agree: the category pills in the gallery
 * toolbar, and the category label on each card (via
 * `--recipe-card-category-color`). Keeping one map means a category reads the
 * same in both.
 *
 * The categories come from the API, not from a fixed design list, so a value
 * can be missing — TheMealDB could add one tomorrow — and the fallback has to
 * look deliberate rather than broken.
 *
 * Every colour here is checked to clear 4.5:1 as text on `--surface` (white),
 * because the card label is small uppercase text. A hue picked to look good as
 * a fill usually fails that; these were chosen against the measurement.
 */
const CATEGORY_COLOR: Record<string, string> = {
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

/** Neutral grey for a category with no assigned colour. 7.56:1 on white. */
const FALLBACK_COLOR = '#4B5563';

export function categoryColor(category: string | undefined): string {
	return (category && CATEGORY_COLOR[category]) || FALLBACK_COLOR;
}
