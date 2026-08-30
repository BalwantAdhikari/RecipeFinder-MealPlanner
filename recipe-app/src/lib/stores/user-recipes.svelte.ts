/**
 * Recipes created by the user.
 *
 * These are the only editable/deletable records — API recipes are read-only.
 * Ids are prefixed `user-` so they never collide with TheMealDB's numeric ids,
 * which lets a single details route serve both sources.
 */

import type { Recipe } from 'recipe-ui-components';
import { load, save, remove, keys } from './persist';

/** A user recipe carries creation metadata the API shape has no place for. */
export interface UserRecipe extends Recipe {
	source: 'user';
	createdAt: string;
	updatedAt: string;
}

export const USER_ID_PREFIX = 'user-';

/** True for ids this store owns. Cheap enough to call during render. */
export function isUserRecipeId(id: string): boolean {
	return id.startsWith(USER_ID_PREFIX);
}

function newId(): string {
	// crypto.randomUUID needs a secure context; Date.now + random is plenty for
	// ids that never leave this browser.
	return `${USER_ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

class UserRecipesStore {
	#items = $state<UserRecipe[]>(load<UserRecipe[]>(keys.userRecipes, []));

	/** Newest first, which is what the listing page wants. */
	get all(): UserRecipe[] {
		return [...this.#items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	get count(): number {
		return this.#items.length;
	}

	get(id: string): UserRecipe | undefined {
		return this.#items.find((r) => r.id === id);
	}

	/** Create. Returns the new record so the caller can navigate to it. */
	create(input: Omit<Recipe, 'id' | 'source'>): UserRecipe {
		const now = new Date().toISOString();
		const recipe: UserRecipe = {
			...input,
			id: newId(),
			source: 'user',
			createdAt: now,
			updatedAt: now
		};
		this.#items = [...this.#items, recipe];
		save(keys.userRecipes, this.#items);
		return recipe;
	}

	/** Update in place. No-op for unknown ids, so callers need not pre-check. */
	update(id: string, patch: Partial<Omit<Recipe, 'id' | 'source'>>): UserRecipe | undefined {
		const existing = this.#items.find((r) => r.id === id);
		if (!existing) return undefined;

		const updated: UserRecipe = { ...existing, ...patch, updatedAt: new Date().toISOString() };
		this.#items = this.#items.map((r) => (r.id === id ? updated : r));
		save(keys.userRecipes, this.#items);
		return updated;
	}

	/** Returns whether anything was removed, so the UI can report accurately. */
	remove(id: string): boolean {
		const before = this.#items.length;
		this.#items = this.#items.filter((r) => r.id !== id);
		const removed = this.#items.length !== before;
		if (removed) save(keys.userRecipes, this.#items);
		return removed;
	}

	clear(): void {
		this.#items = [];
		remove(keys.userRecipes);
	}
}

export const userRecipes = new UserRecipesStore();
