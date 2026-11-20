# AI hand-off log

Running log for AI agents (any model) so work can continue safely after a hand-off.
Standing rules are in [`/CLAUDE.md`](../CLAUDE.md). Newest entry first.
Each entry: what changed, files, why, state left behind, open items.

---

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
