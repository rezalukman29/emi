# API backlog for developers

**What the backend still has to build so the web app can stop using preview / dummy data.**
One place for developers. Keep it up to date: when a request needs an API, add it here (and log the
change in `docs/api-impact-log.md`); when the backend ships it, move it to "Done" with the date.

- Owner rule (2026-11-20, restated 2026-11-23): if a request needs a new or changed API, the AI stops and
  tells the owner first, then records it here. Reusing an existing API is fine without asking.
- "Preview" in the app = data saved only in that browser (localStorage) or generated dummy data. Other users
  and devices do not see it. Every preview screen shows a **Preview** badge.
- Detailed TypeScript contracts live next to the hooks in `src/hooks/api/*Contract.ts`.

Last updated: 2026-11-23.

---

## Summary

| # | Feature (business) | Status in the app | What the backend must build | Priority | Contract |
|---|---|---|---|---|---|
| 1 | **Event Checklist** (groups, assign, photo/report proof, admin e-mail, untick history) | Preview (browser only) | New checklist tables + endpoints + e-mail + file storage | **High** — the feature cannot be used by a team until this exists | `src/hooks/api/eventChecklistContract.ts` |
| 2 | **Event History** (what happened on an event) | Dummy data | Activity log table written on every change + 1 read endpoint | High | `src/hooks/api/eventHistoryContract.ts` |
| 3 | **Overdue tab** on Events | Not built (chip only) | Lifecycle `overdue` or an end-date filter on `/v2/event-filter` | Medium — also needs an owner decision | — |
| 4 | **Event Calendar filters** (stage, lifecycle, PIC, warehouse, category) | Not built | Extra fields or params on `/v1/event-calendar` and `/clashes` | Low | — |
| 5 | **Rich text** for event Description / Note | Waiting for owner decision (A/B/C) | Sanitising + renderer everywhere (only if option A) | Low | — |
| 6 | **Exact stock-tab counts** in Add Items | Works without it (counts loaded items, "+") | `in_stock` filter + counts on `/v2/barang-gudang/detail` | Optional | — |
| 7 | **Event cover images** on the event list | Works if the field exists | Confirm `images` in `/v2/event-filter` (URL preferred) | Question | — |
| 8 | **Partial return / partial transfer** lifecycle | Not built | New lifecycle status + transfer endpoints | Later | `docs/source-migration-53aaf50.md` |
| 9 | **PIC as a user id** (follow renames, "my events") | Not built — PIC saved as a name | Optional `pic_user_id` on events | Optional | — |
| 11 | **Availability by date** (lending model) | Clash pill only | Per-item available qty for a date range; add-to-event checks by dates | **High** | — |
| 12 | **3 Star Protection** (AI assistant per event) | Preview: mock AI rules in the browser | Settings, event brief, analyze endpoint with an LLM, suggestion states | Medium | `src/hooks/api/threeStarContract.ts` |
| 13 | **Warehouse schedule** (out / back per warehouse, returns overdue) | Derived from event dates in the browser | `GET /v1/gudang/{id}/schedule`, `expected_return_date` per line, `?gudang_id=` on the summary | Medium | — |
| 14 | **Project Finance** (contract, costs, invoices, payments) | Preview: browser only; vendor costs real | Client, contract, quotes, invoices + payments, manual costs, rental/replacement prices, PDF, reminders | High | — |
| 15 | **Data validation** (event dates, stock never below 0) | FE hides bad values ("—"), Dashboard still shows −97 | Reject invalid `date_event`/`event_start`; refuse moves/outs that push stock below 0; fix existing rows | Medium | — |
| 10 | **Deleting an event that has items** | UI asks to type the name | Answer: what happens to items, stock and scans? Should the server refuse? | Question | — |

---

## 1. Event Checklist (v2, owner 2026-11-23)

**Why (business):** each event has a to-do list the crew works through. Tasks are grouped freely
("Loading", "Event day", "Client handover"…), can be assigned to a person, and some tasks need proof
(a photo and/or a written report) before they can be ticked. Admins get an e-mail when a task is ticked.
A task can be unticked, but everything stays in the history.
Used on **Event Checklist** (sidebar) and in **Event Detail → Event Checklist** tab (same data).

**Today:** all of it works in the browser only (`localStorage['emi.checklist.v2']`); nothing is shared
between users. E-mails are **not sent**; they are only listed on *Checklist Settings* as "would be sent".

**Reused, no change needed:** `GET /v1/get-all-user` (assignee picker; admins = `is_admin = 1` or
`user_type = ADMIN`, their `email` is the recipient list), `GET /v2/event-filter`, `GET /v1/event/{id}`.

**Data to store (new tables):**

| Table | Main fields |
|---|---|
| checklist_template_groups | id, tenant_id, name, order_data |
| checklist_templates | id, group_id, title, is_required, requires_photo, **requires_report**, due_offset_days, order_data |
| event_checklist_groups | id, event_id, name, order_data, template_group_id |
| event_checklist_items | id, event_id, group_id, template_id, title, is_required, requires_photo, **requires_report**, status (`open/done/na/issue`), note (= report), due_date, **assignee_user_id**, status_by_user_id, status_at, order_data |
| event_checklist_photos | id, item_id, file url, uploaded_by, taken_at, deleted_at |
| event_checklist_activity | id, item_id, user_id, action, detail, created_at (**never deleted**, also for unticks) |
| event_checklist_sign_offs | id, event_id, group_id, role, name, signature_url, note, signed_by_user_id, signed_at |
| event_checklist_settings | tenant_id + the switches in `ChecklistSettingsDTO` (incl. **notify_admins_enabled**, **notify_admins_when**) |

**Endpoints (full list with payloads in the contract file):**
- Templates: groups CRUD + reorder; template tasks CRUD.
- One event: `GET /v1/events/{id}/checklist`; groups CRUD + reorder; items create / update / delete;
  photos upload (multipart) / delete; item activity; group sign-off create / remove.
- Overview: `GET /v1/event-checklists/summary` (progress per event, `required_open`, `my_open_items`,
  filter `assignee_id` for "only events with tasks for me").
- Settings: `GET/PUT /v1/event-checklist-settings`.

**Rules the server must enforce (same as the UI):**
1. Ticking (`status = done`) is refused (422) if the task needs a photo and has none, or needs a report and
   `note` is empty.
2. Unticking (`done/na → open`) is allowed; photos and report stay; write activity `unchecked` with the old status.
3. When a task is ticked and the setting is on (all tasks, or required only): **e-mail every admin** of the
   tenant — event, group, task, who ticked it, time, link `/event-detail?id=<event>&view=checklist`. Write an
   activity row. Send asynchronously (queue) so ticking stays fast.
4. Assigning writes an activity row. *(Optional, not requested yet: e-mail / notify the assignee.)*
5. Signed-off groups are read-only when "lock after sign-off" is on (423). Admin can remove the sign-off.
6. When an event is created, copy every template group and task into it (due date = start + offset).

**Open questions for the owner / backend:**
- Should required checklist tasks block moving the event to the next stage? (v1 tied groups to stages; v2
  groups are free, so there is no stage gate now.) If yes, a group needs an optional "stage" link.
- E-mail sender address and template (Indonesian / English?).
- Photo storage: size limit, retention, keep or strip GPS data.
- Preview data cannot be migrated: ids are local to each browser.

## 2. Event History (activity log)

**Why:** see what happened on an event and who did it. **Today:** dummy data generated per event.
**Needed:** an `event_activity` table written in the same transaction as every change (event created/edited
with before → after per field, stage moved, items added/removed/modified, ownership, scan in/out, checking
started, broken report, files uploaded/deleted, checklist actions) and
`GET /v1/event/{id}/activity?page&limit&type&search` (newest first). Fields: id, event_id, type
(`event|stage|item|scan|file|checklist`), action, message, changes[{field, from, to}], meta, user_id,
user_name, created_at.

## 3. Overdue tab (Events)

**Why:** find events whose finish date has passed but are still Upcoming / On Going.
**Needed (pick one):** (A) lifecycle `overdue` in `/v2/event-filter` (filter + count), or (B) an end-date
param, e.g. `end_to=yyyy-mm-dd` combined with `status=upcoming|on-going`.
**Owner decision:** should overdue events leave their tab, or appear in both?

## 4. Event Calendar filters

Per event in `/v1/event-calendar` → `days[].events[]`: `status_id` (+ name), `lifecycle_status`, `pic`,
warehouse(s); per clash row in `/clashes`: `category_id` / `category_name`. Or accept the
`/v2/event-filter` params on both endpoints.

## 5. Rich text for Description / Note

Waiting for the owner: (A) HTML — server must sanitise, and every reader (mobile app, cards, print, search)
must render it; (B) Markdown — readable as plain text in old clients (recommended); (C) keep plain text.

## 6. Exact Available / Out of Stock counts (Add Items)

Optional: `in_stock=1|0` on `GET /v2/barang-gudang/detail` plus both counts in the response.

## 7. Event cover images

Confirm that `/v2/event-filter` returns `images` (or `image` / `cover_url`), and whether it is a URL or
base64. A URL is preferred for list speed.

## 8. Partial return / partial transfer

See `docs/source-migration-53aaf50.md`.

## 9. PIC as a user id

Today `PIC` is the user's name (string). An optional `pic_user_id` would let the app follow renames and
show "my events".

## 10. Deleting an event that has items

What happens to its items, stock and scans? Should the server refuse? The UI only says "cannot be undone".

## 11. Availability by date (owner 2026-11-24)

**Why:** items are lent to events and come back when returned. "Available" must be computed for the event's
dates, predicting when running events give items back. Today the server checks only today's shelf stock
("stok barang gudang tidak mencukupi"), so an event next month can be refused although the items are back by then,
and the Add Items list cannot show the right number.
**Needed:**
- `GET /v1/availability?start=yyyy-mm-dd&end=yyyy-mm-dd&barang_ids=1,2&gudang_id=` → per item (and per warehouse):
  `on_hand` (shelf now), `out_until_return` (lent to events, with each event id, end date and expected return date),
  `booked_overlapping` (qty in events overlapping the range), `available_for_range` = on_hand + returns due before
  `start` − booked_overlapping, and `shortage`.
- Same rule in `POST /v1/fix-list-item` (and qty edit): check `available_for_range` for the event's dates, not today's stock.
- Expected return date per event (default `event_end` + buffer days set per tenant), overdue returns flagged.
- Optional: `available_for_range` and `next_free_date` included in `/v2/barang-gudang/detail` when `start`/`end` are passed.
**Today in the web:** Add Items shows a note and clash pills from `GET /v1/event-calendar/clashes?month=` (reuse).

## 12. 3 Star Protection (owner 2026-11-24)

**Why:** an assistant per event that checks ★ brief, ★ items, ★ timing, suggests better items or materials
(e.g. round table on grass → wooden base), warns when dates are too tight, and builds a default checklist.
**Today:** works fully in the UI on a rule-based mock (`src/lib/threeStar.ts`), data per browser.
**Needed:** tenant settings, a structured event brief per event, `POST /v1/events/{id}/three-star/analyze` that calls
an LLM with the event + item lines + brief + availability by date (§11) and returns stars, suggestions (with stable
`code`), and checklist tasks; suggestion states (done / dismissed); adding tasks needs the checklist API (§1).
Item knowledge (material, indoor/outdoor suitability, capacity per table) would improve results: optional new item
fields `material`, `outdoor_ok`, `seats`. Full contract: `src/hooks/api/threeStarContract.ts`.

## 13. Warehouse schedule (owner 2026-11-26)

**Today:** the Warehouse Hub builds "Out & back" in the browser from `/v2/event-filter` (dates) + `/v3/fix-list-item-event`
(lines with `gudang_id`), per active event. Slow with many events and only an estimate (load-in = out, event end = back).
**Needed:** `GET /v1/gudang/{id}/schedule?from&to` → per event: lines, qty, out date, expected return date, scanned out/in,
status (out / back / overdue); `expected_return_date` per line (ticket BE-16); `GET /v1/warehouse-inventory-summary?gudang_id=`;
a flag that tells a physical warehouse from an ownership bucket (staging has "Rent", "Buy", "IHP", "Printing", "Venue" as
warehouses — question for the owner).

## 14. Project Finance (owner 2026-11-26)

**Today:** preview. Contract value, client name, invoices (DP / final, VAT), payments, manual costs and extra charges are in
`localStorage['emi.finance.v1']`; invoice numbers `INV-YYMM-###` per browser. Vendor costs are real: `GET /v1/loan-items`
(`rental_cost`, `event_id`) and `GET /v1/outsource-items` (`total_cost`, `event_id`).
**Needed:** `client` entity (+ `event.client_id`, NPWP, billing address); `/v1/events/{id}/finance` (contract value, tax rate);
`/v1/events/{id}/costs` (manual costs with category and receipt); `/v1/invoices` (+ items, numbering per tenant, status,
due date, PDF) and `/v1/invoices/{id}/payments`; extra charges linked to broken/lost reports; item `rental_price` and
`replacement_price`; production cost; quotes with versions; due-date reminders; CSV export; finance permission
(ADMIN or new FINANCE role) enforced on the server.

---

## Done

_(Nothing yet. Move rows here with the date and the backend version when an API ships.)_

## 15. Data validation (UX review 2026-11-26)

**Status: Butuh API — waiting for backend.**
- Events 85 and 73 on staging have a `date_event` that is not a date, so reports showed "NaN-NaN-NaN" (the FE now shows "—").
  Backend: validate `date_event`, `event_start`, `event_end` as `YYYY-MM-DD` on create/update (422 with a field message) and
  repair the existing rows.
- Dashboard shows an item with stock **−97**. Stock must never go below 0: `POST /v1/moving-order`, item-out and stock-opname
  adjustments should refuse (422, message "only N in stock") instead of saving. Provide a one-off report of rows < 0.
