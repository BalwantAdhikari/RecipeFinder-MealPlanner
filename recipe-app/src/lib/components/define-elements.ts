/**
 * Register the Stencil custom elements.
 *
 * Uses the `dist-custom-elements` output (`recipe-ui-components/components/*`)
 * rather than `recipe-ui-components/loader`.
 *
 * The loader is the lazy build: it fetches per-component `*.entry.js` chunks at
 * runtime from a path derived at load time. Vite's dependency optimizer
 * pre-bundles the loader but knows nothing about those runtime chunks, so they
 * 404 and every component silently fails to render with
 * `Constructor for "recipe-card#undefined" was not found`.
 *
 * The custom-elements build has no runtime chunk fetching — each module is
 * self-contained, self-defining, and statically analysable, so the bundler can
 * see and emit everything.
 *
 * Must run client-side only: these modules call `customElements.define` at
 * import time, which throws during SSR.
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
