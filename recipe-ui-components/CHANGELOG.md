# Changelog

All notable changes to `recipe-ui-components`.
This project follows [semantic versioning](https://semver.org/).

## 0.2.0

A layout change to `recipe-card` that consumers will see, hence the minor bump rather than a
patch.

### Changed

- **The whole card is now the navigation target.** The "View recipe" button is gone. The title
  is a real `<button>` whose hit area is stretched over the card by an absolutely positioned
  `::after`, so the card is clickable anywhere while keeping one focusable, screen-reader
  announced target. A `click` handler on the `<article>` would have been simpler and
  unreachable by keyboard.

  Anything you position absolutely inside the card now needs `z-index: 2` or higher, or the
  overlay will swallow its clicks. The favourite toggle and the `actions` slot already do.

- **The meta row replaces the two chips.** Category and area were interchangeable grey pills;
  the category is now a coloured uppercase label and the area quieter text beside it. Consumers
  styling `.chip` from outside had nothing to target anyway — it was never an exposed part — but
  `--recipe-card-chip-bg` and `--recipe-card-chip-text` are **removed**. Use
  `--recipe-card-category-color` and `--recipe-card-muted`.

- **The footer is omitted when the `actions` slot is empty**, instead of rendering an empty
  strip. Actions added after first render are picked up via `slotchange`.

### Added

- **`rating` slot**, at the right of the meta row. This library's data source has no rating
  field, so nothing renders by default — the slot exists so a consumer with real rating data
  can supply it, e.g. `<recipe-rating slot="rating" value={4.5} readonly>`.
- **`category` part**, for styling the label directly.
- **`--recipe-card-category-color`**, meant to be set per category. Kept separate from
  `--recipe-card-accent` so recolouring categories cannot move the focus ring with it. The dark
  scheme ships a lighter orange because the light default is only 3.42:1 on the dark surface.

### Fixed

- **Emoji replaced with inline SVG in `recipe-search-bar` and the card's image
  placeholder.** The magnifier (`🔍`), the clear cross (`✕`) and the plate (`🍽`) render as tofu
  boxes wherever no emoji font is installed — confirmed in headless Chromium on Linux, where the
  search field showed an empty rectangle. This is the same reasoning the favourite heart already
  followed; these three were missed at the time.

### Migration

Consumers who relied on the built-in "View recipe" button should note it no longer exists;
`viewDetails` now fires from the card itself. Anyone theming the chip tokens should switch to
the two named above.

## 0.1.4

### Fixed

- **Day cards could outgrow their host and lap onto the row below.** Shadow roots do not
  inherit the host page's `box-sizing` reset — style isolation cuts both ways — and `.day`
  combines `height: 100%` with padding. As `content-box` it rendered 26px taller than its host,
  which looked like the cards piling on top of each other whenever the grid stretched them.
  Every component now sets its own `box-sizing: border-box` reset, which also removes the same
  latent risk from `.select`, `.field`, `.fav`, `.star` and `.add`.

  Consumers on 0.1.3 can work around it with
  `meal-plan-day::part(day) { box-sizing: border-box }`.

## 0.1.3

### Added

- **The full meal title is now available on hover.** Day columns are narrow, so a longer title
  is clipped with an ellipsis; `meal-plan-day` now sets `title` on the meal name so mouse users
  can recover the complete text without opening the recipe. Purely presentational — the full
  string was always in the DOM, so screen readers were never affected. Keyboard users still get
  the full name from the recipe page.

## 0.1.2

### Fixed

- **A long meal title pushed the slot outside the day card.** `.slot` is a grid whose implicit
  `auto` column sizes to max-content, so a long title widened the track past its container —
  measured 33px of spill — and nothing could shrink, which also stopped `.meal__title`'s
  `text-overflow: ellipsis` from ever applying. The slot now uses
  `grid-template-columns: minmax(0, 1fr)` and `.meal` gets `min-width: 0`, since grid items
  default to `min-width: auto`. Covered by a regression test.

  Consumers on 0.1.1 can work around it with
  `meal-plan-day::part(slot) { grid-template-columns: minmax(0, 1fr) }`.

## 0.1.1

### Changed

- **The favorite toggle is now a heart, not a star.** Filled when favorited, outlined when not.
  Drawn as an inline SVG rather than a `★`/`♥` character, because a dingbat or emoji glyph
  renders as a tofu box on systems without the right font — and here the glyph _is_ the state
  indicator.

### Added

- `part="favorite"` on the favorite button, so consumers can restyle or re-colour it from
  outside. Previously the button was unreachable from the host page: not a part, and inside the
  shadow root, so even its icon could not be changed without a library release.
- `--recipe-card-favorite-color`, `--recipe-card-favorite-bg` and
  `--recipe-card-favorite-active` for theming the toggle without `::part()`.

### Fixed

- **Cards with a photo were taller than cards without one.** `.media img` used
  `height: 100%` inside a box whose height came from `aspect-ratio: 4 / 3` — a circular
  dependency, so browsers fell back to the image's intrinsic ratio. Square source images
  (TheMealDB serves squares) made the media 269px while the no-image placeholder stayed at
  the correct 202px, giving visibly uneven cards in a grid. The image now restates the ratio
  with `height: auto`.
- **`.media` had no overflow clipping**, so any transform a consumer applied via
  `::part(image)` bled over the card body. Now clipped.
- The no-image placeholder uses a soft radial wash instead of flat grey, and
  `--recipe-card-media-bg` is exposed for theming it.

- **`recipe-card` chip text failed WCAG AA contrast.** At 0.75rem on the tinted chip
  background, `--recipe-card-muted` (`#71717a`) measures **4.40:1** — just under the 4.5:1
  threshold. Chips now use dedicated `--recipe-card-chip-text` / `--recipe-card-chip-bg`
  tokens (7.03:1 light, 5.81:1 dark), kept separate so theming `--recipe-card-muted` cannot
  reintroduce the failure. Found with axe-core, which reported 36 violations from this one
  rule.

- **`recipe-filter-panel` reported filters that were not applied.** The active count used
  `Object.keys(selected).length`, so an object like `{ category: undefined, area: undefined }` —
  exactly what a consumer gets from building filters out of URL params — rendered
  "Clear all (2)" while both selects read "All". Now counts truthy values. Two regression tests
  added.

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
