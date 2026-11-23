# API impact log

Every change that might affect the backend API contract is recorded here: endpoints,
request payloads, field names, query params, response parsing, React Query cache keys,
or behavior the backend relies on. When a change is close to the API but does **not**
affect it, record that too, so nobody has to re-check. Newest first.

Format: date — change — endpoints/fields touched — impact — action needed by backend.

---

## 2026-11-23 — PRD refresh

- **Endpoints touched:** none (documentation only). The PRD lists the same "Needs API" items as `docs/api-backlog.md`.

## 2026-11-23 — Event Checklist v2 (groups, assign, proof, admin e-mail, untick log, filter) + API backlog doc

- **Existing endpoints changed:** none. Read-only reuse of `GET /v1/get-all-user` (page 1, limit 200) for the
  assignee picker and the admin e-mail recipients (`is_admin = 1` or `user_type = ADMIN`, field `email`).
- **Needs API — waiting for owner / backend (preview stays in the browser, owner approved the mock preview
  2026-11-20):** everything in this change is stored in `localStorage['emi.checklist.v2']`, **e-mails are not
  sent**. The proposed contract was rewritten for v2 (`src/hooks/api/eventChecklistContract.ts`):
  - Groups replace stages: `event_status_id` removed from items/templates → `group_id`; new group endpoints
    (CRUD + reorder) for templates and for each event; sign-offs move to `…/groups/{groupId}/sign-offs`.
  - New fields: `requires_report` (template + item), `assignee_user_id` on create/update, activity actions
    `unchecked`, `assigned`, `edited`, `email_sent`; summary `required_open` (was `blocking_items`),
    `my_open_items`, filter `assignee_id`; settings `notify_admins_enabled`, `notify_admins_when`
    (`require_sign_off_before_next_stage` removed).
  - Server rules: refuse ticking without the required photo / report (422); allow unticking and log it;
    e-mail all admins when a task is ticked (setting); 423 when editing a locked group.
  - The stage-change gate from v1 is dropped (groups are not stages) — **question for the owner**, see
    `docs/api-backlog.md` §1.
- **New doc:** `docs/api-backlog.md` — one list of every API the backend still has to build (owner request).

## 2026-11-23 — Add Items stock tabs, default warehouse, version B

- **Endpoints touched:** none changed. Read-only reuse of `GET /v2/barang-gudang/detail` (same params:
  page, limit 30, search, categoryId, gudang_id). Default warehouse = highest `stok_gudang` in the item's
  `warehouses[]`; tabs split the loaded items by "any warehouse has stock". Add to cart / Save to Event unchanged.
- **Optional (not blocking) — backend could add:** a stock filter on `/v2/barang-gudang/detail`
  (e.g. `in_stock=1|0`) plus counts for both, so the Available / Out of Stock counts are exact and the
  frontend does not need to load extra pages. Today the counts cover only the items loaded so far ("+" shown).

## 2026-11-23 — Event Detail B v3, Events tab memory, delete confirm, Event History

- **Endpoints touched:** none changed. B v3 shows fields already in `GET /v1/event/{id}` (`event_start`,
  `event_end`, `address`, `PIC`, `event_code`). Delete still calls the same delete endpoint; the typed-name
  check is front-end only and uses `total_items` from `/v2/event-filter`. Tab memory is URL + sessionStorage
  (`emi.event.tab.v1`).
- **Question for backend:** what happens to an event's items (stock, scans) when an event that has items is
  deleted? The UI now only warns "cannot be undone"; if the server refuses or should refuse, tell the owner.
- **Needs API — waiting for owner / backend: Event History (activity log).** The page runs on **dummy data**
  (owner asked for it). Needed: `GET /v1/event/{id}/activity?page&limit&type&search` returning
  `{ id, event_id, type (event|stage|item|scan|file|checklist), action, message, changes[{field,from,to}],
  meta, user_id, user_name, created_at }`, newest first, and the backend writing one row for every change on
  an event (create/edit with before/after, stage moves, items added/removed/modified, ownership, scan in/out,
  checking started, broken reports, file upload/delete). Full contract: `src/hooks/api/eventHistoryContract.ts`.

## 2026-11-22 — Event Detail layout B v2

- **Endpoints touched:** none. Same requests; filters and *Refresh items* reuse the existing params and
  `refetchEventItems()`.

## 2026-11-22 — Event Detail layout B + A/B switcher

- **Endpoints touched:** none. Same queries and mutations in both layouts; B's refresh icon calls the existing
  `refetchEventItems()` and the ownership filter applies on change instead of on *Check* (same request params).
  Only new local state: localStorage `emi.ui.variant.v1`, `emi.ui.variantSwitcher.pos.v1`, `emi.ui.variantSwitcher.hidden.v1`.

## 2026-11-22 — PIC from users, Event Detail menu, item drawer, assistant hidden

- **Endpoints touched:** read-only reuse of `GET /v1/get-all-user` (page 1, limit 100, `search`) for the
  PIC picker. The event create/edit payload is unchanged: `PIC` is still a string (the user's full name).
  If PIC should later be a user id (to follow renames or filter "my events"), that needs a new field.
- Menu, print chooser, drawer and hiding the assistant: no API impact.
- **Waiting for owner / backend — rich text for Description and Note:** the fields stay the same but their
  content would become formatted text (HTML or Markdown). Everything that reads them as plain text
  (mobile app, event cards, print plan, summary, search) would show the markup unless it is changed too,
  and the backend should sanitise stored HTML (XSS). Options: (A) HTML + sanitising on the server + a
  renderer everywhere; (B) Markdown (stays readable as plain text in old clients); (C) keep plain text with
  line breaks. Needs a new editor dependency on the web.

## 2026-11-22 — Event list: Overdue chip, clickable cards, tooltips

- **Endpoints touched:** none. The Overdue chip reads the existing `event_start` / `event_end` /
  `date_event` of `/v2/event-filter` records.
- **Needs API — waiting for owner / backend:** an **Overdue tab** (events whose finish date has passed but
  are still Upcoming / On Going), with its count and pagination. Tabs and counts come from the server
  (`/v2/event-filter?status=<lifecycle>`), so the frontend cannot move events between tabs on its own.
  Options: (A) add lifecycle `overdue` to `/v2/event-filter` (status filter + count), or (B) add an end-date
  param, e.g. `end_to=<yyyy-mm-dd>` together with `status=upcoming|on-going`, so the frontend builds the tab.
  Also a product decision: should overdue events leave Upcoming / On Going, or stay there and also show in Overdue?

## 2026-11-22 — Sidebar foldable groups / nested menus

- **Endpoints touched:** none. Menu structure and local UI state only (`localStorage` `emi.sidebar.open.v1`).

## 2026-11-20 — Event Checklist in Event Detail (mock) + stage fix

- **Endpoints touched:** none changed. Read-only reuse of `/v2/event-filter` (overview list),
  `/v1/event/{id}` and `/v1/event-status/get-all` (stages). The Event Detail stage fix only waits for
  `/v1/event/{id}` before choosing the current stage; no request or parsing change.
- **Needs API — waiting for backend (owner chose a mock preview for now, 2026-11-20):** the whole
  checklist (templates per stage, items per event, status/photos/notes, sign-offs, settings) as written in
  `src/hooks/api/eventChecklistContract.ts`. Today it is stored per browser in
  `localStorage['emi.checklist.v1']`. Priority endpoints for "checklist inside every event":
  `GET /v1/events/{eventId}/checklist`, `PATCH …/checklist/items/{itemId}` (status, note),
  `POST …/items/{itemId}/photos`, `POST/DELETE …/stages/{eventStatusId}/sign-offs`,
  `GET/POST/PATCH/DELETE /v1/checklist-templates` (keyed by **real** `event_status_id`).
  Template ids and stage ids in the preview are local; they cannot be migrated to the server as-is.

## 2026-11-20 — Event Calendar filters

- **Endpoints touched:** none. Filters run in the browser on the existing responses of
  `GET /v1/event-calendar?month=` and `GET /v1/event-calendar/clashes?month=`.
- **Impact:** none.

### Needs API — waiting for owner / backend

Filters the owner may expect on the calendar but which the current responses cannot support:

| Filter | Needed in `/v1/event-calendar` → `days[].events[]` (or as query params) |
|---|---|
| Event stage (Event Status) | `status_id` (and name) per event; or `?status_id=` param |
| Lifecycle (On Going / Ready for Checking / …) | `lifecycle_status` per event; or `?lifecycle=` param |
| PIC | `pic` per event |
| Warehouse | warehouse(s) the event's items come from |
| Item category (clash table) | `category_id` / `category_name` per clash row in `/clashes` |

Option A (smallest): add the fields to each event / clash row, filtering stays in the browser.
Option B: accept the same params as `/v2/event-filter` (`status_id`, `location_id`, `status`) on both
calendar endpoints so the server filters and the summary counts stay server-side.

## 2026-11-20 — Event list cards: cover photo + item count

- **Endpoint touched:** `GET /v2/event-filter` — **read-only parsing**, no request change.
- **Fields read (optional):** `images` (also `image` / `cover_url`) for the card cover; `total_items` for the
  item count. Missing fields are handled (no cover / no count).
- **Assumption — please confirm:** does the list return `images`, and as a URL or raw base64 (the create/edit
  form uploads raw base64)? A URL is preferred for list performance.
- **Label only:** lifecycle `checking-inventory` is now *displayed* as "Ready for Checking"; the value sent to
  and read from the API is unchanged.
- **Not done, needs backend:** `partial-return` lifecycle status and partial transfer (see
  `docs/source-migration-53aaf50.md`).

## 2026-11-20 — Light / dark mode

- **Endpoints touched:** none. The theme choice is stored only in the browser
  (`localStorage` key `emi.theme.v1`: `light` | `dark` | `system`); nothing is sent to or
  read from the backend, and it is not part of the user/account data.
- **Impact:** none. If the theme should later follow the account across devices, that
  needs a new user-preference field/endpoint (not requested).

## 2026-11-20 — Sidebar redesign

- **Endpoints touched:** none. CSS, icons and markup only.
- **Impact:** none.

## 2026-11-20 — Event Checklist v2 (more NEW endpoints/fields)

- **Existing endpoints changed:** none (still mock data, no requests).
- **Changed in the proposed contract** (`src/hooks/api/eventChecklistContract.ts`), on top of the
  2026-11-20 checklist entry below:
  - Item: `is_done`/`done_by_name`/`done_at` replaced by `status` (`open|done|na|issue`),
    `status_by_name`, `status_at`; new `note`, `requires_photo`, `photos[]`.
  - Template: new `requires_photo`.
  - New: `POST/DELETE /v1/events/{eventId}/checklist/items/{itemId}/photos[/{photoId}]` (multipart),
    `GET …/items/{itemId}/activity`,
    `POST/DELETE /v1/events/{eventId}/checklist/stages/{eventStatusId}/sign-offs`,
    `GET/PUT /v1/event-checklist-settings`.
  - Summary: `done_items` → `resolved_items`, new `open_issues`.
  - Requested gate on the existing event status-change endpoint now also returns
    `open_issues` and `missing_sign_off_roles`.
- **Backend action:** file storage for photos (size limit, compression, retention, EXIF/GPS policy),
  signature images, lock rule (423 when a signed-off stage is edited), settings table per tenant.

## 2026-11-20 — Build info in the sidebars

- **Endpoints touched:** none. Data comes from git / Vercel env vars at build time.
- **Impact:** none.

## 2026-11-20 — Event Checklist module (NEW endpoints needed)

- **Area:** `src/pages/EventChecklistPage.tsx` (currently mock data, no requests sent).
- **Existing endpoints changed:** none.
- **New endpoints the backend must build** (full contract with DTOs:
  `src/hooks/api/eventChecklistContract.ts`):
  - Templates per stage: `GET/POST /v1/event-checklist-templates`,
    `PUT/DELETE /v1/event-checklist-templates/{id}`, `PUT /v1/event-checklist-templates/reorder`.
  - Checklist of an event: `GET /v1/events/{eventId}/checklist`,
    `POST /v1/events/{eventId}/checklist/items`,
    `PUT/DELETE /v1/events/{eventId}/checklist/items/{itemId}`,
    `POST /v1/events/{eventId}/checklist/sync-templates`.
  - Overview: `GET /v1/event-checklists/summary` (paginated, progress per event).
- **Behavior change requested on an existing endpoint (later):** the event status-change
  endpoint should refuse leaving a stage while required checklist items of that stage are
  open (HTTP 422 with `data.open_required_items`). Not wired in the front end yet.
- **Backend action:** build the endpoints above; on event creation, copy templates into the
  event checklist (`due_date = start_date + due_offset_days`).

## 2026-11-20 — Event Settings rule guide redesign

- **Area:** `src/pages/EventStatusPage.tsx` (Event Status / Event Settings page).
- **Endpoints touched:** none. `/v1/event-status/get-all`, create, update, delete and
  reorder calls are unchanged; the rule flags (`cutting_stock`, `stock_return`,
  `allow_add_item`, `allow_delete`, `check_ownership`, `production_item`, `borrow_item`,
  `outsource_item`, `action`) are read and sent exactly as before.
- **Impact:** none — UI, copy (i18n) and CSS only.
- **Backend action:** none.

## 2026-11-20 — App version in the sidebars

- **Endpoints touched:** none. Version is read from `package.json` at build time.
- **Impact:** none.
