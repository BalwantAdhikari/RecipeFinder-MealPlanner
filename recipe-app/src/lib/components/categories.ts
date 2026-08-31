/**
 * Per-category colours for the recipe categories.
 *
 * Used in three places that must agree: the category chips in the gallery
 * toolbar, the dot inside each chip, and the tinted category pill on every card
 * (through `--recipe-card-category-color` and `--recipe-card-category-bg`).
 * One map means a category reads the same everywhere.
 *
 * The categories come from the API, not a fixed design list, so a value can be
 * missing — TheMealDB could add one tomorrow — and the fallback has to look
 * deliberate rather than broken.
 *
 * ## How these values were chosen
 *
 * Every tint is its own colour at 14% over white. A fixed strength keeps the
 * pills looking like one family; letting each tint float to whatever its colour
 * could carry produced anything from 6% to 20%, which read as a mistake.
 *
 * Holding the strength fixed means the *text* has to move instead, so four of
 * the twelve are slightly darkened from the colour used for the chip dot. Each
 * pair below is verified at 4.5:1 or better both on its own tint and on white,
 * because the same colour is also used as a dot on a white chip.
 *
 * If you change a colour here, re-check it against **both** backgrounds. A hue
 * chosen to look good as a tint usually fails as its own text colour.
 */
type CategoryStyle = { color: string; tint: string };

const CATEGORY_STYLE: Record<string, CategoryStyle> = {
	Breakfast: { color: '#A74D08', tint: '#F5E7DD' },
	Chicken: { color: '#B91C1C', tint: '#F5DFDF' },
	Dessert: { color: '#A21CAF', tint: '#F2DFF4' },
	Goat: { color: '#7C3AED', tint: '#EDE3FC' },
	Lamb: { color: '#9D174D', tint: '#F1DFE6' },
	Miscellaneous: { color: '#4B5563', tint: '#E6E7E9' },
	Pasta: { color: '#B63D0B', tint: '#F6E4DD' },
	Seafood: { color: '#0E718C', tint: '#DDECEF' },
	Side: { color: '#1D4ED8', tint: '#DFE6FA' },
	Starter: { color: '#047655', tint: '#DCECE7' },
	Vegan: { color: '#147739', tint: '#DEEDE4' },
	Vegetarian: { color: '#2B7455', tint: '#E2EDE8' }
};

/** Neutral grey for a category with no assigned colour: 7.56:1 on white. */
const FALLBACK: CategoryStyle = { color: '#4B5563', tint: '#E6E7E9' };

function styleFor(category: string | undefined): CategoryStyle {
	return (category && CATEGORY_STYLE[category]) || FALLBACK;
}

export function categoryColor(category: string | undefined): string {
	return styleFor(category).color;
}

export function categoryTint(category: string | undefined): string {
	return styleFor(category).tint;
}
