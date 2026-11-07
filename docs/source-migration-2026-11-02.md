# Adaptive migration — emi-source commits from 2 November 2026

Source commits:

- `b1669d9e` — Add items and vendors from request forms, add Outsource module like Rent
- `545a7488` — Seed multi-event rentals, lock past events, enforce finish >= start, limit Modify Item
- `f59524c1` — Add technical system-schema PRD for the mobile app

The source is a prototype backed by local state and seed data. This migration therefore ports the product rules and UI into the existing `emi-final` API architecture; it does not copy browser-only stores, mock dates, or sample records.

## Implemented in emi-final

### Event rules

- Events whose final scheduled date is before the user's current local date can no longer be edited. The edit action is disabled and the edit handler also rejects direct attempts.
- Event Finish Date must be on or after Start Date, both through form validation and the date input minimum.
- Modify Item always allows Area/Sub Area changes.
- Modify Item permits quantity changes only when the item was added in the event's current status.
- PIC, ownership, and notes are visible but read-only in Modify Item. The update request preserves their backend values; ownership changes remain in the dedicated ownership flow.

### Quick add from request forms

- Request Production and Rent Item can search Inventory master data through `GET /v1/barang-filter` (`limit=100`, server-side search).
- A missing item can be created from the request form through the normal `POST /v1/barang` contract, then selected immediately.
- Production vendor and rent vendor dropdowns can create their respective master records through `POST /v1/vendor` and `POST /v1/loan-vendors`, then select the returned record.
- Nested modal Escape handling is guarded so an open searchable dropdown closes before its parent modal.

### Product semantics and documentation

- Production copy now states that a completed produced item becomes an owned asset.
- Rent remains temporary, must be returned, and is not treated as an owned inventory asset.
- Added the source PRDs `docs/prd/PRD-2026-11-02.md` and `docs/prd/PRD-TECHNICAL-SYSTEM-SCHEMA.md` for implementation and mobile-system reference.

## Intentionally not copied

- Source seed records for one rental shared across multiple events: `emi-final` already loads tenant data from the backend.
- Source `TODAY = 2026-04-09`: `emi-final` uses the actual local date for UI locking, while backend authorization must use server time.
- Source localStorage/catalog/vendor stores and mocked activity logs.
- The prototype Outsource module. No confirmed `emi-final` backend contract exists yet, so creating a browser-only parallel data source would cause drift from server data.

## Backend changes still needed

The following items were recorded in `emi-source/docs/backend.md`, `changes.md`, `context.md`, and `PRD-2026-11-02.md` and still require backend decisions or enforcement:

1. **Server-side past-event lock.** Reject update/delete of an event whose final scheduled date has passed. Frontend locking is only a UX guard.
2. **Date invariant.** Validate `event_end >= event_start` on create and update.
3. **Modify Item authorization.** Allow Area/Sub Area at permitted lifecycle stages; accept quantity changes only for items created at the current status; reject PIC/note/ownership mutation through this endpoint if those fields belong to dedicated flows.
4. **Outsource lifecycle contract.** Either provide dedicated outsource-order endpoints or extend rental records with a discriminator such as `type: RENT | OUTSOURCE`. Required lifecycle: Requested → Received/Active → Completed, event association, vendor, area/sub-area, quantity, dates, notes, and audit fields.
5. **Event-status flag.** Add and return a persisted `outsource_item` boolean if the Outsource action is stage-controlled, analogous to `borrow_item` and `production_item`.
6. **Vendor safety.** Vendor deletion must be refused while referenced by an active production, rent, or outsource record; historical records should retain vendor snapshots.
7. **Quick-create response.** Item and vendor create endpoints must return the newly created full record and ID so the request form can select it immediately. Current `emi-final` integrations already consume that contract.
8. **Server time and audit.** Eligibility, lifecycle timestamps, creator/updater identity, and activity history must be server-owned rather than derived from the browser.

## Validation

- `tsc --noEmit`: passed.
- `vite build` with Node 20: passed.
- Targeted ESLint command: no errors, but the current ESLint configuration ignores the TypeScript files (warnings only).
- Build retains the existing large-chunk warning; this migration does not introduce a new build failure.
