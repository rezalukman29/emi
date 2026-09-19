# Migration from emi-source 109eb35

Source: `109eb35e136fc404ae247aa0a44db7939db27f84`, reviewed against
`emi-source/docs/changes.md` rounds 12–18, `context.md`, and `backend.md`.

## Ported UI

- Six event lifecycle tabs, lifecycle badges, completed events grouped by month.
- New events start at the first configured API stage; edits preserve their stage.
- PIC and QR type share a row; address spans the next row.
- Final-stage close confirmation, frozen closing stepper, Cross Check Items,
  Return Item & Transfer, and finalization only after every item is resolved.
- IHC/IHP/Outsource ownership badges and filtering, bulk ownership assignment
  with filter-independent selection, change preview, and one log per bulk change.
- Group Items moved to the more menu; redundant Warehouse Item indicator removed.
- Optional uppercase Event Status Code and Product Knowledge documentation.
- English and Indonesian semantic translation keys.

## Backend boundaries

Existing event, inventory, status, scan, cart, and summary API integrations remain.
Existing notes, PIC, additional code, units, and print layout remain unchanged.
Event listing still uses `/v1/event-filter`; date filtering is omitted for lifecycle
tabs because lifecycle and calendar date are independent.

The new lifecycle, ownership, cross-check, transfer, and status Code features are
**local previews**, not server inventory mutations. They persist in localStorage,
scoped to the logged-in company/user, and are identified by stable event/item IDs.
Transfers retain a local destination copy across navigation; they do not adjust
backend stock and are not included in backend summaries. Source `backend.md`
describes proposed endpoints; those endpoints are deliberately not called.

Upcoming/On Going uses API `total_items`, `item_count`, or `itemCount` if provided;
otherwise it uses the count captured when opening Event Detail. Without either,
an event starts as Upcoming. Full first-load classification requires the event
list API to provide item counts. Final-stage detection uses API status ordering.

New component is TSX and shared state is TypeScript; no JSX pages were introduced.
The pre-existing local change to `vite.config.js` was left untouched.

## Checks

Run `npx tsc --noEmit`, `npm run build`, and
`node --test tests/eventLifecycle.test.cjs` with Node 20 or newer.
