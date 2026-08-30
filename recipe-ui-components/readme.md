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
<script type="module" src="/node_modules/recipe-ui-components/dist/recipe-ui-components/recipe-ui-components.esm.js"></script>
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

Slots: `actions` (footer controls), `badge` (image overlay).
Parts: `card`, `image`, `title`, `favorite`.

The favorite toggle is a heart — filled when `isFavorite`, outlined when not — drawn as an
inline SVG so it does not depend on a font having the glyph. Theme it with
`--recipe-card-favorite-color`, `--recipe-card-favorite-bg` and
`--recipe-card-favorite-active`, or via `::part(favorite)`.

### `<recipe-search-bar>`

| Prop          | Attribute     | Type     | Default             |
| ------------- | ------------- | -------- | ------------------- |
| `value`       | `value`       | `string` | `''`                |
| `placeholder` | `placeholder` | `string` | `'Search recipes…'` |
| `debounceMs`  | `debounce-ms` | `number` | `300`               |
| `label`       | `label`       | `string` | `'Search recipes'`  |

| Event          | Detail                                                  |
| -------------- | ------------------------------------------------------- |
| `searchChange` | `{ query: string }` — debounced, or immediate on submit |
| `searchClear`  | `void`                                                  |

Method: `setFocus(): Promise<void>`.
Slot: `filters`. Parts: `field`, `submit`.

Submitting the form flushes the pending debounce instead of waiting it out.

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

| Token                     | Role                                  | Needs                            |
| ------------------------- | ------------------------------------- | -------------------------------- |
| `--recipe-card-accent`    | Button fill, paired with white text   | 4.5:1 against white              |
| `--recipe-card-chip-text` | Small text on `--recipe-card-chip-bg` | 4.5:1 against that background    |
| `--recipe-card-muted`     | Larger secondary text                 | 4.5:1 against `--recipe-card-bg` |

`--recipe-card-chip-text` exists specifically so that mapping `--recipe-card-muted` to a lighter
grey cannot silently push chip text below AA — the chips are 0.75rem, where a colour that passes
elsewhere often fails.

## Development

```bash
npm install
npm start          # dev build, watch + serve
npm run build      # production build into dist/ and loader/
npm test           # unit + component tests
```

### Tests

58 tests across two Vitest projects:

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
