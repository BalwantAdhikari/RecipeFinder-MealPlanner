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
| Excluded categories | **Beef** and **Pork** are hidden app-wide (`EXCLUDED_CATEGORIES`) | Requested. Enforced by id, not category name, because `filter.php` returns partial records with no `strCategory` — see Phase 4. |

---

## Phase 0 — Foundations ✅

- [x] **0.1** `git init` at root, add `.gitignore`, initial commit on branch `main`
- [x] **0.2** Pushed to **https://github.com/BalwantAdhikari/RecipeFinder-MealPlanner**
      (see "Git identity" below — this repo uses a personal identity and SSH key, not the
      machine-global corporate ones)
- [x] **0.3** Confirmed `/recipe-ui-components` + `/recipe-app` sibling layout
- [x] **0.4** Stray root scratch files (`index.html`, `tooltip.js`) removed

### Git identity

This repo must stay off the machine's corporate defaults (global git email is
`@coxautoinc.com`, global npm registry is a corporate Artifactory). Configured **locally only**:

```bash
git config --local user.name  "Balwant Adhikari"
git config --local user.email "balwantadhikari123@gmail.com"
git config --local core.sshCommand "ssh -i ~/.ssh/id_github_personal -o IdentitiesOnly=yes"
```

`IdentitiesOnly=yes` matters — it stops SSH offering any other key, so this repo can only
authenticate as the personal account. The remote is SSH rather than HTTPS so it bypasses the
global `store` credential helper entirely.

Commit messages carry **no** AI co-author trailer, by request.

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

## Phase 2 — npm publish ✅

**Published: https://www.npmjs.com/package/recipe-ui-components** — `recipe-ui-components@0.1.0`,
2026-08-29, 70 files / 402 kB unpacked, MIT, maintainer `balwant-adhikari`.

- [x] **2.1** Logged in to `registry.npmjs.org` with a personal account (not corporate)
- [x] **2.2** Every `exports`, `main`, `module`, `types`, `collection` and `unpkg` path verified to
      resolve against a real build. Two broken starter paths fixed in 1.1.
- [x] **2.3** Published. Required **2FA** — see gotcha below.
- [ ] **2.4** Semver discipline: `0.1.0` initial, minor bump per new component, patch per fix.
      Maintain `CHANGELOG.md`
- [~] **2.7** `0.1.1` prepared and committed (version bump + `CHANGELOG.md` + corrected README +
      the `recipe-filter-panel` active-count fix). **Publish deferred to Phase 7.5.** No longer
      docs-only, but the app works around the same bug locally, so nothing is blocked.
- [x] **2.5** `repository` (with `directory`), `homepage` and `bugs` added before first publish, so
      `0.1.0` shipped with the GitHub link rather than needing a bump.
- [x] **2.6** Verified consumable: installed `recipe-ui-components@0.1.0` from the registry into a
      scratch project. No `src/`, no tests. All four import paths resolve:
      `recipe-ui-components/loader` (`defineCustomElements`), the root import
      (`parseObjectProp`/`parseArrayProp`/`debounce`), and
      `recipe-ui-components/components/recipe-card` (`RecipeCard`, `defineCustomElement`).

### Publishing gotchas hit

1. **npm requires 2FA to publish.** A plain `npm publish` in a non-interactive shell fails with
   `403 ... Two-factor authentication or granular access token with bypass 2fa enabled is
   required`. In a real terminal npm prompts for the OTP; otherwise pass `--otp=<6 digits>`.
   Granular tokens with "bypass 2FA" are being deprecated for direct publishing, so the OTP path
   is the durable one.
2. **npm login sessions expire.** `npm whoami` worked, then returned 401 ten minutes later.
   Re-run `npm login` if publish suddenly 401s.
3. **Project `.npmrc` overrides user `~/.npmrc`.** The repo pins the auth token to
   `${NPM_TOKEN}`, so if that variable is not exported, the line shadows whatever credential
   `npm login` wrote to `~/.npmrc` and publishing fails with 401 from inside the package
   directory. Pick one path and stick to it: either export `NPM_TOKEN`, or comment out the
   `_authToken` line and use `npm login` + `--otp`. Do not mix them.

   Never put a literal token in any `.npmrc` here — all three are committed to a public repo.
   Check before every publish:
   ```bash
   grep -rE '_authToken=npm_' .npmrc */.npmrc && echo LEAK || echo safe
   ```
4. **Never publish straight after running the dev server.** `npm start` leaves `dist/` holding a
   `--dev` build: unminified, and **missing `dist/collection/`** entirely, which the `collection`
   and `collection:main` fields point at. A dev-state tarball was 42 files / 152 kB versus the
   correct 70 files / 85 kB. `"prepublishOnly": "npm run build"` in `package.json` guards against
   this by forcing a production rebuild.

---

## Phase 3 — SvelteKit app skeleton ✅

- [x] **3.1** `sv create recipe-app` — Svelte 5.56, SvelteKit 2.63, Vite 8, TypeScript,
      ESLint + Prettier. Note: no `svelte.config.js` in this version; adapter config lives in
      `vite.config.ts` under the `sveltekit()` plugin.
- [x] **3.2** `npm i recipe-ui-components` **from the registry**. Lockfile records
      `https://registry.npmjs.org/recipe-ui-components/-/recipe-ui-components-0.1.0.tgz`, so this is
      a real registry dependency, not a `file:`/`link:` shortcut.
- [x] **3.3** Elements registered client-side only, in `+layout.svelte` `onMount`
- [x] **3.4** `vite.config.ts`: file-watch polling enabled (see gotcha 3 below)
- [x] **3.5** All seven routes created; dynamic routes render their `id` param
- [x] **3.6** Shared layout with sticky nav + active state, footer, and `src/app.css` design tokens
      that are projected into the components' shadow DOM via their CSS custom properties
- [x] **3.7** `src/lib/components/stencil.ts` — `use:on` and `use:props` actions, solving the
      event-binding and object-prop problems once (this is tasks **6.1 and 6.2**, done early)
- [x] **3.8** Verified in a real browser: 19/19 checks, 0 page errors — SSR 200, hydration,
      object props, both slots, events driving Svelte state, props pushed back to the element,
      `goto()` navigation, all seven routes, nav active state on child routes

### Phase 3 gotchas — all four cost real debugging time

1. **Do not use `recipe-ui-components/loader` in a bundled app.** The lazy build fetches
   `*.entry.js` chunks at runtime; Vite pre-bundles the loader but cannot see those chunks, so they
   404 and every component fails with `Constructor for "recipe-card#undefined" was not found`. The
   element upgrades and gets a shadow root, but `shadowRoot.innerHTML` stays empty and `.hydrated`
   is never added — a confusingly quiet failure. Use the `dist-custom-elements` output instead:
   `import('recipe-ui-components/components/recipe-card')` per component. `components/index.js`
   exports only helpers and runtime, **not** the elements, so each must be imported individually.
2. **A child's actions run before the parent layout's `onMount`.** So `use:props` fires while the
   element is still un-upgraded, and plain assignment creates own properties that shadow the
   accessors Stencil installs on the prototype during upgrade — the component then renders its
   empty state despite the prop "being set". The `props` action waits on
   `customElements.whenDefined(tag)` before assigning.
3. **Vite's file watcher does not work on `/mnt/c`.** WSL2 gets no inotify events from the Windows
   9p mount, so edits are invisible: the dev server keeps serving stale transforms and HMR silently
   does nothing. This produced a phantom bug where a fix on disk had no effect. Fixed with
   `server.watch.usePolling: true` in `vite.config.ts`. Also clear `node_modules/.vite` when
   changing how a dependency is imported, since the dep optimizer caches aggressively.
4. **`resolve()` returns a relative path during SSR.** Comparing it against
   `page.url.pathname` for nav active state silently never matches. Keep the canonical route path
   for matching separate from the resolved `href`. Also: the ESLint config requires `resolve()` on
   every `href`/`goto()` and `SvelteSet` over a plain `Set` — both worth following, since
   `SvelteSet` is reactive on mutation and needs no defensive copying.

## Phase 4 — Data & state layer ✅

- [x] **4.1** `src/lib/api/` — typed TheMealDB client (`themealdb.ts`) plus a normalizer
      (`normalize.ts`) mapping the wire format to the internal `Recipe` type
- [x] **4.2** Remote data fetched in `+page.ts` load functions (discovery and details), using
      SvelteKit's `fetch` so the first render is server-side
- [x] **4.3** Runes stores in `.svelte.ts`: `favorites`, `userRecipes`, `mealPlan`
- [x] **4.4** `localStorage` persistence with a `browser` guard and a versioned envelope
      (`persist.ts`, `SCHEMA_VERSION = 1`)
- [x] **4.5** User recipes merged into discovery results (`merge.ts`), user-first, de-duplicated
- [x] **4.6** Discovery state lives in the URL (`?q=`, `?category=`, `?area=`), so searches are
      shareable and survive reload/back
- [x] **4.7** Details page renders the loaded recipe (ingredients + instructions), serving both API
      and user recipes from one route
- [x] **4.8** **27 offline tests** for the normalizer and merge logic, plus **8 opt-in live
      integration tests** against the real API (`npm run test:live`)
- [x] **4.10** **Beef and Pork excluded app-wide.** Removed from the category dropdown (14 → 12),
      subtracted from every result set, and blocked on the details route so a deep link is not a way
      around it. The same rule applies to user-created recipes, so the local path cannot reintroduce
      them.
- [x] **4.9** Verified end-to-end in a browser: 17/17 checks — live data renders, search drives the
      URL, filters apply, category+area intersects, favorites persist across reload, meal-plan
      writes are version-stamped, unknown ids 404, no-results shows an empty state

### API findings worth knowing

Probed before writing the client rather than assumed:

| Endpoint | Behaviour |
|---|---|
| `search.php?s=x` | Full 54-key records: `strIngredient1..20` + `strMeasure1..20`, instructions |
| `search.php?s=` | Returns 25 meals — a usable default browse, no extra endpoint needed |
| `filter.php?c=x` | **Partial** records. Includes `strArea` but **not** `strCategory` |
| `lookup.php?i=x` | Full record; unknown id returns `{"meals":null}` |
| no match | `{"meals":null}`, not `[]` and not a 404 |
| pagination | None. Every response is the full result set |

1. **`filter.php` accepts one dimension at a time.** Filtering by category *and* area needs two
   calls intersected by id — implemented in `discover()` and covered by a live test that checks the
   intersection against both single-filter result sets.
2. **`list.php?a=list` is a trap.** It returns 195 countries, not 195 cuisines with recipes —
   roughly 85% return zero results, so a dropdown built from it is mostly dead options. The real
   list is **37**, derived by scanning all 14 category endpoints (793 meals) and collecting distinct
   `strArea` values. Hardcoded as `AREAS` because deriving it at runtime costs 14 requests.
3. **Instructions are one blob split by `\r\n`**, sometimes with blank lines and pre-existing
   "1." / "2)" numbering that has to be stripped, or the UI shows "1. 1. Bring a pot…".
4. **Excluding a category cannot be done by name alone.** `filter.php` omits `strCategory`, so an
   area-filtered result set has no category to test. The ids of every recipe in an excluded
   category are fetched once, cached at module level, and subtracted from all results. Measured:
   the Chinese area filter returns 27 upstream and shows 20 — the 7 removed arrived as partial
   records with no category at all, so a name check would have let them through.
5. **Ingredient names repeat legitimately.** A flan lists sugar for the caramel and again for the
   custard, so keying an `{#each}` by ingredient name is a runtime `each_key_duplicate` crash.

### Phase 4 gotchas

1. **Never name an import `props`.** Svelte parses `$props` as a store subscription, so
   `import { props }` breaks the `$props()` rune in the same component. The action is `setProps`.
2. **Run `svelte-kit sync` after adding a load function**, or `PageData` types as `{}` and every
   `data.x` access is an error.
3. **`{ category: undefined }` still has a key.** Counting active filters by key claimed a filter
   was applied when none was — visible as "Clear all (2)" with both selects on "All". Fixed on both
   sides: the load function omits unset keys, and the component now counts truthy values (with two
   regression tests, bundled into the deferred `0.1.1`).
4. **`location` does not exist during SSR.** Use `page.params`, not `location.pathname`.

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

- [x] **6.1 Object props** — solved in Phase 3.7 by the `use:props` action, which assigns DOM
      properties and waits for `customElements.whenDefined()` so it works regardless of whether the
      element has upgraded yet. Verified: `typeof el.recipe === 'object'` in a real browser.
- [x] **6.2 Custom events** — solved in Phase 3.7 by the `use:on` action (`addEventListener` plus
      teardown). Confirmed `favoriteToggle`, `viewDetails`, `searchChange` and `searchClear` all
      drive Svelte state.
- [x] **6.3 Slots** — confirmed: `badge` and `actions` both project through hydration
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
- [ ] **7.5** **Publish `recipe-ui-components@0.1.1`** (deferred from 2.7 — docs-only). Already
      committed and ready; `prepublishOnly` forces a clean production build.
      1. Revoke the compromised token, create a new one, then `export NPM_TOKEN=<new>`
      2. `cd recipe-ui-components && npm publish`
      3. Verify the corrected README renders on npmjs.com
      4. `cd recipe-app && npm install recipe-ui-components@0.1.1 && rm -rf node_modules/.vite`
      5. Re-run the browser verification, then commit the lockfile change
- [ ] **7.6** Confirm the README's npm link points at the latest published version

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
