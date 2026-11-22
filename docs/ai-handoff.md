# AI hand-off log

Running log for AI agents (any model) so work can continue safely after a hand-off.
Standing rules are in [`/CLAUDE.md`](../CLAUDE.md). Newest entry first.
Each entry: what changed, files, why, state left behind, open items.

---

## 2026-11-22 — Sidebar: foldable groups + nested menus

- **Sync check:** origin `daniel-staging-web` still `a25b133` (owner has not pushed patches 0001–0004);
  main nothing new. This is patch 0005 on top of local `7b52bb5`.
- **Owner:** "sidebar … nested menu if possible so it is not so crowded". UI only, no API.
- **Sidebar.tsx:** entries are `NavLeaf {to,label,icon}` or `NavParent {key,label,icon,children}`.
  Parents: `vendors` (Production/Rent/Outsource in Master Data), `event-settings` (`SETTINGS_PARENT()`,
  admin only, appended to Events). Feature filtering runs per leaf; an empty parent is dropped.
  Open state `Record<key,bool>` in `localStorage['emi.sidebar.open.v1']`; default = open if it holds the
  current route (`isOnRoute`: equal, `to/…` or `to-…`, so `/event-detail` counts as `/event`); a
  `pathname` effect re-opens a group/parent explicitly closed when you navigate into it; search forces
  open. Enter in search goes to the first leaf.
- **Checks:** build OK, tsc 0, lint baseline 12/1. Playwright: first visit only the active group open
  (3 visible rows on /dashboard); open/close persists after reload; /loan re-opens Master Data + Vendors
  with Rent active; search "outs" → Outsource, Enter → /outsource; "settings" → both settings links;
  Staff sees no Settings parent; dark + 390px slide-over OK; no page errors.
- **API impact:** none.

## 2026-11-20 — Event Checklist reachable from Event Detail (mock store) + stage race fix

- **Owner:** "event checklist ok outside, but it must also be in every event / accessible from event
  detail". Needed the checklist API (not built) → asked first; owner chose **mock data for now**.
- **Store:** `src/lib/checklistStore.ts` — module store + `useSyncExternalStore`, persisted to
  `localStorage['emi.checklist.v1']` (`{version, templates, items, signOffs, nextId, templatesSeeded}`),
  `storage` event sync between tabs, `storageFull` flag on quota errors. `seedTemplates(stages)` copies
  the sample templates (`eventChecklistMock.ts`) onto the real stages once (name match → partial name →
  relative position). `ensureEventChecklist(event, stages)` copies templates for an event the first time
  (status open, due from the event start). Photos are downscaled JPEG data URLs (`photoToDataUrl`).
  `INITIAL_EVENTS / INITIAL_ITEMS / INITIAL_SIGNOFFS` in the mock file are no longer used.
- **UI:** `EventChecklistPanel` (moved out of the page; mount with `key={event.id}`) is used by the
  overview page (right side) and by Event Detail (`?view=checklist`, switch `.ed-view-switch` inserted
  before the item toolbar; the item area is wrapped in `detailView === 'items'`). Overview list = real
  events from `/v2/event-filter` for 4 lifecycles (limit 100 each), `?event=<id>` selects one.
- **Stage race (pre-existing):** the current-status effect in `EventDetailPage` ran when statuses were
  present but `eventDetail` was not yet, fell back to the first stage and locked (`currentStatusId !== null`).
  Reproduced with a 400 ms slower `/v1/event/{id}`; fixed with `!eventDetail` in the guard.
- **Checks:** build OK, tsc 0, lint baseline 12/1, node tests 38/40 (same 2 pre-existing). Playwright
  (mocked API): overview lists real events; tick a task → *Open in event* → same task ticked, 1/15 in the
  switch, survives reload; Items view unchanged; *All checklists* returns with the event selected;
  templates on the 7 real stages; 390px dark OK; stage shows step 2 with the slow detail response.
- **Mock gotcha:** Event Detail needs arrays from `/v2/package`, `/v3/production-requests`,
  `/v1/events/{id}/borrowed-items|outsource-items`, `/v1/kategori-barang-all`, `/v1/event-files`, and
  items need `sub_list_id`, `is_checking`, `is_ware_house_item` as `{…, Valid}` objects.
- **API impact:** none (checklist still needs its backend — see api-impact-log).

## 2026-11-20 — Event Calendar filters + "stop when it needs the API" rule

- **Sync check:** origin `a25b133` (owner has not pushed the two patches yet); main nothing new.
- **Owner asked:** features for Event Calendar, "make sure there is a filter"; and a standing rule:
  if a request needs the API, stop and tell the owner first, and write it down for the devs.
  Rule added to `CLAUDE.md` (also in the `tendersystem` repo's CLAUDE.md).
- **API check first:** `/v1/event-calendar` returns per event only `id, name, location, booking_from,
  booking_to`; `/clashes` returns item rows (item, from/to, demand, stock, shortage, events). So
  search / location / events / items / only-with-clashes / shortages are client-side; stage, lifecycle,
  PIC, warehouse, category filters need API fields → **not built**, logged as "Needs API".
- **Code:** `src/lib/calendarFilters.ts` — `filterCalendar(days, clashes, filters, month)` returns kept
  event ids, kept clash rows, events per day, distinct clash/short items per day (expanded from row
  from/to within the month) and a summary. Search rule: if the text matches an item name, only those
  item rows are kept; otherwise rows of the matched events. Page uses server numbers when no filter
  is active (`isFiltering`), local numbers otherwise. Drawer reuses `Drawer` + `SearchableSelect multiple`
  + `.event-list-filter` button like the Event page; all strings i18n (en + id).
- **Tests:** `tests/calendarFilters.test.cjs` (6, pass). `node --test tests/*.test.cjs` = 38/40; the 2 failures
  are pre-existing on `a25b133` (checked in a clean worktree). vm-context objects need a JSON copy
  before `deepStrictEqual`.
- **Checks:** build OK, tsc 0, lint baseline 12/1. Playwright (mocked calendar API, 5 events, 3 clash rows):
  defaults match server numbers; Location Bali → 2/2/2/1; search "led par" → 1 clash row; dark + 390px OK.
- **API impact:** none (see api-impact-log for the "Needs API" list).

## 2026-11-20 — Port from emi-source (Event list) + dark-mode inline colour fixes

- **Sync check:** `daniel-staging-web` = `a25b133` + local dark-mode commit (owner applying the patch);
  main nothing new.
- **Source:** `sandmanzz/emi` = emi-source (found by code search; read-only clone, owner confirmed).
  Unported after the 11–12 Nov migration: `53aaf50` (Round 44) and two docs-only commits. Owner sent a
  screenshot of the emi-source Event page.
- **Done:** `EventPage.tsx` — `eventCoverSrc()` + `EventCardCover` (cover from optional `images`/`image`/
  `cover_url`, tolerant parsing, hides on error), card `overflow: hidden`, item-count badge from
  `total_items`; `.event-card-cover` in `eventUpgrade.css`; i18n `lifecycle.checking-inventory` →
  "Ready for Checking"/"Siap Diperiksa" (+ `prdBody`).
- **Dark-mode follow-up:** inline `#fff`/greys in `EventPage`, `InventoryPage`, `WarehousePage`,
  `WarehouseInventoryPage`, `EventDetailPage`, `Loading.tsx`, `AiMaterialAnalyzerPage` → `var(--white)` or
  `var(--dk-…, <original>)`; the `--dk-*` vars exist only in `theme-dark.css` (dark), so light mode is
  pixel-identical. Pattern documented in `CLAUDE.md`.
- **Round 44 review + what needs backend:** `docs/source-migration-53aaf50.md`.
- **Checks:** build OK, tsc 0, lint baseline 12/1. Playwright with mocked `/v2/event-filter` (6 events:
  2 valid covers, 1 invalid image string, counts 0–174) in light and dark; no page errors.
  Note: the generic mock must return an **array** for `/v1/location` or `/event` crashes in the mock.
- **API impact:** response parsing only (reads optional `images`, `total_items`) — see api-impact-log.

## 2026-11-20 — Light / dark mode (tenant app)

- **Sync check:** fetched `daniel-staging-web` + `main`; local = origin `a25b133`, main has
  nothing new.
- **Why:** owner asked to bring the mobile app's light/dark mode (built today in the
  `tendersystem` repo, branch `daniel-staging`, React Native) to the web as today's update.
  There is no general Settings page on the web, so the switcher sits in the header next to
  the language switcher (the existing place for per-user preferences). Options and default
  match mobile: Light / Dark / System, default Light.
- **How it works:**
  - `index.html` sets `html[data-theme]` before first paint from `localStorage['emi.theme.v1']`.
  - `src/lib/theme.ts`: module store + `useTheme()` (`useSyncExternalStore`), writes the
    attribute, listens to `prefers-color-scheme` (only while "system") and `storage` (other tabs).
    Imported in `main.jsx`.
  - `src/theme-dark.css` (imported last in `main.jsx`): `:root[data-theme="dark"]` token
    values copied from `.sa-theme`, wrapped in `@media screen` so print stays light; then
    ~80 selector fixes for hard-coded light colours found by scanning all CSS files
    (`#fff` surfaces → `var(--white)`, grey hovers → white alpha, tints → `--*-bg`, solid
    buttons with white text keep the light-mode 600 shades for contrast).
  - `ThemeSwitcher.tsx` reuses the `.lang-switcher*` dropdown classes + `.theme-switcher-*`
    (end of `style.css`).
- **Not covered:** `Login.tsx` (24 inline colours; stays light, readable), inline hex in
  `AiMaterialAnalyzerPage`, `InventoryPage`, `EventPage`, `PrintPlanModal` (print) — checked
  the analyzer and event pages in dark, they read fine with empty data. Pages were checked
  with mocked **empty** API data; tables with rows, modals and drawers with real data still
  need a look in dark mode.
- **Gotcha:** `src/index.css` (Vite template leftovers, pulled in by `Loading.tsx`) has its
  own `prefers-color-scheme: dark` block and `color-scheme: light dark`. Checked: with OS dark
  and theme Light, the app still renders light. Not touched; candidate for cleanup.
- **Checks:** `npm run build` OK, `npx tsc --noEmit -p .` 0 errors, lint at baseline 12/1.
  Playwright: pick Dark from the menu → applied + saved, survives reload; System follows
  OS dark/light live; print media → body white/dark text; screenshots in dark at 1440px
  (Event Checklist, Event Settings, Dashboard, Calendar, Inventory, Loan, Material Analyzer,
  Event) and 390px (Event Checklist, Event Settings); Owner panel unaffected.
- **API impact:** none.

## 2026-11-20 — Sidebar redesign (minimal)

- **Sync check:** main had nothing new; branch still 2 commits ahead of origin (owner has not
  pushed the build-info + checklist v2 patch yet).
- **CSS (`src/style.css`, SIDEBAR block + `.sidebar-search*` + `.sidebar-footer`/build-info block):**
  width 240px, padding on the sidebar (10px) instead of on items; no divider lines between
  sections (14px spacing instead); nav items are rounded pills (8px radius, 7px 10px),
  weight 500; icons 16px in `--text-muted`, brand color when active; active = `--brand-bg`
  background without the old left border; hover = `--bg`; focus-visible outline; long labels
  ellipsis; thin scrollbar that only shows on hover. Search is a borderless filled pill.
  Footer: Owner Panel is now a `.nav-item` (muted); build info is one small card
  (`--bg`, radius 8px) with version on top (+ label on the right in the owner panel).
  Only design tokens are used, so the dark `.sa-theme` works without changes.
- **`Sidebar.tsx`:** Event Calendar, Event Report and Stock Opname Report used text glyphs
  (▦ ▤) as icons — replaced with SVGs like the other items. Owner link gets `nav-item`.
- **`BuildInfo.tsx`:** version + optional label in one row (`.sidebar-version-top`).
- **API impact:** none. **Checks:** build OK, tsc 0, lint baseline 12/1; screenshots tenant
  desktop, owner (dark), mobile slide-over.

## 2026-11-20 — Event Checklist v2: field features + Checklist Settings

- **Sync check:** fetched `daniel-staging-web` + `main`; main had nothing new. Local branch was
  1 commit ahead (build-info commit `5715e8b`, not pushed yet by the owner) — this work sits on top.
- **Why:** owner asked to "roast" the checklist for field use (photos, sign-off) and to make every
  feature controllable from a settings menu. Roast table + open items: `docs/prd/event-checklist.md` (Round 2).
- **New files:**
  - `src/lib/checklistSettings.ts` — settings type, defaults, store (`useSyncExternalStore`,
    persisted to `localStorage` key `emi.checklistSettings.v1`, wrapped in try/catch).
  - `src/lib/tenantUser.ts` — `isTenantAdminUser()`, `currentUserName()` from `localStorage.auth`.
  - `src/pages/EventChecklistSettingsPage.tsx` — `/event-checklist-settings`, admin only, grouped
    switches, sticky save bar (Save / Discard), reset to defaults.
  - `src/components/checklist/ChecklistItemDrawer.tsx` — task view (status picker, photos with
    lightbox, note, history); validation: Done needs a photo when `requiresPhoto`; N/A / Issue need a note.
  - `src/components/checklist/SignOffModal.tsx` + `SignaturePad.tsx` (pointer events, PNG data URL).
- **Changed:** `EventChecklistPage.tsx` (statuses, photos, notes, sign-off, lock, settings-driven
  UI, Settings link for admins), `src/data/eventChecklistMock.ts` (status/photos/notes/activity,
  `requiresPhoto` on templates, `INITIAL_SIGNOFFS`, placeholder photo + signature SVGs),
  `src/eventChecklist.css`, `Sidebar.tsx` (admin-only "Checklist Settings" under Events),
  `App.tsx` (route), i18n `eventChecklist.*` + `checklistSettings.*` + nav key (en + id),
  `src/hooks/api/eventChecklistContract.ts` (statuses, photos, activity, sign-offs, settings).
- **Rules implemented in the UI** (must be mirrored by the backend): resolved = done | na;
  sign-off only when required items are resolved and no Issue is open; lock after sign-off;
  admin reopen removes all sign-offs of that stage.
- **Checks:** build OK, `tsc` 0 errors, lint at baseline 12/1, no page errors. Playwright flow
  tested: Issue without note blocked → with note OK; quick tick on photo-required task opens the
  drawer; upload photo → Done; sign-off with drawn signature → stage locked; settings saved
  (signer = both); mobile drawer.
- **API impact:** new endpoints/fields only (see `docs/api-impact-log.md`).

## 2026-11-20 — Build info in the sidebars + "sync with main first" rule

- **Sync check done before this change:** `origin/main` (783b3d5, 3 "first init" commits)
  is fully contained in `daniel-staging-web` → nothing to merge.
- **New standing rule** (owner's request) in `CLAUDE.md` → "Team flow": at the start of
  every task fetch + pull `daniel-staging-web` and merge `origin/main` if it has commits
  the branch lacks.
- **Build info:** `vite.config.js` defines `__BUILD_INFO__` (Vercel `VERCEL_GIT_COMMIT_REF/
  SHA/MESSAGE/AUTHOR_LOGIN` first, then local `git`, then `unknown`; commit date only from
  git, otherwise the build time is shown as "built …"). `src/components/BuildInfo.tsx`
  renders version, branch, short commit and date (full details in the hover tooltip);
  used by `Sidebar.tsx` and `SuperAdminSidebar.jsx`. Type: `src/types/build-info.d.ts`.
  i18n `buildInfo.*` in en + id. CSS: `.sidebar-build-*` in `src/style.css`.
  `vite.config.js` imports `process` from `node:process` (ESLint `no-undef` otherwise).
- **Note:** the info is the commit at **build time**; a deploy shows the commit it was
  built from, which is the point.
- **API impact:** none.

## 2026-11-20 — New module: Event Checklist (UI on mock data)

- **Route/menu:** `/event-checklist`, sidebar Events → "Event Checklist" (after Event),
  gated by `event_management_price` in `ROUTE_FEATURES` (`src/components/Sidebar.tsx`),
  route in `src/App.tsx`.
- **Decision:** one checklist per event, grouped by stage, generated from per-stage
  templates; required items will block leaving a stage. Full reasoning and open questions:
  `docs/prd/event-checklist.md`.
- **Files:**
  - `src/pages/EventChecklistPage.tsx` — two tabs: *Event checklists* (event list with
    progress/overdue/blocking + detail grouped by stage, tick, add, delete with Undo
    toast, current/all stages, hide completed; mobile = list → detail with back button)
    and *Stage templates* (per stage: add, required toggle, delete with Undo).
  - `src/eventChecklist.css` — all `.ck-*` styles (separate file, imported by the page).
  - `src/data/eventChecklistMock.ts` — stages, templates, events, items. Dates are
    relative to today. State lives in `useState`; reload resets it.
  - `src/hooks/api/eventChecklistContract.ts` — **contract only** (comments + DTO types),
    no requests. Implement hooks from it when the backend exists.
  - i18n: `eventChecklist.*` and `navigation.items.eventChecklist` in en + id
    (plural keys use i18next `_one` / `_other`).
- **Mock stages are hard-coded** (`CHECKLIST_STAGES`). When wiring the API, take stages from
  `/v1/event-status/get-all` instead.
- **API impact:** new endpoints required (see `docs/api-impact-log.md`); nothing existing changed.
- **Checks:** build OK, lint at baseline (12/1), no console errors; screenshots at 1440px
  and 390px (list, detail, all stages, templates, add form).

## 2026-11-20 — Event Settings rule guide redesign

- **Why:** owner said the "What do the rules mean?" button (an unstyled native button, class
  `link-btn` had no CSS) and the guide content looked bad.
- **What:**
  - Header of `src/pages/EventStatusPage.tsx` now uses `.es-header` with an actions group:
    a **"Rule guide"** toggle button (info icon + chevron, `aria-expanded`/`aria-controls`)
    next to **New Status**.
  - Guide panel (`section#es-rule-guide.card.es-guide`): title + one-line explanation,
    close button, 4 group cards (Scanning / Stock / Items / Requests) with colored top
    border, a one-line hint per group, and per rule: chip, tag (`1 stage only` for unique
    rules, `Shown when off` for restrictive ones), short description.
    Footer explains the colored dots in the stage bar (previously unexplained).
  - New i18n keys `eventSettingsRules.guide.*` in **en** and **id**. Old
    `eventSettingsRules.*.description` keys are untouched — the New/Edit Status modal
    switches and chip tooltips still use them.
  - CSS: new `.es-header*`, `.es-guide*` rules in `src/style.css`; removed unused
    `.es-legend` and `.es-legend-row`; `.es-legend-title` is kept (used by the form).
    Responsive: 4 → 2 columns ≤1100px, 1 column ≤640px.
- **API impact:** none (see `docs/api-impact-log.md`).
- **Checks:** build OK; lint at baseline (12 errors / 1 warning, pre-existing).
  Screenshots checked at 1440, 1000 and 390px with a mocked API.

## 2026-11-20 — App version at the bottom of the sidebars

- `src/style.css`: `.sidebar` is a flex column so the footer/version is pinned to the bottom;
  removed a `margin-top: 16px` that overrode `margin-top: auto` on `.sidebar-version`.
- `src/components/SuperAdminSidebar.jsx`: shows `v{version}` from `package.json`.
- On GitHub as `7bb734f` (pushed by the owner via patch).

## Open items

- Cloud sessions cannot push: the Claude GitHub App is not installed on
  `rezalukman29/emi` (the owner is only a contributor; connected GitHub account is
  `sandmanz26`). Workaround used: `git format-patch origin/daniel-staging-web`, send the
  patch, the owner runs `git am` + `git push` on their Mac. After they push, `git fetch`
  and `git reset --hard origin/daniel-staging-web` only if `git diff HEAD origin/daniel-staging-web`
  is empty (git am rewrites hashes). Permanent fix: repo owner installs the app.
