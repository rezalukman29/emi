# Update History — EMI (Event Management Inventory)

This file is a running changelog of functional changes made to the app, written so a
developer picking up the project cold can understand **what changed, why, and where** —
not just a diff summary. Entries are newest first. No calendar dates are attached to
older entries below because they weren't tracked at the time; treat the ordering as
chronological ("Round 1" happened before "Round 2", etc).

If you're new to this codebase, read **"Context every dev should know"** first — it
explains a few non-obvious conventions that the entries below assume you already know.

---

## Context every dev should know

- **No backend.** Everything is a static React SPA (Vite, plain JSX, no TypeScript).
  All "data" lives in `src/data/*.js` as exported arrays/consts and is seeded into
  `useState` on each page. Refreshing the browser resets any in-session edits —
  this is expected, not a bug.
- **Mock "today".** `src/data/events.js` exports `TODAY = new Date('2026-04-09')`.
  Every days-until / overdue / recency calculation across the app (Dashboard,
  Item Loan, Event countdowns) is computed against this constant, **not** the real
  system clock. If dates in the UI look "wrong", check this constant first.
- **Styling.** Plain CSS with custom properties in `src/style.css` — no Tailwind/CSS
  framework. The superadmin panel reuses the same variable *names* but overrides
  their values inside a `.sa-theme` scope for its dark theme.
- **Two separate apps in one router.** Tenant-facing pages (`/dashboard`, `/event`,
  `/inventory`, …) and the **SaaS Owner ("superadmin") panel** (`/superadmin/*`) live
  side by side in `App.jsx`. The superadmin panel has its own mock, localStorage-based
  auth (`src/lib/superAdminAuth.js`) — there is no real backend/session behind it.
  - Login: `/superadmin/login`
  - Demo credentials: `owner@emi-saas.com` / `Owner@123`
  - Discoverable in the tenant UI via the small **"Owner Panel"** link in the sidebar
    footer (added in Round 2 below) — before that it was only reachable by typing
    the URL directly.
- **Dev server port:** 3100 (`vite.config.js` → `server.port`, `strictPort: true`).
  Also configured in `.claude/launch.json` for the in-editor preview browser.
- **Reusable pieces worth knowing about:** `Modal.jsx` (size presets `md`→`4xl`),
  `Stepper.jsx` (event-level status stepper), `Pagination.jsx`, `SortTh.jsx`,
  `GlobalSearch.jsx`, `RequireAuth.jsx`.

---

# 2026-11-24 — AI Tools hub + 3 Star Protection (preview on mock AI)

- **Sidebar:** AI Tools is now a highlighted card (not a plain group) linking to the new **AI Tools hub** (`/ai-tools`)
  with 3 Star Protection and Material Analyzer.
- **3 Star Protection settings** (`/ai/three-star`): explains the three stars, master On/Off, checks per star,
  strictness, minimum prep days, setup hours, checklist suggestion, who sees the tab, example suggestions.
- **Event Detail → 3 Star tab:** star score in the tab; hero with stars and per-star status; suggestions with Risk /
  Check / Tip (e.g. "Meja Bulat Kaca on grass may wobble", "50 chairs short for 200 guests", "Only 9 days to
  prepare", "Lights need power"); Done / Not relevant; an AI checklist that adds tasks (with photo/report
  requirements and due dates) to the Event Checklist group "3 Star · AI"; a structured **Event brief** form.
- **Mock:** `src/lib/threeStar.ts` (rule engine + small item knowledge base), stored per browser. Contract for the
  real AI: `src/hooks/api/threeStarContract.ts`; API needs in `docs/api-backlog.md` §12.
- **Files:** new `src/lib/threeStar.ts`, `src/components/ai/ThreeStarPanel.tsx`, `src/pages/AiToolsPage.tsx`,
  `src/pages/ThreeStarSettingsPage.tsx`, `src/threeStar.css`, `src/hooks/api/threeStarContract.ts`; changed
  `src/components/Sidebar.tsx`, `src/App.tsx`, `src/pages/EventDetailPage.tsx`, translations (`aiTools.*`, `threeStar.*`).

---

# 2026-11-24 — Inventory is lent to events: rental availability hints in Add Items

- **Business knowledge (owner):** items go out to an event and come back to the warehouse; a return adds stock
  again. Availability therefore depends on dates, and stock checks must predict when running events return items.
  Recorded in `docs/prd/PRD-2026-11-23.md` §1b.
- **Add Items (A and B):** a note says the stock is what is on the shelf now and that items at other events come back
  when returned; items that clash with other events on this event's dates get an orange pill
  "Clash 24 Dec–26 Dec: short 40 · Other event" (data from the Event Calendar clash report, no new API).
- **Needs API:** a real "available for these dates" number and date-based checks when adding items
  (`docs/api-backlog.md` §11).
- **Files:** `src/pages/EventDetailPage.tsx`, `src/hooks/api/useGetEventCalendar.ts`, `src/eventUpgrade.css`,
  `src/locales/{en,id}/translation.json` (`rentalAvail.*`), docs.

---

# 2026-11-23 — PRD updated to the current product

- New `docs/prd/PRD-2026-11-23.md`: the product as it is now (platform on the real API, navigation, Events list,
  Event Detail A/B, Add Items A/B, Event History, Event Checklist groups model, calendar, A/B process) with
  [RULE] / [ASSUMPTION] / [QUESTION] / [PREVIEW] / [NEEDS API] marks and a table of open owner decisions.
- `docs/prd/event-checklist.md`: Round 3 (groups, assignees, proof on tick, admin e-mail, untick history) replaces the
  stage model; Rounds 1–2 kept as history.
- `docs/prd/PRD-TECHNICAL-SYSTEM-SCHEMA.md`: status banner (what is outdated since the move to the real API), notes for
  Event History and a new §3.21 Event Checklist.
- Docs only: no code, UI or API change.

---

# 2026-11-23 — Event Checklist v2: free groups, assign to users, photo/report proof, admin e-mail, untick history, filter

Owner request; applies on the **Event Checklist** page and in **Event Detail → Event Checklist** (same panel).
Still a **preview**: data stays in the browser, e-mails are not sent (the backend list is in `docs/api-backlog.md`).

- **Groups instead of stages:** tasks live in free groups (add, rename inline, move ↑ ↓, delete with Undo).
  New events get a copy of the **template groups** (Templates tab, same tools). The "Current stage / All stages"
  switch and the stage gate setting are gone; the event's stage still shows as a pill in the event list.
- **Assign:** a task can be assigned to a user from the tenant's user list (`/v1/get-all-user`), when adding
  the task (*Options*) or in the task drawer. Rows show the person (or *Unassigned*). Filters *Assigned to me*
  (panel) and *Only events with tasks for me* (event list); event cards show "N for me".
- **Proof when ticking:** each task (and template task) can need a **photo** and/or a **report**. Ticking such
  a task opens *Complete task* (upload photo(s), write the report); *Mark as done* refuses until they are
  filled. Tasks without requirements are ticked straight away. Requirements can be changed in the drawer.
- **E-mail to admins:** new setting *Notifications → E-mail admins when a task is ticked* (every task or required
  only). Preview: a toast says how many admins would get it, the task history logs it, and Checklist Settings
  lists the last e-mails that would be sent (recipients = admins with an e-mail in the user list).
- **Untick:** allowed; photos and report are kept; history records "unticked the task (was Done)".
  The drawer history notes that every change is recorded.
- **Filter:** All / Not done / Done with counts (plus *Assigned to me*).
- **Preview data reset:** new storage key `emi.checklist.v2`; v1 data (by stage) is no longer read.
- **Docs:** new `docs/api-backlog.md` (every API the backend still has to build) and `docs/ui-changes.md`
  (UI map per screen + UI change log), both requested by the owner.
- **Files:** `src/data/eventChecklistMock.ts`, `src/lib/checklistStore.ts`, `src/lib/checklistSettings.ts`,
  `src/lib/tenantUser.ts` (`currentUserId`), `src/components/checklist/EventChecklistPanel.tsx`,
  `ChecklistItemDrawer.tsx`, new `CompleteTaskModal.tsx`, new `useChecklistUsers.ts`,
  `src/pages/EventChecklistPage.tsx`, `EventChecklistSettingsPage.tsx`, `EventDetailPage.tsx`,
  `src/hooks/api/eventChecklistContract.ts`, `src/eventChecklist.css`, `src/locales/{en,id}/translation.json`.

---

# 2026-11-23 — Add Items: A/B switch + version B, stock tabs, default warehouse; responsive pass

- **A/B switcher has two rows now:** *Event Detail A|B* and *Add Items A|B*, switched independently
  (admins only, on Event Detail). Its default spot moved to the bottom-left so it no longer covers
  *Save to Event*; it can still be dragged anywhere.
- **Add Items from Inventory — both versions:**
  - Tabs **Available (n)** / **Out of Stock (n)** under the search; *Available* is open by default. The counts
    cover the items loaded so far (a "+" means more pages exist); more pages load automatically while a tab
    shows few rows, and a **Load more items** button is at the bottom.
  - **A warehouse is always pre-selected**: the one with the most stock for that item (was: the first one in
    the list). An item that is in no warehouse says "Not in any warehouse" instead of an empty dropdown.
- **Add Items — version B:** one clean row per item (photo · name, SKU · category, warehouse · stock number
  in green/orange/red · − qty + stepper · Add). Rows already in the cart show "3 in cart". Out-of-stock rows
  offer **Rent Item** / **Request Production** (when the stage allows them; the picker closes and the cart is
  kept). Cart panel shows the total pcs and a warning when items still need an area. On phones: a
  *Browse inventory | Cart (n)* switch instead of two stacked panels.
- **Responsive pass:** all 34 main pages checked at 390 px and 768 px for sideways scrolling (none).
  Fixed on phones: Events tab labels no longer break into 2–3 lines (the tab bar scrolls); Event Detail
  (A) ownership + Check use the full row, the stage chips and the cards/list toggle share one row, and the
  Items / Event Checklist tab labels stay on one line.
- **Files:** `src/lib/uiVariant.ts` (scopes), `src/components/VariantSwitcher.tsx`, `src/components/Layout.tsx`,
  `src/pages/EventDetailPage.tsx`, `src/pages/EventPage.tsx`, `src/edLayoutB.css`, `src/eventUpgrade.css`,
  `src/sourceResponsive.css`, `src/locales/{en,id}/translation.json` (`addItemsB.*`).

---

# 2026-11-23 — Event Detail B v3, Events tab remembered, safer delete, Event History (preview)

- **Event Detail layout B v3** (owner: "fresher, better UX; layout may change"). Version A is unchanged.
  - **Hero card:** breadcrumb, event name + status, **date range · venue · PIC · event code** (A did not show
    these), and a "Current stage" panel with the stage menu, a progress bar and the next action
    (Next / Start Checking / For Return) on the right. Under it a one-line hint: green "All set at this stage.
    Next: …" or orange "N item(s) still need scanning before moving to …".
  - **Stat tiles:** Items · Scanned in (or Checked during inventory checking) · Scanned out · Event Checklist,
    with small progress bars. Items and Checklist tiles switch to their tab.
  - **Work area:** Items / Event Checklist tabs, search + one Filter button + cards/list toggle, chips only for
    stages with items, item cards with a bigger photo and one row of status pills. Header actions are
    *Add Item* and *⋯* (Outsource, Rent, Request Production, Files, History, Summary, Rentals, …, Print…).
- **Events list remembers its tab:** the tab is kept in the URL (`/event?tab=on-going`) and in the browser
  tab's session, so *Back to Events*, the browser back button and the sidebar link return to the same tab.
- **Delete event:** if the event has items (`total_items` > 0, or the count is unknown) the user must type the
  event name (not case-sensitive) before *Delete* is enabled; an event with 0 items keeps the simple confirm.
- **Event History (preview, dummy data):** the History icon on event cards/rows (it had no action) and a new
  *History* entry in the Event Detail ⋯ menu open `/event-history?id=<event>`: a timeline grouped by day
  (event edits with before → after, stage moves, items, scans, files, checklist), search and type filters.
  The entries are **generated sample data** with a "Preview · dummy data" badge; the real log needs the
  backend (see `docs/api-impact-log.md`, "Needs API").
- **Files:** new `src/pages/EventHistoryPage.tsx`, `src/data/eventHistoryMock.ts`,
  `src/hooks/api/eventHistoryContract.ts`, `src/eventHistory.css`; changed `src/pages/EventDetailPage.tsx`,
  `src/pages/EventPage.tsx`, `src/App.tsx`, `src/edLayoutB.css`, `src/eventUpgrade.css`,
  `src/locales/{en,id}/translation.json` (`edB.*`, `eventDelete.*`, `eventHistory.*`).

---

# 2026-11-22 — Event Detail layout B + floating A/B switcher

- **What:** a second, calmer layout ("B") for **Event Detail**, and a floating **A / B switcher** so the owner
  can compare both on real data. A stays exactly as before and is the default.
- **Switcher:** small dark pill (bottom right) with *Event Detail · A | B* and ×. Drag it by the grip
  anywhere; the position is remembered. × hides it; open any page with `?ab=1` to bring it back.
  Shown only to **tenant admins** and only on `/event-detail`. The chosen version is per browser
  (localStorage), not per account.
- **Layout B v2 (same features, much less on screen)** — the owner found the first B still too busy:
  - Header: only **Add Item** and **⋯**. Outsource Item, Rent Item, Request Production and Files (with count)
    are the first group of the ⋯ menu, above Summary, Rentals, Group Items, Bulk Assign Ownership, Print….
  - Stage: one quiet row — stage name ▾ · "Step 3 of 10", one thin continuous progress bar, *Next* on the right.
  - Items / Event Checklist as underline tabs.
  - Toolbar: keyword search, one **Filter** button (Area + Ownership in a small popover, applied immediately,
    with *Clear* and *Refresh items*; the button shows how many filters are on) and the cards/list toggle.
  - Stage chips: only stages that have items; the row is hidden when only *All* would show. The
    "N item(s) with status … in area …" sentence is hidden (the chip and tab counts say the same).
  - Item card: one line of small status pills (Checking · Scan In · Scan Out; green ✓ when done, scan time
    as tooltip) instead of three rows; the PIC line only when there is a PIC; shorter image.
  - Works in dark mode and on phones.
- **Not changed:** data, actions, modals, permissions and API calls are the same in A and B.
- **Files:** new `src/lib/uiVariant.ts`, `src/components/VariantSwitcher.tsx`, `src/edLayoutB.css`;
  changed `src/pages/EventDetailPage.tsx`, `src/components/Layout.tsx`, `src/main.jsx`,
  `src/locales/{en,id}/translation.json` (`edB.*`, `abSwitcher.*`).

---

# 2026-11-22 — Event Detail menu + print chooser, Item details drawer, PIC from users, assistant hidden

- **"⋯" menu (Event Detail):** every entry has an icon and fits on one line; grouped with thin separators
  (Summary, Rentals | Group Items, Bulk Assign Ownership, Cross Check | Print…). *Print Plan* and *Print*
  are now one **Print…** entry that opens a small chooser: *Print Plan* (packing list) or *This page*.
  *Request Production* in the header got an icon like the other buttons; header labels stay on one line.
- **Item details drawer:** compact header (small photo, name, SKU · category, badges), a Qty / Status /
  Ownership strip, *Location* (area, sub area, warehouse, PIC), *Progress* (Checking, Scan In, Scan Out as
  ✓/○ chips with the scan time as tooltip), and the note only when there is one (the empty orange "—"
  box is gone). Footer: **Remove** and **Go to item detail** (opens `/inventory-detail?id=<item>`).
  *Modify item*, *Report broken item*, *Create production* and *Scan* moved into the footer's **⋯** menu,
  because the drawer is the only place for them.
- **PIC (New / Edit Event):** chosen from the tenant's users (`/v1/get-all-user`, searchable). Saved as the
  user's name in the same `PIC` field, so the API is unchanged; an older PIC that is not a user stays
  selectable ("not a user"). If the user list cannot load, PIC falls back to free text.
- **EMI Assistant** chatbot is hidden (`SHOW_ASSISTANT = false` in `Layout.tsx`).
- **Not done, waiting for a decision:** rich text for Description / Note (see api-impact-log).
- **Files:** `src/pages/EventDetailPage.tsx`, `src/pages/EventPage.tsx`, `src/components/Layout.tsx`,
  `src/eventUpgrade.css`, `src/locales/{en,id}/translation.json` (`eventForm.*`, `eventDetailMenu.*`, `itemDrawer.*`).

---

# 2026-11-22 — Event list: clickable cards, Overdue chip, instant tooltips; Events open by default

- **Sidebar:** the *Events* group is open by default (until the user folds it), even when the current
  page is in another group.
- **Clickable cards:** an event card (grid) or event row (Ready for Checking, Returned & Completed,
  Transferred, past list) opens Event Detail when clicked anywhere; the icons keep their own action.
  Keyboard: Tab to the card, Enter or Space.
- **Overdue chip:** a card whose **finish date** has passed showed a negative countdown ("-1128d away").
  It now shows **Overdue · N d** (red; tooltip "Ended on 10 Nov 2023 but not closed yet"); an event that
  started but has not finished shows **In progress**. The event still sits in its current tab: moving it
  to an *Overdue* tab needs the backend (see `docs/api-impact-log.md`, "Needs API").
- **Tooltips:** card and row icons (Detail / Cart, Summary, Edit, Delete, History, item count) show an
  instant styled tooltip on hover and keyboard focus, instead of the slow browser tooltip. The Edit icon of
  a finished event is now `aria-disabled` (was `disabled`, which blocked its tooltip); clicking it still
  shows "This event has ended and can no longer be edited."
- Event cards no longer use `overflow: hidden` (it clipped tooltips); the cover photo rounds its own corners.
- **Files:** `src/pages/EventPage.tsx` (`cardOpenProps`, `EventDateChip`, `daysSinceEnd`, tooltips),
  `src/eventUpgrade.css` (`.event-card-link`, `.event-chip-*`, `[data-tip]`), `src/components/Sidebar.tsx`
  (`DEFAULT_OPEN`), `src/locales/{en,id}/translation.json` (`eventCard.*`).
- **Reusable:** `data-tip="text"` (+ `data-tip-align="start|end"`, `data-tip-pos="below"`) works on any element.

---

# 2026-11-22 — Sidebar: foldable groups and nested menus

- **Groups fold:** Events, Inventory, Master Data, Report and System have a chevron and can be folded.
  On a first visit only the group of the current page is open, so the sidebar shows a short list of
  headers instead of 26 links. Each user's open/closed choice is remembered in the browser
  (`localStorage` `emi.sidebar.open.v1`). One-link sections (Home, AI Tools) do not fold.
- **Nested menus:** *Events → Settings* holds Event Settings and Checklist Settings (admins only, as before);
  *Master Data → Vendors* holds Production, Rent and Outsource. A folded parent turns brand-coloured
  when the current page is inside it.
- Opening a page inside a folded group (link, search, back button) opens that group again.
  **Menu search** still works: results show expanded, including nested links; Enter opens the first one.
- Same component for desktop and the phone slide-over; dark mode uses the existing tokens.
- **Files:** `src/components/Sidebar.tsx`, `src/style.css` (foldable/nested block after `.nav-item`),
  `src/locales/{en,id}/translation.json` (`navigation.items.vendors`, `navigation.items.settings`).
- **API:** none. Route/feature gating (`ROUTE_FEATURES`) is unchanged and also applies to nested links.

---

# 2026-11-20 — Event Checklist inside every event (preview on mock data)

- **Event Detail** has a new switch under the stage bar: **Items | Event Checklist**. The Checklist
  view shows that event's checklist (progress, current stage, tasks, photos, notes, sign-off); the
  switch shows progress (e.g. 1/15) and how many required tasks block the stage. Link:
  `/event-detail?id=<id>&view=checklist`. "All checklists" goes back to the overview.
- **Event Checklist menu** stays as the overview, now with the **real events** (upcoming, on-going,
  ready to close, ready for checking) instead of sample events, and an **Open in event** button.
  Both places show the same checklist.
- **Stage templates** now use the **real stages from Event Settings**. The sample tasks are copied
  onto them once (matched by stage name, else by position). A new event gets a copy of the templates
  the first time it is opened.
- **Still a preview (owner approved mock data):** tasks, ticks, photos and sign-offs are saved in
  **this browser only** (`localStorage` `emi.checklist.v1`), not on the server; other users and devices
  do not see them. The badge says so. Backend contract: `src/hooks/api/eventChecklistContract.ts`.
- **Bug fix (Event Detail stage):** when the stage list arrived before the event's own data (cache or a
  faster response), the page picked the first stage ("Created by admin, step 1") and kept it, so the
  stage bar and *Next* could be wrong. It now waits for the event data. No API change.
- **Files:** `src/lib/checklistStore.ts` (shared store), `src/components/checklist/EventChecklistPanel.tsx`
  (one event's checklist), `src/pages/EventChecklistPage.tsx` (overview, real events/stages),
  `src/pages/EventDetailPage.tsx` (switch, checklist view, stage fix), `src/eventChecklist.css`,
  `src/locales/{en,id}/translation.json` (`eventChecklist.*`).

---

# 2026-11-20 — Event Calendar: search and filters

- **Toolbar** under the intro: a search box (event name, location or clashing item), a **Filter**
  button with the number of active filters, and **Shortages only** (moved here from the header).
- **Filter panel:** Location (multi), Events (multi), Items (multi, only items that clash this month;
  picking items keeps the events that book them) and *Only events with item clashes*.
- Active filters show as removable chips with "Showing N events" and **Clear all**. The calendar
  cells, the four summary cards, the day panel and the clash table all follow the filters.
  Without filters the numbers are the server's, exactly as before. Filters stay when you change month.
- Works on the data the calendar already loads: **no API change.** Filters that would need new API
  data (stage, lifecycle status, PIC, warehouse, item category) were not built; they are listed in
  `docs/api-impact-log.md` as "Needs API".
- **Files:** `src/lib/calendarFilters.ts` (pure filter logic), `src/pages/EventCalendarPage.tsx`,
  `src/style.css` (`.cal-toolbar`, `.cal-active-filters`, `.cal-filter-*`),
  `src/locales/{en,id}/translation.json` (`calendarUi.filter.*`), `tests/calendarFilters.test.cjs`.
- **New team rule** (`CLAUDE.md`): when a request needs the API, the AI stops and asks the owner first,
  and records it in the API impact log.

---

# 2026-11-20 — Event list: cover photos, item count, "Ready for Checking"; dark-mode fixes

- **Event cards** now show the event's **cover photo** (16:9, cropped to fit) when the event has one,
  and the **number of items** next to the cart icon. Events without a photo look as before.
- The lifecycle tab, summary card and badges say **Ready for Checking** (ID: *Siap Diperiksa*)
  instead of "Checking Inventory", matching emi-source and the Event Detail popup. The API status
  value (`checking-inventory`) is unchanged.
- **Dark mode fixes:** event cards, inventory/warehouse cards, the loading overlay, tab chips,
  scan-pending text in Event Detail and the AI Material Analyzer advisories used hard-coded light
  colours and stayed white in dark mode. They now use `var(--dk-…, <original colour>)`: identical
  in light mode, themed in dark mode.
- Ported from emi-source; what was already covered, what still needs the backend (Partial Return,
  partial transfer) and the open API questions: `docs/source-migration-53aaf50.md`.

---

# 2026-11-20 — Light / dark mode for the tenant app

- **Where:** new **Theme** button in the header, between the user name and the language
  switcher. It shows a sun or a moon (what is on screen now) and opens a menu with
  **Light**, **Dark** and **System** (follows the computer/phone; the menu shows
  "now light/dark"). Labels in English and Indonesian.
- **Default is Light**, so nothing changes until a user picks Dark or System.
- The choice is saved **per browser** (`localStorage` key `emi.theme.v1`), not per account,
  and is applied before the page draws (script in `index.html`), so there is no white flash.
  It also syncs between open tabs and follows the OS live while System is selected.
- **Dark colours** are the same as the SaaS Owner panel's dark theme, so both panels match.
  The Owner panel itself is unchanged (it was already dark).
- **Not themed (by design or for later):** the tenant Login page stays light (its colours
  are inline in `Login.tsx`); printed pages and PDFs always stay light.
- **Files:** `src/lib/theme.ts` (store + hook), `src/components/ThemeSwitcher.tsx`,
  `src/components/Layout.tsx`, `src/components/icons.tsx` (sun, moon, monitor),
  `src/theme-dark.css` (dark tokens + fixes for hard-coded colours), `src/main.jsx`,
  `index.html`, `src/style.css` (switcher menu items), `src/locales/{en,id}/translation.json`
  (`theme.*`).
- **For developers:** new CSS should use the tokens (`var(--white)`, `var(--bg)`,
  `var(--text)`, …). A hard-coded light colour stays light in dark mode and needs a fix
  in `src/theme-dark.css`.
- **API:** no change.

---

# 2026-11-20 — Cleaner, more modern sidebar

- No more divider lines between menu groups; spacing separates them.
- Menu items are rounded with softer gray icons; the active page gets a light brand-colored
  background (no thick left border). Hover and keyboard focus are clearer.
- Event Calendar, Event Report and Stock Opname Report now have real icons (they used text
  symbols before).
- The menu search is a soft filled field; the scrollbar only appears on hover.
- Bottom: "Owner Panel" looks like a menu item; version, branch and commit sit in one small card.
- Same look in the SaaS Owner panel (dark) and in the mobile slide-over menu.

---

# 2026-11-20 — Event Checklist v2: photos, statuses, notes, sign-off + Checklist Settings

- **Tap a task** to open its full view: status (To do, Done, N/A, Issue), photos (camera or
  gallery, tap to enlarge), a note, and the full history (who did what, when).
- **Photo proof:** template tasks can require a photo; such a task cannot be marked Done
  without one (the quick checkbox opens the task instead).
- **N/A and Issue** need a note explaining why. Open issues are counted on the event list and
  block the stage sign-off.
- **Stage sign-off:** when required tasks are resolved and no issue is open, a supervisor and/or
  the client signs (name + drawn signature + optional note). The stage is then locked; admins
  can reopen it.
- **New page Events → Checklist Settings** (admins only): turn each feature on or off — photos
  (max per task, camera only), notes, N/A, issues, sign-off (who signs, signature, lock, stage
  gate), due dates, assignees, adding extra tasks, who may delete tasks.
- Still mock data: settings are saved in the browser for now. Backend contract:
  `src/hooks/api/eventChecklistContract.ts`; review and open questions: `docs/prd/event-checklist.md`.

---

# 2026-11-20 — Sidebar shows which branch and commit is running

- Below the version at the bottom of both sidebars (tenant and SaaS Owner, also on
  mobile): the **branch** the build came from and the **last commit** (short hash + date).
  Hover it to see the commit message and author.
- Values are set at build time in `vite.config.js`: on Vercel from `VERCEL_GIT_*`
  variables, locally from `git`. If git history is missing the build date is shown
  ("built …") instead of the commit date.
- Team flow written down in `CLAUDE.md`: before each change, pull `daniel-staging-web`
  and merge any new commits from `main`.

---

# 2026-11-20 — New module: Event Checklist (preview on mock data)

- New menu **Events → Event Checklist** (`/event-checklist`), visible when the plan has
  Event Management.
- **Event checklists tab:** left, every event with its progress, current stage, overdue
  and "blocking" counts (required tasks open in the current stage), plus search and an
  "only events that need attention" filter. Right, the selected event's checklist grouped
  by stage: tick tasks (records who/when), add a task to any stage, delete with Undo.
  Shows the current stage by default; "All stages" shows the whole flow with finished
  stages collapsed. A warning lists open required tasks in the current stage.
  On phones the list and the detail are two screens with an "All events" back button.
- **Stage templates tab:** default tasks per stage (required/optional, due as days from
  the event start, role). New events will get these automatically.
- **Data:** mock only (`src/data/eventChecklistMock.ts`); a "Preview · mock data" badge
  is shown and changes reset on reload. The backend contract is written as comments in
  `src/hooks/api/eventChecklistContract.ts`; the product reasoning is in
  `docs/prd/event-checklist.md`.

---

# 2026-11-20 — Event Settings: redesigned rule guide

- **Button:** the old "What do the rules mean?" control used a class with no CSS, so it
  rendered as a raw browser button. It is now a **Rule guide** button (info icon, chevron,
  active state) next to **New Status** in the page header; on phones both buttons sit on
  one row under the title.
- **Guide panel:** title + one-line explanation, close button, four group cards
  (Scanning, Stock, Items, Requests) with a short hint each. Every rule shows its chip,
  a tag where it matters (*1 stage only* for Cut/Return stock, *Shown when off* for
  No adding/No deleting) and a shorter, plainer description. A footer explains the
  colored dots in the stage bar. Layout: 4 columns → 2 (≤1100px) → 1 (≤640px).
- **Files:** `src/pages/EventStatusPage.tsx`, `src/style.css` (`.es-header*`, `.es-guide*`;
  removed unused `.es-legend`, `.es-legend-row`), `src/locales/{en,id}/translation.json`
  (new `eventSettingsRules.guide.*` keys; existing description keys unchanged because
  the New/Edit Status modal still uses them).
- **API:** no change (see `docs/api-impact-log.md`).
- **New docs for every future change:** `CLAUDE.md` (standing AI rules),
  `docs/ai-handoff.md` (AI hand-off log), `docs/api-impact-log.md` (API impact log),
  `docs/ai-incident-log.md` (AI lapses). This file stays the developer changelog.

---

# 2026-11-20 — App version pinned to the bottom of the sidebar

- The tenant sidebar already rendered `v{version}` from `package.json` (single source of truth; Vite bundles only the `version` field). It now sits at the very bottom: `.sidebar` is a flex column so the footer's `margin-top: auto` works, and the duplicate border/margin on `.sidebar-version` inside `.sidebar-footer` was removed.
- The SaaS Owner sidebar (`SuperAdminSidebar.jsx`) now shows the same version under the "SaaS Owner" label, also pinned to the bottom.
- Both sidebars share one component for desktop and the mobile slide-over, so the version is visible in both. To release a new version, bump `version` in `package.json`.

---

# 2026-11-18 — Sidebar search and responsive Event Settings

- Adapted emi-source commit `687ba556` to the translated, plan-filtered TypeScript sidebar in emi-final. Search matches visible menu/section labels, Enter opens the first result, Escape clears, and `/` focuses the search when the sidebar is visible.
- On phone widths, Event Settings shows rule chips below each status and hides secondary table columns. The Event Detail return flow already uses a responsive lifecycle layout, so its backend-connected behavior was left unchanged.
- The Event Detail scan popup now displays a QR code containing `event_item/{id}/{IN|OUT}`; its type follows the same current-stage scan action as the backend scan request.
- No API calls, backend models, or data sources were replaced.

---

# 2026-11-07 — Outsource vendors and event outsource ordering

- Integrated the dedicated Outsource backend catalogs instead of sharing production or rent vendors: vendor list/detail/create/update/delete use `/v1/outsource-vendors`.
- Added the **Outsource** Master Data menu with Vendors and Outsourced Items tabs, server pagination/search/status filtering, summary cards, vendor detail/history, and item lifecycle actions.
- Replaced the Event Detail outsource placeholder with a real request form using `/v1/events/{eventId}/outsource-item`; it captures an Inventory item, area/sub-area, vendor, dates, unit cost, quantity, and notes.
- Added an **Outsourced** Event Detail tab. `REQUESTED` orders can be cancelled or marked `RECEIVED`; received orders can be marked `COMPLETED`. Event items are refetched after every action because `RECEIVED` creates the event item with Outsource ownership server-side.
- API types and cache keys live in `src/hooks/api/useOutsource.ts`; event UI is split into `EventOutsourceItemModal.tsx` and `EventOutsourceItemsPanel.tsx`.

---

# 2026-11-04 — Adaptive port of emi-source commits from 2 November

- Ported event date/edit rules, restricted Modify Item behavior, quick-add Inventory/vendor flows, and nested modal handling from `b1669d9e` and `545a7488`.
- Added the 2 November product PRD and mobile technical system-schema PRD from `f59524c1`.
- Kept the prototype Outsource module out of runtime until its backend lifecycle contract is available.
- Full implementation/back-end gap notes: [source-migration-2026-11-02.md](source-migration-2026-11-02.md).

## Round 5 — Event Detail: stage tabs, searchable area filter, stepper numbering

**Files:** `src/pages/EventDetailPage.jsx`, `src/components/Stepper.jsx`, `src/style.css`

Three targeted fixes/refinements on top of Round 4's stepper/dropdown work, requested
after reviewing it live:

1. **Area filter is now a searchable combobox with item counts.** The old "All Place"
   dropdown was a plain static list of ~15+ areas with no way to search and no
   indication of how many items were in each. It's now `dropdown-search` (a text
   input pinned to the top of the menu) + `dropdown-list` (scrollable, max-height
   260px) + a count badge (`dropdown-item-count`) per row, computed live from the
   current `items` array. Typing filters the area list by substring match
   (case-insensitive).
   - **Known data quirk found while building this:** a few item records in
     `initialItems` use area names (`RECEPTION`, `PHOTOBOOTH`) that **do not exist**
     in the master area list (`src/data/areas.js` → `initialAreas`). This is a
     pre-existing seed-data inconsistency, not something introduced here — those
     areas simply never show up as selectable options in the dropdown (old or new),
     even though items are tagged with them. If you're asked to "fix filtering by
     RECEPTION", the real fix is adding it to `initialAreas`, not the dropdown code.

2. **Stepper no longer swaps to a checkmark icon on completed steps.** Round 4 had
   completed steps (e.g. "Preparation" after moving to "During Event") render a
   checkmark SVG instead of their number. Product direction was to always show the
   step number regardless of state — only the color/fill (`.stepper-dot.done` /
   `.active`) should change. `Stepper.jsx` now always renders `{idx + 1}`.

3. **New "stage" tracking + tabs to distinguish carried-over vs. newly-added items.**
   This is the biggest change of the three. Every item now has a `stage` field —
   the event status (`Preparation` / `During Event` / `After Event`) that was active
   **at the moment the item was added**:
   - The 12 seed items in `initialItems` are all `stage: 'Preparation'`.
   - `checkout()` (the cart → event-items flow) now stamps new items with
     `stage: eventStatus` (whatever the stepper is currently set to).
   - A new tab row (`.stage-tabs`) sits above the item grid with three options:
     **Semua** (everyone, respects the area/keyword filters only), **Dari Tahap
     Sebelumnya** (items whose `stage` is earlier than the current stepper position),
     and **Baru di "{stage}"** (items added exactly in the current stage). Each tab
     shows a live count.
   - Moving the header stepper (`changeEventStatus()`) automatically resets the tab
     back to "Semua" — otherwise a user could get stuck looking at an empty "Baru"
     tab after advancing the event and be confused about where their items went.
   - This is purely a **viewing/filtering aid**. It does not hide or lock items —
     you can still see everything via "Semua" regardless of what stage the event is
     in now, including items added in a stage *after* the one currently selected
     (an edge case if someone moves the stepper backwards).

---

## Round 4 — SaaS-level Dashboard redesign, Owner Panel access, status-dropdown removal

**Files:** `src/pages/DashboardPage.jsx`, `src/components/Sidebar.jsx`,
`src/pages/EventDetailPage.jsx`, `src/style.css`

Three independent requests landed together:

1. **Owner Panel is now discoverable from the tenant UI.** Added a small
   "Owner Panel" link (shield icon) to the bottom of the sidebar, above the version
   tag, linking to `/superadmin/login`. Previously the only way in was knowing the
   URL. See "Context every dev should know" above for credentials.

2. **Dashboard rebuilt to be "SaaS-level" rather than a plain KPI-and-table page.**
   The old dashboard was 4 KPI cards + 2 charts + 1 table, all inventory/event-only.
   The new one deliberately pulls from **every** data module to act as a connective
   home page:
   - Hero greeting line with a computed one-sentence business insight (next event
     countdown + restock count) and today's date (`TODAY`, not `new Date()`).
   - 6 KPI cards (was 4): Total Events, Inventory SKU, Low Stock, **Sedang Dipinjam**
     and **Peminjaman Terlambat** (new — sourced from `src/data/itemLoans.js`,
     "overdue" = `dueDate < TODAY` and no `returnDate`), and Warehouses. Each card
     has a small delta/trend indicator (`.kpi-delta`) — for the loan/warehouse
     figures these deltas are illustrative dummy text (`+3 bulan ini`, `stabil`,
     etc.), **not** computed from historical snapshots, because no historical data
     exists yet. Don't wire real logic to them without first deciding what
     "previous period" should mean.
   - Quick Actions row: 4 shortcut buttons that just `navigate()` to the page where
     that action's modal lives (`/event`, `/inventory`, `/item-loan`,
     `/warehouse-inventory`). They don't open a modal directly from the dashboard.
   - New "Distribusi Stok per Gudang" horizontal bar chart (top 5 warehouses by
     stock, reusing the existing `.viz-bar-chart` classes) and a new "Aktivitas
     Terbaru" feed (last 5 entries from `src/data/activityLogs.js`, sorted by
     timestamp, with a colored dot per module via `MODULE_DOT` in
     `DashboardPage.jsx`).
   - Kept as-is: Upcoming Events list, Kesehatan Stok stacked bar, Stok per
     Kategori bar chart, Perlu Perhatian table.

3. **Removed the per-item "All Status" dropdown filter in Event Detail.** Item-level
   status filtering (`selectedStatus`, a `<select>` in `.filter-row`) was made
   redundant by the event-level header stepper introduced earlier (see Round 3) —
   the product decision was that *all* status-related filtering should now go
   through that single stepper, not a second independent per-item control.
   - Removed `selectedStatus` state, its `<select>`, and its clause in the
     `filtered` `useMemo`.
   - Removed the now-dead `status` field from `initialItems` and from the object
     `checkout()` builds for new items (it was being set but never read anywhere
     once the dropdown was gone).
   - The summary sentence above the item grid ("`X` pcs item …") now reads off
     `eventStatus` (the stepper's value) instead of the removed dropdown's label.
   - **Note:** Round 5 later reintroduced a *different* per-item field, `stage` —
     don't confuse the two. `status` (removed here) was meant to represent an
     item's current state and duplicated the event-level stepper. `stage` (added in
     Round 5) is a write-once historical marker of *which event stage the item was
     added in*, used only to power the "carried over vs. new" tabs.

---

## Round 3 — Event-level status stepper (corrected from an earlier per-item attempt)

**Files:** `src/pages/EventDetailPage.jsx`, `src/components/Stepper.jsx`, `src/style.css`

Product intent: an event has an overall lifecycle — **Preparation → During Event →
After Event** — and the UI needed a stepper to represent *that*, in the page header,
not per inventory item. An earlier pass had misread the request and built a stepper
on every item card instead; that was reverted:

- Removed per-item stepper, `onStatusChange`, and `updateItemStatus` from `ItemCard`.
- Added page-level `eventStatus` state and a `.event-status-section` block in the
  header (between the action buttons row and the filter row) containing the
  `Stepper` component, driven by `STATUSES = ['Preparation','During Event','After Event']`.
- `Stepper.jsx` renders a row of numbered/labelled dots with connecting lines;
  `done`/`active` styling comes from comparing each step's index to `currentIndex`.

---

## Round 2 — Reporting, Dashboard v1, pricing-as-formula, Item Loan, Stock Opname

**Files:** `src/pages/DashboardPage.jsx` (v1), `src/pages/*` (various new pages),
`src/data/pricingCatalog.js`, `src/lib/pricingCalc.js`, `src/data/itemLoans.js`

Several features landed in this stretch:

- **Report menu** added with **Inventory Report** and **Overview Report** pages.
- **Dashboard menu** added for the first time (dummy-data KPI cards + basic charts;
  later fully redesigned in Round 4 above).
- **Stock Opname** feature added inside the **Warehouse Inventory** page.
- **Item Loan** module added (`src/data/itemLoans.js` + `/item-loan` page) —
  tracks borrower, loan/due/return dates, used later by the Round 4 dashboard KPIs.
- **Pricing changed from manual entry to a formula**, in the SaaS Owner Panel's
  Pricing page: price is now derived from selected Modules + an AI Feature toggle +
  a Storage tier, via `computePlanPrice(plan)` / `planFeatureList(plan)` in
  `src/lib/pricingCalc.js`, reading catalog constants
  (`BASE_PLATFORM_FEE`, `AI_FEATURE_FEE`, `MODULE_CATALOG`, `STORAGE_TIERS`) from
  `src/data/pricingCatalog.js`. Don't let a plan's `price` field be hand-edited
  again without also updating this formula — it will silently drift from what the
  module/storage selection implies.
- **Global Search** (`src/components/GlobalSearch.jsx`) added — searches across
  Events, Inventory, Warehouses, Warehouse Inventory, Areas, Categories, Units, and
  Item Loans, with grouped dropdown results; Event results deep-link to
  `/event-detail?name=...`.
- **Log and Users pages** completed (`src/data/activityLogs.js`, `src/data/users.js`).
- Category/Unit master data extracted from inline consts in `CategoryPage.jsx` /
  `UnitPage.jsx` into shared `src/data/categories.js` / `src/data/units.js` so
  Global Search could reach them.

---

## Round 1 — Inventory Picker + Cart UX, Modal size bug

**Files:** `src/components/Modal.jsx`, `src/pages/EventDetailPage.jsx`

- **Modal size bug fix.** `size="3xl"` / `"4xl"` never visually changed anything
  because the base `.modal` CSS had a hardcoded `width: 460px` that beat the
  `maxWidth` the `size` prop was setting. Fixed by having the `sizeStyles` map set
  `width` directly instead of `maxWidth` — if you add a new size preset, make sure
  it does the same, or it'll silently do nothing at that width.
- **"Tambah Barang dari Inventory" redesigned as a two-panel picker + cart.**
  Originally this was a single-panel modal you had to close and reopen to check
  what you'd already added. It's now a persistent two-panel layout
  (`.inv-pick-split` → `.inv-pick-left` browse list / `.inv-pick-right` cart) so
  users add and review without the modal popping in and out.
- **Cart merge/split-by-warehouse logic.** Adding the same inventory item from the
  *same* warehouse accumulates quantity on one cart line; adding it from a
  *different* warehouse creates a separate cart line. See `addToCart()`'s
  `find(x => x.inventoryId === inv.id && x.warehouse === warehouse)` check.
- **Iterated toolbar layout:** "Tambah Barang" became the single primary button;
  Cart and Packaging became icon-only buttons with a badge count; a "⋮" more-menu
  button was added for future actions; title and the action buttons were aligned
  onto one row (`.event-header-row`). Area assignment was moved out of the cart
  panel and into a bulk-assign step that only appears when trying to check out
  items with no area set (`hasMissingArea`, `applyBulkAssign()`).

---

## How to extend this file

Add new entries at the **top** (right below "Context every dev should know", above
the current newest round), numbered one higher than the current top entry (the next
one after this file's initial version is "Round 6"). Each entry should say **what**
changed, **why** (the product reason, not just "user asked"), which **files** were
touched, and any **gotcha** a future dev would otherwise have to rediscover the hard
way.
