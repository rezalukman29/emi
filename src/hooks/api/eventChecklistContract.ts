/**
 * Event Checklist — proposed backend API contract (NOT IMPLEMENTED YET).
 *
 * The Event Checklist page currently runs on mock data (`src/data/eventChecklistMock.ts`).
 * This file only describes what the backend needs to provide; it makes no requests.
 * When the endpoints exist, add React Query hooks next to this file
 * (`useGetEventChecklist.ts`, `usePostEventChecklistItem.ts`, …) using `ax` from
 * `src/service/axios.ts`, and replace the mock state in `EventChecklistPage.tsx`.
 *
 * Model (agreed design):
 *   - Templates are defined PER STAGE (event status). They are the "default tasks" for a stage.
 *   - Each event has ONE checklist. When an event is created, the backend copies every
 *     template item into it (grouped by stage, due date = event start + due_offset_days).
 *   - Users can add, edit, tick and delete items on a single event without touching templates.
 *   - Items marked `is_required` should block moving the event OUT of their stage while open
 *     (enforced by the backend in the existing "change event status" endpoint).
 *
 * Responses follow the existing `APIResponse<T>` / `BaseResponsePagination<T>` shapes
 * (`src/interfaces/BaseApiResponse.ts`). Auth headers are added by the axios interceptor.
 *
 * ───────────────────────────── Templates (per stage) ─────────────────────────────
 *
 * GET    /v1/event-checklist-templates?event_status_id={id}
 *        → APIResponse<ChecklistTemplateItemDTO[]>   (omit the param to get all stages)
 *
 * POST   /v1/event-checklist-templates
 *        body: ChecklistTemplatePayload
 *        → APIResponse<ChecklistTemplateItemDTO>
 *
 * PUT    /v1/event-checklist-templates/{id}
 *        body: Partial<ChecklistTemplatePayload>
 *        → APIResponse<ChecklistTemplateItemDTO>
 *
 * DELETE /v1/event-checklist-templates/{id}
 *        → APIResponse<null>
 *        Deleting a template does NOT remove items already copied into events.
 *
 * PUT    /v1/event-checklist-templates/reorder
 *        body: { event_status_id: number; ids: number[] }   (new order, top to bottom)
 *
 * ──────────────────────────── Checklist of one event ────────────────────────────
 *
 * GET    /v1/events/{eventId}/checklist
 *        → APIResponse<EventChecklistDTO>
 *
 * POST   /v1/events/{eventId}/checklist/items
 *        body: ChecklistItemPayload
 *        → APIResponse<ChecklistItemDTO>
 *
 * PUT    /v1/events/{eventId}/checklist/items/{itemId}
 *        body: Partial<ChecklistItemPayload> & { is_done?: boolean }
 *        → APIResponse<ChecklistItemDTO>
 *        Setting `is_done: true` stores `done_by` (current user) and `done_at` (server time).
 *
 * DELETE /v1/events/{eventId}/checklist/items/{itemId}
 *        → APIResponse<null>
 *
 * POST   /v1/events/{eventId}/checklist/sync-templates
 *        Adds template items created after the event was made (skips ones already copied,
 *        matched by `template_id`). → APIResponse<EventChecklistDTO>
 *
 * ──────────────────────────────── Overview list ────────────────────────────────
 *
 * GET    /v1/event-checklists/summary?page&limit&search&only_attention=true|false
 *        → APIResponse<BaseResponsePagination<EventChecklistSummaryDTO[]>>
 *        Used by the left-hand event list (progress per event without loading all items).
 *
 * ───────────────────────────── Stage-change enforcement ─────────────────────────────
 *
 * The existing event status change endpoint should reject leaving a stage while required
 * items of that stage are open:
 *   HTTP 422 { success: false, message: "...", data: { open_required_items: ChecklistItemDTO[] } }
 * The front end will show those items in the stage-change dialog.
 *
 * Cache keys to use: ["eventChecklist", eventId], ["eventChecklistSummary", params],
 * ["eventChecklistTemplates", eventStatusId].
 */

export interface ChecklistTemplateItemDTO {
  id: number;
  event_status_id: number;
  title: string;
  description?: string | null;
  is_required: boolean;
  /** Days relative to the event start date. -3 = three days before, 0 = event day, 1 = day after. Null = no due date. */
  due_offset_days: number | null;
  /** Free text role, e.g. "Warehouse", "Event lead". Optional. */
  assignee_role?: string | null;
  order_data: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplatePayload {
  event_status_id: number;
  title: string;
  description?: string | null;
  is_required: boolean;
  due_offset_days: number | null;
  assignee_role?: string | null;
}

export interface ChecklistItemDTO {
  id: number;
  event_id: number;
  event_status_id: number;
  /** Set when the item was copied from a template; null for items added on the event. */
  template_id: number | null;
  title: string;
  description?: string | null;
  is_required: boolean;
  is_done: boolean;
  due_date: string | null; // YYYY-MM-DD
  assignee_user_id: number | null;
  assignee_name: string | null;
  done_by_name: string | null;
  done_at: string | null; // ISO date-time
  order_data: number;
}

export interface ChecklistItemPayload {
  event_status_id: number;
  title: string;
  description?: string | null;
  is_required?: boolean;
  due_date?: string | null;
  assignee_user_id?: number | null;
}

export interface EventChecklistDTO {
  event_id: number;
  current_event_status_id: number;
  items: ChecklistItemDTO[];
}

export interface EventChecklistSummaryDTO {
  event_id: number;
  event_name: string;
  start_date: string;
  current_event_status_id: number;
  current_event_status_name: string;
  total_items: number;
  done_items: number;
  overdue_items: number;
  /** Open required items in the CURRENT stage (these block the next stage change). */
  blocking_items: number;
}
