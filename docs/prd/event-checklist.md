# Event Checklist — product decision (2026-11-20)

Status: **UI built on mock data** (`/event-checklist`). Backend not started.
API contract: `src/hooks/api/eventChecklistContract.ts`.

## Question

Should an event have **one checklist**, or **one checklist per stage**?

## Options considered

| Option | How it works | Good | Bad |
|---|---|---|---|
| A. One flat checklist per event | A single to-do list on the event | Simplest to build and understand | No link to the stage flow; nothing tells the team what matters *now*; cannot gate stage changes |
| B. Separate checklist per stage | Each stage has its own list; you see one at a time | Clear "what to do in this stage" | Work is scattered across many lists; hard to see overall progress; tasks that span stages have no home |
| **C. Hybrid (chosen)** | **One checklist per event, items grouped by stage, created from per-stage templates** | Overall progress *and* stage focus; templates remove repeated typing; required items can block leaving a stage | Slightly more backend work (templates + copy on event creation) |

## Why C

This is the pattern used by tools that run repeatable operational workflows (onboarding
checklists in HR tools, project templates in Asana/ClickUp, run sheets in event and rental
software): **a template defines the standard process, each job gets its own copy, and
gates sit on the phase boundaries.** It fits EMI because events already move through
ordered stages (Event Settings) that carry rules like Scan and Cut stock — a checklist
gate is one more rule of the same kind.

Notes on the research: this comparison is based on well-known product patterns, not on a
fresh survey of specific competitors or user interviews. Validate with 2–3 event leads
before building the backend (questions below).

## Design decisions

- **Templates per stage** (tab "Stage templates"): title, required/optional, due date as
  an offset from the event start (H-3, Hari H, H+2), optional role.
- **Copy, don't link:** a new event gets a copy of the templates. Editing a template never
  changes events that already exist (no surprise edits mid-event). A "sync templates"
  endpoint can add newer template items on request.
- **Per-event extras:** users can add tasks to any stage of one event ("Added for this event").
- **Default view = current stage**, with "All stages" for the full picture; past stages
  collapse; "Hide completed" for long lists.
- **Required items block leaving the stage** (backend rule on the existing status-change
  endpoint, HTTP 422 with the open items). Until then the UI only warns.
- **Event list shows what needs attention:** progress %, overdue count, blocking count,
  with an "Only events that need attention" filter.
- **Safe delete:** deleting is instant with an Undo toast instead of a confirm dialog.

## Open questions for the owner / event leads

1. Should *required* items really block a stage change, or only warn? (Proposed: block,
   with an admin override later.)
2. Assignee: a user from Users, or a free-text role? (Mock uses names; contract supports both.)
3. Do templates need to differ per event type (wedding vs corporate)? If yes, add
   `event_type_id` to templates later.
4. Should checklist progress show on the Event detail page too? (Recommended next step.)

---

# Round 2 — Field review ("roast") and fixes (2026-11-20)

Status: built on mock data; every feature can be switched in **Events → Checklist Settings**
(`/event-checklist-settings`, admins only).

## What v1 got wrong for the field

| # | Problem in v1 | Why it matters on site | Fix in v2 |
|---|---|---|---|
| 1 | A tick was the only proof | Disputes with clients ("the stage was not set up", "the chair was broken before") cannot be settled | **Photo evidence** per task (camera or gallery, max per task); template tasks can **require a photo** before Done |
| 2 | Only done / not done | Real tasks are skipped ("no stage at this venue") or blocked ("truck cancelled") | Statuses **To do · Done · N/A · Issue**; N/A counts as resolved, Issue blocks sign-off |
| 3 | No place to write what happened | Crew had to use WhatsApp, info gets lost | **Notes** per task; a note is **required** for N/A and Issue (switchable) |
| 4 | No acceptance at handover | Nobody confirms "setup done" / "everything returned"; no accountability | **Stage sign-off** with name, role (supervisor / client / both), drawn **signature**, optional note and an explicit confirmation |
| 5 | Ticks could be changed after the fact | Records can be edited after the client signed | **Lock after sign-off**; only admins can reopen (removes the sign-off) |
| 6 | No audit trail | "Who ticked this and when?" had no answer | **History** per task (created, status changes, photos, notes) with person and time |
| 7 | Tiny tap targets, info only on hover | Hard to use with one hand on a phone | Tap a task to open a **full-screen task view** with large status buttons, photos and notes |
| 8 | Everything always on | Small teams do not want signatures; big clients want both signatures | **Checklist Settings**: every feature can be turned on/off per tenant |

## Settings (all tenant-wide)

- Evidence: photo evidence (on/off), max photos per task, camera-only on phones; task notes,
  require a note for N/A / Issue.
- Task statuses: N/A on/off, Issue on/off.
- Stage sign-off: on/off, who signs (supervisor, client, both), drawn signature required,
  lock tasks after sign-off, require sign-off before the next stage (backend gate).
- Planning: due dates, assignees.
- Permissions: add extra tasks on an event; who can delete tasks (everyone / admins / nobody).

## Still open (needs backend or a decision)

1. **Offline use.** Venues often have bad signal. Needs a service worker + upload queue for
   photos and status changes. Recommended before rolling out to crews.
2. **Stage gate** (refuse moving to the next stage without sign-off) is only shown in the UI;
   the backend must enforce it on the existing status-change endpoint.
3. **Photo storage**: size limit, compression, retention period and whether GPS data is kept.
4. **Client sign-off on the crew's phone**: the client signs on our device; the backend should
   store which logged-in user handed the device over (`signed_by_user_id`).
5. Settings are tenant-wide. Per-event-type overrides (wedding vs corporate) are not designed yet.
6. "My tasks" view for crew (filter by assignee) — recommended next.
