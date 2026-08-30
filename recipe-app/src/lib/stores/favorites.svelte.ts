/**
 * Favorite recipe ids.
 *
 * Stores ids rather than whole recipes: the recipe body can change upstream, and
 * duplicating it would mean serving stale titles and images from localStorage.
 * The favorites page re-fetches by id.
 */

import { load, save, remove, keys } from './persist';

/**
 * A `SvelteSet` would also work, but ids need serialising to an array for
 * storage anyway, and an explicit class keeps the persistence side-effect in one
 * place instead of scattering `save()` calls across callers.
 */
class FavoritesStore {
	#ids = $state<string[]>(load<string[]>(keys.favorites, []));

	/** Sorted for stable rendering; the underlying order is insertion. */
	get ids(): string[] {
		return this.#ids;
	}

	get count(): number {
		return this.#ids.length;
	}

	has(id: string): boolean {
		return this.#ids.includes(id);
	}

	/** Set membership explicitly. Components emit a requested state, not a flip. */
	set(id: string, isFavorite: boolean): void {
		const already = this.#ids.includes(id);
		if (isFavorite === already) return;

		this.#ids = isFavorite ? [...this.#ids, id] : this.#ids.filter((x) => x !== id);
		save(keys.favorites, this.#ids);
	}

	toggle(id: string): void {
		this.set(id, !this.has(id));
	}

	clear(): void {
		this.#ids = [];
		remove(keys.favorites);
	}
}

export const favorites = new FavoritesStore();
