/**
 * One colour per category, shared by the gallery chips, the dot inside each
 * chip, and the tinted pill on every card. Keeping it in one place is what makes
 * a category look the same everywhere.
 *
 * Categories come from the API rather than a fixed design list, so one can go
 * missing — hence the fallback.
 *
 * Each tint is its own colour at 14% over white. The fixed strength is
 * deliberate: letting each tint go as dark as its colour allowed gave anything
 * from 6% to 20% and looked like a mistake. Holding it steady means four of the
 * twelve text colours are nudged darker instead.
 *
 * If you change a colour, check it on **both** backgrounds — the same value is
 * text on its tint and a dot on a white chip, and a hue that looks good as a
 * tint usually fails as text.
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

/** For a category we don't have a colour for. 7.56:1 on white. */
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
