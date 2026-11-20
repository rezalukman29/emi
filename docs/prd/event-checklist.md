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
