/**
 * @fileoverview entry point for the recipe-ui-components library
 *
 * Exports the public type contracts and helpers that accompany the components.
 *
 * DO NOT export components from here. Consume them either by registering all
 * custom elements via the loader:
 *
 *   import { defineCustomElements } from 'recipe-ui-components/loader';
 *   defineCustomElements();
 *
 * or by importing a single element directly:
 *
 *   import { RecipeCard } from 'recipe-ui-components/components/recipe-card';
 */

export { parseObjectProp, parseArrayProp, debounce } from './utils/utils';
export type {
  Recipe,
  RecipeIngredient,
  RecipeSource,
  RecipeFilters,
  MealSlot,
  PlannedMeal,
} from './types/recipe';
export type * from './components.d.ts';
