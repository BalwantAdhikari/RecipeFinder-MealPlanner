# Recipe Finder & Meal Planner — Task Breakdown

Assignment: build a Recipe Finder & Meal Planner using **Svelte 5 + SvelteKit** that consumes a
**StencilJS component library published to npm**.

Track progress by checking boxes. Suggested build order is at the bottom.

---

## Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Recipe API | **TheMealDB** (`https://www.themealdb.com/api/json/v1/1/`) | Free, no API key, no rate cap. Supports search-by-name, filter by category/area/ingredient, and full detail lookup with ingredients + instructions. Spoonacular has richer filters but needs a key and caps at 150 req/day. |
| Repo layout | Monorepo-ish: `/recipe-ui-components` + `/recipe-app` as sibling roots | Two independent `package.json` files; no workspace tooling needed since the app installs the library from npm, not from disk. |
| Persistence | `localStorage` | No backend in scope. Applies to favorites, user-created recipes, and the meal plan. |
| State | Svelte 5 runes in `.svelte.ts` modules | Idiomatic Svelte 5; avoids legacy store contract. |
| npm package name | `@<scope>/recipe-ui` (scope TBD — must be one you own) | Current name `recipe-ui-components` is unscoped and generic. |

---

## Phase 0 — Foundations

- [ ] **0.1** `git init` at root, add `.gitignore`, initial commit
- [ ] **0.2** Create GitHub repo and push (repo link is a deliverable)
- [ ] **0.3** Confirm `/recipe-ui-components` + `/recipe-app` sibling layout
- [ ] **0.4** Remove stray root scratch files (`index.html`, `tooltip.js` — leftover web-components tutorial code)

---

## Phase 1 — Stencil component library

- [ ] **1.1** Fix `package.json`: scoped name, `version` → `0.1.0`, real `description`, correct
      `repository`, and rewrite `exports` (currently still references `stenciljs/component-starter`
      and `./my-component`)
- [ ] **1.2** `stencil.config.ts`: add `dist` + `dist-custom-elements` output targets with
      `customElementsExportBehavior: 'auto-define-custom-elements'`
- [ ] **1.3** Delete the starter `my-component`
- [ ] **1.4** Build the components below
- [ ] **1.5** Tests covering each component's props/events contract
- [ ] **1.6** JSDoc on every `@Prop`/`@Event` so Stencil auto-generates `readme.md`
- [ ] **1.7** Library README with props/events/slots tables

### Components

Each must exercise **props, `@Event`, and slots** — the assignment grades all three explicitly.

| Component | Props | Events | Slots |
|---|---|---|---|
| `recipe-card` | `recipe`, `isFavorite` | `favoriteToggle`, `viewDetails` | `actions` (footer) |
| `recipe-search-bar` | `value`, `placeholder` | `searchChange` (debounced) | — |
| `recipe-filter-panel` | `categories`, `areas`, `selected` | `filterChange` | extra controls |
| `meal-plan-day` | `day`, `meals` | `removeMeal`, `addMealRequest` | empty-state content |
| `recipe-rating` / `ui-badge` | `value`, `variant` | `rate` | default |

---

## Phase 2 — npm publish

- [ ] **2.1** `npm login`; verify the scope is available/owned
- [ ] **2.2** `npm pack` and inspect the tarball — confirm `files`, `main`, `module`, `types`, and
      every `exports` subpath actually resolve
- [ ] **2.3** `npm publish --access public` (**required** — scoped packages default to private)
- [ ] **2.4** Semver discipline: `0.1.0` initial, minor bump per new component, patch per fix.
      Maintain `CHANGELOG.md`

---

## Phase 3 — SvelteKit app skeleton

- [ ] **3.1** `npx sv create recipe-app` — Svelte 5, TypeScript, ESLint + Prettier
- [ ] **3.2** `npm i @<scope>/recipe-ui` **from the npm registry** — not `file:` or `link:`.
      The assignment forbids importing components from source.
- [ ] **3.3** Register custom elements client-side only in `+layout.svelte`:
      `onMount(() => defineCustomElements())`. SSR throws on `HTMLElement` otherwise.
- [ ] **3.4** Adjust `vite.config.ts` (`optimizeDeps.exclude` / `ssr.noExternal`) if the loader
      fails to resolve
- [ ] **3.5** Routes:
      - `/` — discover
      - `/recipes/[id]` — details
      - `/my-recipes` — list
      - `/my-recipes/new` — create
      - `/my-recipes/[id]/edit` — edit
      - `/favorites`
      - `/meal-plan`
- [ ] **3.6** Shared layout: nav, global CSS custom-property design tokens

---

## Phase 4 — Data & state layer

- [ ] **4.1** API client wrapping TheMealDB (search, filter, lookup) with typed responses and a
      normalizer to an internal `Recipe` type
- [ ] **4.2** Fetch remote data in `+page.ts` / `+page.server.ts` load functions, not components
- [ ] **4.3** Runes stores in `.svelte.ts`: `favorites`, `userRecipes`, `mealPlan`
- [ ] **4.4** `localStorage` persistence with a `browser` guard and a schema `version` field
- [ ] **4.5** Merge user-created recipes into discovery/search results so both sources appear together

---

## Phase 5 — Features

- [ ] **5.1 Discovery** — search → API query, category/area filters, `recipe-card` grid, loading /
      empty / error states
- [ ] **5.2 Details page** — image, meta, ingredients table, numbered instructions; handles both
      API and user-created recipes; favorite toggle; "add to meal plan"
- [ ] **5.3 Recipe CRUD** — create/edit form with dynamic ingredient rows; delete with confirm;
      edit/delete restricted to user-created recipes
- [ ] **5.4 Validation** — required title + category, ≥1 ingredient, ≥1 instruction step, valid
      image URL; inline per-field errors; submit blocked while invalid
- [ ] **5.5 Favorites** — toggle from card and details, `/favorites` page, remove, empty state
- [ ] **5.6 Meal planner** — 7 `meal-plan-day` columns with breakfast/lunch/dinner slots; assign
      via picker or drag-and-drop; change, remove, clear week

---

## Phase 6 — Integration hardening

The graded-but-easily-broken part. Do 6.1 and 6.2 as soon as the first card renders.

- [ ] **6.1 Object props** — Svelte sets *attributes* on unknown elements, and Stencil's
      lazy-loaded proxy may not have the property defined at hydration time. Verify objects/arrays
      actually land; if not, use `bind:this` + an `$effect` that assigns `el.recipe = value`.
- [ ] **6.2 Custom events** — `onfavoriteToggle` will not bind. Use `on:favoriteToggle` or
      `addEventListener` via an action/effect. Build one thin Svelte wrapper per component so this
      is solved in a single place.
- [ ] **6.3 Slots** — confirm shadow-DOM slot projection survives SvelteKit hydration
- [ ] **6.4 Theming** — style across the shadow boundary via CSS custom properties / `::part()`
- [ ] **6.5** Accessibility and responsive pass on both library and app

---

## Phase 7 — Deliverables

- [ ] **7.1** Deploy: `@sveltejs/adapter-vercel` or Netlify → live URL
- [ ] **7.2** Root README: setup, install, `npm run dev`, build, assumptions, npm package link,
      GitHub link, deployed URL
- [ ] **7.3** Library README finalized (see 1.7)
- [ ] **7.4** Final pass: dead starter code removed, lint clean, tests green

---

## Assumptions to state in the README

- No backend. Favorites, user recipes, and the meal plan persist in `localStorage`, so they are
  per-browser and lost when site data is cleared.
- User-created recipes are client-side only and cannot be deep-linked from another device.
- TheMealDB has no pagination, so discovery renders the full result set per query.
- Only user-created recipes are editable/deletable; API recipes are read-only.

---

## Build order

```
0 → 1 → 2 → 3 → 4 → 5.1, 5.2 → 6.1, 6.2 → 5.3, 5.4, 5.5, 5.6 → 7
```

**Key sequencing point:** publish a minimal `v0.1.0` of the library early (Phase 2), then resolve
the prop/event plumbing (6.1–6.2) immediately after the first card renders. Those two integration
quirks are where most Stencil-in-SvelteKit work stalls, and discovering them late means reworking
every component's API. Bump the package version as components land rather than saving publishing
for the end.
