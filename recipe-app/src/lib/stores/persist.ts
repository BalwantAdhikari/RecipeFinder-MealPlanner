/**
 * `localStorage` with a version stamp. There's no backend, so favourites, user
 * recipes and the meal plan live in the browser.
 *
 * Every access is behind the `browser` flag, since `localStorage` doesn't exist
 * on the server. Stored data outlives code, so each payload carries a schema
 * version and anything that doesn't match is thrown away — the user can
 * recreate all of it, so a migration path isn't worth writing.
 */

import { browser } from '$app/environment';

/** Bump when a stored shape changes incompatibly. */
export const SCHEMA_VERSION = 1;

const PREFIX = 'recipe-finder';

interface Envelope<T> {
	version: number;
	data: T;
}

export const keys = {
	favorites: `${PREFIX}:favorites`,
	userRecipes: `${PREFIX}:user-recipes`,
	mealPlan: `${PREFIX}:meal-plan`
} as const;

/**
 * Reads a stored value, returning `fallback` for anything unexpected — server,
 * missing key, bad JSON, wrong envelope shape or a stale schema version.
 */
export function load<T>(key: string, fallback: T): T {
	if (!browser) return fallback;

	let raw: string | null;
	try {
		raw = localStorage.getItem(key);
	} catch {
		// Safari in private mode can throw on read, not just on write.
		return fallback;
	}
	if (!raw) return fallback;

	try {
		const parsed = JSON.parse(raw) as Envelope<T>;
		if (!parsed || typeof parsed !== 'object' || parsed.version !== SCHEMA_VERSION) {
			return fallback;
		}
		return parsed.data ?? fallback;
	} catch {
		return fallback;
	}
}

/**
 * Writes a value inside a versioned envelope. Write failures are ignored: a full
 * or blocked quota shouldn't break the app, and in-memory state stays right for
 * the rest of the session.
 */
export function save<T>(key: string, data: T): void {
	if (!browser) return;
	try {
		const envelope: Envelope<T> = { version: SCHEMA_VERSION, data };
		localStorage.setItem(key, JSON.stringify(envelope));
	} catch {
		// Quota exceeded, or storage disabled.
	}
}

/** Drops a stored value. Used by the "clear" actions. */
export function remove(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Ignore.
	}
}
