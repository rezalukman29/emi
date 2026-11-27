# Backend notes — everything the web needs from backend (except the layout features)

Owner request (2026-11-27): "from all our conversations, apart from the stage (event layout) and warehouse mapping
features, make notes for backend so nothing is missed."

- **Who reads this:** backend developers and the reviewer. Written so a developer can pick an item and finish it
  without reading the chat.
- **What is not here:** the warehouse layout / floor map (`docs/api-backlog.md` §16) and the event layout map (§17).
- **Source of truth for contracts:** `docs/api-backlog.md` (per feature) and the files named in each row.
- **How to close an item:**
  1. Run its **Check** on staging.
  2. Move it to the **Done** table at the bottom with the date and the backend version.
  3. Tell the PM.

  An item is not closed until its check passes on staging. Fixing the code without cleaning the existing data
  does not count when the item is a data issue.

## Status legend

- 🔴 **Bug / data**: wrong data or wrong behaviour exists today.
- 🟠 **Needs API**: a screen is built (often as a browser preview) and waits for an endpoint.
- 🟡 **Decision**: the owner or backend must decide something first.

Last staging check: **2026-11-27**, read-only. "Still" means the item was still present on that date.

---

## A. Bugs and data problems found on staging

| ID | Problem (what we saw) | What backend should do | Check (how we verify) |
|---|---|---|---|
| B-01 🔴 | **Negative stock** is stored. Still: "kerang tipis place card" −97 (Gudang Bali 70), "Isolasi Kecil" −19 (Gudang Bali 66). | Refuse any write that makes `barang_gudang.stok` < 0: event scan out, `POST /v1/moving-order`, stock-opname apply, manual edit. Return 422 with a message such as "only N in stock". Fix the 2 rows, and send a list of any others. | `GET /v1/barang-gudang/gudang/{id}` for every warehouse shows no `stok < 0`. A QA- test that moves more than the stock gets 422. |
| B-02 🔴 | **Invalid event dates.** Still: event 73 "Bvlgari NYE 2026" and event 84 "jimmmy + diaah" have `date_event = "NaN-NaN-NaN"`. Several dates are not zero-padded (`"2026-3-3"`, events 75, 78, 79, 80, 81). About 25 events have an empty `date_event`. Event 85 is fixed. | Validate `date_event`, `event_start`, `event_end` as `YYYY-MM-DD` (or ISO) on create and edit. Return 422 per field. Repair the existing rows. Decide what an empty load-in date means (default to `event_start`?). | `/v2/event-filter` for every lifecycle: every `date_event` matches `^\d{4}-\d{2}-\d{2}`. A QA- event saved with a bad date gets 422. |
| B-03 🔴 | **Two different stock totals.** For 41 items the item total (`stok_barang` in `/v2/barang-gudang/detail`) ≠ the sum of its warehouse stocks. Examples: Kabel Listrik 150 vs 100, Meja Besar 90 vs 56, Bola Tenis 10 vs 9. | One source of truth: compute the item total from `barang_gudang`, or keep both in sync in the same transaction. Recalculate the 41 items. **Question for the owner:** should the total include items currently out at events? | For every item in `/v2/barang-gudang/detail`: `stok_barang == Σ warehouses[].stok_gudang`. |
| B-04 🔴 | **26 items have no warehouse** (`warehouses: []`). Example: "Backdrop Panel Ecolab". | Every item must have at least one `barang_gudang` row, or be marked archived. Give the list to the warehouse team. | `/v2/barang-gudang/detail` has no item with an empty `warehouses` (except archived ones). |
| B-05 🔴 | **Duplicate warehouses:** three "Gudang C9" (ids 25, 26, 28, all empty) next to "Gudang C9 Update" (23). Owner: "probably duplicates". | Remove or deactivate 25/26/28 (they hold no stock). Optional: refuse a new warehouse whose name already exists in the tenant. | `/v1/gudang` has one "Gudang C9…". |
| B-06 🔴 | **Empty warehouse returns an error.** `GET /v1/barang-gudang/gudang/{id}` answers **400** for a warehouse without items. Still: 25, 26, 28, Rent (22), Printing (18), Venue (17). The web now treats 400 as "no items". | Return `200` with `data: []`. | Call it for id 25 → 200 and `[]`. |
| B-07 🔴 | **Orphan records:** moving orders #3 and #4 point to warehouses 408 and 409, which no longer exist (QA test warehouses that were deleted). | Add foreign keys, or refuse to delete a warehouse that has transactions (soft delete instead). Clean up #3/#4 (they are QA data). | Every `/v1/moving-order` row has existing `from_gudang_id` / `to_gudang_id` and names. |
| B-08 🔴 | **The "Outsource" warehouse (16) has `is_out_source = 0`.** | Set it to 1. The flag should mean "not a physical place" (see B-10). | `/v1/gudang` id 16 → `is_out_source = 1`. |
| B-09 🔴🟡 | **Ownership is stored as warehouses.** Rent, Buy, IHP, Printing, Venue are ownership/source **labels**, not places (owner 2026-11-27). Meanwhile the real ownership column `barang_gudang.kepemilikan_id` is **0 on all 2,109 rows**. | Decide one model (recommended: use `kepemilikan_id` for owned / rented / bought / IHP / outsource, and keep warehouses for places). Migrate the stock in the label warehouses. Until then add `type: "physical" \| "label" \| "outsource"` on `/v1/gudang` (B-10). | `kepemilikan_id` is filled. The label warehouses are flagged or gone. |
| B-10 🟠 | **No warehouse type.** The web currently recognises label warehouses by **name** (Rent, Buy, IHP, Printing, Venue, Outsource). | Add `type` (or `is_label`) to `/v1/gudang` list, detail, create and edit. Show it in the Warehouse form. | `/v1/gudang` rows carry `type`. |
| B-11 🔴 | **Catalogue gaps:** 915 of 1,907 items have no category, 176 no code, 88 no photo. 9 item names are duplicated (e.g. "Artificial Flower Orchid Yellow" ×2). | Report for the data team. Optional: require category and code on create. Merge duplicates (move stock and history to one item). | The counts go down. |
| B-12 🔴 | **Three different "number of items":** dashboard summary 1,940; catalogue 1,907; stock rows 2,109. | Define each one (items / item × warehouse / …) and name the fields accordingly, or align them. | The definitions are written in this file. |
| B-13 🔴 | **Stock-opname period is free text** ("Des 2027", "16 August 1st"). A future period (Nov 2027) is already "done". | Store `period_start` / `period_end` dates (keep the label). Refuse periods in the future. | Periods sort by date. |
| B-14 🔴 | **Stock history is empty.** `GET /v1/barang-gudang-history/{id}` returns `data: null` for the item we checked. There is no single ledger of stock changes. | One `stock_movements` table written in the same transaction as every change: event out/in, moving order, opname, manual edit, broken, conversion. Fields: qty ±, before/after, reason, ref id, user, time. Expose it per item and per warehouse. | Change stock with a QA- item → a history row appears. |
| B-15 🔴 | **Unused columns** on `barang_gudang`: `status` (all empty), `alternative_stock` (all 0), `valuation` (2 rows), `flag_1/flag_2`, `reason`, `lantai`, `lorong`, `internal_location`. | Document them or drop them. If valuation matters, fill it (finance §F-14 needs item values). | Documented. |
| B-16 🔴 | **Intermittent CORS error** on `/v2/event-filter`: one call out of many failed in the browser with "blocked by CORS" during our tests. | Check that error responses (5xx, timeouts) also send the CORS headers. | No CORS error in a 5-minute session. |

## B. Behaviour the web relies on (tell us if it is wrong)

| ID | Assumption | Why it matters |
|---|---|---|
| R-01 | **401 = session invalid or expired, nothing else.** The web (FE dev's version, merged 2026-11-27) logs the user out on any 401. | If 401 is used for "no permission", users get logged out by mistake. Use 403 for permission. |
| R-02 | **`limit` up to 100** is accepted on every list endpoint. The web now offers "Show 10 / 20 / 50 / 100" per page. Checked on `/users` (50 OK). | If a list caps lower, the page shows fewer rows than chosen. |
| R-03 | **Retries only on 5xx** (FE dev's change): the web does not retry 4xx. | 4xx must be final. |
| R-04 | **"Admin" = `user_type === 'ADMIN'`** (FE dev's change; `is_admin = 1` alone no longer counts). Finance, Users, Event Status, Checklist Settings and Upgrade are admin only in the UI. | The server must enforce the same rule. The UI check alone is not security. |
| R-05 | Event lines (`/v3/fix-list-item-event`) carry `area_name`, `sub_list_name`, `scan_out`, `scan_in`, `gudang_id` for every line. | The checklist, finance, the warehouse schedule and the layouts use them. |

## C. Features built in the web that wait for an API

Details, fields and endpoints are in `docs/api-backlog.md` (section numbers in brackets).

| ID | Feature (business) | Today in the web | Needed from backend |
|---|---|---|---|
| F-01 🟠 | **Event Checklist** (groups, assign, photo/report proof, admin e-mail, untick history) [§1] | Browser only; e-mails not sent | Checklist tables + endpoints, file storage, e-mail sending (`src/hooks/api/eventChecklistContract.ts`) |
| F-02 🟠 | **Event History** (who did what on an event) [§2] | Dummy data | `event_activity` table + `GET /v1/event/{id}/activity` (`eventHistoryContract.ts`) |
| F-03 🟡 | **Overdue tab** on Events [§3] | Chip only | Lifecycle `overdue` or an end-date filter; owner decides if overdue events also stay in their tab |
| F-04 🟠 | **Event Calendar filters** [§4] | Not built | Stage, lifecycle, PIC, warehouse on calendar events; category on clashes |
| F-05 🟡 | **Rich text** for description/notes [§5] | Plain text | Owner decision (Markdown recommended) |
| F-06 🟠 | **Exact stock-tab counts** in Add Items [§6] | Counts the loaded rows | `in_stock` filter + counts on `/v2/barang-gudang/detail` (optional) |
| F-07 🟡 | **Event cover images** [§7] | Shown if present | Confirm the `images` field and URL vs base64 |
| F-08 🟠 | **Partial return / transfer** [§8] | Not built | New lifecycle + endpoints (`docs/source-migration-53aaf50.md`) |
| F-09 🟠 | **PIC as a user** [§9] | PIC is a name | Optional `pic_user_id` |
| F-10 🟡 | **Deleting an event with items** [§10] | UI asks to type the name | What happens to items, stock and scans? Should the server refuse? |
| F-11 🟠 | **Availability by date** (lending model) [§11] — **high priority** | Clash pills only | `GET /v1/availability?start&end…`; add-to-event checks availability for the event dates, not today's shelf |
| F-12 🟠 | **3 Star Protection** (AI per event) [§12] | Rule-based mock in the browser | Settings, brief, `POST …/three-star/analyze` with an LLM, suggestion states (`threeStarContract.ts`) |
| F-13 🟠 | **Warehouse schedule** (out / back per warehouse, overdue returns) [§13] | Estimated in the browser from event dates | `GET /v1/gudang/{id}/schedule`, `expected_return_date` per line, `?gudang_id=` on the summary |
| F-14 🟠 | **Project Finance** (contract, costs, invoices, payments) [§14] | Browser only; vendor costs real | Client, contract, invoices + payments, manual costs, numbering, PDF, finance permission on the server |
| F-15 🟠 | **Data validation** (dates, no negative stock) [§15] | UI hides bad values ("—") | = B-01 and B-02 above |

## D. Decisions still open (owner / backend)

1. B-03: should the item total include items currently out at events?
2. B-09: ownership model. Use `kepemilikan_id` and drop the label warehouses, or keep both?
3. F-10: deleting an event that has items: refuse, or return the items?
4. F-03: overdue events: their own tab only, or also in Upcoming / On Going?
5. F-05: rich text format.
6. Who may edit event layouts and checklists (all users, admins, or the event PIC)?
7. Expected return buffer: how many days after the event ends do items count as "back" (F-11, F-13)?

## E. Security (parked by the owner on 2026-11-26, listed so it is not forgotten)

- `src/service/axiosEmi.ts` contains a hard-coded production token. Move it to the server or an environment
  variable, and rotate the token.
- The server must not trust the `User-Id` header alone. Every request needs a valid token, and permissions must
  be checked on the server (see R-04).
- Staging credentials were shared in a chat on 2026-11-23. The account password should be changed.

---

## Done

| ID | Date | Backend version | Checked by |
|---|---|---|---|
| (part of B-02) event 85 `date_event` repaired | seen 2026-11-27 | ? | Claude (staging read) |
