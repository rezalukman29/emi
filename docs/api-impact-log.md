# API impact log

Every change that might affect the backend API contract is recorded here: endpoints,
request payloads, field names, query params, response parsing, React Query cache keys,
or behavior the backend relies on. When a change is close to the API but does **not**
affect it, record that too, so nobody has to re-check. Newest first.

Format: date — change — endpoints/fields touched — impact — action needed by backend.

---

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
