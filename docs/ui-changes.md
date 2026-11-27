# UI changes — map and log

For developers and designers: **what each screen looks like now** (the map, always current) and **what
changed on screen** (the log, newest first: before → after, and why). Code-level details are in
`docs/update-history.md`; API needs in `docs/api-backlog.md`.

Update this file in the same commit as any visible change: new screen, layout, text, colours, components,
navigation, empty / error states.

Conventions: all new text exists in English and Indonesian (`src/locales/{en,id}/translation.json`); colours
come from tokens in `src/style.css` / `src/theme-dark.css`, so light and dark mode both work; phones are
checked at 390 px and tablets at 768 px.

---

## UI map (current state, 2026-11-23)

### Sidebar and header
- Sidebar groups fold open/closed (remembered per browser). Events group: Event Calendar, Event,
  Event Checklist, Settings (nested). Footer: Owner Panel link, app version, branch · commit.
- Header: global search, Upgrade, user name · role, light/dark switch, language EN/ID, logout.

### Events (`/event`)
- Tabs: Upcoming / On Going / Ready for Checking / … with counts. The open tab is kept in the URL
  (`?tab=`) and per browser tab, so coming back returns to the same tab. On phones the tab bar scrolls.
- Event cards (cover photo, item count, Overdue chip, tooltips) — the whole card opens the event.
  Icons: History (opens Event History), Edit, Delete.
- Delete: an event with items (or unknown count) asks to **type the event name**; with 0 items a simple confirm.

### Event Detail (`/event-detail?id=`) — A/B test
- Floating **A/B switcher** (admins only, bottom-left, draggable, × hides it, `?ab=1` brings it back):
  rows *Event Detail A|B* and *Add Items A|B*.
- **A (default):** original layout; header buttons Outsource / Rent / Request Production / Files /
  Add Item / ⋯; stage tabs; Items / Event Checklist tabs.
- **B:** hero card (name, status, date range · venue · PIC · code, current stage with next action and a hint),
  stat tiles (Items, Scanned in or Checked, Scanned out, Checklist), Items / Event Checklist tabs, search +
  Filter popover + cards/list toggle. Header: Add Item + ⋯ (Outsource, Rent, Request Production, Files,
  History, Summary, Rentals, Group Items, Bulk Assign Ownership, Cross Check, Print…).
- Item drawer: compact header, Qty/Status/Ownership strip, Location, Progress, Remove / Go to item detail, ⋯.
- **Event Checklist tab:** the same checklist panel as the Event Checklist page (see below).

### Add Items from Inventory (modal in Event Detail) — A/B test
- Both: a grey note "Stock = what is in the warehouse now… check the dates" and orange **clash pills** on items that
  clash with other events on this event's dates (count in the note).
- Both: search, category, **Available / Out of Stock tabs** with counts ("+" = more pages), a warehouse
  pre-selected (the one with the most stock), "Load more items".
- **A:** original table-like rows with a warehouse dropdown.
- **B:** one row per item — photo, name, SKU · category, warehouse, stock (green / orange / red), − qty +,
  Add; "N in cart" badge; out-of-stock rows offer Rent Item / Request Production; cart shows total pcs and
  a warning for items without an area; phones switch between *Browse* and *Cart (n)*.

### Event History (`/event-history?id=`) — preview, dummy data
- Back to Events, Open event, "Preview · dummy data" badge; search; type chips (All, Event, Stage, Item,
  Scan, File, Checklist) with counts; timeline grouped by day with before → after for edits.

### Event Checklist (`/event-checklist`) — preview, browser only
- Header: title, intro, "Preview · mock data" badge, **Checklist Settings** (admins).
- Tabs: **Event checklists** | **Templates**.
- **Event checklists:** left list of active events (search, "Only events that need attention",
  **"Only events with tasks for me"**; each card: %, date, stage pill, overdue / issues / **required** /
  **"N for me"** badges). Right: the checklist panel. On phones the list and the panel are two steps.
- **Checklist panel** (same on this page and in Event Detail):
  - Summary card: event name, venue, date, "x / y tasks done", progress bar, *Open in event* / *All checklists*.
  - Filter row: **All (n) | Not done (n) | Done (n)** and **Assigned to me**.
  - **Groups** (free sections, numbered in order): name, done count, collapse; tools ↑ ↓ (reorder),
    ✎ rename (inline), 🗑 delete (asks when it has tasks; Undo in the toast). *+ Add group* under the last group.
  - Task row: checkbox, title, tags (Required, **Photo needed**, **Report needed**, N/A, Issue), due date or
    "Done by … · date", **assignee** (initials + name, or *Unassigned*), photo count, report preview, delete.
  - *+ Add a task…* → title + **Options** (Assigned to, Due date, Required, Photo needed, Report needed) + Add.
  - Ticking a task that needs proof opens **Complete task** (photo upload and/or report, both marked *;
    *Mark as done* checks them). Ticking also shows "E-mail to N admins queued (preview: not actually sent)"
    when the setting is on. **Unticking** is allowed and shows "Task unticked. This is recorded in the task history."
  - Group sign-off box at the bottom of each group (name + signature), lock after sign-off, admin can reopen.
  - Task drawer: Status (To do / Done / N/A / Issue), **Assigned to**, **Group** (move), Due date,
    **"Before it can be ticked"** (Required / Photo needed / Report needed), Photos, Report (or Note),
    **History** ("Every change is recorded, including unticking").
- **Templates:** template groups (↑ ↓ ✎ 🗑, *+ Add group*), template tasks with toggles **Photo**,
  **Report**, Required/Optional, due offset; *Add template task* form.

### Checklist Settings (`/event-checklist-settings`, admins)
- Sections: Evidence (photos, notes), Task statuses (N/A, Issue), **Group sign-off**, **Notifications**
  (*E-mail admins when a task is ticked*: Every task / Required tasks only, recipient list from the users,
  preview note, "Latest e-mails that would be sent"), Planning (due dates, assignees), Permissions
  (add tasks, who can delete). Sticky save bar; Reset to recommended defaults.

### AI Tools (`/ai-tools`) and 3 Star Protection (`/ai/three-star`, Event Detail → 3 Star) — preview
- Sidebar: purple "AI Tools" card above System (hub link + 3 Star Protection + Material Analyzer).
- Hub: hero, tool cards with status. Settings: intro with the three stars, master switch, checks, strictness, numbers,
  checklist suggestion, audience, example. Event Detail tab "3 Star ★★☆": hero with stars and tiles, suggestions,
  AI checklist, read context, brief form. Off state explains how to turn it on (admins get a button).

### Event Calendar (`/event-calendar`)
- Month view with search and filters (on the loaded month), clash table.

---

## UI change log (newest first)

### 2026-11-27 — Event layout map
- Event Detail has a new tab **Layout** (between 3 Star and Finance). Empty → choose Ballroom / Garden / Empty or copy
  from another event; event areas become zones automatically.
- View: Areas & items, Setup progress, Return progress, Load-in route; item search; Print; side list of areas with %.
- Edit layout: stage, decor, round/long tables (with a table generator and seat count), walkways, doors, walls,
  pillars, zones; venue photo; checks; export/import. "Preview" badge: saved in this browser only.

### 2026-11-27 — Layout editor v2
- Editor gets a toolbar (Select / Pan, Undo / Redo, zoom, floor plan photo, Export / Import), a **rack row
  generator**, new blocks (aisle, wall, column, charging zone), **layers** and **checks** panels, box select +
  align / distribute, snap guides, rulers, a status bar and keyboard shortcuts.
- Racks now have bays × levels; selecting a rack shows its **front view** with slots (e.g. A01-03-2) to place items.
- Hub map: rack detail shows the front view; pick routes now walk along aisles instead of straight lines.

### 2026-11-27 — Warehouse layout editor + floor map (preview)
- New page **Warehouse layout** (`/warehouse-hub/layout`, admin, button "Layout setup" in Warehouse Hub): start from a
  template or empty, drag/resize racks, bulk areas, zones (receiving, shipping, staging, QA, returns) and entrance;
  side panel to rename, set code, levels, capacity, and assign items. "Preview" badge: saved in this browser only.
- Warehouse Hub: when one warehouse is chosen, a dark **Floor map** appears above the monitor with views Stock
  heatmap / Issues / Pick route, item search, zoom, and a detail panel per block. No layout yet → card inviting an
  admin to set one up. "All warehouses" → buttons to pick a warehouse.

### 2026-11-27 — Warehouse Hub live monitor
- Top of Warehouse Hub: before → 4 plain number cards; after → "Live warehouse monitor": pulsing Live badge, last
  update + refresh, 6 animated tiles, stock-health ring, 14-day out/back chart, "Coming up" timeline, stock per
  warehouse bars. Cards fade/slide in, numbers count up, bars grow; turned off for users who prefer reduced motion.
- Rent, Buy, IHP, Printing, Venue now appear as "Label" (not counted as warehouses).

### 2026-11-27 — Tables and lists
- Sort arrows: before → both arrows always grey, no way to see the current sort; after → the sorted column is purple
  and shows one arrow (↑ A→Z / ↓ Z→A).
- Pagination: added "Show 10/20/50/100" and text "Prev"/"Next" buttons (arrows only on phones).
- Removed the second "New" button inside the table card on Sub Area, Area, Category, Unit, Warehouse, Users, Inventory.
- Inventory table: wider name column, numbers right-aligned, Action column stays visible on the right, time shows
  minutes correctly.

### 2026-11-26 — UX review outside the event pages
- Unknown address: before → silent jump to Events; after → "Page not found" card with "Go to dashboard" / "Go to events".
- A page that crashes: before → whole app blank; after → "This page hit a problem" card, sidebar still works, "Try again".
- Session ended (401): before → pages showed empty lists/errors; after → back to login with "Your session has ended".
- Category list pagination: "NaN" pages gone. Event Report: broken dates show "—".
- Inventory: photos load as you scroll (faster first view).

### 2026-11-26 — Warehouse Hub + Project Finance (new menus; old menus unchanged)
| Where | Before | After | Why |
|---|---|---|---|
| Sidebar | — | New sections "Warehouse Hub" (Gudang) and "Finance" (Keuangan Proyek, admins only) above Inventory | Task-first entry points |
| `/warehouse-hub` | — | Warehouse picker (remembered), quick actions (Move stock, Start stock count, Receive items, Classic menu), 4 action cards (Out of stock, Low stock, Returns overdue, Stock counts open), Out & back list with pick list, Stock to fix with "Find in other warehouses → Move here", warehouse cards (virtual last), Data to tidy | Warehouse work as tasks |
| Move stock | Table form in Warehouse Inventory | Guided 4-step modal, qty capped at source stock, summary sentence | Fewer mistakes |
| `/finance` | — | KPIs (due in 7 days, overdue, to collect, average margin), filters, table per event with contract, cost, margin, billing state | Owner view of money |
| Event Detail tabs | Items · Checklist · 3 Star | + "Finance" (admins): summary cards, contract + client, costs (vendor costs automatic), invoices (DP/final schedule, VAT, payments, print/PDF), extra charges | Money per project |

### 2026-11-24 — 3 Star Protection v3
| Where | Before | After | Why |
|---|---|---|---|
| Risk suggestion → Done | One click | Asks "What was done?" | Stars must mean something |
| Star tiles | — | "N confirmed by the team" | Shows manual overrides |
| Handled suggestion | Stayed handled forever | Reopens with an orange note when the facts change | No stale ticks |
| Shortage / clash suggestions | No action | "Rent the shortfall" opens Rent Item | One step to the fix |
| Event card stars | — | Tooltip adds "checked <date>" | Freshness |

### 2026-11-24 — 3 Star Protection v2 (UX review)
| Where | Before | After | Why |
|---|---|---|---|
| 3 Star tab, new event | Score + 10 "missing" warnings, brief at the bottom | Setup mode: "Not scored yet", brief form on top, Save and analyze / Skip | Brief first; no punishment |
| Stars | Handled suggestions still counted | Done / Not relevant (with reason) lift the star; handled list shows who/when/why | Reachable 3 stars |
| Suggestions | 12 flat cards, 3 about one item | Grouped per item, top 5 + "Show N more"; "Confirm" instead of "Check" | Less noise |
| Suggestion actions | "Open items" to the tab only | "Show in items" filters to the item; alternatives in stock | Actionable |
| Hero | "Analyze again" button with fake delay | "Updates automatically" | Honest |
| AI checklist | Tasks could be created overdue | Due date never before today | No instant red |
| Events list | — | Star badge on cards, "Below 3 stars (n)" filter | Portfolio view |
| New / Edit Event | — | Optional "Brief for the AI" section | Fill once, when info is fresh |
| Event Detail tabs (phone) | 3 Star tab hidden off-screen | Tabs wrap | Discoverable |

### 2026-11-24 — AI Tools made special + 3 Star Protection
| Where | Before | After | Why |
|---|---|---|---|
| Sidebar | "AI Tools" plain group with one link | Highlighted purple card "AI Tools · Your event assistant" (link to the hub) with 3 Star Protection and Material Analyzer | AI should feel like a feature, not a menu entry |
| New `/ai-tools` | — | Hub: hero + tool cards (3 Star Protection "New" with On/Off, Material Analyzer) | Home for AI features |
| New `/ai/three-star` | — | Explanation of the three stars, master On/Off, checks per star, strictness, minimum prep days, setup hours, suggest checklist, who sees the tab, example suggestions, save bar | Owner can enable and tune |
| Event Detail tabs | Items · Event Checklist | + **3 Star** tab with the star count (or "Off") | Assistant per event |
| 3 Star tab | — | Hero (stars, Analyze again, preview badge, three star tiles), Suggestions (Risk/Check/Tip, actions Done / Not relevant / Complete the brief / Open items, show handled), AI checklist card (Add to checklist → group "3 Star · AI"), What the assistant read, collapsible Event brief form | Readable, actionable suggestions |

### 2026-11-24 — Add Items: rental availability hints
| Where | Before | After | Why |
|---|---|---|---|
| Add Items (A and B) | Stock number only | Note "stock = on the shelf now; items at other events come back when returned" + count of clashing items | Owner: inventory is lent; availability depends on dates |
| Add Items rows (A and B) | — | Orange pill "Clash 24 Dec–26 Dec: short 40 · Other event" (tooltip: demand vs stock) | Warn before booking items that other events need on the same dates |

### 2026-11-23 — Event Checklist v2: groups, assign, proof form, admin e-mail, untick history, filter
Owner request (Event Checklist screen + Event Detail checklist tab). All in the preview (browser only).

| Where | Before | After | Why |
|---|---|---|---|
| Checklist panel | Tasks grouped by **event stage**, with *Current stage / All stages* switch | Tasks in **free groups** the user adds, renames, reorders, deletes; all groups shown | Flexible structure, not tied to stages |
| Checklist panel | *Hide completed* checkbox | **All / Not done / Done** segment with counts + **Assigned to me** | Filter open vs finished work |
| Task row | Role text from the template (e.g. "Event lead") | **Assigned user** (initials + name) or *Unassigned* | Assign tasks to real users |
| Add task | One-line title only | Title + **Options**: assignee, due date, Required, Photo needed, Report needed | Decide the proof when creating the task |
| Ticking | Tasks needing a photo opened the drawer with a toast | **Complete task** form (photo and/or report, required fields marked *) | Proof captured at the moment of ticking |
| Ticking | — | Toast "E-mail to N admins queued (preview)" | Admins informed when tasks are ticked |
| Unticking | Silent | Toast + history row "unticked the task (was Done)" | Every change recorded |
| Task drawer | Status, photos, note, history | + Assigned to, Group, Due date, *Before it can be ticked* flags; "Report" label when required | Edit everything in one place |
| Event list cards | "N blocking" (current stage) | "N required" (all groups) + "N for me"; filter "Only events with tasks for me" | No stage link any more; see own work |
| Templates tab | "Stage templates", one card per stage | "Templates", free template groups (↑ ↓ ✎ 🗑, Add group), toggle **Report** next to Photo | Same group model as events |
| Checklist Settings | "Stage sign-off" incl. *Require sign-off before next stage* | "Group sign-off" (stage gate removed); new **Notifications** section with e-mail setting and "would be sent" list | Groups are not stages; e-mail feature |
| Event Detail tab | Checklist tab badge "N blocking" | "N required" | Shorter, fits on phones |

Not verified on a real phone; checked in Chromium at 1440 px and 390 px with a mocked API. Old preview data
(stage-based, key `emi.checklist.v1`) is not shown any more; the checklist starts again from the sample templates.

### 2026-11-23 — Add Items A/B, stock tabs, default warehouse; responsive pass
- Add Items: A/B switch (second row in the switcher); tabs Available / Out of Stock; warehouse pre-selected
  (most stock); version B rows with stepper, "in cart" badge, Rent / Request Production on out-of-stock rows,
  phone Browse / Cart switch. Switcher moved to bottom-left (was covering *Save to Event*).
- Phones: Events tab labels on one line (bar scrolls); Event Detail A ownership + Check full width, stage chips
  and view toggle on one row, tab labels on one line.

### 2026-11-23 — Event Detail B v3, Events tab memory, delete by name, Event History
- B: hero card with meta and stage panel + hint, stat tiles, cleaner work area. ⋯ menu gets *History* (A and B).
- Events: returning keeps the tab. Delete: type the event name when it has items.
- New screen Event History (dummy data).

### 2026-11-22 and earlier
See `docs/update-history.md` (Event Detail B v1/v2 and switcher, Event Detail menu + print chooser + item
drawer, PIC picker, event list chips/tooltips, foldable sidebar, Event Checklist v1, calendar filters,
dark mode, sidebar redesign).

## 2026-11-26 — FE fixes

Admin-only actions are hidden from employees. Added a required event-stage recovery dialog and improved session, error, inventory and navigation feedback.
