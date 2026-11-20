# AI hand-off log

Running log for AI agents (any model) so work can continue safely after a hand-off.
Standing rules are in [`/CLAUDE.md`](../CLAUDE.md). Newest entry first.
Each entry: what changed, files, why, state left behind, open items.

---

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
- Commit `0187b9d`. **Not yet on GitHub**: push was refused (403, GitHub App access).

## Open items

- Push to `origin/daniel-staging-web` is blocked by 403 in the session that made the
  changes above. If those commits are missing on GitHub, re-apply them from this log.
