# EMI — Technical System Schema PRD (for the mobile app)

> **Purpose.** This is the technical reference of the EMI (Event Management Inventory) system as implemented in the
> web app on `main` (repo `sandmanzz/emi`) on **2026-11-02**. It is written for an AI agent (e.g. Claude) that has to
> **tune up / align the existing mobile app** with the web system. Every entity, field, enum, state machine, business rule
> and derived value below is taken from the code. Where the web app is still a prototype (no backend), this document says
> so and gives the intended server contract.
>
> **How to read it.** §1 = system overview and conventions. §2 = glossary. §3 = the data model (every entity, field by
> field). §4 = state machines. §5 = business rules (the logic the mobile app must reproduce exactly). §6 = derived values
> and formulas. §7 = screens and flows (web → what mobile needs). §8 = API contract for a real backend. §9 = mobile-specific
> guidance. §10 = known gaps. §11 = source-file map. Items marked **[RULE]** are hard rules; **[ASSUMPTION]** marks a
> product decision that the owner has not confirmed.
>
> Related docs: `docs/context.md` (all owner instructions, newest first — source of truth for decisions),
> `docs/changes.md` (code changelog per round), `docs/backend.md` (backend notes), `docs/prd/PRD-2026-10-16.md`,
> `PRD-2026-10-19.md`, `PRD-2026-11-02.md` (dated feature PRDs).

---

## 0. Ten things you must not get wrong

1. **"Rent" always means WE rent from a vendor.** We never lend our items out (the old outbound "Item Loan" module was
   removed). Rented items are **temporary**: they are returned to the vendor and **never become our stock or asset**.
2. **Production creates assets.** When a production is **Done**, its quantity is added to a warehouse row → it becomes our
   stock and counts in asset value.
3. **Outsource works exactly like Rent** (separate vendors, separate records, different labels). Not our asset.
4. **There is one stock source:** Warehouse Inventory rows (one row per *item name × warehouse*). Item "Total Stock" is
   always **derived** = Σ rows. Every stock change must write a **stock movement** (ledger) with a reason.
5. **Items are joined by NAME**, not id (rows, event lines, rentals, productions all reference `name` / `itemName`).
   A backend should introduce `itemId`, but the mobile app must not assume ids exist in today's data.
6. **Event stages are configurable** (Master Data → Event Status). Never hard-code stage names; read the list and its
   flags (scan, cuttingStock, stockReturn, productionItem, checkOwnership, allowDelete, loanItem, outsourceItem).
7. **Event key** = `"<event.date> | <EVENT NAME IN UPPERCASE>"` (e.g. `2026-05-08 | WEDDING SPRING GARDEN`). All per-event
   stores are keyed by it.
8. **Numbers are displayed Indonesian style**: dot = thousands separator, comma = decimal (`12.500`, `78,5`), currency
   `Rp1.443.680.000` (no space). Never `en-US`. Inputs and CSV keep raw numbers.
9. **"Today" in the demo is fixed** at `2026-04-09` (`TODAY` in `src/data/events.js`). Overdue, past-event locks, calendar
   "Today" all use it. A real backend uses server date.
10. **UI text is English; the owner speaks Indonesian.** Labels below are the exact UI strings.

---

## 1. System overview

### 1.1 Product
EMI is a multi-tenant SaaS for event-decoration companies (weddings, galas, corporate events). It manages:
- an **item catalog** (master data) with value per unit,
- **stock per warehouse** with a full movement ledger and stock opname (physical count) approval,
- **events**: which items go to which area of the venue, through a configurable stage pipeline (prepare → scan in →
  event running → scan out → return), with stock cut / return, broken items, transfers between events,
- **production** (we have items made → become assets), **rent** (we rent items → returned), **outsource** (we order
  items/work for an event → not assets),
- **vendors** for each of those three,
- **reports**: Inventory, Event Report, Event Calendar with item clashes, Stock Opname Report, Overview, Dashboard.

### 1.2 Tenancy and apps
| App | Path | Users | Auth store |
|---|---|---|---|
| Tenant app (the product) | `/…` | tenant users: roles `Admin`, `Staff`, `Viewer` | `emi_tenant_auth` |
| Super Admin console | `/superadmin/…` | platform owner: customers, payments, pricing, global categories/units | `emi_superadmin_auth` |

The mobile app is a **tenant app** client. Super Admin is out of scope for mobile.

### 1.3 Tech of the web reference
React 19 + Vite SPA, React Router, plain CSS. **No backend**: seeds in `src/data/*.js`, mutable state persisted in
`localStorage` via `src/lib/*` stores. Everything in §3 maps 1:1 to a future API resource (§8).

### 1.4 Conventions
| Convention | Value |
|---|---|
| Dates (storage) | ISO `YYYY-MM-DD` for business dates (event start/finish, rental dates). Some legacy display stamps are `DD Mon YYYY` (`updatedAt` on rows/catalog) or `DD Mon YYYY, HH:MM` (ledger `at`). Backend: use ISO 8601 everywhere. |
| Money | Integer Rupiah, no decimals. |
| Qty | Integer ≥ 0 (≥ 1 on create). |
| Display numbers | `fmtNum(n)` = `n.toLocaleString('id-ID', {maximumFractionDigits: 2})`; `formatIDR(n)` = `'Rp' + n.toLocaleString('id-ID')`. Large KPI shorthand: `Rp597 jt` (juta = million). |
| IDs | Integer per entity (seeded); rows/records generated as `max(id)+1`. Composite keys documented per entity. |
| Activity log | Every user action writes `{userName, action, module, description}` (§3.17). |

---

## 2. Glossary

| Term (UI) | Meaning |
|---|---|
| Item / Inventory | Catalog master-data record (one per item name). |
| Warehouse Inventory row | Stock of one item in one warehouse. THE stock source. |
| Wh. Stock / Item Stock | Row stock (the two fields are kept equal). |
| Valuation / Total Val. | Row unit value / `valuation × stock`. |
| Item Value | Catalog unit value (Rp); copied to every row's `valuation`. |
| Asset value | Σ (valuation × stock) of our own rows. |
| Event | A job at a venue with a date window and a list of item lines. |
| Event line / event item | An item allocated to an event area (qty, area, sub area, stage added, ownership…). |
| Area / Sub Area | Venue zones (master data), e.g. `GUEST TABLE` / `Centerpiece`. |
| Stage / Event Status | One step of the configurable event pipeline. |
| Ownership | `IHC` (in-house, company), `IHP` (in-house produced), `Outsource` (from outside). |
| Stock cut | Event lines deducted from warehouse stock when a cutting stage is crossed. |
| Stock return | Cut lines returned to stock when a stock-return stage is crossed. |
| Closing status | Event-level lifecycle after the stage pipeline (Checking Inventory → Returned & Completed / Transferred). |
| Production | Vendor makes an item for us → becomes stock (asset). |
| Convert | Turn existing stock of item A into item B (stock of A deducted). |
| Rent (code: `loan`) | We rent from a rent vendor; returned. |
| Outsource | We order an item/work from an outsource vendor for an event. |
| Stock opname | Physical count of a warehouse; differences approved by Admin are written to stock. |
| Moving order | Move stock between two warehouses. |
| Clash | Same item booked by ≥ 2 events on the same day (shared / shortage). |

---

## 3. Data model

Notation: `field: type` — description. **(derived)** = computed, never stored. **PK** = primary key.
Storage key = current web `localStorage` key (seed file in brackets).

### 3.1 User (tenant)
Store: in-memory roster seeded from `data/users.js`; session in `emi_tenant_auth`.
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | |
| name | string | shown in logs as `userName` / `by` |
| email | string | login, unique (case-insensitive) |
| password | string | demo only (plaintext). Backend: hashed. |
| role | `'Admin' \| 'Staff' \| 'Viewer'` | |
| status | `'active' \| 'inactive'` | inactive cannot log in ("This account has been deactivated. Contact your admin.") |
| lastActive | string `YYYY-MM-DD HH:MM` | |

Session object (`emi_tenant_auth`): `{ id, name, email, role }`. `isTenantAdmin()` = `role === 'Admin'`.
Demo logins: Admin `dewi@emi.id / Admin@123`, Staff `anto@emi.id / Staff@123`.
**Permissions in web today:** Admin-only = approve/reject stock opname, Users management. Everything else is open to
logged-in users. **[ASSUMPTION]** Viewer should be read-only on mobile.

### 3.2 Item (catalog / master data)
Store `emi_catalog` [`data/inventory.js`]. Lib `lib/catalogStore.js`.
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | |
| name | string | **unique (case-insensitive)**; the join key everywhere |
| sku | string | **unique**, stored UPPERCASE; suggested by `suggestSku(name)` = initials of first 3 words + `-NNN` (e.g. `Fresh Flower Centerpiece` → `FFC-001`) |
| category | string | one of Category master data (`Floral, Furniture, Lighting, Fabric, Decoration, Equipment`) |
| unit | string | unit abbr from Unit master data (`pcs, meter, unit, roll, set, box`) |
| itemValue | int Rp | value per unit; drives asset value |
| desc | string | |
| homeWarehouse | string | where it is usually kept (warehouse name) |
| needsSetup | bool | true for drafts auto-created by a finished production (missing category/unit) |
| source | `'' \| 'production' \| 'rent' \| 'outsource'` | how it was created (quick-add from a request form sets it) |
| producedBy, producedFor | string | vendor / event name for production drafts |
| updatedAt | string `DD Mon YYYY` | |
| totalStock **(derived)** | int | Σ `itemStock` of rows with the same name |
| warehouses **(derived)** | `[{name, stock}]` | rows of this item, sorted by stock desc |
| warehouse **(derived)** | string | `warehouses[0].name` or `homeWarehouse` |
| stockStatus **(derived)** | `'Out of Stock' \| 'Low Stock' \| 'Available'` | see §6.2 |

Rules: create with optional opening stock `{warehouse, qty}` → creates/updates a row + ledger `Opening stock`.
Rename → all rows renamed (event lines keep the old name). Item Value change → all rows' `valuation` updated.
Delete **refused while totalStock > 0**. Saving a `needsSetup` item with category + unit clears `needsSetup`.

### 3.3 Warehouse
Seed `data/warehouses.js` (not persisted in web).
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | |
| name | string | unique; referenced by name |
| location | string | `'None'` for the placeholder **"Buy"** (not a real place; excluded from deploy/keep pickers) |
| pic | string | |
| createdAt, updatedAt | string | |

### 3.4 Warehouse Inventory row — THE stock source
Store `emi_wh_rows` [`data/warehouseInventory.js`]. Lib `lib/stockOpnameStore.js`.
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | `nextRowId()` |
| name | string | item name (FK → Item.name) |
| warehouseName | string | FK → Warehouse.name. Unique pair (name, warehouseName). |
| itemStock | int | the stock. |
| warehouseStock | int | kept equal to itemStock (legacy duplicate) |
| stokMin | int | minimum stock (0 = not set) |
| stokUsed | int | informational counter |
| valuation | int Rp | unit value (= catalog itemValue) |
| totalValuation **(stored-derived)** | int | `valuation × itemStock`, recomputed on every change |
| minStatus **(stored-derived)** | `'Not Set' \| 'Safe' \| 'Warning' \| 'Critical'` | §6.1 |
| flag1, flag2 | int\|'' | display flags F1/F2 |
| asile, rack, level, lantai, lorong | string\|int | location in the warehouse: Aisle, Rack, Level, Floor (lantai), Lane (lorong). `'TBC'` allowed |
| image | string? | |
| updatedAt | string `DD Mon YYYY` | |

**[RULE]** Every change of `itemStock` goes through the store and writes one ledger entry (§3.5):
`applyStockMovement(rowId, delta, info)` (never below 0), `setInventoryRows(rows, info)` (bulk; diff per row logged;
removed rows logged → 0; new rows logged as opening), `addInventoryRow(row, info)`, `stockInto(name, warehouse, qty, info,
template)` (adds qty, opens the row if missing), `resolveOpname(...)`.

### 3.5 Stock movement (ledger, "Stock History")
Store `emi_stock_movements` (starts empty).
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | |
| at | string `DD Mon YYYY, HH:MM` | timestamp |
| itemName, warehouse | string | |
| change | int | `after − before` (signed) |
| before, after | int | |
| reason | enum string | `Opening stock`, `New stock row`, `Manual edit`, `Moving order`, `Production`, `Convert`, `Stock opname`, … |
| eventName, stage, note, by | string | context |

### 3.6 Stock opname (physical count)
Store `emi_opname_history` [`data/stockOpnameHistory.js`].
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | |
| appliedAt, appliedBy | string | submitted when / by |
| warehouse | string | one warehouse per opname |
| countedCount | int | rows counted |
| status | `'Pending' \| 'Approved' \| 'Rejected'` | |
| resolvedAt, resolvedBy | string | |
| items | `[{rowId, name, warehouseName, before, after, diff, condition: 'Good'\|'Poor', note, valuation?}]` | only rows that differ or are Poor |

Rules: `hasPendingOpname()` tells the UI an opname is waiting for approval (shown as a warning). **Approve (Admin)** → each item row set to
`after`, ledger reason `Stock opname`, note `Opname #id`. Reject → nothing changes.

### 3.7 Moving order
Page-local in web (Warehouse Inventory → Moving Order), not persisted as a document; its effect is persisted:
source row −qty, destination row +qty (opened if missing, copying valuation), ledger reason `Moving order`.
Fields: `{id, sourceWarehouse, destWarehouse, lines:[{rowId, name, qty}], createdAt, by}`.

### 3.8 Area / Sub Area
`data/areas.js`: `initialAreas[{id,name,…}]`, `SUB_AREAS: { [areaName]: string[] }`. Event lines store names.

### 3.9 Category, Unit
`data/categories.js` `{id,name,desc,itemCount,createdAt,updatedAt}`; `data/units.js` `{id,name,abbr,desc,…}` (items store `abbr`).

### 3.10 Event
Seed `data/events.js` (`initialEvents`; page state in web).
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | |
| name | string | |
| code | string | short code |
| desc | string | |
| start | ISO date | **[RULE]** `finish ≥ start` |
| finish | ISO date | |
| date | ISO date | "Event Date" = load-in / preparation date (may be before start; not range-limited) |
| location, address | string | |
| pic | string | |
| status | string | legacy, hidden; the stage lives in Event Progress (§3.12) |
| qrType, note, image | string | |
| type | `'upcoming' \| 'past'` | set on create: `start < TODAY ? past : upcoming` |
| itemCount | int | seed size of the item list (drives "On Going" and item generation) |
| updatedAt | ISO date | |
| **eventKey (derived)** | string | `` `${date} \| ${name.toUpperCase()}` `` |

**[RULE]** An event whose **last day** = max(finish, start, date) **< today** cannot be edited (Edit disabled).
New event → saved progress = first configured stage.

### 3.11 Event Status (stage configuration)
Store `emi_event_statuses` [`data/eventStatuses.js`]. Lib `lib/eventStatuses.js`.
| Field | Type | Meaning when true / value |
|---|---|---|
| id **PK**, order | int | stage order (stepper order = sort by `order`) |
| status | string | stage name (unique) |
| code | string | |
| scan | `'None' \| 'Scan'` | items must be scanned at this stage ("Waiting Scan" tab, scan-in/out) |
| cuttingStock | bool | crossing INTO this stage cuts stock for un-cut lines |
| stockReturn | bool | crossing INTO this stage returns cut lines to stock; afterwards the event can't take new items |
| productionItem | bool | "Request Production" offered |
| checkOwnership | bool | on Next, ask if any line needs an ownership change |
| allowDelete | bool (missing = true) | lines may be deleted |
| loanItem | bool | "Rent Item" offered |
| outsourceItem | bool (missing = same as loanItem) | "Outsource Item" offered |
| eventRunning | int | display counter |
| updatedAt | ISO date | |

Seed (order: status — flags):
1 `Created by admin up` — rent, outsource · 2 `On preparing items` — production, rent, outsource · 3 `Finish setup` —
production, checkOwnership, rent, outsource · 4 `Waiting scan in` — scan, no delete · 5 `Event running` — no delete ·
6 `Waiting scan out` — scan, no delete · 7 `Finished` — no delete · 8 `Postphone` · 9 `Disable`.
(Seed has cuttingStock/stockReturn false; tenants set them.)

### 3.12 Event progress (current stage)
`emi_event_progress: { [eventKey]: stageName }`, `emi_event_furthest_stage: { [eventKey]: stageName }`.
`resolveEventStage(key)` = saved → the event's mock status (Event Inventory data) → first stage. Stages up to
"furthest" can be revisited from the stage dropdown; stages after it only via **Next**.

### 3.13 Event closing status
`emi_event_closing: { [eventKey]: value }`.
| Stored value | UI label | Notes |
|---|---|---|
| (none) / `on-going` | **Upcoming** if no items, **On Going** if items (derived) | items = seed `itemCount > 0` or `emi_event_items_added[key]` |
| (derived) | **Ready to Close** | on-going AND current stage = last configured stage |
| `checking-inventory` | Checking Inventory | set by "Ready to Close" button; per-line Return / Transfer |
| `returned-completed` | Returned & Completed | terminal; all lines resolved, ≥ 1 returned |
| `transferred` | Transferred | terminal; all lines transferred out |

### 3.14 Event line (event item)
Web: page state of Event Detail, initial list from `lib/eventItems.getEventSeedItems(key)` (hand seed
`data/eventItemsSeed.js` → generated list for `itemCount ≥ 30` → 26 generic items). Incoming transfers from
`emi_moved_items[key]`. **Not persisted in web (known gap §10).**
| Field | Type | Notes |
|---|---|---|
| id **PK (per event)** | int | |
| name | string | item name |
| qty | int ≥ 1 | |
| area **required**, subArea | string | location |
| stage | string | stage at which the line was added (drives "Added New" and Modify rules) |
| pic | string | person in charge |
| ownership | `'IHC' \| 'IHP' \| 'Outsource'` | cycles IHC → IHP → Outsource by clicking the badge |
| warehouseItem | bool | from our stock (true) vs non-warehouse (false: rented/outsourced/free) |
| warehouse | string | source warehouse (cart) / deploy warehouse (production) |
| groupId | int\|null | package/group ("Grouped" tab) |
| checking, checked | bool | checklist flags |
| scanned | bool; scanIn, scanOut | timestamps (`Apr 9, 2026 08:20 AM` style) |
| note | string | |
| stockCut, stockReturned | bool | §5.4 |
| brokenQty, brokenNote, brokenReportedBy, brokenReportedAt, brokenWrittenOff | int/string | §5.6 |
| resolution | `'returned'` \| undefined | closing phase |
| fromProduction / fromConvert / fromLoan / fromOutsource | bool | origin badges: Production / Converted / **Rented** / **Outsourced** |
| loanVendor | string | rent/outsource vendor name |

### 3.15 Production request
Event: `emi_production_requests: { [eventKey]: Request[] }` [`data/productionSeed.js` `SEED_EVENT_PRODUCTION`].
Manual (no event): `emi_production_log: Request[]`.
| Field | Type | Notes |
|---|---|---|
| id **PK (per list)** | int | |
| type | `'production' \| 'convert'` | |
| name | string | item to produce (picked from catalog or quick-added) |
| qty | int | |
| area, subArea | string | event location (event requests) |
| warehouse | string | **deploy-to warehouse** (required; not "Buy") |
| vendorOrigin | `'Internal' \| 'External'` | |
| vendorId, vendorName | int, string | production vendor |
| replacesItemId | int\|null | when created from a broken line ("Create Production") |
| reason | `'broken'`? | |
| note | string | |
| status | production: `Requested → In Production → Done`; convert: `Pending → Converted` | |
| stage | string | stage when requested |
| requestedBy, requestedAt, finishedAt | string/ISO | |
| convert fields | `fromRowId, fromName, fromQty, toName, toQty, convertedAt` | |
Derived view `getAllProductions()` = every event request (non-convert) + manual, with `uid`, `source: 'event'|'manual'`,
`eventKey`, `eventName`, newest first.

### 3.16 Rental / Outsource order (one schema, `kind`)
Lib `lib/eventLoans.js`. `kind = 'loan'` (UI: **Rent**) or `'outsource'`.
| kind | per-event store | general store | seed |
|---|---|---|---|
| loan | `emi_event_loans: {[eventKey]: Rec[]}` | `emi_rentals: Rec[]` (kept in a warehouse) | `SEED_EVENT_LOANS`, `SEED_GENERAL_RENTALS` |
| outsource | `emi_event_outsource` | `emi_outsource_general` (unused) | `SEED_EVENT_OUTSOURCE` |

| Field | Type | Notes |
|---|---|---|
| id **PK (per list)** | int | |
| itemName | string | picked from catalog or quick-added |
| qty | int ≥ 1; unit | string (unit abbr) |
| area, subArea | string | event records |
| warehouse, purpose | string | general rentals (where we keep it) |
| vendorId, vendorName | int, string | vendor of the same kind |
| startDate, dueDate | ISO | **[RULE]** `dueDate ≥ startDate`. Labels: Rent "Rent from / Return by"; Outsource "Needed from / Until" |
| rentalCost | int Rp | **per unit** for the whole period. Total = `qty × rentalCost` |
| status | `'Requested' \| 'Borrowed' \| 'Returned'` | stored values; labels per kind (§4.4) |
| stage | string | stage when requested |
| requestedBy, requestedAt, borrowedAt, returnedAt | string/ISO | |
| note | string | |
| displayStatus **(derived)** | + `'Overdue'` | Borrowed and `dueDate < today` |
| uid, source, eventKey, eventName **(derived)** | | in `getAllEventLoans(kind)` |

### 3.17 Vendor
Store `emi_vendors` [`data/vendors.js`]. Lib `lib/vendorStore.js`.
| Field | Type | Notes |
|---|---|---|
| id **PK** | int | seed: 5–19 production/rent, 101–103 outsource |
| name | string | |
| origin | `'Internal' \| 'External'` | only meaningful for production; rent/outsource are always External (UI hides it) |
| kinds | `('production' \| 'loan' \| 'outsource')[]` | which menus list it / which pickers offer it. Missing → `['production','loan']` |
| description, phone, address | string | |

### 3.18 Activity log
Store `emi_activity_logs`. `{ id, userName, action: 'Create'|'Update'|'Delete'|'Return'|'Transfer'|'Login'…, module, description, createdAt }`.

### 3.19 UI-only persisted prefs
`emi_event_detail_view` (card/list view). `emi_event_items_added` (`{[eventKey]: true}`). `emi_moved_items`
(`{[eventKey]: Line[]}` transfer queue). `emi_vendors_outsource_seeded` (one-time migration flag).

### 3.20 Entity relationship (logical)
```
Category 1─* Item *─1 Unit
Item 1─* WarehouseRow *─1 Warehouse            (join: Item.name = Row.name)
WarehouseRow 1─* StockMovement                 (join: itemName + warehouse)
Warehouse 1─* StockOpname 1─* OpnameLine *─1 WarehouseRow (rowId)
Event 1─* EventLine *─1 Item (name)  ; EventLine *─1 Area/SubArea
Event 1─1 EventProgress(stage) ; Event 1─1 EventClosing
EventStatus (ordered list) ── drives stage of every Event
Event 1─* ProductionRequest *─1 Vendor(kind production) ; ProductionRequest(Done) ─> StockMovement(+)
Event 1─* Rental(kind loan) *─1 Vendor(kind loan) ; WarehouseRental *─1 Warehouse
Event 1─* OutsourceOrder *─1 Vendor(kind outsource)
```

---

## 4. State machines

### 4.1 Event stage pipeline (configurable)
```
stage[0] → stage[1] → … → stage[n-1]        (Next button; back via dropdown up to "furthest")
```
On **Next** from current `i` to target `j > i` (in this order, see `confirmStageChange`):
1. If any stage in `(i, j]` has `cuttingStock` → mark all un-cut lines `stockCut = true` (log).
2. If any stage in `(i, j]` has `stockReturn` → lines with `stockCut` (or being cut now) and not returned →
   `stockReturned = true` (log).
3. Write off broken units (§5.6).
4. Apply pending Convert requests (§5.8).
5. Save stage + furthest.
Before moving: if current stage has `checkOwnership` → dialog "does any item need a change of ownership?". If broken
items exist → warning dialog. If target crosses cutting/return → confirmation with counts.
Moving back never cuts or returns.

### 4.2 Event closing
```
on-going ──(stage = last)──> [Ready to Close] ──button──> checking-inventory
checking-inventory: each line → Return (resolution='returned') or Transfer (to another on-going event + stage; removed here,
  queued in emi_moved_items for the target)
all lines resolved ──Finalize──> returned-completed (≥1 returned) | transferred (0 returned)
```

### 4.3 Production
```
Requested ──Start Production──> In Production ──Mark Done──> Done
Done ⇒ stockInProduced(name, qty, warehouse): catalog item created as needsSetup draft if missing;
       row += qty (ledger 'Production'); for event requests a line is added to the event
       (ownership 'IHP', fromProduction, warehouse = deploy warehouse).
Cancel allowed only while Requested.
Convert: Pending ──(event moves forward)──> Converted ⇒ fromRow −fromQty (ledger 'Convert'), new line toName×toQty
        (area 'UNASSIGNED', ownership IHC, fromConvert).
```

### 4.4 Rent / Outsource
```
stored:   Requested ──Mark Received──> Borrowed ──Mark Returned/Completed──> Returned
Rent UI:  Requested → Rented   → Returned       (+ Overdue when Borrowed and dueDate < today)
Out. UI:  Requested → Received → Completed      (+ Overdue)
Received (event record) ⇒ event line added: qty, unit, area, ownership 'Outsource', warehouseItem false,
          fromLoan | fromOutsource, loanVendor. NO stock movement. Ever.
Cancel only while Requested. Event-record actions happen in Event Detail; warehouse rentals in Rent → Rented Items.
Requests can be created only at a stage with loanItem / outsourceItem, while closing = on-going and not add-locked.
```

### 4.5 Stock opname
`Pending ──Admin Approve──> Approved (stock written)` / `──Reject──> Rejected`.

---

## 5. Business rules (reproduce exactly)

### 5.1 Stock
- R1 Stock exists only on Warehouse rows; Item.totalStock is derived. Never store totals elsewhere.
- R2 Every stock change writes a ledger entry with a reason and the user.
- R3 Stock can't go below 0 (`applyStockMovement` clamps).
- R4 Rented / outsourced items never change stock or asset value.
- R5 Item delete refused while it has stock. Row valuation follows catalog Item Value.

### 5.2 Adding items to an event (cart)
- Picker lists catalog items with stock per warehouse; the user picks **warehouse + qty**; qty is capped at that warehouse's
  stock (`min(stockHere, qty)`); same item+warehouse merges in the cart.
- Cart lines need Area (bulk assign possible), then "Save" adds lines with `stage = current stage`.
- No adding once the event reached a `stockReturn` stage (`addLocked`), or when closing ≠ on-going, or items locked.

### 5.3 Modify / delete a line
- **Modify Item:** Area / Sub Area always editable. **Qty editable only if `line.stage === current stage`**
  (added at this stage); otherwise read-only with hint. Ownership, PIC, Note read-only in the modal.
- Ownership changes via badge cycle (IHC→IHP→Outsource) and the Check Ownership dialog.
- Delete allowed only when current stage `allowDelete !== false`.

### 5.4 Stock cut / return
See §4.1. Flags per line; cut lines show "Stock cut", returned "Stock returned". **In the web prototype these are flags only
(no ledger movement yet) — backend must move stock (§10).**

### 5.5 Scan
At `scan: 'Scan'` stages lines must be scanned (QR). First scan sets `scanIn`, next `scanOut`; "Waiting Scan" tab = not scanned.
QR codes are generated per item (QR Code menu). Mobile is the natural scanner.

### 5.6 Broken items
Report on a line: `brokenQty ≤ qty`, note, reporter, date (badge "Broken item · N"). Moving forward writes it off:
`qty -= brokenQty`, `brokenWrittenOff += brokenQty`, `brokenQty = 0`. "Create Production" on a broken line pre-fills a
production request (replacement, `replacesItemId`).

### 5.7 Production
Only at `productionItem` stages. Required: item (catalog pick or quick-add), qty ≥ 1, deploy warehouse (not "Buy"),
vendor (production kind, filtered by Internal/External), area. Done ⇒ stock in (asset).

### 5.8 Convert
From a row with stock: `fromQty ≤ row stock` → `toName` (existing catalog item) × `toQty`. Stock deducted only when the event
moves to the next stage.

### 5.9 Rent / Outsource
Only at `loanItem` / `outsourceItem` stages. Required: item, qty ≥ 1, area (event) or warehouse (general), vendor of the
same kind, start, due ≥ start. Cost optional (per unit). Received ⇒ event line; Returned ⇒ back to vendor.

### 5.10 Quick-add master data from request forms
Item field = searchable catalog list (shows SKU and stock) + **"+ Add “<text>” as new item"** → full New Item form
(name pre-filled, SKU suggested, no opening stock) → saved to catalog immediately (`source` = production/rent/outsource) →
selected. Vendor field = vendors of that kind + **"+ Add … as new vendor"** → Vendor form → saved with `kinds:[kind]`.
Name/SKU uniqueness enforced.

### 5.11 Vendors
- Three menus: Production (`kinds ∋ production`, shows Internal/External), Rent (`loan`), Outsource (`outsource`)
  — no Internal/External for the last two.
- Vendor form has no "type" field: kind = the menu.
- **[RULE] Delete blocked** while active records exist: rent/outsource = status Requested or Borrowed; production = status
  ≠ Done. A vendor in several lists is "removed from this list" instead of deleted (same guard).

### 5.12 Events
- `finish ≥ start` (form error "Finish Date can't be before Start Date", Save disabled).
- Past event (last day < today) not editable. Events in Returned & Completed / Transferred are read-only.
- Event list tabs: Upcoming, On Going, Ready to Close, Checking Inventory, Returned & Completed, Transferred.
- Filters on listing: search, date range, location, etc.

### 5.13 Stock opname
Count per warehouse; lines differing or Poor are listed; Admin approves → stock written. Variance value = diff × valuation.

### 5.14 Clashes (calendar)
Booking window of an event = `min(date, start)` → `max(finish, start, date)`. Demand per day = Σ qty of owned-item lines
(exclude ownership Outsource, fromLoan, names not in catalog, events with itemCount 0, transferred events). For each item
booked by ≥ 2 events on a day: **shared** if Σ demand ≤ total stock, **shortage** otherwise (`short = demand − stock`).

---

## 6. Derived values & formulas

| # | Value | Formula |
|---|---|---|
| 6.1 | Row `minStatus` | `stokMin = 0 → 'Not Set'`; `stock ≤ min → 'Critical'`; `stock ≤ 1.5·min → 'Warning'`; else `'Safe'` |
| 6.2 | Item `stockStatus` | `total = 0 → 'Out of Stock'`; `Σmin > 0 ? total ≤ Σmin : total ≤ 10 → 'Low Stock'`; else `'Available'` |
| 6.3 | Row `totalValuation` | `valuation × itemStock` |
| 6.4 | Total Asset Value (Warehouse Inventory) | Σ `totalValuation` of all rows (rented rows excluded) |
| 6.5 | Total Asset Value (Inventory) | Σ `itemValue × totalStock` per item |
| 6.6 | Rental / outsource total | `qty × rentalCost` |
| 6.7 | Overdue | `status = Borrowed ∧ dueDate < today` |
| 6.8 | Event key | `` `${date} | ${NAME}` `` |
| 6.9 | On Going vs Upcoming | stored on-going ∧ (seed itemCount > 0 ∨ items added) |
| 6.10 | Ready to Close | on-going ∧ stage = last stage |
| 6.11 | Event past | max(finish, start, date) < today |
| 6.12 | Production value (vendor detail) | Σ Done qty × current itemValue |
| 6.13 | Inventory source filter | Produced = name has a Done production or catalog `source='production'`; Rent = warehouse rental Borrowed (virtual read-only rows); Normal = rest |

---

## 7. Screens & flows (web reference → mobile)

| Web route | Screen | Key content / actions | Mobile priority |
|---|---|---|---|
| `/login`, `/register`, `/forgot-password` | Auth | email+password | **High** |
| `/dashboard` | Dashboard | KPIs, active rentals, quick actions, recent activity | High |
| `/event` | Event list | 6 tabs (§3.13), search/filters, New/Edit (rules §5.12), Delete | **High** |
| `/event-detail?name=<eventKey>` | Event Detail | header (+ Outsource Item, Rent Item, Request Production, Add Item/cart, ⋮ Print Plan), stage stepper + Next, tabs All / Added New / Waiting Scan / Grouped / Production / Rented / Outsourced, card & list views, line drawer (detail, Modify, Report broken, Create Production, Delete), scan popup, ownership check, closing (Ready to Close → Return/Transfer → Finalize) | **Highest** |
| `/event-summary?name=` | Event Report | KPIs, by area/category/ownership, rentals, productions, clashes | Medium |
| `/event-calendar` | Event Calendar | month grid, clash chips, day panel, shortage filter | Medium |
| `/inventory`, `/inventory-detail?id=` | Items | asset value card, category multi-filter, New/Edit/Delete item | High |
| `/warehouse`, `/warehouse-detail` | Warehouses | | Low |
| `/warehouse-inventory` | Warehouse Inventory | Total Asset Value, Safe/Warning/Critical, source filter Normal/Produced/Rent, tabs Inventory / Moving Order / Opname History / Stock History | High |
| `/stock-opname` | Stock Opname | count per warehouse, conditions, submit; Admin approve | **High (mobile counting)** |
| `/stock-opname-report` | Opname report | | Low |
| `/vendor` (Production), `/rent`, `/outsource` | Vendor menus | tabs Vendors / Produced·Rented·Outsourced Items; delete guard | Medium |
| `/vendor-detail`, `/rent-vendor-detail`, `/outsource-vendor-detail` `?id=` | Vendor detail | info, items per vendor (multi-event), history | Medium |
| `/area`, `/sub-area`, `/category`, `/unit`, `/event-status` | Master data | CRUD; Event Status flags | Low (read on mobile) |
| `/qr-code` | QR codes | print item QR | Low |
| `/log`, `/users` | Activity log, users | | Low |

Key flow — **Event Detail Next stage** (mobile must implement the same dialogs in this order): ownership check (if flag)
→ broken-item warning (if any) → cut/return confirmation (if crossing such stages) → apply (§4.1).

---

## 8. Target API contract (for the real backend the mobile app should call)

Base `/api/v1`, JSON, bearer token, tenant from token. Errors: `401` auth, `403` role, `404`, `409` business-rule conflict
`{code, message, details}`, `422` validation `{fields: {name: msg}}`. Lists: `?page&pageSize&q&sort` → `{data, total}`.

| Resource | Endpoints | Notes / rule codes |
|---|---|---|
| Auth | `POST /auth/login {email,password}` → `{token,user}`; `POST /auth/register`; `POST /auth/forgot` | inactive → 403 `USER_INACTIVE` |
| Items | `GET/POST /items`, `GET/PATCH/DELETE /items/{id}` (+ `?includeStock=1`) | 422 `NAME_TAKEN`, `SKU_TAKEN`; DELETE 409 `ITEM_HAS_STOCK`; POST may carry `opening:{warehouseId,qty}` |
| Warehouses | `GET /warehouses` | |
| Stock rows | `GET /warehouse-inventory?warehouseId&status&source&q` → rows + `totalAssetValue`, `filteredAssetValue`; `PATCH /warehouse-inventory/{rowId}` (min, location, valuation) | stock not patchable directly |
| Stock movements | `POST /stock-movements {rowId|itemId+warehouseId, delta, reason, eventId?, note}`; `GET /stock-movements?itemId&warehouseId&reason&from&to` | 409 `NEGATIVE_STOCK` |
| Moving orders | `POST /moving-orders {sourceWarehouseId, destWarehouseId, lines:[{rowId,qty}]}` | atomic, 2 movements per line |
| Opname | `POST /stock-opnames {warehouseId, lines:[{rowId,counted,condition,note}]}`; `POST /stock-opnames/{id}/approve` (Admin) / `reject`; `GET /stock-opnames/report` | |
| Event statuses | `GET/PUT /event-statuses` (ordered list with flags) | |
| Events | `GET/POST /events`, `GET/PATCH/DELETE /events/{id}` | 422 `FINISH_BEFORE_START`; PATCH 409 `EVENT_PAST` |
| Event stage | `POST /events/{id}/advance {targetStage, ownershipChanges?:[{lineId,ownership}]}` → applies §4.1 server-side, returns lines + movements | 409 `STAGE_NOT_REACHABLE` |
| Event lines | `GET /events/{id}/items`; `POST /events/{id}/items [{itemId|name, warehouseId, qty, areaId, subAreaId}]` (→ `warnings` clashes); `PATCH /events/{id}/items/{lineId} {areaId, subAreaId, qty?}`; `DELETE` | 422 `QTY_LOCKED` if line stage ≠ current; 409 `ADD_LOCKED`, `DELETE_NOT_ALLOWED`; 422 `QTY_OVER_STOCK` |
| Scan | `POST /events/{id}/items/{lineId}/scan {code}` | sets scanIn then scanOut |
| Broken | `POST /events/{id}/items/{lineId}/broken {qty,note}`; `DELETE …/broken` | qty ≤ line qty |
| Ownership | `PATCH /events/{id}/items/{lineId}/ownership {ownership}` | |
| Closing | `POST /events/{id}/close` (→ checking-inventory); `POST …/items/{lineId}/return`; `POST …/items/{lineId}/transfer {targetEventId, stage}`; `POST /events/{id}/finalize` | 409 `UNRESOLVED_ITEMS` |
| Productions | `GET /productions?vendorId&status&eventId`; `POST /events/{id}/productions`, `POST /productions` (manual); `POST /productions/{id}/start`, `/done`, `DELETE` (Requested only) | done → stock movement `Production` + event line |
| Converts | `POST /events/{id}/converts {fromRowId, fromQty, toItemId, toQty}` | applied on advance |
| Rentals | `GET /rentals?type=RENT|OUTSOURCE&vendorId&status&eventId`; `POST /events/{id}/rentals`, `POST /rentals` (warehouse); `POST /rentals/{id}/receive`, `/return`, `DELETE` (Requested only) | 422 `DUE_BEFORE_START`; never moves stock |
| Vendors | `GET /vendors?kind=`, `POST /vendors {kind,…}`, `PATCH`, `DELETE /vendors/{id}?kind=` | 409 `VENDOR_HAS_ACTIVE_RECORDS {activeCount}` |
| Clashes | `GET /events/clashes?from&to`; `GET /events/{id}/clashes` | |
| Reports | `GET /events/{id}/report`, `GET /dashboard` | |
| Master data | `/areas`, `/sub-areas`, `/categories`, `/units` CRUD | |
| Activity | `GET /activity-logs` (server writes them) | |
| Users | `/users` CRUD (Admin) | |

Status enums on the wire (suggested): rental `REQUESTED|RECEIVED|RETURNED` (labels per type), production
`REQUESTED|IN_PRODUCTION|DONE`, convert `PENDING|CONVERTED`, opname `PENDING|APPROVED|REJECTED`, closing
`ON_GOING|CHECKING_INVENTORY|RETURNED_COMPLETED|TRANSFERRED`.

---

## 9. Mobile-specific guidance

1. **Primary mobile jobs:** (a) Event Detail on site — view lines by area, scan in/out (camera QR), report broken items,
   move stage with the same dialogs; (b) Stock opname counting per warehouse; (c) Rent/Outsource receive & return;
   (d) quick lookups (item stock per warehouse, event list).
2. **Offline:** queue scans, broken reports, opname counts and receive/return actions with client UUIDs; replay in order;
   the server re-validates rules (§5) and returns 409/422 → show the rule message. Never compute stock client-side as truth.
3. **Do not hard-code** stage names, areas, categories, units, vendors: fetch master data and cache.
4. **Enforce client-side** (and expect server errors for): finish ≥ start, due ≥ start, qty ≤ warehouse stock when picking,
   qty edit only for current-stage lines, no add after stock-return stage, no delete at `allowDelete=false`, no edit of past
   events, vendor delete guard, item delete guard.
5. **Labels:** use exactly Rent / Rented / Returned, Outsource / Received / Completed, Production / In Production / Done,
   ownership IHC / IHP / Outsource, badges Rented / Outsourced / Production / Converted / Stock cut / Stock returned /
   Broken item · N / Needs setup.
6. **Formatting:** id-ID numbers, `Rp` prefix, dates `09 Apr 2026` in lists, ISO in API.
7. **Quick-add** item/vendor from Rent/Outsource/Production forms (bottom sheet with the full New Item / Vendor form).
8. **Multi-event items:** the same catalog/rented item can be on several events at once; show clashes/shortage warnings
   when adding lines (from `/events/{id}/clashes`).
9. **Roles:** hide approve opname and users for non-Admin; Viewer read-only **[ASSUMPTION]**.

---

## 10. Known gaps in the web prototype (do not copy them)

| Gap | Correct behaviour for backend/mobile |
|---|---|
| Event lines live in page state (not persisted); seed regenerates | Persist lines server-side |
| Stock cut / return / broken write-off are flags only — no ledger movement | Cut = −qty from the line's source warehouse row; return = +qty (minus written-off broken) with reasons `Event cut`, `Event return`, `Broken write-off` |
| Items joined by name | Use `itemId`; keep name for display |
| Events list not persisted; Users registration in memory | Server |
| Demo `TODAY` fixed 2026-04-09 | Server date |
| Outsource costs not in Event Report / Dashboard / Search | Include `type=OUTSOURCE` totals |
| Some `updatedAt` stored as display strings | ISO 8601 |
| Viewer permissions not enforced | Enforce server-side |

---

## 11. Source-file map (web)

| Area | Files |
|---|---|
| Stores (logic) | `src/lib/stockOpnameStore.js` (rows, ledger, opname), `catalogStore.js` (items, derived stock), `producedItems.js` (`stockInProduced`), `productionRequests.js`, `eventLoans.js` (rent+outsource, `KIND_TEXT`), `vendorStore.js`, `eventStatuses.js`, `eventProgress.js`, `eventClosing.js`, `eventClosingLabels.js`, `eventItems.js`, `eventItemsFlag.js`, `movedItems.js`, `eventClashes.js`, `activityLogStore.js`, `tenantAuth.js`, `format.js` |
| Seeds | `src/data/*.js` (inventory, warehouseInventory, warehouses, areas, categories, units, events, eventStatuses, eventItemsSeed, genericEventItems, productionSeed, eventLoanSeed, vendors, stockOpnameHistory, users) |
| Key pages | `src/pages/EventDetailPage.jsx`, `EventPage.jsx`, `WarehouseInventoryPage.jsx`, `InventoryPage.jsx`, `StockOpnamePage.jsx`, `VendorPage.jsx`, `LoanVendorDetailPage.jsx`, `VendorDetailPage.jsx`, `EventStatusPage.jsx`, `EventSummaryPage.jsx`, `EventCalendarPage.jsx`, `DashboardPage.jsx` |
| Shared components | `src/components/EventLoans.jsx`, `LoanLogTab.jsx`, `ProductionLogTab.jsx`, `QuickPickers.jsx`, `ItemFormModal.jsx`, `VendorFormModal.jsx`, `SearchableSelect.jsx`, `Modal.jsx`, `PrintPlanModal.jsx` |
| Routes | `src/App.jsx`; menu `src/components/Sidebar.jsx` |
