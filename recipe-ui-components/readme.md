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

### Register every element via the loader

The simplest route. In SvelteKit this must run client-side only, because custom element
registration touches `HTMLElement`, which does not exist during SSR:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';

  onMount(async () => {
    const { defineCustomElements } = await import('recipe-ui-components/loader');
    await defineCustomElements();
  });
</script>
```

### Or import a single element

Tree-shakeable; registers itself on import.

```ts
import 'recipe-ui-components/components/recipe-card';
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

These are native `CustomEvent`s. Their names are camelCase, which Svelte's `on<name>` shorthand
does not cover, so bind with `on:` or `addEventListener`:

```svelte
<recipe-card
  recipe={JSON.stringify(recipe)}
  is-favorite={isFavorite}
  on:favoriteToggle={(e) => toggleFavorite(e.detail.recipeId, e.detail.isFavorite)}
  on:viewDetails={(e) => goto(`/recipes/${e.detail.recipeId}`)}
>
  <button slot="actions" onclick={addToPlan}>Add to plan</button>
</recipe-card>
```

## Components

### `<recipe-card>`

| Prop | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `recipe` | `recipe` | `Recipe \| string` | — | Object or JSON string |
| `isFavorite` | `is-favorite` | `boolean` | `false` | |
| `compact` | `compact` | `boolean` | `false` | Hides the meta row |

| Event | Detail |
|---|---|
| `favoriteToggle` | `{ recipeId: string; isFavorite: boolean }` — the *requested* next state |
| `viewDetails` | `{ recipeId: string }` |

Slots: `actions` (footer controls), `badge` (image overlay).
Parts: `card`, `image`, `title`.

### `<recipe-search-bar>`

| Prop | Attribute | Type | Default |
|---|---|---|---|
| `value` | `value` | `string` | `''` |
| `placeholder` | `placeholder` | `string` | `'Search recipes…'` |
| `debounceMs` | `debounce-ms` | `number` | `300` |
| `label` | `label` | `string` | `'Search recipes'` |

| Event | Detail |
|---|---|
| `searchChange` | `{ query: string }` — debounced, or immediate on submit |
| `searchClear` | `void` |

Method: `setFocus(): Promise<void>`.
Slot: `filters`. Parts: `field`, `submit`.

Submitting the form flushes the pending debounce instead of waiting it out.

### `<recipe-filter-panel>`

Fully controlled — holds no selection state of its own.

| Prop | Attribute | Type | Default |
|---|---|---|---|
| `categories` | `categories` | `string[] \| string` | — |
| `areas` | `areas` | `string[] \| string` | — |
| `selected` | `selected` | `RecipeFilters \| string` | `{}` |
| `hideClear` | `hide-clear` | `boolean` | `false` |

| Event | Detail |
|---|---|
| `filterChange` | `RecipeFilters` — the complete next state, with empty values stripped |
| `filterClear` | `void` |

A select is omitted entirely when its option list is empty. Slot: default. Parts: `panel`, `select`.

### `<meal-plan-day>`

One day column with `breakfast` / `lunch` / `dinner` slots. Empty slots are both click targets and
drop targets, so drag-and-drop and a picker dialog can coexist.

| Prop | Attribute | Type | Default |
|---|---|---|---|
| `day` | `day` | `string` | — (required) |
| `meals` | `meals` | `PlannedMeal[] \| string` | `[]` |
| `isToday` | `is-today` | `boolean` | `false` |
| `addLabel` | `add-label` | `string` | `'+ Add'` |

| Event | Detail |
|---|---|
| `removeMeal` | `{ day: string; slot: MealSlot; recipeId: string }` |
| `addMealRequest` | `{ day: string; slot: MealSlot }` |
| `mealDrop` | `{ day: string; slot: MealSlot; recipeId: string }` |

For `mealDrop` to fire, the drag source must set the recipe id on the dataTransfer:

```js
event.dataTransfer.setData('text/plain', recipe.id);
```

Slot: `footer`. Parts: `day`, `slot`.

### `<recipe-rating>`

| Prop | Attribute | Type | Default |
|---|---|---|---|
| `value` | `value` | `number` | `0` | 
| `max` | `max` | `number` | `5` |
| `readonly` | `readonly` | `boolean` | `false` |
| `label` | `label` | `string` | `'Rating'` |

| Event | Detail |
|---|---|
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
