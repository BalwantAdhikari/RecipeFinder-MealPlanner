/**
 * Registers the Stencil custom elements. Client-side only — these modules call
 * `customElements.define` when imported, which throws on the server.
 *
 * Note the import path: `components/*`, not `recipe-ui-components/loader`. The
 * loader fetches per-component chunks at runtime, and Vite can't see those, so
 * they 404 and every component quietly fails with
 * `Constructor for "recipe-card#undefined" was not found`.
 */
export async function defineElements(): Promise<void> {
	await Promise.all([
		import('recipe-ui-components/components/recipe-card'),
		import('recipe-ui-components/components/recipe-search-bar'),
		import('recipe-ui-components/components/recipe-filter-panel'),
		import('recipe-ui-components/components/meal-plan-day'),
		import('recipe-ui-components/components/recipe-rating')
	]);
}
