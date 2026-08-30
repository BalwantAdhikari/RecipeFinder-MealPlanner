/**
 * Versioned `localStorage` persistence.
 *
 * There is no backend, so favorites, user recipes and the meal plan live in the
 * browser. Two things this guards against:
 *
 * - **SSR.** `localStorage` does not exist on the server, so every access is
 *   behind SvelteKit's `browser` flag.
 * - **Shape drift.** Stored data outlives code. Each payload is wrapped with a
 *   schema `version`; on mismatch the value is discarded rather than fed to code
 *   that expects a different shape. Discarding is the right call here because
 *   everything stored is reconstructible by the user, and a migration path for
 *   throwaway data is not worth the complexity.
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
 * Read a persisted value, falling back on anything unexpected.
 *
 * Returns `fallback` when: running on the server, the key is absent, the JSON is
 * malformed, the envelope is unrecognisable, or the schema version differs.
 */
export function load<T>(key: string, fallback: T): T {
	if (!browser) return fallback;

	let raw: string | null;
	try {
		raw = localStorage.getItem(key);
	} catch {
		// Private-mode Safari and similar can throw on access, not just on write.
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
 * Persist a value inside a versioned envelope.
 *
 * Swallows write errors: a full or blocked quota should not break the app, since
 * the in-memory state remains correct for the session.
 */
export function save<T>(key: string, data: T): void {
	if (!browser) return;
	try {
		const envelope: Envelope<T> = { version: SCHEMA_VERSION, data };
		localStorage.setItem(key, JSON.stringify(envelope));
	} catch {
		// Ignore — quota exceeded or storage disabled.
	}
}

/** Remove a persisted value. Used by the "clear" actions. */
export function remove(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(key);
	} catch {
		// Ignore.
	}
}
