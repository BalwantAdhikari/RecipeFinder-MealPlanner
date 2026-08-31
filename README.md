# Smart Rasoi — Recipe Finder & Meal Planner

A recipe discovery and weekly meal-planning app built with **Svelte 5 / SvelteKit**, consuming a
**StencilJS web component library published to npm**.

| Deliverable           | Link                                                        |
| --------------------- | ----------------------------------------------------------- |
| **Live app**          | _to be filled in after the first Vercel deploy_             |
| **npm package**       | https://www.npmjs.com/package/recipe-ui-components          |
| **GitHub repository** | https://github.com/BalwantAdhikari/RecipeFinder-MealPlanner |

The web components are installed from the npm registry, not imported from source — the lockfile
resolves `recipe-ui-components` to `https://registry.npmjs.org/...`, and the library is developed in
this repo but consumed as a third party would consume it.

---

## Repository layout

```
.
├── recipe-ui-components/    StencilJS component library → published to npm
│   ├── src/components/      recipe-card, recipe-search-bar, recipe-filter-panel,
│   │                        meal-plan-day, recipe-rating
│   └── src/index.html       standalone dev sandbox for the components
│
├── recipe-app/              SvelteKit application → deployed to Vercel
│   ├── src/lib/api/         TheMealDB client + normalizer
│   ├── src/lib/stores/      favorites, user recipes, meal plan (localStorage)
│   ├── src/lib/components/  Stencil interop actions + the recipe form
│   └── src/routes/          seven routes
│
└── TASKS.md                 phase-by-phase build log, decisions and gotchas
```

Two independent packages with their own `package.json`. Deliberately **not** an npm workspace: a
workspace would symlink the library into the app, which is exactly what the assignment asks us to
avoid.

---

## Setup

Requires **Node 20+**.

```bash
git clone git@github.com:BalwantAdhikari/RecipeFinder-MealPlanner.git
cd RecipeFinder-MealPlanner

# The app — this is all you need to run it
cd recipe-app && npm install

# The component library — only needed to work on the components themselves
cd ../recipe-ui-components && npm install
```

Both directories carry a local `.npmrc` pinning `registry.npmjs.org`, so installs work regardless of
any private registry configured on the machine.

## Starting the development server

```bash
cd recipe-app
npm run dev              # http://localhost:5173
npm run dev -- --open    # and open a browser
```

To work on the components in isolation:

```bash
cd recipe-ui-components
npm start                # http://localhost:3333 — sandbox with an event log
```

## Other commands

| Command             | Directory              | What it does                                           |
| ------------------- | ---------------------- | ------------------------------------------------------ |
| `npm test`          | `recipe-app`           | 64 unit tests (normalizer, merge, validation)          |
| `npm run test:live` | `recipe-app`           | 14 integration tests against the real TheMealDB        |
| `npm run lint`      | `recipe-app`           | Prettier + ESLint                                      |
| `npm run check`     | `recipe-app`           | `svelte-check`                                         |
| `npm run build`     | `recipe-app`           | Production build                                       |
| `npm run preview`   | `recipe-app`           | Serve the production build locally                     |
| `npm test`          | `recipe-ui-components` | 68 tests (59 component contracts in Chromium + 9 unit) |
| `npm run build`     | `recipe-ui-components` | Build `dist/` and `loader/`                            |

The component tests need a real browser. On Ubuntu/WSL:

```bash
npx playwright install chromium
sudo apt-get install -y libasound2   # the browser download alone is not enough
```

---

## Features

**Recipe discovery** — debounced search, category and cuisine filters, results in a card grid.
Search and filter state lives in the URL, so a result set is shareable and survives reload and the
back button.

**Recipe details** — image, category, cuisine, tags, ingredient table and numbered steps. One route
serves both API and user-created recipes.

**Recipe management** — create, edit and delete your own recipes, with dynamic ingredient and step
rows, step reordering, and deletion behind a named confirmation. Editing and deleting are restricted
to user-created recipes; API recipes are read-only.

**Validation** — required title and category, at least one ingredient and one step, length caps, and
an image-URL check that rejects non-`http(s)` schemes. Errors appear per field after blur or a
submit attempt, and submitting an invalid form reveals every error and focuses the first one.

**Favorites** — toggle from a card or the details page, with a dedicated page and a clear-all.

**Weekly meal plan** — seven days × three slots, today highlighted. Assign by selecting a favourite
and choosing a slot, by dragging (mouse), or from a recipe's own page. Modify, remove, or clear the
week.

---

## Architecture notes

### Consuming the components

The library ships two builds and only one of them works inside a bundler:

```ts
// src/lib/components/define-elements.ts
await Promise.all([
  import("recipe-ui-components/components/recipe-card"),
  // …one per component
]);
```

`recipe-ui-components/loader` is the lazy build — it fetches per-component `*.entry.js` chunks at
runtime from a path resolved at load time. Vite pre-bundles the loader but cannot see those runtime
chunks, so they 404 and every component fails with
`Constructor for "recipe-card#undefined" was not found`. The failure is quiet: the element upgrades
and gets a shadow root but never renders. The `dist-custom-elements` output has no runtime chunk
fetching, so the bundler can see everything.

Registration runs in `onMount` only. `customElements.define` touches `HTMLElement`, which does not
exist during SSR.

### Passing data in and getting events out

Two small actions in `src/lib/components/stencil.ts`:

- **`use:setProps`** assigns DOM properties rather than attributes, so objects arrive as objects
  instead of `"[object Object]"`. It waits on `customElements.whenDefined()` first, because a child's
  actions run _before_ the parent layout's `onMount` — assigning to a not-yet-upgraded element
  creates own properties that shadow the accessors Stencil installs during upgrade, and the component
  then renders as though no props were passed.
  It is **not** named `props`: Svelte reads `$props` as a store subscription, so an import called
  `props` breaks the `$props()` rune.
- **`use:on`** binds camelCase custom events via `addEventListener`, with teardown. Svelte 5's
  `onclick` shorthand only covers known DOM events, so `onfavoriteToggle` does not exist.

### Data layer

`src/lib/api/` wraps TheMealDB behind a typed client and normalizes its wire format. Things the docs
do not mention, found by probing the API first:

- `filter.php` returns **partial** records with no `strCategory`, so the requested category is
  carried through the normalizer.
- `filter.php` accepts one dimension at a time, so category + cuisine is two calls intersected by id.
- `list.php?a=list` returns 195 countries, not cuisines with recipes — around 85% return nothing. The
  real list is 37, derived by scanning all 14 category endpoints.
- Instruction numbering comes in two forms needing opposite treatment: a line that is _only_ a number
  is a step marker to drop (40% of the browse set does this), while a line starting with a number and
  then content keeps the content and loses the prefix.
- No pagination. Every response is the full result set.

### State and persistence

Svelte 5 runes in `.svelte.ts` modules, persisted to `localStorage` behind a versioned envelope. On a
schema-version mismatch the stored value is discarded rather than fed to code expecting a different
shape — everything stored is reconstructible by the user, so a migration path is not worth the
complexity.

Favorites and the meal plan make deliberately opposite trade-offs. Favorites store **ids only** and
resolve them at render, so an edited or upstream-changed recipe never shows a stale title. The meal
plan **denormalises** title and image, because rendering 21 slots must not cost 21 lookups;
`mealPlan.syncRecipe()` keeps those copies fresh when a user recipe is edited.

### Accessibility

axe-core reports **0 violations** across 9 page states in both colour schemes (WCAG 2.0/2.1 A + AA +
best-practice), verified against the production build. No horizontal overflow at 375 / 768 / 1366 px,
and tab order reaches controls inside the components' shadow DOM.

Text and fill colours are separate tokens, because one hue cannot serve both roles: the accent is
5.18:1 paired with white as a button fill but only 3.84:1 as link text on the dark background.

---

## Assumptions

1. **No backend.** Favorites, user recipes and the meal plan live in `localStorage`, so they are
   per-browser and per-device, and are lost if site data is cleared. Nothing is shared between users.
2. **User-created recipes are client-side only** and cannot be deep-linked from another device — the
   details page renders "not found" for a user recipe id the browser does not know.
3. **API recipes are read-only.** Only recipes you created can be edited or deleted.
4. **TheMealDB has no pagination**, so discovery renders the full result set for a query.
5. **Beef and Pork are excluded app-wide**, by request. Enforced by recipe id rather than category
   name, because `filter.php` returns records with no category to test. Deep links to an excluded
   recipe return 404, so the filter is not bypassable by URL.
6. **A single warm colour theme**, not a light/dark pair. The design is already dark, and a light
   version would be a different design, so `prefers-color-scheme` does not invert it.
7. **Ratings are display-only.** `recipe-rating` supports interaction, but TheMealDB exposes no
   rating data and per-user ratings would need a backend.
8. **Drag-and-drop is mouse-only**, because HTML5 drag never fires from touch input. Selecting a
   favourite and then choosing a slot works with any input, including the keyboard.

---

## Deployment

Deployed to **Vercel** with `@sveltejs/adapter-vercel`. The routes fetch per request, so they run as
serverless functions rather than being prerendered.

The one setting that matters: this repo holds two packages, so Vercel must be pointed at the app.

1. Import the GitHub repository at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `recipe-app`
3. Leave the rest as detected — Framework `SvelteKit`, build `npm run build`, output `.vercel/output`
4. Deploy. No environment variables are needed; TheMealDB's public test key requires no registration.

Or from the CLI:

```bash
cd recipe-app
npx vercel          # preview deployment
npx vercel --prod   # production
```

---

## The component library

Five components, each exercising props, custom events, slots and shadow parts.

| Component             | Events                                     | Slots              | Parts                                |
| --------------------- | ------------------------------------------ | ------------------ | ------------------------------------ |
| `recipe-card`         | `favoriteToggle`, `viewDetails`            | `actions`, `badge` | `card`, `image`, `title`, `favorite` |
| `recipe-search-bar`   | `searchChange`, `searchClear`              | `filters`          | `field`, `submit`                    |
| `recipe-filter-panel` | `filterChange`, `filterClear`              | default            | `panel`, `select`                    |
| `meal-plan-day`       | `removeMeal`, `addMealRequest`, `mealDrop` | `footer`           | `day`, `slot`                        |
| `recipe-rating`       | `rate`                                     | default            | `rating`, `star`                     |

Every object- or array-valued prop also accepts a JSON string, so the components behave identically
whether the host framework sets DOM properties or only attributes. Malformed JSON degrades to an
empty state rather than throwing.

See [recipe-ui-components/readme.md](recipe-ui-components/readme.md) for the full API and
[CHANGELOG.md](recipe-ui-components/CHANGELOG.md) for the release history.

---

## Licence

MIT. Recipe data from [TheMealDB](https://www.themealdb.com/). Kaushan Script is licensed under the
SIL Open Font License 1.1 and is self-hosted in `recipe-app/static/fonts`.
