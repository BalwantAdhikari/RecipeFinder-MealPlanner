# recipe-ui-components

[![npm](https://img.shields.io/npm/v/recipe-ui-components)](https://www.npmjs.com/package/recipe-ui-components)
[![license](https://img.shields.io/npm/l/recipe-ui-components)](./LICENSE)

Reusable [StencilJS](https://stenciljs.com/) web components for a Recipe Finder & Meal Planner.
Framework-agnostic custom elements, consumed here from a SvelteKit application.

- **npm:** https://www.npmjs.com/package/recipe-ui-components
- **Source:** https://github.com/BalwantAdhikari/RecipeFinder-MealPlanner

## Install

```bash
npm install recipe-ui-components
```

## Usage

### Register the elements (bundler apps: Vite, SvelteKit, webpack)

Import the per-component modules from `components/*`. Each is self-contained and
self-defining, so importing it registers the element.

Registration calls `customElements.define`, which throws during SSR, so this has to run
client-side only:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';

  onMount(async () => {
    await Promise.all([
      import('recipe-ui-components/components/recipe-card'),
      import('recipe-ui-components/components/recipe-search-bar'),
      import('recipe-ui-components/components/recipe-filter-panel'),
      import('recipe-ui-components/components/meal-plan-day'),
      import('recipe-ui-components/components/recipe-rating')
    ]);
  });
</script>
```

> **Do not use `recipe-ui-components/loader` in a bundled app.** The loader is the lazy
> build: it fetches per-component `*.entry.js` chunks at runtime from a path resolved at
> load time. Bundlers pre-bundle the loader itself but cannot see those runtime chunks, so
> they 404 and every component fails to render with
> `Constructor for "recipe-card#undefined" was not found`. Confirmed against Vite 8 /
> SvelteKit 2.

### Register every element via the loader (script tags / no bundler)

The lazy build is the right choice when you serve the package as static assets rather than
bundling it — one small entry file, components fetched on demand:

```html
<script
  type="module"
  src="/node_modules/recipe-ui-components/dist/recipe-ui-components/recipe-ui-components.esm.js"
></script>
```

### Types

```ts
import type { Recipe, PlannedMeal, MealSlot, RecipeFilters } from 'recipe-ui-components';
```

## Passing data in

Every object- or array-valued prop accepts **either** a real value **or** a JSON string, so the
components work whether the host framework sets DOM properties or only attributes:

```svelte
<!-- as a property (preferred) -->
<recipe-card bind:this={el}></recipe-card>

<!-- as a JSON attribute (works everywhere, including SSR markup) -->
<recipe-card recipe={JSON.stringify(recipe)}></recipe-card>
```

Malformed JSON degrades to the component's empty state rather than throwing.

## Handling events out

These are native `CustomEvent`s with camelCase names. Svelte 5's `onclick`-style shorthand
only covers known DOM events, so `onfavoriteToggle` does not exist, and the `on:` directive
is deprecated. Use `addEventListener` — a small action keeps it tidy and handles teardown:

```ts
// src/lib/stencil.ts
export function on(node: HTMLElement, handlers: Record<string, (e: CustomEvent) => void>) {
  let current = handlers;
  const bind = m => Object.entries(m).forEach(([k, f]) => node.addEventListener(k, f));
  const unbind = m => Object.entries(m).forEach(([k, f]) => node.removeEventListener(k, f));
  bind(current);
  return {
    update(next) {
      unbind(current);
      current = next;
      bind(current);
    },
    destroy() {
      unbind(current);
    },
  };
}
```

```svelte
<recipe-card
  use:setProps={{ recipe, isFavorite }}
  use:on={{
    favoriteToggle: (e) => toggleFavorite(e.detail.recipeId, e.detail.isFavorite),
    viewDetails: (e) => goto(`/recipes/${e.detail.recipeId}`)
  }}
>
  <span slot="badge">API</span>
  <button slot="actions" onclick={addToPlan}>Add to plan</button>
</recipe-card>
```

### Setting object props safely

**Do not name this action `props`.** Svelte parses `$props` as a store subscription, so an
import called `props` breaks the `$props()` rune in any component that uses both.

A companion `setProps` action assigns DOM properties instead of attributes. One ordering
subtlety matters: in SvelteKit a child's actions run **before** the parent layout's
`onMount`, so the element is usually not upgraded yet when the action first fires.
Assigning then creates own properties that shadow the accessors Stencil installs during
upgrade, and the component renders as if no props were passed. Wait for the definition:

```ts
export function setProps(node: HTMLElement, values: Record<string, unknown>) {
  let current = values,
    ready = false;
  const apply = () => Object.entries(current).forEach(([k, v]) => (node[k] = v));
  const tag = node.localName;
  if (tag.includes('-') && !customElements.get(tag)) {
    customElements.whenDefined(tag).then(() => {
      ready = true;
      apply();
    });
  } else {
    ready = true;
    apply();
  }
  return {
    update(next) {
      current = next;
      if (ready) apply();
    },
  };
}
```

## Components

### `<recipe-card>`

| Prop         | Attribute     | Type               | Default | Notes                 |
| ------------ | ------------- | ------------------ | ------- | --------------------- |
| `recipe`     | `recipe`      | `Recipe \| string` | —       | Object or JSON string |
| `isFavorite` | `is-favorite` | `boolean`          | `false` |                       |
| `compact`    | `compact`     | `boolean`          | `false` | Hides the meta row    |

| Event            | Detail                                                                   |
| ---------------- | ------------------------------------------------------------------------ |
| `favoriteToggle` | `{ recipeId: string; isFavorite: boolean }` — the _requested_ next state |
| `viewDetails`    | `{ recipeId: string }`                                                   |

Slots: `actions` (footer controls), `badge` (image overlay), `rating` (right of the meta row).
Parts: `card`, `image`, `title`, `category`, `favorite`.

**The whole card is the click target.** Rather than a "View recipe" button, the title is a
real `<button>` whose hit area is stretched over the card with an absolutely positioned
`::after`. That keeps one focusable navigation target per card and avoids a `click` handler
on a `<div>`, which is invisible to keyboards and screen readers. The favorite toggle and
anything slotted into `actions` sit above the overlay, so they stay independently clickable
— if you add your own absolutely positioned content, give it `z-index: 2` or higher.

**The footer only exists when you fill it.** `actions` starts empty, so a card with no
consumer controls has no empty strip at the bottom. Actions added later are picked up via
`slotchange`.

The `rating` slot is the only way to show a rating: this library's data source has no rating
field, so nothing is displayed by default rather than inventing a value.

```svelte
<recipe-card use:setProps={{ recipe }}>
  <recipe-rating slot="rating" value={4.5} readonly></recipe-rating>
</recipe-card>
```

The category renders as a tinted pill. Set both tokens per category:

```css
recipe-card[data-category='Seafood'] {
  --recipe-card-category-color: #0e718c;
  --recipe-card-category-bg: #ddecef;
}
```

Check the pair **against each other**, not against the card — the text sits on the tint, not on
`--recipe-card-bg`. A hue chosen to look good as a tint usually fails as its own text colour. If you
generate tints programmatically, holding the tint strength constant across categories and darkening
the text where needed looks more deliberate than letting each tint float to whatever its colour can
carry.

The favorite toggle is a heart — filled when `isFavorite`, outlined when not — drawn as an
inline SVG so it does not depend on a font having the glyph. Theme it with
`--recipe-card-favorite-color`, `--recipe-card-favorite-bg` and
`--recipe-card-favorite-active`, or via `::part(favorite)`.

### `<recipe-search-bar>`

| Prop          | Attribute     | Type      | Default             |
| ------------- | ------------- | --------- | ------------------- |
| `value`       | `value`       | `string`  | `''`                |
| `placeholder` | `placeholder` | `string`  | `'Search recipes…'` |
| `debounceMs`  | `debounce-ms` | `number`  | `300`               |
| `label`       | `label`       | `string`  | `'Search recipes'`  |
| `iconSubmit`  | `icon-submit` | `boolean` | `false`             |

| Event          | Detail                                                  |
| -------------- | ------------------------------------------------------- |
| `searchChange` | `{ query: string }` — debounced, or immediate on submit |
| `searchClear`  | `void`                                                  |

Method: `setFocus(): Promise<void>`.
Slots: `filters` (right of the input), `hint` (between the input and the submit button).
Parts: `field`, `submit`.

Submitting the form flushes the pending debounce instead of waiting it out.

`iconSubmit` swaps the labelled button for a round icon button, for use as a page's primary search
field. The accessible name stays `Search` either way — the label is visually replaced, not removed.

The `hint` slot is for a keyboard-shortcut chip. It is a slot rather than a prop because the right
text depends on the user's platform, which the consumer knows and this component does not — and
because the shortcut itself has to be bound by the consumer:

```svelte
<recipe-search-bar bind:this={bar} use:setProps={{ iconSubmit: true }}>
  <kbd slot="hint" aria-hidden="true">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
</recipe-search-bar>
```

```ts
// setFocus() is a Stencil method, so wait for the element to be upgraded.
if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
  await customElements.whenDefined('recipe-search-bar');
  event.preventDefault();
  await bar.setFocus();
}
```

Size it with `--search-pad-y` (the bar's height is padding, not a fixed value), `--search-radius`
and `--search-shadow`.

If your app renders one colour scheme regardless of the user's OS setting, also set
`--search-clear-hover-bg`. The clear button's hover fill has a `prefers-color-scheme` default, which
keys off the OS rather than your app, so a light app on a dark OS otherwise gets a near-black fill
under its own dark icon.

### `<recipe-filter-panel>`

Fully controlled — holds no selection state of its own.

| Prop         | Attribute    | Type                      | Default |
| ------------ | ------------ | ------------------------- | ------- |
| `categories` | `categories` | `string[] \| string`      | —       |
| `areas`      | `areas`      | `string[] \| string`      | —       |
| `selected`   | `selected`   | `RecipeFilters \| string` | `{}`    |
| `hideClear`  | `hide-clear` | `boolean`                 | `false` |

| Event          | Detail                                                                |
| -------------- | --------------------------------------------------------------------- |
| `filterChange` | `RecipeFilters` — the complete next state, with empty values stripped |
| `filterClear`  | `void`                                                                |

A select is omitted entirely when its option list is empty. Slot: default. Parts: `panel`, `select`.

### `<meal-plan-day>`

One day column with `breakfast` / `lunch` / `dinner` slots. Empty slots are both click targets and
drop targets, so drag-and-drop and a picker dialog can coexist.

| Prop       | Attribute   | Type                      | Default      |
| ---------- | ----------- | ------------------------- | ------------ |
| `day`      | `day`       | `string`                  | — (required) |
| `meals`    | `meals`     | `PlannedMeal[] \| string` | `[]`         |
| `isToday`  | `is-today`  | `boolean`                 | `false`      |
| `addLabel` | `add-label` | `string`                  | `'+ Add'`    |

| Event            | Detail                                              |
| ---------------- | --------------------------------------------------- |
| `removeMeal`     | `{ day: string; slot: MealSlot; recipeId: string }` |
| `addMealRequest` | `{ day: string; slot: MealSlot }`                   |
| `mealDrop`       | `{ day: string; slot: MealSlot; recipeId: string }` |

For `mealDrop` to fire, the drag source must set the recipe id on the dataTransfer:

```js
event.dataTransfer.setData('text/plain', recipe.id);
```

Slot: `footer`. Parts: `day`, `slot`.

### `<recipe-rating>`

| Prop       | Attribute  | Type      | Default    |
| ---------- | ---------- | --------- | ---------- |
| `value`    | `value`    | `number`  | `0`        |
| `max`      | `max`      | `number`  | `5`        |
| `readonly` | `readonly` | `boolean` | `false`    |
| `label`    | `label`    | `string`  | `'Rating'` |

| Event  | Detail                                             |
| ------ | -------------------------------------------------- |
| `rate` | `{ value: number }` — never fires while `readonly` |

`value` is clamped to `0..max`. Renders a `radiogroup` of buttons when interactive and an inert
`img`-role display when `readonly`. Slot: default. Parts: `rating`, `star`.

## Theming

All components use shadow DOM. Style them from outside via CSS custom properties, set on the
element or inherited from an ancestor:

```css
recipe-card {
  --recipe-card-accent: #0f766e;
  --recipe-card-radius: 4px;
}
```

Each component documents its own variables at the top of its `.css` file. Exposed `part` names are
listed per component above, for `::part()` styling. A `prefers-color-scheme: dark` block ships with
sensible dark values.

### Contrast when overriding tokens

Text and fill roles are deliberately separate tokens, because one hue rarely serves both. If you
theme these, re-check contrast:

| Token                          | Role                            | Needs                            |
| ------------------------------ | ------------------------------- | -------------------------------- |
| `--recipe-card-accent`         | Focus ring and favourite active | 3:1 against `--recipe-card-bg`   |
| `--recipe-card-category-color` | The category label              | 4.5:1 against `--recipe-card-bg` |
| `--recipe-card-muted`          | Larger secondary text           | 4.5:1 against `--recipe-card-bg` |

`--recipe-card-category-color` is separate from `--recipe-card-accent` so that recolouring
categories cannot drag the focus ring along with it. It is 0.75rem uppercase text, where a
hue chosen to look good as a _fill_ usually fails as text — the default `#c2410c` measures
5.18:1 on white but only 3.42:1 on the dark surface, which is why the dark scheme ships a
lighter orange.

## Development

```bash
npm install
npm start          # dev build, watch + serve
npm run build      # production build into dist/ and loader/
npm test           # unit + component tests
```

### Tests

76 tests across two Vitest projects:

- **`unit`** — helper logic in Stencil's mock DOM. Runs anywhere, no browser.
  ```bash
  npx vitest run --project unit
  ```
- **`browser`** — component props/events/slots contracts in real Chromium via Playwright:
  ```bash
  npx playwright install chromium
  npx vitest run --project browser
  ```

On Ubuntu 22.04 / WSL, Chromium also needs one system library that the Playwright download does
not include:

```bash
sudo apt-get install -y libasound2
```

Prefer that over `sudo npx playwright install-deps chromium`, which fails under nvm because `sudo`
resets `PATH`, and pulls in 22 packages plus fonts when this is usually the only one missing.

The component tests require a real browser — Stencil's mock DOM has no `DragEvent`/`DataTransfer`
and does not lay elements out. Two related constraints when adding tests:

- Pass props and slotted children through **JSX**, not a render options object. `render()`'s real
  options type only accepts `clearStage` / `stageAttrs` / `waitForReady` / `spyOn` / `registry`.
- Do **not** use `vi.useFakeTimers()` around `render()`. It polls for layout on the timers the fake
  clock freezes, so the render deadlocks — and a timed-out test leaks the fake clock into the rest
  of the file. Use short real waits for debounce assertions.

## License

MIT
