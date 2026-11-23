/**
 * Event History (activity log) — proposed backend API contract (NOT IMPLEMENTED YET).
 *
 * The Event History page (`src/pages/EventHistoryPage.tsx`) currently shows DUMMY data
 * from `src/data/eventHistoryMock.ts` (owner 2026-11-23). This file makes no requests; it
 * describes what the backend needs so the page can switch to real data.
 *
 * GET /v1/event/{id}/activity?page=1&limit=50&type=stage|item|scan|file|checklist|event&search=
 *     → BaseResponsePagination<EventActivityDTO>   (newest first)
 *
 * The backend should WRITE a row whenever something changes on an event, in the same
 * transaction as the change: event created/edited (with before/after per field), stage moved,
 * items added/removed/modified, ownership assigned, scan in/out, inventory checking started,
 * broken item reported, files uploaded/deleted, checklist items done (when that API exists).
 * The actor is the logged-in user of the request.
 */

export type EventActivityType = 'event' | 'stage' | 'item' | 'scan' | 'file' | 'checklist';

export interface EventActivityDTO {
  id: number;
  event_id: number;
  type: EventActivityType;
  /** Machine-readable action, e.g. "event.created", "event.updated", "stage.moved", "item.added", "scan.in". */
  action: string;
  /** Short human-readable summary prepared by the backend (fallback when the UI has no template). */
  message: string;
  /** Before/after for edits, e.g. [{ field: "PIC", from: "Anto", to: "Rina" }]. */
  changes?: Array<{ field: string; from: string | null; to: string | null }>;
  /** Extra numbers/names, e.g. { count: 12, area: "Main Stage" }. */
  meta?: Record<string, string | number | null>;
  user_id: number;
  user_name: string;
  created_at: string;
}
