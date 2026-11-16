# Adaptive migration — emi-source commits from 11–12 November 2026

Source commits:

- `6c7ffda` — stage-aware checking/scan UX, filters, QR type, covers, photos/files, and cart warning
- `b2b8dae` — Event Status `Allow Add Item`
- `910b4cd` — Cutting Stock / Stock Return reservation flow
- `3e21595` — Event Settings rule-based redesign
- `2fb69e7` — closing flow with checking notes and partial returns
- `4bcdfee` — partial transfers, Transferred view, quick-created items, and incomplete-item reminder

`emi-source` is a browser-state prototype. This migration ports compatible product rules and UI into `emi-final` while keeping the live API as the source of truth. It deliberately does not copy mock dates, seed records, or localStorage stock/closing stores.

## Implemented or retained in emi-final

### Event Settings

- Reworked the page into grouped rules (Scanning, Stock, Item permissions, Requests), compact rule chips, an optional legend, stage pipeline, and grouped switch form.
- Added the `allow_add_item` field to the Event Status response and create/update/reorder payloads.
- Restored `stock_return` in create/update/reorder payloads; the response field was already read but previously lost when saving a status.
- Cutting Stock and Stock Return are mutually exclusive within a stage and each may be assigned to only one stage.

### Event Detail stage permissions

- Add Item is locked when `currentStatus.allow_add_item` is false.
- Rent Item, Outsource Item, and Request Production are also disabled at that stage, matching the source rule.
- Older status responses that do not yet contain `allow_add_item` remain permissive for compatibility.
- Existing API-backed rules for `allow_delete`, `check_ownership`, scan phases, production, rent, outsource, closing, transfer/finalize, item images, QR type, and inventory setup remain intact.

### Existing adaptations preserved

- Inventory and Warehouse Inventory already expose Needs Setup based on backend fields.
- Event creation already supports QR type and cover data where provided by the active API contract.
- Event Detail already has stage-aware checking/scan rendering, cart-based Add Item, quick item creation, ownership checks, closing/finalize handling, and transfer destinations.
- Stock movement, partial return, and partial transfer behavior is not reimplemented in browser storage; the frontend continues to use existing backend endpoints and response state.

## Intentionally not copied from the prototype

- localStorage stock reservations, returns, checking records, event files, and transfer queues.
- Source demo SVGs, fake event/item records, and fixed mock date.
- Client-side stock deductions or optimistic partial-return/partial-transfer quantities that the backend cannot authoritatively confirm.
- Proposed endpoint names from `emi-source/docs/backend.md` when an existing `emi-final` endpoint already owns the workflow.

## Backend changes or confirmations still needed

The following requirements come from `emi-source/docs/backend.md`, `changes.md`, `context.md`, and the 11–12 November PRDs. They must be implemented or confirmed server-side before full parity can be claimed:

1. **Allow Add Item enforcement.** Persist and return `allow_add_item` on every Event Status. Reject Add Item, Rent Item, Outsource Item, and Request Production with `409 ADD_NOT_ALLOWED_AT_STAGE` when the current stage disables it.
2. **Stock-stage enforcement.** Persist `cutting_stock` and `stock_return`, enforce one stage for each, and reject a row that enables both. Stage advancement must create idempotent, atomic reservation/return stock movements and expose reserved quantity.
3. **Closing checks and partial return.** Persist checked state, checking note, and returned quantity per event line. First return must require every line to be checked; partial returns need an authoritative `PARTIAL_RETURN` lifecycle and atomic stock movements.
4. **Partial transfer.** Support quantity, target event, and target stage in one transaction. Return the transferred quantity to the source reservation, create the target event line, and return cumulative transfer metadata.
5. **Stage-aware checking.** If `check_item` is required as a separate rule, add it to the Event Status contract. Checking and scan endpoints must validate the event's current stage instead of trusting the UI.
6. **Files and images.** Event-file upload/list/delete and item/event image upload need server-owned URLs, size limits, tenant authorization, and audit metadata.
7. **Draft/incomplete inventory.** Quick-created event items need stable item IDs plus `needs_setup`, a server-filterable incomplete count, and a completion rule for category, unit, and item value.
8. **Concurrency and audit.** Stage changes, stock moves, returns, transfers, and finalization must be transactional, idempotent, tenant-scoped, and written to the activity ledger by the server.

## Validation

- Locale JSON parse: passed.
- `git diff --check`: passed.
- `tsc --noEmit` with Node 20: passed.
- Production build with Node 20: passed.
- Global ESLint still reports the repository's existing unused-variable errors in `PrintPlanModal.jsx`, `AreaDetailPage.jsx`, and `AreaPage.jsx`; no new build/type failure is introduced by this migration.
- The existing unrelated `vite.config.js` working-tree change was preserved.
