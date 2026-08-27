/**
 * Public data contracts shared by the components in this library.
 *
 * These are deliberately framework-agnostic and tolerant: every field beyond
 * `id`/`title` is optional so a partially-populated search result renders the
 * same way a fully-hydrated detail record does.
 */

/** A single ingredient line, e.g. `{ name: 'Flour', measure: '200 g' }`. */
export interface RecipeIngredient {
  name: string;
  measure?: string;
}

/** Where a recipe came from. User recipes are editable; API recipes are not. */
export type RecipeSource = 'api' | 'user';

/** The core recipe shape consumed by `recipe-card` and friends. */
export interface Recipe {
  id: string;
  title: string;
  image?: string;
  category?: string;
  area?: string;
  tags?: string[];
  ingredients?: RecipeIngredient[];
  /** Instruction steps, already split into an ordered list. */
  instructions?: string[];
  source?: RecipeSource;
}

/** Meal slots within a single day of the weekly plan. */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

/** A recipe assigned to a slot on a given day. */
export interface PlannedMeal {
  slot: MealSlot;
  recipeId: string;
  title: string;
  image?: string;
}

/** Active filter selection emitted by `recipe-filter-panel`. */
export interface RecipeFilters {
  category?: string;
  area?: string;
}
