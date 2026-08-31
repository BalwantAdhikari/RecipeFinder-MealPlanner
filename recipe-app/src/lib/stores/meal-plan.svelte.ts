/**
 * The weekly meal plan, stored as a flat list rather than a nested
 * `{ day: { slot: meal } }` map — flat is easier to persist, filter and diff,
 * and `forDay()` builds the per-column view the component wants.
 *
 * A day and slot hold one recipe at most, so assigning over a full slot
 * replaces what was there.
 */

import type { MealSlot, PlannedMeal, Recipe } from 'recipe-ui-components';
import { load, save, remove, keys } from './persist';

/** Monday first — that's how people plan a week, whatever JS thinks. */
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

/** A planned meal, plus which day it's on. */
export interface PlanEntry extends PlannedMeal {
	day: Day;
}

/** Today's name in the same terms as DAYS, so the column can be highlighted. */
export function today(): Day {
	// getDay() counts from Sunday, DAYS from Monday.
	// Plain Date, not SvelteDate: this is read once and thrown away, and the
	// highlight doesn't need to move by itself at midnight.
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
	 * One day's entries, shaped for `meal-plan-day`. Builds a new array each call
	 * on purpose: Stencil compares props by reference, so a cached one would stop
	 * the component re-rendering.
	 */
	forDay(day: Day): PlannedMeal[] {
		return this.#entries
			.filter((e) => e.day === day)
			.map(({ slot, recipeId, title, image }) => ({ slot, recipeId, title, image }));
	}

	/** How many of the three slots are taken, for the day's summary line. */
	filledCount(day: Day): number {
		return this.#entries.filter((e) => e.day === day).length;
	}

	/**
	 * Puts a recipe in a slot, replacing anything already there.
	 *
	 * `title` and `image` are copied in rather than looked up, so the planner can
	 * render without a request per cell. A stale title after someone edits their
	 * own recipe beats 21 lookups on every page load.
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

	/** Empties one slot, and says whether there was anything in it. */
	unassign(day: Day, slot: MealSlot): boolean {
		const before = this.#entries.length;
		this.#entries = this.#entries.filter((e) => !(e.day === day && e.slot === slot));
		const removed = this.#entries.length !== before;
		if (removed) save(keys.mealPlan, this.#entries);
		return removed;
	}

	/** Forgets a recipe everywhere. Called when someone deletes one of their own. */
	removeRecipe(recipeId: string): void {
		const before = this.#entries.length;
		this.#entries = this.#entries.filter((e) => e.recipeId !== recipeId);
		if (this.#entries.length !== before) save(keys.mealPlan, this.#entries);
	}

	/** Refreshes the copied title and image after an edit. */
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
