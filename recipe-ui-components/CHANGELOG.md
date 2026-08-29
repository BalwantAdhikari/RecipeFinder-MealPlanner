# Changelog

All notable changes to `recipe-ui-components`.
This project follows [semantic versioning](https://semver.org/).

## 0.1.1

Documentation only — no runtime or API changes.

### Fixed

- **README told consumers to use the wrong entry point.** `0.1.0` documented
  `recipe-ui-components/loader` as the way to register the elements. That is the lazy build: it
  fetches per-component `*.entry.js` chunks at runtime from a path resolved at load time. Bundlers
  pre-bundle the loader itself but cannot see those runtime chunks, so they 404 and every component
  fails with `Constructor for "recipe-card#undefined" was not found`. The failure is quiet — the
  element upgrades and gets a shadow root, but never renders and never gains the `hydrated` class.

  Bundled apps (Vite, SvelteKit, webpack) should import the `dist-custom-elements` output instead:

  ```js
  import('recipe-ui-components/components/recipe-card');
  ```

  Note `components/index.js` exports only helpers and runtime, not the elements, so each component
  must be imported individually. The loader remains correct for script-tag usage without a bundler.

- Replaced the deprecated `on:` directive in the event-handling example with a Svelte 5 action, and
  documented that object props must wait for `customElements.whenDefined()` when the element may
  not have upgraded yet.

## 0.1.0

Initial release.

### Added

- `recipe-card` — props `recipe`, `isFavorite`, `compact`; events `favoriteToggle`, `viewDetails`;
  slots `actions`, `badge`; parts `card`, `image`, `title`
- `recipe-search-bar` — debounced search with `setFocus()` method; events `searchChange`,
  `searchClear`; slot `filters`; parts `field`, `submit`
- `recipe-filter-panel` — fully controlled category/cuisine filters; events `filterChange`,
  `filterClear`; default slot; parts `panel`, `select`
- `meal-plan-day` — breakfast/lunch/dinner slots with drag-and-drop; events `removeMeal`,
  `addMealRequest`, `mealDrop`; slot `footer`; parts `day`, `slot`
- `recipe-rating` — read-only display or radiogroup input; event `rate`; default slot; parts
  `rating`, `star`
- Every object/array prop also accepts a JSON string, so the components behave identically whether
  the host framework sets DOM properties or only attributes. Malformed JSON degrades to an empty
  state instead of throwing.
- Theming via CSS custom properties and `::part()`, with a `prefers-color-scheme: dark` block.
