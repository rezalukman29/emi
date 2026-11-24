# AI hand-off log

Running log for AI agents (any model) so work can continue safely after a hand-off.
Standing rules are in [`/CLAUDE.md`](../CLAUDE.md). Newest entry first.
Each entry: what changed, files, why, state left behind, open items.

---

## 2026-11-24 — 3 Star v3 (second review)

- `Handling.fp` = JSON of the suggestion params when handled; `analyzeEvent` treats a handling with a different fp as
  open and sets `changedSinceHandled`. Risks need a note to be marked done (`dismissing.mode = 'done'`).
- `action: 'rent'` on chairsShort / tablesShort / stockClash → panel `onRent` (EventDetail passes `setBorrowOpen(true)`
  when `loanEnabled && !addLocked`). AI checklist tasks carry activity detail `ai:<taskKey>` for de-duplication.
- Checks: build OK, tsc 0, lint 12/1, tests 38/40; Playwright: rent action shown, risk done needs note, tile
  "1 confirmed by the team", guests 200→260 reopens chairs (110 short), re-adding checklist in Indonesian adds 0.

## 2026-11-24 — 3 Star v2 (UX roast fixes)

- Store `emi.threeStar.v1` now also has `scores` (per event `{earned, risks, open, at}`, written by the panel) and
  `pendingBriefs` (keyed `pendingBriefKey(name, start)`, claimed in EventDetail by `claimPendingBrief`); `handled` values
  are `Handling {state, reason?, by, at}` (old string values are migrated on load).
- `analyzeEvent(..., handled)` marks suggestions with `handled` and scores only unhandled ones; brief star also passes
  when `brief-missing` was handled. Suggestions carry `itemName` (grouping) and `altSearch` ("kayu").
- Panel: setup mode when no brief; groups per item; `Alternatives` reads `/v2/barang-gudang/detail?search=` (reuse) and
  filters by the word client-side; dismiss needs a reason; checklist due ≥ today; `onOpenItems(name)` sets the Items
  keyword search. EventPage: optional brief section (`BriefFields`), `.event-card-stars`, `.event-star-filter`.
- **Checks:** build OK, tsc 0, lint 12/1, tests 38/40. Playwright (mock): setup mode → after brief 2/3 (was 1→0 before),
  handling all suggestions → 3/3 "Nothing to fix"; item link filters Items; no overdue AI tasks; card stars + filter;
  form brief section; off state; 390 px no sideways scroll; no page errors.

## 2026-11-24 — AI Tools hub + 3 Star Protection (mock)

- **Engine:** `analyzeEvent(event, items, brief, settings, today, clashes)` in `src/lib/threeStar.ts` returns stars,
  suggestions `{id, star, severity, key, params, action}` (texts in `threeStar.sug.<key>.title/detail`) and checklist
  task keys (`threeStar.tasks.*`). Keyword KB (`KB`) for round tables, chairs, glass, fabric, lights, flowers, wood,
  stage, electronics (ID + EN words). Store `useThreeStar()` (localStorage `emi.threeStar.v1`: settings, briefs, handled).
- **UI:** `ThreeStarPanel` (Event Detail `?view=stars`), `StarRow`, `STAR_ICON`; `AiToolsPage` `/ai-tools`;
  `ThreeStarSettingsPage` `/ai/three-star`. Sidebar renders section "AI Tools" as `.sidebar-ai-card` unless the menu
  search is active. Tab hidden for non-admins when audience = admins.
- **Checklist hand-off:** adds group "3 Star · AI" (order 0) with tasks into `checklistStore`; re-running only adds
  missing titles.
- **Checks:** build OK, tsc 0, lint 12/1 baseline. Playwright (mock): sidebar card, hub → settings, brief filled
  (outdoor, grass, no rain plan, no power, 200 guests) → 12 suggestions incl. round table on grass, chairs short,
  setup 3 h; checklist added; turning off shows the off state; 390 px no sideways scroll; no page errors.
- **Open:** advisory only vs blocking (PRD §5b question); real LLM + item material fields.

## 2026-11-24 — Rental model + clash hints in Add Items

- **Rule to remember:** EMI inventory is LENT. Add to event → out; return → stock back; availability = by dates
  (shelf now + returns due before the event − overlapping bookings). Never treat it like a sales inventory.
- **Code:** EventDetailPage computes `clashesByItem` from `useGetEventCalendarClashes(start month)` and `(end month)`,
  filtered to clashes overlapping `event_start..event_end`; `clashNote(barangId)` renders `.inv-clash` in A and B rows;
  `.inv-avail-note` above the list. Hook now `enabled: Boolean(month)`.
- **Assumption:** `clash.item_id` = `barang_id` (same id space as `/v2/barang-gudang/detail`). Verify on staging data
  with a real clash.
- **Checks:** build OK, tsc 0, lint 12/1 baseline; Playwright mocked clash on item 103 shows pill in A and B, note with
  count; no page errors. Staging had no clashes in Nov 2026, so not seen with real data.
- **Needs API:** `docs/api-backlog.md` §11.

## 2026-11-23 — PRD refresh (docs only)

- `docs/prd/PRD-2026-11-23.md` is now the current product PRD; older PRDs point to it. Technical schema PRD got a
  banner: it documents the old localStorage prototype; business rules in its §0 / §3.11 still hold.
- Open business questions were sent to the owner (roles, lifecycle meanings, over-stock adding, delete with items,
  checklist stage gate / notifications, A/B winners). Record answers in the PRD (§9) and remove the [QUESTION] marks.
- No code change; checks not needed beyond a build sanity run.

## 2026-11-23 — Event Checklist v2 (groups, assign, proof, e-mail, untick log, filter) + docs

- **Sync check:** `origin/daniel-staging-web` still `e9fe796`, `main` unchanged (previous patches not pushed yet).
  Branch `add-items-b`, new commit on top of the Add Items commit.
- **Model:** `src/data/eventChecklistMock.ts` now only types + sample template groups. Store
  (`src/lib/checklistStore.ts`) v2: key `emi.checklist.v2`, state `templateGroups, templates, groups, items,
  signOffs, outbox, nextId, templatesSeeded`. `seedTemplates()` / `ensureEventChecklist(event)` no longer take
  stages; `summarizeEvent(eventId, items, today, me?)` → `blocking` = required open (all groups), `mine`.
  `isMine(item, {id,name})` compares `assigneeId` with `currentUserId()` (auth `id`), name as fallback.
- **Panel:** `EventChecklistPanel` (no `stages` prop): filter `all|todo|done` + mine; groups CRUD/reorder;
  add-task form with Options (SearchableSelect of users, date, flags); `quickToggle` opens `CompleteTaskModal`
  when `needsForm`; `setStatus` logs `unchecked` on untick and calls `queueAdminEmail` on done (outbox + toast +
  `emailQueued` activity). Drawer gained assignee / group / due / requirement flags (`onAssign`, `onEdit`).
- **Settings:** `notifyAdmins {enabled, when}`; `signOff.requiredBeforeNextStage` removed (groups ≠ stages).
  Settings page shows recipients and the outbox. Admins/users from `useChecklistUsers()` (`/v1/get-all-user`).
- **i18n:** removed `eventChecklist.scope*`, `hideDone`, `current`, `*InStage`, `noStages`, `stageUnknown`,
  `currentStage`, `photoRequired`, `checklistSettings.signOff.gate*`; added `filter.*`, `assign.*`, `groups.*`,
  `complete.*`, `email.*`, activity `unchecked/assigned/edited/emailQueued`, `notifyAdmins.*`.
- **Docs:** new `docs/api-backlog.md` and `docs/ui-changes.md` (owner asked for both); `CLAUDE.md` table lists them.
- **Checks:** build OK, tsc 0, lint 12/1 (baseline), node tests 38/40 (same 2). Playwright (mocked API incl.
  users): 4 sample groups; report-required task refuses empty report then ticks; photo-required task ticks after
  upload; toast "E-mail to 2 admins queued"; untick logged; assign → history; Done filter shows 1 row; new group
  + task with assignee/flags; settings outbox lists 2 e-mails; Event Detail checklist tab same groups; 390 px no
  sideways scroll; no page errors. Not tested on a real phone.
- **Open:** owner to decide whether required tasks should block a stage change (needs an optional group→stage
  link); e-mail template/sender; whether assignees should be notified.

## 2026-11-23 — Add Items A/B + stock tabs + default warehouse, responsive pass

- **Sync check:** origin `daniel-staging-web` still `e9fe796` (previous patches not pushed yet); `main` unchanged.
  Branch `add-items-b` on top of `f71553f`. Owner gets a combined patch (5 commits) and a this-commit-only patch.
- **A/B scopes:** `useUiVariant(scope)` / `setUiVariant(next, scope)`; scopes `eventDetail` (key
  `emi.ui.variant.v1`, unchanged) and `addItems` (`emi.ui.variant.addItems.v1`). `VariantSwitcher` takes
  `rows: {scope,label}[]`; default position bottom-left. Add a scope there for the next A/B test.
- **Picker (EventDetailPage):** module helpers `itemHasStock`, `defaultItemWarehouse`, `PICKER_MIN_ROWS` (12),
  `PICKER_AUTO_PAGES` (6). `pickerMatched` (search) → `pickerFiltered` (stock tab); `pickerStockCounts`;
  effect auto-fetches next pages while the tab shows < 12 rows (max 6 auto pages per tab/search change);
  `cartQtyByBarang`; state `pickerStock`, `pickPane`, `isAddB`. `getSelectedItemWarehouse` falls back to
  `defaultItemWarehouse`. B rows are a separate JSX branch inside the same map (same setters /
  `addInventoryItem`). Rent / Request Production from an out-of-stock row first closes the picker
  (those modals render earlier in the DOM, so they would sit under it); `cart` is not reset by closing.
- **Responsive:** `sourceResponsive.css` end block; `EventPage` tab bar got class `event-tab-bar`.
  Audit script: every route at 390/768, page-level `scrollWidth > clientWidth` → none. Pages
  `/warehouse-detail`, `/inventory-report`, `/upgrade` threw with the generic mock (mock shape, not checked
  against the real API) so they were not fully rendered in the audit.
- **Checks:** build OK, tsc 0, lint 12/1, node tests 38/40 (same 2). Playwright: A and B tabs Available 4 /
  Out of Stock 3; default warehouse = Gudang Bali (12) over Gudang Utama (4); B stepper 3 → "3 in cart",
  cart "3 pcs" + area warning; out-of-stock actions Rent Item / Request Production; phone Browse/Cart switch;
  dark OK; previous Event Detail / Events / History tests still pass; no page errors.
- **API impact:** none (reuse of `/v2/barang-gudang/detail`). Optional: a stock filter param for exact tab counts.

## 2026-11-23 — B v3, Events tab memory, delete-by-name, Event History preview

- **Sync check:** `origin/daniel-staging-web` still `e9fe796`, `main` unchanged. Local branch `event-ux-v3`
  on top of the two unpushed A/B commits (`845901d`, `64c6cb4`); owner gets one combined patch.
- **B v3 (EventDetailPage):** card children wrapped in `.ed-b-hero` / `.ed-b-body` for B and `.ed-contents`
  (`display: contents`) for A, so A's layout is unchanged. New B-only JSX: `.ed-b-meta` (date range from
  `event_start`/`event_end`, `address`, `PIC`, `event_code`), `.ed-b-stage-label`, `.ed-b-hint` (`bNextHint`
  from `stageScanEnabled`/`unscannedCount`/`hasNextStage`), `.ed-b-stats` (`bStats`; checked count replaces
  scanned-in while `backendCheckingEvent`). CSS grid puts the next-stage buttons on the right of the stage panel.
  ⋯ menu got **History** (A and B).
- **EventPage:** `activeTab` initialised from `?tab=` → sessionStorage `emi.event.tab.v1` → `upcoming`, and
  written back to both (URL with `replace`). Delete modal: `delNeedsTyping` unless `total_items` is known and 0;
  `deleteConfirmed` gates the button, Enter and `confirmDelete`. History icons navigate to `/event-history`.
- **EventHistoryPage:** route `event-history`; reads `/v1/event/{id}` + `/v1/event-status/get-all` (read-only),
  builds entries with `buildEventHistory()` (seeded by event id, so stable). Contract in
  `eventHistoryContract.ts` (`GET /v1/event/{id}/activity`).
- **Wording check:** the delete warning does not claim what the backend does with the items (unknown).
- **Checks:** build OK, tsc 0, lint 12/1, node tests 38/40 (same 2). Playwright (mocked API): tab
  `on-going` → open event → Back to Events → `/event?tab=on-going` with On Going active; delete of an event
  with 5 items shows the name box and stays disabled until "event b" is typed; 0 items → simple confirm;
  History icon → `/event-history?id=1`, 17 entries, type filter works; B v3 desktop/dark/390 px OK; A/B
  switcher checks unchanged; no page errors.
- **Open:** Event History needs the backend activity log (Needs API).

## 2026-11-22 — Event Detail layout B v2 (simpler)

- **Owner:** "B is still too complicated, improve it." Follow-up commit on `ab-version` (first B commit not
  pushed yet; owner gets a combined patch plus a v2-only patch).
- **EventDetailPage:** Request ▾ dropdown and Files icon removed from the header; in B those entries are the
  first group of the existing ⋯ menu (same setters). `requestMenu*` state replaced by `filterOpen`/`filterRef`
  (click-outside ignores `.ss-menu`, because SearchableSelect renders its menu in a portal). Area/ownership
  selects and the view toggle extracted to `areaSelect`, `ownershipSelect`, `viewToggle` consts (A renders them
  where it did); `activeFilterCount` = area + applied ownership. B refresh icon → *Refresh items* inside the
  popover. `ItemCard` calls `useUiVariant()`: B renders `.ed-b-progress` pills instead of indicator/scan rows
  and hides an empty PIC line.
- **CSS (`src/edLayoutB.css`):** continuous stage bar, popover, pills, `.stage-tabs-row:has(.stage-tab:only-child)`
  hidden, `.summary-text` hidden in B.
- **i18n:** `edB.files|filter|area|ownership|clear` (en/id).
- **Checks:** build OK, tsc 0, lint 12/1, node tests 38/40 (same 2). Playwright: header = Add Item + ⋯;
  ⋯ lists Outsource/Rent/Request Production/Files first and Outsource opens its modal; picking an area keeps
  the popover open and shows "Filter 1"; outside click closes it; switcher/drag/staff checks unchanged;
  dark + 390 px OK; no page errors.

## 2026-11-22 — Event Detail layout B + floating A/B switcher

- **Base:** `origin/daniel-staging-web` `e9fe796` (owner pushed patches 0001–0007). Local branch `ab-version`.
- **Owner asked:** floating draggable switcher to test version A/B, and a cleaner B for Event Detail with
  every feature kept ("think as head of design").
- **Pattern (reuse for other pages):** `useUiVariant()` from `src/lib/uiVariant.ts` (localStorage
  `emi.ui.variant.v1`, `useSyncExternalStore`, cross-tab `storage` sync). In the page: `const isB = useUiVariant() === 'B'`,
  add a scope class (`ed-b`) and put B-only CSS in a scoped file (`src/edLayoutB.css`, imported in `main.jsx`
  before `theme-dark.css`). Keep JSX branches minimal (`{!isB && …}`) so A is untouched.
  `<VariantSwitcher label="…" />` is mounted in `Layout.tsx` for admins on `/event-detail`; extend that
  condition for more pages. Switcher keys: `emi.ui.variantSwitcher.pos.v1`, `emi.ui.variantSwitcher.hidden.v1`
  (`?ab=1` un-hides).
- **EventDetailPage B changes:** `requestMenuOpen`/`requestMenuRef` (Request ▾ dropdown calling the same
  setters as A's buttons), Files icon button, ownership `onChange` also sets `appliedOwnershipFilter`,
  refresh icon → `refetchEventItems()`, zero-count stage chips hidden in B.
- **Checks:** build OK, tsc 0, lint 12/1, node tests 38/40 (same 2). Playwright (mocked API): B header =
  Request / Files / Add Item / ⋯; Request menu opens each modal; switcher toggles live; drag persists after
  reload; staff do not see the switcher; dark + 390 px screenshots OK; no page errors.
- **API impact:** none. **Open:** owner to pick A or B after testing; then remove the losing branch + switcher.

## 2026-11-22 — Event Detail menu/print chooser, item drawer, PIC users, assistant hidden

- **Sync check:** origin still `a25b133`; main nothing new. Patch 0007 on top of local `9be82db`.
- **Owner asked 6 things:** (1) rich text editor for Description and Note → **stopped** (changes the content
  format of existing API fields; mobile, cards, print and summary would show raw HTML; needs sanitising and a
  new dependency) — waiting for the owner; (2) PIC from users → `useGetUsers` (`/v1/get-all-user`, limit 100,
  server search via `SearchableSelect.onSearchChange`), value = fullname (string, same field); fallback
  `TextInput` on error; (3) "⋯" menu rebuilt (icons, `white-space: nowrap`, separators `.more-menu-sep`),
  `printChooserOpen` modal (Print Plan → `setPrintPlanOpen`, This page → `window.print()` after the modal
  closes); Request Production icon; (4) drawer rebuilt with `.idr-*` classes; (5) `SHOW_ASSISTANT = false`;
  (6) drawer footer = Remove + Go to item detail (`/inventory-detail?id=barangId`, hidden when no barangId);
  other actions in `drawerMenuOpen` dropdown (`.idr-more-menu`, opens upwards) — **not removed**, since
  Modify / Report broken have no other entry point.
- **Checks:** build OK, tsc 0, lint 12/1, node tests 38/40 (same 2). Playwright: menu entries all 32 px high
  (one line); chooser shows Print Plan / This page; drawer footer Remove · ⋯ · Go to item detail, ⋯ = Modify
  item, Report broken item; Go to item → /inventory-detail?id=77 renders; PIC lists users and selects
  "Anto Wijaya"; no chatbot; 390px drawer OK; no page errors.
- **Mock gotcha:** `/inventory-detail` needs arrays from `/v1/kategori-barang-all` and `/v1/satuan`, and
  `/v1/barang/{id}` as an object.
- **API impact:** none (rich text = decision pending).

## 2026-11-22 — Event list: clickable cards, Overdue chip, tooltips, Events default-open

- **Sync check:** origin still `a25b133`, main nothing new. Patch 0006 on top of local `d569d55`.
- **Owner asked (4 items):** (1) one group open by default, e.g. Events → `DEFAULT_OPEN` in Sidebar.tsx;
  (2) click the whole card → `cardOpenProps()` on `EventCard` and `PastEventRow` (ignores clicks inside
  button/a/input/label; role=link, tabIndex 0, Enter/Space); (3) "past finish date → overdue": the **tab**
  needs the server lifecycle (stopped, logged as Needs API); built only the chip `EventDateChip`
  (`isEventPast` → Overdue · days since `eventLastDate`; started-not-finished → In progress; else the old
  `CountdownChip`); (4) tooltips: CSS-only `[data-tip]::after` in `eventUpgrade.css`, titles replaced
  by `data-tip` + `aria-label`; edit uses `aria-disabled` (a `disabled` button gets no hover; `openEdit`
  already refuses past events with a toast). Faded state is on the svg, not the button (opacity would
  fade the tooltip). Removed `overflow: hidden` from `EventCard` (clipped tooltips); `.event-card-cover`
  has its own top radius.
- **Pre-existing, not changed:** `CountdownChip` strings ("Today!", "Tomorrow", "Nd away") are hard-coded
  English; the History icon has no action.
- **Checks:** build OK, tsc 0, lint 12/1, node tests 38/40 (same 2). Playwright: Events open on /dashboard;
  chips Overdue · 1108d / Overdue · 454d / In progress / 9d away; edit tooltip visible (opacity 1),
  forced click → toast, no navigation; Summary icon → /event-summary; card body → /event-detail?id=2;
  row Enter → /event-detail?id=9; no page errors. Playwright refuses normal clicks on aria-disabled → use force.
- **API impact:** none (Overdue tab = Needs API).

## 2026-11-22 — Sidebar: foldable groups + nested menus

- **Sync check:** origin `daniel-staging-web` still `a25b133` (owner has not pushed patches 0001–0004);
  main nothing new. This is patch 0005 on top of local `7b52bb5`.
- **Owner:** "sidebar … nested menu if possible so it is not so crowded". UI only, no API.
- **Sidebar.tsx:** entries are `NavLeaf {to,label,icon}` or `NavParent {key,label,icon,children}`.
  Parents: `vendors` (Production/Rent/Outsource in Master Data), `event-settings` (`SETTINGS_PARENT()`,
  admin only, appended to Events). Feature filtering runs per leaf; an empty parent is dropped.
  Open state `Record<key,bool>` in `localStorage['emi.sidebar.open.v1']`; default = open if it holds the
  current route (`isOnRoute`: equal, `to/…` or `to-…`, so `/event-detail` counts as `/event`); a
  `pathname` effect re-opens a group/parent explicitly closed when you navigate into it; search forces
  open. Enter in search goes to the first leaf.
- **Checks:** build OK, tsc 0, lint baseline 12/1. Playwright: first visit only the active group open
  (3 visible rows on /dashboard); open/close persists after reload; /loan re-opens Master Data + Vendors
  with Rent active; search "outs" → Outsource, Enter → /outsource; "settings" → both settings links;
  Staff sees no Settings parent; dark + 390px slide-over OK; no page errors.
- **API impact:** none.

## 2026-11-20 — Event Checklist reachable from Event Detail (mock store) + stage race fix

- **Owner:** "event checklist ok outside, but it must also be in every event / accessible from event
  detail". Needed the checklist API (not built) → asked first; owner chose **mock data for now**.
- **Store:** `src/lib/checklistStore.ts` — module store + `useSyncExternalStore`, persisted to
  `localStorage['emi.checklist.v1']` (`{version, templates, items, signOffs, nextId, templatesSeeded}`),
  `storage` event sync between tabs, `storageFull` flag on quota errors. `seedTemplates(stages)` copies
  the sample templates (`eventChecklistMock.ts`) onto the real stages once (name match → partial name →
  relative position). `ensureEventChecklist(event, stages)` copies templates for an event the first time
  (status open, due from the event start). Photos are downscaled JPEG data URLs (`photoToDataUrl`).
  `INITIAL_EVENTS / INITIAL_ITEMS / INITIAL_SIGNOFFS` in the mock file are no longer used.
- **UI:** `EventChecklistPanel` (moved out of the page; mount with `key={event.id}`) is used by the
  overview page (right side) and by Event Detail (`?view=checklist`, switch `.ed-view-switch` inserted
  before the item toolbar; the item area is wrapped in `detailView === 'items'`). Overview list = real
  events from `/v2/event-filter` for 4 lifecycles (limit 100 each), `?event=<id>` selects one.
- **Stage race (pre-existing):** the current-status effect in `EventDetailPage` ran when statuses were
  present but `eventDetail` was not yet, fell back to the first stage and locked (`currentStatusId !== null`).
  Reproduced with a 400 ms slower `/v1/event/{id}`; fixed with `!eventDetail` in the guard.
- **Checks:** build OK, tsc 0, lint baseline 12/1, node tests 38/40 (same 2 pre-existing). Playwright
  (mocked API): overview lists real events; tick a task → *Open in event* → same task ticked, 1/15 in the
  switch, survives reload; Items view unchanged; *All checklists* returns with the event selected;
  templates on the 7 real stages; 390px dark OK; stage shows step 2 with the slow detail response.
- **Mock gotcha:** Event Detail needs arrays from `/v2/package`, `/v3/production-requests`,
  `/v1/events/{id}/borrowed-items|outsource-items`, `/v1/kategori-barang-all`, `/v1/event-files`, and
  items need `sub_list_id`, `is_checking`, `is_ware_house_item` as `{…, Valid}` objects.
- **API impact:** none (checklist still needs its backend — see api-impact-log).

## 2026-11-20 — Event Calendar filters + "stop when it needs the API" rule

- **Sync check:** origin `a25b133` (owner has not pushed the two patches yet); main nothing new.
- **Owner asked:** features for Event Calendar, "make sure there is a filter"; and a standing rule:
  if a request needs the API, stop and tell the owner first, and write it down for the devs.
  Rule added to `CLAUDE.md` (also in the `tendersystem` repo's CLAUDE.md).
- **API check first:** `/v1/event-calendar` returns per event only `id, name, location, booking_from,
  booking_to`; `/clashes` returns item rows (item, from/to, demand, stock, shortage, events). So
  search / location / events / items / only-with-clashes / shortages are client-side; stage, lifecycle,
  PIC, warehouse, category filters need API fields → **not built**, logged as "Needs API".
- **Code:** `src/lib/calendarFilters.ts` — `filterCalendar(days, clashes, filters, month)` returns kept
  event ids, kept clash rows, events per day, distinct clash/short items per day (expanded from row
  from/to within the month) and a summary. Search rule: if the text matches an item name, only those
  item rows are kept; otherwise rows of the matched events. Page uses server numbers when no filter
  is active (`isFiltering`), local numbers otherwise. Drawer reuses `Drawer` + `SearchableSelect multiple`
  + `.event-list-filter` button like the Event page; all strings i18n (en + id).
- **Tests:** `tests/calendarFilters.test.cjs` (6, pass). `node --test tests/*.test.cjs` = 38/40; the 2 failures
  are pre-existing on `a25b133` (checked in a clean worktree). vm-context objects need a JSON copy
  before `deepStrictEqual`.
- **Checks:** build OK, tsc 0, lint baseline 12/1. Playwright (mocked calendar API, 5 events, 3 clash rows):
  defaults match server numbers; Location Bali → 2/2/2/1; search "led par" → 1 clash row; dark + 390px OK.
- **API impact:** none (see api-impact-log for the "Needs API" list).

## 2026-11-20 — Port from emi-source (Event list) + dark-mode inline colour fixes

- **Sync check:** `daniel-staging-web` = `a25b133` + local dark-mode commit (owner applying the patch);
  main nothing new.
- **Source:** `sandmanzz/emi` = emi-source (found by code search; read-only clone, owner confirmed).
  Unported after the 11–12 Nov migration: `53aaf50` (Round 44) and two docs-only commits. Owner sent a
  screenshot of the emi-source Event page.
- **Done:** `EventPage.tsx` — `eventCoverSrc()` + `EventCardCover` (cover from optional `images`/`image`/
  `cover_url`, tolerant parsing, hides on error), card `overflow: hidden`, item-count badge from
  `total_items`; `.event-card-cover` in `eventUpgrade.css`; i18n `lifecycle.checking-inventory` →
  "Ready for Checking"/"Siap Diperiksa" (+ `prdBody`).
- **Dark-mode follow-up:** inline `#fff`/greys in `EventPage`, `InventoryPage`, `WarehousePage`,
  `WarehouseInventoryPage`, `EventDetailPage`, `Loading.tsx`, `AiMaterialAnalyzerPage` → `var(--white)` or
  `var(--dk-…, <original>)`; the `--dk-*` vars exist only in `theme-dark.css` (dark), so light mode is
  pixel-identical. Pattern documented in `CLAUDE.md`.
- **Round 44 review + what needs backend:** `docs/source-migration-53aaf50.md`.
- **Checks:** build OK, tsc 0, lint baseline 12/1. Playwright with mocked `/v2/event-filter` (6 events:
  2 valid covers, 1 invalid image string, counts 0–174) in light and dark; no page errors.
  Note: the generic mock must return an **array** for `/v1/location` or `/event` crashes in the mock.
- **API impact:** response parsing only (reads optional `images`, `total_items`) — see api-impact-log.

## 2026-11-20 — Light / dark mode (tenant app)

- **Sync check:** fetched `daniel-staging-web` + `main`; local = origin `a25b133`, main has
  nothing new.
- **Why:** owner asked to bring the mobile app's light/dark mode (built today in the
  `tendersystem` repo, branch `daniel-staging`, React Native) to the web as today's update.
  There is no general Settings page on the web, so the switcher sits in the header next to
  the language switcher (the existing place for per-user preferences). Options and default
  match mobile: Light / Dark / System, default Light.
- **How it works:**
  - `index.html` sets `html[data-theme]` before first paint from `localStorage['emi.theme.v1']`.
  - `src/lib/theme.ts`: module store + `useTheme()` (`useSyncExternalStore`), writes the
    attribute, listens to `prefers-color-scheme` (only while "system") and `storage` (other tabs).
    Imported in `main.jsx`.
  - `src/theme-dark.css` (imported last in `main.jsx`): `:root[data-theme="dark"]` token
    values copied from `.sa-theme`, wrapped in `@media screen` so print stays light; then
    ~80 selector fixes for hard-coded light colours found by scanning all CSS files
    (`#fff` surfaces → `var(--white)`, grey hovers → white alpha, tints → `--*-bg`, solid
    buttons with white text keep the light-mode 600 shades for contrast).
  - `ThemeSwitcher.tsx` reuses the `.lang-switcher*` dropdown classes + `.theme-switcher-*`
    (end of `style.css`).
- **Not covered:** `Login.tsx` (24 inline colours; stays light, readable), inline hex in
  `AiMaterialAnalyzerPage`, `InventoryPage`, `EventPage`, `PrintPlanModal` (print) — checked
  the analyzer and event pages in dark, they read fine with empty data. Pages were checked
  with mocked **empty** API data; tables with rows, modals and drawers with real data still
  need a look in dark mode.
- **Gotcha:** `src/index.css` (Vite template leftovers, pulled in by `Loading.tsx`) has its
  own `prefers-color-scheme: dark` block and `color-scheme: light dark`. Checked: with OS dark
  and theme Light, the app still renders light. Not touched; candidate for cleanup.
- **Checks:** `npm run build` OK, `npx tsc --noEmit -p .` 0 errors, lint at baseline 12/1.
  Playwright: pick Dark from the menu → applied + saved, survives reload; System follows
  OS dark/light live; print media → body white/dark text; screenshots in dark at 1440px
  (Event Checklist, Event Settings, Dashboard, Calendar, Inventory, Loan, Material Analyzer,
  Event) and 390px (Event Checklist, Event Settings); Owner panel unaffected.
- **API impact:** none.

## 2026-11-20 — Sidebar redesign (minimal)

- **Sync check:** main had nothing new; branch still 2 commits ahead of origin (owner has not
  pushed the build-info + checklist v2 patch yet).
- **CSS (`src/style.css`, SIDEBAR block + `.sidebar-search*` + `.sidebar-footer`/build-info block):**
  width 240px, padding on the sidebar (10px) instead of on items; no divider lines between
  sections (14px spacing instead); nav items are rounded pills (8px radius, 7px 10px),
  weight 500; icons 16px in `--text-muted`, brand color when active; active = `--brand-bg`
  background without the old left border; hover = `--bg`; focus-visible outline; long labels
  ellipsis; thin scrollbar that only shows on hover. Search is a borderless filled pill.
  Footer: Owner Panel is now a `.nav-item` (muted); build info is one small card
  (`--bg`, radius 8px) with version on top (+ label on the right in the owner panel).
  Only design tokens are used, so the dark `.sa-theme` works without changes.
- **`Sidebar.tsx`:** Event Calendar, Event Report and Stock Opname Report used text glyphs
  (▦ ▤) as icons — replaced with SVGs like the other items. Owner link gets `nav-item`.
- **`BuildInfo.tsx`:** version + optional label in one row (`.sidebar-version-top`).
- **API impact:** none. **Checks:** build OK, tsc 0, lint baseline 12/1; screenshots tenant
  desktop, owner (dark), mobile slide-over.

## 2026-11-20 — Event Checklist v2: field features + Checklist Settings

- **Sync check:** fetched `daniel-staging-web` + `main`; main had nothing new. Local branch was
  1 commit ahead (build-info commit `5715e8b`, not pushed yet by the owner) — this work sits on top.
- **Why:** owner asked to "roast" the checklist for field use (photos, sign-off) and to make every
  feature controllable from a settings menu. Roast table + open items: `docs/prd/event-checklist.md` (Round 2).
- **New files:**
  - `src/lib/checklistSettings.ts` — settings type, defaults, store (`useSyncExternalStore`,
    persisted to `localStorage` key `emi.checklistSettings.v1`, wrapped in try/catch).
  - `src/lib/tenantUser.ts` — `isTenantAdminUser()`, `currentUserName()` from `localStorage.auth`.
  - `src/pages/EventChecklistSettingsPage.tsx` — `/event-checklist-settings`, admin only, grouped
    switches, sticky save bar (Save / Discard), reset to defaults.
  - `src/components/checklist/ChecklistItemDrawer.tsx` — task view (status picker, photos with
    lightbox, note, history); validation: Done needs a photo when `requiresPhoto`; N/A / Issue need a note.
  - `src/components/checklist/SignOffModal.tsx` + `SignaturePad.tsx` (pointer events, PNG data URL).
- **Changed:** `EventChecklistPage.tsx` (statuses, photos, notes, sign-off, lock, settings-driven
  UI, Settings link for admins), `src/data/eventChecklistMock.ts` (status/photos/notes/activity,
  `requiresPhoto` on templates, `INITIAL_SIGNOFFS`, placeholder photo + signature SVGs),
  `src/eventChecklist.css`, `Sidebar.tsx` (admin-only "Checklist Settings" under Events),
  `App.tsx` (route), i18n `eventChecklist.*` + `checklistSettings.*` + nav key (en + id),
  `src/hooks/api/eventChecklistContract.ts` (statuses, photos, activity, sign-offs, settings).
- **Rules implemented in the UI** (must be mirrored by the backend): resolved = done | na;
  sign-off only when required items are resolved and no Issue is open; lock after sign-off;
  admin reopen removes all sign-offs of that stage.
- **Checks:** build OK, `tsc` 0 errors, lint at baseline 12/1, no page errors. Playwright flow
  tested: Issue without note blocked → with note OK; quick tick on photo-required task opens the
  drawer; upload photo → Done; sign-off with drawn signature → stage locked; settings saved
  (signer = both); mobile drawer.
- **API impact:** new endpoints/fields only (see `docs/api-impact-log.md`).

## 2026-11-20 — Build info in the sidebars + "sync with main first" rule

- **Sync check done before this change:** `origin/main` (783b3d5, 3 "first init" commits)
  is fully contained in `daniel-staging-web` → nothing to merge.
- **New standing rule** (owner's request) in `CLAUDE.md` → "Team flow": at the start of
  every task fetch + pull `daniel-staging-web` and merge `origin/main` if it has commits
  the branch lacks.
- **Build info:** `vite.config.js` defines `__BUILD_INFO__` (Vercel `VERCEL_GIT_COMMIT_REF/
  SHA/MESSAGE/AUTHOR_LOGIN` first, then local `git`, then `unknown`; commit date only from
  git, otherwise the build time is shown as "built …"). `src/components/BuildInfo.tsx`
  renders version, branch, short commit and date (full details in the hover tooltip);
  used by `Sidebar.tsx` and `SuperAdminSidebar.jsx`. Type: `src/types/build-info.d.ts`.
  i18n `buildInfo.*` in en + id. CSS: `.sidebar-build-*` in `src/style.css`.
  `vite.config.js` imports `process` from `node:process` (ESLint `no-undef` otherwise).
- **Note:** the info is the commit at **build time**; a deploy shows the commit it was
  built from, which is the point.
- **API impact:** none.

## 2026-11-20 — New module: Event Checklist (UI on mock data)

- **Route/menu:** `/event-checklist`, sidebar Events → "Event Checklist" (after Event),
  gated by `event_management_price` in `ROUTE_FEATURES` (`src/components/Sidebar.tsx`),
  route in `src/App.tsx`.
- **Decision:** one checklist per event, grouped by stage, generated from per-stage
  templates; required items will block leaving a stage. Full reasoning and open questions:
  `docs/prd/event-checklist.md`.
- **Files:**
  - `src/pages/EventChecklistPage.tsx` — two tabs: *Event checklists* (event list with
    progress/overdue/blocking + detail grouped by stage, tick, add, delete with Undo
    toast, current/all stages, hide completed; mobile = list → detail with back button)
    and *Stage templates* (per stage: add, required toggle, delete with Undo).
  - `src/eventChecklist.css` — all `.ck-*` styles (separate file, imported by the page).
  - `src/data/eventChecklistMock.ts` — stages, templates, events, items. Dates are
    relative to today. State lives in `useState`; reload resets it.
  - `src/hooks/api/eventChecklistContract.ts` — **contract only** (comments + DTO types),
    no requests. Implement hooks from it when the backend exists.
  - i18n: `eventChecklist.*` and `navigation.items.eventChecklist` in en + id
    (plural keys use i18next `_one` / `_other`).
- **Mock stages are hard-coded** (`CHECKLIST_STAGES`). When wiring the API, take stages from
  `/v1/event-status/get-all` instead.
- **API impact:** new endpoints required (see `docs/api-impact-log.md`); nothing existing changed.
- **Checks:** build OK, lint at baseline (12/1), no console errors; screenshots at 1440px
  and 390px (list, detail, all stages, templates, add form).

## 2026-11-20 — Event Settings rule guide redesign

- **Why:** owner said the "What do the rules mean?" button (an unstyled native button, class
  `link-btn` had no CSS) and the guide content looked bad.
- **What:**
  - Header of `src/pages/EventStatusPage.tsx` now uses `.es-header` with an actions group:
    a **"Rule guide"** toggle button (info icon + chevron, `aria-expanded`/`aria-controls`)
    next to **New Status**.
  - Guide panel (`section#es-rule-guide.card.es-guide`): title + one-line explanation,
    close button, 4 group cards (Scanning / Stock / Items / Requests) with colored top
    border, a one-line hint per group, and per rule: chip, tag (`1 stage only` for unique
    rules, `Shown when off` for restrictive ones), short description.
    Footer explains the colored dots in the stage bar (previously unexplained).
  - New i18n keys `eventSettingsRules.guide.*` in **en** and **id**. Old
    `eventSettingsRules.*.description` keys are untouched — the New/Edit Status modal
    switches and chip tooltips still use them.
  - CSS: new `.es-header*`, `.es-guide*` rules in `src/style.css`; removed unused
    `.es-legend` and `.es-legend-row`; `.es-legend-title` is kept (used by the form).
    Responsive: 4 → 2 columns ≤1100px, 1 column ≤640px.
- **API impact:** none (see `docs/api-impact-log.md`).
- **Checks:** build OK; lint at baseline (12 errors / 1 warning, pre-existing).
  Screenshots checked at 1440, 1000 and 390px with a mocked API.

## 2026-11-20 — App version at the bottom of the sidebars

- `src/style.css`: `.sidebar` is a flex column so the footer/version is pinned to the bottom;
  removed a `margin-top: 16px` that overrode `margin-top: auto` on `.sidebar-version`.
- `src/components/SuperAdminSidebar.jsx`: shows `v{version}` from `package.json`.
- On GitHub as `7bb734f` (pushed by the owner via patch).

## Open items

- Cloud sessions cannot push: the Claude GitHub App is not installed on
  `rezalukman29/emi` (the owner is only a contributor; connected GitHub account is
  `sandmanz26`). Workaround used: `git format-patch origin/daniel-staging-web`, send the
  patch, the owner runs `git am` + `git push` on their Mac. After they push, `git fetch`
  and `git reset --hard origin/daniel-staging-web` only if `git diff HEAD origin/daniel-staging-web`
  is empty (git am rewrites hashes). Permanent fix: repo owner installs the app.
