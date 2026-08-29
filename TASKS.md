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
| npm package name | `recipe-ui-components`, unscoped | Confirmed available on registry.npmjs.org, so no scope is required. Sidesteps needing a scope tied to a personal account. |
| npm registry | Project-local `.npmrc` pins `registry.npmjs.org` | The machine default is a corporate Artifactory. This project must not publish or install through it. Publishing needs a personal npm login. |
| Git | Single root repo; the nested `create-stencil` `.git` was removed | Assignment asks for one GitHub repository link. |

---

## Phase 0 — Foundations ✅

- [x] **0.1** `git init` at root, add `.gitignore`, initial commit (`829e7f0`, branch `main`)
- [ ] **0.2** Create GitHub repo and push (repo link is a deliverable) — *deferred, doing manually*
- [x] **0.3** Confirmed `/recipe-ui-components` + `/recipe-app` sibling layout
- [x] **0.4** Stray root scratch files (`index.html`, `tooltip.js`) removed

---

## Phase 1 — Stencil component library ✅

- [x] **1.1** `package.json`: kept the name `recipe-ui-components` (verified **available** on the
      public registry, so no scope needed), `version` → `0.1.0`, real description/keywords/author,
      dropped the wrong `repository`, added `publishConfig`. **Fixed two broken `exports` paths
      inherited from the starter** — `dist/recipe-ui-components/recipe-ui-components.cjs.js` and
      `loader/index.cjs` do not exist; CJS consumers would have failed to resolve the package.
- [x] **1.2** `stencil.config.ts` already had `dist` + `dist-custom-elements` with
      `auto-define-custom-elements` and `docs-readme`. Verified, namespace left as-is since it
      matches the package name and dist paths.
- [x] **1.3** Starter `my-component` deleted
- [x] **1.4** Five components built (see table below)
- [x] **1.5** **58/58 tests pass** — 49 component contract tests in real Chromium + 9 helper unit
      tests. See "Testing notes" below.
- [x] **1.6** JSDoc on every `@Prop`/`@Event`/`@slot`/`@part`; Stencil generates per-component
      `readme.md` with full props/events/slots/parts tables
- [x] **1.7** Library README with usage, integration notes, per-component tables, theming
- [x] **1.8** `src/index.html` dev sandbox rewritten to exercise all five components, object props,
      slots, drag-and-drop and an event log (`npm start`)
- [x] **1.9** Project-local `.npmrc` pinning the public registry, since the machine default points
      at a private corporate Artifactory

### Testing notes

```bash
npx vitest run                      # all 58
npx vitest run --project unit       # helpers, no browser needed
npx vitest run --project browser    # component contracts, real Chromium
```

Three environment gotchas already resolved, worth knowing if this is set up on another machine:

1. **Chromium needs one system library on Ubuntu 22.04/WSL.** Playwright's browser download alone
   is not enough:
   ```bash
   sudo apt-get install -y libasound2
   ```
   `sudo npx playwright install-deps chromium` fails under nvm (`sudo` resets `PATH`), and would
   install 22 packages plus fonts when only this one was missing.
2. **Never call `vi.useFakeTimers()` around browser-mode `render()`.** It polls for layout on the
   same timers the fake clock freezes, so the render never resolves. Worse, a test that times out
   before `vi.useRealTimers()` leaks the fake clock into every later test in the file — that turned
   2 real failures into 7. Debounce tests use short real waits instead.
3. **Stencil's mock DOM cannot substitute for the browser.** `render()`'s actual options type has
   no `props`/`slots` (the `RenderOptions` exported from `types.js` that does is vestigial and unused),
   and `DragEvent`/`DataTransfer` are undefined. Props and slots go through JSX.

`vitest.config` is `.mts` so Vite loads it as ESM without a `type: module` in `package.json`, which
would break the published CJS entry point.

### Components as built

Each exercises **props, `@Event`, and slots** — the assignment grades all three explicitly.

| Component | Props | Events | Slots | Parts |
|---|---|---|---|---|
| `recipe-card` | `recipe`, `isFavorite`, `compact` | `favoriteToggle`, `viewDetails` | `actions`, `badge` | `card`, `image`, `title` |
| `recipe-search-bar` | `value`, `placeholder`, `debounceMs`, `label` | `searchChange`, `searchClear` | `filters` | `field`, `submit` |
| `recipe-filter-panel` | `categories`, `areas`, `selected`, `hideClear` | `filterChange`, `filterClear` | default | `panel`, `select` |
| `meal-plan-day` | `day`, `meals`, `isToday`, `addLabel` | `removeMeal`, `addMealRequest`, `mealDrop` | `footer` | `day`, `slot` |
| `recipe-rating` | `value`, `max`, `readonly`, `label` | `rate` | default | `rating`, `star` |

`recipe-search-bar` also exposes a `setFocus()` public `@Method`.

Design decisions worth noting:

- **Every object/array prop accepts a JSON string too**, via `parseObjectProp`/`parseArrayProp`.
  This pre-solves integration task 6.1: it does not matter whether SvelteKit sets a DOM property or
  only an attribute. Malformed JSON degrades to an empty state rather than throwing.
- **`recipe-filter-panel` is fully controlled** — it holds no selection state, and emits the
  complete next filter object with empty values stripped.
- **`recipe-card` emits the requested next favorite state**, not a bare toggle, so the consumer's
  store stays authoritative.
- A named slot inside a repeated list does not work (only the first instance receives projected
  content), so `meal-plan-day`'s empty slots use an `addLabel` prop rather than a slot.

---

## Phase 2 — npm publish

- [ ] **2.1** `npm login --registry=https://registry.npmjs.org/` with a **personal** account.
      Do not publish under corporate credentials. Re-confirm `recipe-ui-components` is still
      unclaimed at publish time.
- [x] **2.2** Every `exports`, `main`, `module`, `types`, `collection` and `unpkg` path verified to
      resolve against a real build. Two broken starter paths fixed in 1.1.
- [ ] **2.3** `npm publish`. `publishConfig.access: public` is already set in `package.json`.
- [ ] **2.4** Semver discipline: `0.1.0` initial, minor bump per new component, patch per fix.
      Maintain `CHANGELOG.md`
- [ ] **2.5** Add the GitHub repo URL to `package.json` `repository` once the remote exists (0.2).
      Removed for now rather than left pointing at the starter template.

---

## Phase 3 — SvelteKit app skeleton

- [ ] **3.1** `npx sv create recipe-app` — Svelte 5, TypeScript, ESLint + Prettier
- [ ] **3.2** `npm i recipe-ui-components` **from the npm registry** — not `file:` or `link:`.
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
- [ ] **6.6 Do not re-create custom elements to reflect state** — use **keyed** each blocks
      (`{#each recipes as r (r.id)}`) and update props, never rebuild the list. Recreating a
      `<recipe-card>` forces Stencil to re-hydrate it, the browser to re-decode its image, and the
      hover state to drop mid-transition — visible as a flicker. Hit this in the dev sandbox: one
      favorite toggle destroyed and rebuilt all three cards. Fixed by holding element references
      and assigning only the changed prop. An unkeyed `{#each}` in Svelte is the equivalent trap.
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
