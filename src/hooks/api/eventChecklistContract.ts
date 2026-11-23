/**
 * Event Checklist — proposed backend API contract (NOT IMPLEMENTED YET). v2, owner 2026-11-23.
 *
 * The Event Checklist page and the Checklist view in Event Detail run on PREVIEW data kept in the
 * browser (`src/lib/checklistStore.ts`, localStorage `emi.checklist.v2`). This file makes no requests;
 * it describes what the backend needs so the preview can be switched to real data. A plain-language
 * list for developers is in `docs/api-backlog.md`.
 *
 * Model (v2):
 *   - Tasks are organised in free GROUPS (named sections the user creates, renames, reorders, deletes).
 *     Groups are NOT tied to event stages any more (owner 2026-11-23).
 *   - Tenant-wide TEMPLATE groups + template tasks. When an event is created, the backend copies every
 *     template group and its tasks into the event (due date = event start + due_offset_days).
 *     Later template edits do not change existing events.
 *   - Each task can be ASSIGNED to a user (users from GET /v1/get-all-user), and can require a PHOTO
 *     and/or a written REPORT before it can be ticked.
 *   - Ticking a task can e-mail the tenant's admins (setting). Unticking is allowed; every change is
 *     kept in the task's activity log (who, when, what).
 *   - A group can be signed off (name + optional drawn signature); signed-off groups can be locked.
 *
 * Responses follow `APIResponse<T>` / `BaseResponsePagination<T>` (`src/interfaces/BaseApiResponse.ts`).
 * Auth headers come from the axios interceptor. All endpoints are tenant-scoped.
 *
 * ───────────────────────────── Templates ─────────────────────────────
 * GET    /v1/event-checklist-templates                      → APIResponse<ChecklistTemplateGroupDTO[]> (groups with tasks)
 * POST   /v1/event-checklist-template-groups                body { name }            → group
 * PUT    /v1/event-checklist-template-groups/{id}           body { name }            → group
 * DELETE /v1/event-checklist-template-groups/{id}           (deletes its template tasks; existing events unchanged)
 * PUT    /v1/event-checklist-template-groups/reorder        body { ids: number[] }
 * POST   /v1/event-checklist-templates                      body ChecklistTemplatePayload → task
 * PUT    /v1/event-checklist-templates/{id}                 body Partial<ChecklistTemplatePayload>
 * DELETE /v1/event-checklist-templates/{id}
 *
 * ──────────────────────────── Checklist of one event ────────────────────────────
 * GET    /v1/events/{eventId}/checklist                     → APIResponse<EventChecklistDTO>
 * POST   /v1/events/{eventId}/checklist/groups              body { name }            → group
 * PUT    /v1/events/{eventId}/checklist/groups/{groupId}    body { name }
 * PUT    /v1/events/{eventId}/checklist/groups/reorder      body { ids: number[] }
 * DELETE /v1/events/{eventId}/checklist/groups/{groupId}    (deletes its tasks; keep them in the activity log)
 * POST   /v1/events/{eventId}/checklist/items               body ChecklistItemPayload → item
 * PUT    /v1/events/{eventId}/checklist/items/{itemId}      body Partial<ChecklistItemPayload> & { status?, note? }
 *        Server rules (mirror of the UI):
 *          - status "done" → 422 when requires_photo (and photos enabled) and the task has no photo;
 *            422 when requires_report and `note` is empty.
 *          - status "na" | "issue" → 422 without a note when settings.require_note_for_exception.
 *          - status back to "open" (untick) is allowed; keep the photos and the report, write an
 *            activity row "unchecked" with the previous status.
 *          - status set to "done" → when settings.notify_admins_enabled (and the task is required, if
 *            notify_admins_when = "required"), send an e-mail to every admin user of the tenant
 *            (event name, group, task, who ticked it, time, link to the event) and write an activity row.
 *          - assignee change → activity row "assigned"; (optional) notify the new assignee.
 *          - any change in a signed-off group while settings.lock_after_sign_off → 423 Locked.
 *        Every change stores status_by / status_at and appends an activity row in the same transaction.
 * DELETE /v1/events/{eventId}/checklist/items/{itemId}
 * POST   /v1/events/{eventId}/checklist/items/{itemId}/photos   multipart: file (image/*, ≤10 MB), taken_at?
 * DELETE /v1/events/{eventId}/checklist/items/{itemId}/photos/{photoId}   (soft delete, logged)
 * GET    /v1/events/{eventId}/checklist/items/{itemId}/activity           → ChecklistActivityDTO[] (oldest first)
 * POST   /v1/events/{eventId}/checklist/groups/{groupId}/sign-offs        body { role, name, note?, signature? }
 *        422 when required tasks of the group are open or an issue is open; 409 when the role already signed.
 * DELETE /v1/events/{eventId}/checklist/groups/{groupId}/sign-offs        (admin) body { reason }
 *
 * ──────────────────────────── Overview, "my tasks", settings ────────────────────────────
 * GET    /v1/event-checklists/summary?page&limit&search&only_attention&assignee_id
 *        → BaseResponsePagination<EventChecklistSummaryDTO>  (left-hand list on the Event Checklist page)
 * GET    /v1/event-checklist-settings          → ChecklistSettingsDTO
 * PUT    /v1/event-checklist-settings          (admin) body ChecklistSettingsDTO
 *
 * Cache keys to use: ["eventChecklist", eventId], ["eventChecklistSummary", params],
 * ["eventChecklistTemplates"], ["eventChecklistSettings"].
 */

export type ChecklistStatusDTO = 'open' | 'done' | 'na' | 'issue';

export interface ChecklistTemplateTaskDTO {
  id: number;
  group_id: number;
  title: string;
  is_required: boolean;
  requires_photo: boolean;
  requires_report: boolean;
  /** Days relative to the event start (-3 = three days before). Null = no due date. */
  due_offset_days: number | null;
  order_data: number;
}

export interface ChecklistTemplateGroupDTO {
  id: number;
  name: string;
  order_data: number;
  tasks: ChecklistTemplateTaskDTO[];
}

export interface ChecklistTemplatePayload {
  group_id: number;
  title: string;
  is_required: boolean;
  requires_photo: boolean;
  requires_report: boolean;
  due_offset_days: number | null;
}

export interface ChecklistGroupDTO {
  id: number;
  event_id: number;
  name: string;
  order_data: number;
  /** Template group it was copied from; null when created on the event. */
  template_group_id: number | null;
}

export interface ChecklistPhotoDTO {
  id: number;
  url: string;           // signed URL, short-lived
  thumbnail_url: string;
  uploaded_by_name: string;
  taken_at: string | null;
  created_at: string;
}

export interface ChecklistItemDTO {
  id: number;
  event_id: number;
  group_id: number;
  template_id: number | null;
  title: string;
  is_required: boolean;
  requires_photo: boolean;
  requires_report: boolean;
  status: ChecklistStatusDTO;
  /** Report / description written when ticking, or the reason for N/A / Issue. */
  note: string | null;
  photos: ChecklistPhotoDTO[];
  due_date: string | null; // YYYY-MM-DD
  assignee_user_id: number | null;
  assignee_name: string | null;
  status_by_name: string | null;
  status_at: string | null;
  order_data: number;
}

export interface ChecklistItemPayload {
  group_id: number;
  title: string;
  is_required?: boolean;
  requires_photo?: boolean;
  requires_report?: boolean;
  due_date?: string | null;
  assignee_user_id?: number | null;
}

export interface ChecklistActivityDTO {
  at: string;
  by_name: string;
  action: 'created' | 'status' | 'unchecked' | 'photo' | 'photo_removed' | 'note' | 'assigned' | 'edited' | 'email_sent' | 'signed_off' | 'reopened';
  /** e.g. the new / previous status, the assignee name, the number of e-mail recipients. */
  detail: string | null;
}

export interface GroupSignOffDTO {
  id: number;
  event_id: number;
  group_id: number;
  role: 'supervisor' | 'client';
  name: string;
  signed_by_user_id: number | null;
  signature_url: string | null;
  note: string | null;
  signed_at: string;
}

export interface EventChecklistDTO {
  event_id: number;
  groups: ChecklistGroupDTO[];
  items: ChecklistItemDTO[];
  sign_offs: GroupSignOffDTO[];
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
  /** Required tasks still open. */
  required_open: number;
  /** Open tasks assigned to the requesting user. */
  my_open_items: number;
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
  lock_after_sign_off: boolean;
  notify_admins_enabled: boolean;
  notify_admins_when: 'all' | 'required';
  due_dates_enabled: boolean;
  assignees_enabled: boolean;
  allow_extra_tasks: boolean;
  delete_permission: 'everyone' | 'admin' | 'nobody';
}
