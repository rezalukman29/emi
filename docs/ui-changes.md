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

### Event Calendar (`/event-calendar`)
- Month view with search and filters (on the loaded month), clash table.

---

## UI change log (newest first)

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
