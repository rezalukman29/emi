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
