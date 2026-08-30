/**
 * The weekly meal plan.
 *
 * Shape is a flat list of entries rather than a nested `{ day: { slot: meal } }`
 * map. Flat is easier to persist, filter and diff, and `forDay()` derives the
 * per-column view the `meal-plan-day` component wants.
 *
 * Each (day, slot) pair holds at most one recipe, so assigning to an occupied
 * slot replaces rather than appends.
 */

import type { MealSlot, PlannedMeal, Recipe } from 'recipe-ui-components';
import { load, save, remove, keys } from './persist';

/** Monday-first, matching how a week is planned rather than JS day numbering. */
export const DAYS = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday'
] as const;

export type Day = (typeof DAYS)[number];

export const SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

/** A planned meal plus the day it belongs to. */
export interface PlanEntry extends PlannedMeal {
	day: Day;
}

/** Today's name in the same vocabulary as DAYS, for highlighting the column. */
export function today(): Day {
	// getDay() is 0=Sunday; DAYS is Monday-first.
	// A transient read, not reactive state: SvelteDate would add a proxy around a
	// value discarded on the next line, and the highlighted column does not need
	// to re-render at midnight.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const index = (new Date().getDay() + 6) % 7;
	return DAYS[index];
}

class MealPlanStore {
	#entries = $state<PlanEntry[]>(load<PlanEntry[]>(keys.mealPlan, []));

	get entries(): PlanEntry[] {
		return this.#entries;
	}

	get count(): number {
		return this.#entries.length;
	}

	/**
	 * Entries for one day, as `meal-plan-day` expects.
	 *
	 * Returns a fresh array every call — Stencil compares props by reference, so
	 * handing back a cached array would suppress re-renders.
	 */
	forDay(day: Day): PlannedMeal[] {
		return this.#entries
			.filter((e) => e.day === day)
			.map(({ slot, recipeId, title, image }) => ({ slot, recipeId, title, image }));
	}

	/** How many of the three slots are filled, for a per-day summary. */
	filledCount(day: Day): number {
		return this.#entries.filter((e) => e.day === day).length;
	}

	/**
	 * Assign a recipe to a slot, replacing whatever was there.
	 *
	 * Denormalises `title` and `image` deliberately: the planner must render
	 * without a network round trip per cell, and a stale title on a
	 * user-edited recipe is a better outcome than 21 lookups on page load.
	 */
	assign(day: Day, slot: MealSlot, recipe: Pick<Recipe, 'id' | 'title' | 'image'>): void {
		const entry: PlanEntry = {
			day,
			slot,
			recipeId: recipe.id,
			title: recipe.title,
			image: recipe.image
		};
		this.#entries = [...this.#entries.filter((e) => !(e.day === day && e.slot === slot)), entry];
		save(keys.mealPlan, this.#entries);
	}

	/** Clear one slot. Returns whether anything was removed. */
	unassign(day: Day, slot: MealSlot): boolean {
		const before = this.#entries.length;
		this.#entries = this.#entries.filter((e) => !(e.day === day && e.slot === slot));
		const removed = this.#entries.length !== before;
		if (removed) save(keys.mealPlan, this.#entries);
		return removed;
	}

	/** Drop every reference to a recipe — used when a user recipe is deleted. */
	removeRecipe(recipeId: string): void {
		const before = this.#entries.length;
		this.#entries = this.#entries.filter((e) => e.recipeId !== recipeId);
		if (this.#entries.length !== before) save(keys.mealPlan, this.#entries);
	}

	/** Keep denormalised copies in step after a user recipe is edited. */
	syncRecipe(recipe: Pick<Recipe, 'id' | 'title' | 'image'>): void {
		let changed = false;
		this.#entries = this.#entries.map((e) => {
			if (e.recipeId !== recipe.id) return e;
			changed = true;
			return { ...e, title: recipe.title, image: recipe.image };
		});
		if (changed) save(keys.mealPlan, this.#entries);
	}

	clear(): void {
		this.#entries = [];
		remove(keys.mealPlan);
	}
}

export const mealPlan = new MealPlanStore();
