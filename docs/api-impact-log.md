# API impact log

Every change that might affect the backend API contract is recorded here: endpoints,
request payloads, field names, query params, response parsing, React Query cache keys,
or behavior the backend relies on. When a change is close to the API but does **not**
affect it, record that too, so nobody has to re-check. Newest first.

Format: date — change — endpoints/fields touched — impact — action needed by backend.

---

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
