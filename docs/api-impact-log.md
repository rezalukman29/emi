# API impact log

Every change that might affect the backend API contract is recorded here: endpoints,
request payloads, field names, query params, response parsing, React Query cache keys,
or behavior the backend relies on. When a change is close to the API but does **not**
affect it, record that too, so nobody has to re-check. Newest first.

Format: date — change — endpoints/fields touched — impact — action needed by backend.

---

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
