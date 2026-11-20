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
 *        body: Partial<ChecklistItemPayload> & { status?: ChecklistStatusDTO; note?: string }
 *        → APIResponse<ChecklistItemDTO>
 *        Changing `status` stores `status_by` (current user) and `status_at` (server time) and
 *        appends an activity row. Server-side validation (mirror of the UI, settings-driven):
 *          - status "done" on an item with requires_photo → 422 unless it has ≥ 1 photo
 *            (only when settings.photos_enabled);
 *          - status "na" | "issue" → 422 without a note when settings.require_note_for_exception;
 *          - any change on a stage that is signed off and settings.lock_after_sign_off → 423 Locked.
 *
 * POST   /v1/events/{eventId}/checklist/items/{itemId}/photos      (multipart/form-data)
 *        fields: file (image/*, max 10 MB, server re-encodes to JPEG and strips GPS EXIF unless
 *        the tenant keeps it), taken_at? (ISO, from the device)
 *        → APIResponse<ChecklistPhotoDTO>    422 when settings.max_photos_per_task is reached.
 *
 * DELETE /v1/events/{eventId}/checklist/items/{itemId}/photos/{photoId}
 *        → APIResponse<null>   (soft delete; keep it in the activity log)
 *
 * GET    /v1/events/{eventId}/checklist/items/{itemId}/activity
 *        → APIResponse<ChecklistActivityDTO[]>   newest last
 *
 * DELETE /v1/events/{eventId}/checklist/items/{itemId}
 *        → APIResponse<null>
 *
 * POST   /v1/events/{eventId}/checklist/sync-templates
 *        Adds template items created after the event was made (skips ones already copied,
 *        matched by `template_id`). → APIResponse<EventChecklistDTO>
 *
 * ─────────────────────────────── Stage sign-off ───────────────────────────────
 *
 * POST   /v1/events/{eventId}/checklist/stages/{eventStatusId}/sign-offs
 *        body: { role: "supervisor" | "client"; name: string; note?: string;
 *                signature?: string (PNG data URL; required when settings.require_signature) }
 *        → APIResponse<StageSignOffDTO>
 *        422 when required items of the stage are not done/na, or an item has status "issue".
 *        409 when that role already signed this stage.
 *
 * DELETE /v1/events/{eventId}/checklist/stages/{eventStatusId}/sign-offs      (admin only)
 *        body: { reason: string }  → reopens the stage, logged in activity.
 *
 * Sign-offs are returned inside EventChecklistDTO.sign_offs.
 *
 * ──────────────────────────────── Settings (tenant) ────────────────────────────────
 *
 * GET    /v1/event-checklist-settings          → APIResponse<ChecklistSettingsDTO>
 * PUT    /v1/event-checklist-settings          (admin only) body: ChecklistSettingsDTO
 *        Defaults when never saved: see DEFAULT_CHECKLIST_SETTINGS in src/lib/checklistSettings.ts.
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
 * items of that stage are open, an issue is open, or (when settings.sign_off_required_before_next_stage)
 * the stage is not signed off by every required role:
 *   HTTP 422 { success: false, message: "...", data: { open_required_items: ChecklistItemDTO[],
 *              open_issues: ChecklistItemDTO[], missing_sign_off_roles: ("supervisor"|"client")[] } }
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
  requires_photo: boolean;
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
  requires_photo: boolean;
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
  requires_photo: boolean;
  status: ChecklistStatusDTO;
  note: string | null;
  photos: ChecklistPhotoDTO[];
  due_date: string | null; // YYYY-MM-DD
  assignee_user_id: number | null;
  assignee_name: string | null;
  status_by_name: string | null;
  status_at: string | null; // ISO date-time
  order_data: number;
}

/** open = to do · done · na = not applicable (counts as resolved) · issue = problem reported (blocks sign-off). */
export type ChecklistStatusDTO = 'open' | 'done' | 'na' | 'issue';

export interface ChecklistPhotoDTO {
  id: number;
  url: string;           // signed URL, short-lived
  thumbnail_url: string;
  uploaded_by_name: string;
  taken_at: string | null;
  created_at: string;
}

export interface ChecklistActivityDTO {
  at: string;
  by_name: string;
  action: 'created' | 'status' | 'photo' | 'photo_removed' | 'note' | 'signed_off' | 'reopened';
  detail: string | null; // e.g. the new status
}

export interface StageSignOffDTO {
  id: number;
  event_id: number;
  event_status_id: number;
  role: 'supervisor' | 'client';
  name: string;
  signed_by_user_id: number | null; // the logged-in user who handed over the device
  signature_url: string | null;
  note: string | null;
  signed_at: string;
}

export interface ChecklistSettingsDTO {
  photos_enabled: boolean;
  max_photos_per_task: number;
  allow_gallery_upload: boolean;
  notes_enabled: boolean;
  require_note_for_exception: boolean;
  not_applicable_enabled: boolean;
  issues_enabled: boolean;
  sign_off_enabled: boolean;
  sign_off_signer: 'supervisor' | 'client' | 'both';
  require_signature: boolean;
  sign_off_required_before_next_stage: boolean;
  lock_after_sign_off: boolean;
  due_dates_enabled: boolean;
  assignees_enabled: boolean;
  allow_extra_tasks: boolean;
  delete_permission: 'everyone' | 'admin' | 'nobody';
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
  sign_offs: StageSignOffDTO[];
}

export interface EventChecklistSummaryDTO {
  event_id: number;
  event_name: string;
  start_date: string;
  current_event_status_id: number;
  current_event_status_name: string;
  total_items: number;
  /** done + na */
  resolved_items: number;
  overdue_items: number;
  open_issues: number;
  /** Open required items in the CURRENT stage (these block the next stage change). */
  blocking_items: number;
}
