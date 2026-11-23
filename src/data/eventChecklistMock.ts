// Event Checklist — types and SAMPLE templates for the preview (owner approved mock data, 2026-11-20).
// Replace with the API described in src/hooks/api/eventChecklistContract.ts once the backend is ready.
//
// v2 (owner 2026-11-23): tasks are organised in free GROUPS instead of event stages. A group is just
// a named section ("Persiapan", "Loading", "Hari H", …) that users create, rename and delete.
// Each task can be assigned to a user, and can require a photo and/or a written report before it
// can be ticked. Unticking is allowed and is recorded in the task history.

/** Free group (section) of tasks inside one event's checklist. */
export interface ChecklistGroup {
  id: number;
  eventId: number;
  name: string;
  order: number;
  /** Template group it was copied from, null when created on the event. */
  templateGroupId: number | null;
}

/** Group of the tenant-wide templates. Every new event gets a copy of every template group. */
export interface ChecklistTemplateGroup {
  id: number;
  name: string;
  order: number;
}

export interface ChecklistTemplateItem {
  id: number;
  groupId: number;
  title: string;
  required: boolean;
  /** Ticking needs at least one photo (when photos are enabled in settings). */
  requiresPhoto: boolean;
  /** Ticking needs a written report / description. */
  requiresReport: boolean;
  /** Days relative to the event start. Negative = before. Null = no due date. */
  dueOffsetDays: number | null;
}

/** open = to do · done = completed · na = not applicable (skipped with a reason) · issue = problem reported. */
export type ChecklistStatus = 'open' | 'done' | 'na' | 'issue';

export interface ChecklistPhoto {
  id: number;
  url: string;
  name: string;
  by: string;
  at: string;
}

export interface ChecklistActivity {
  at: string;
  by: string;
  /** i18n key suffix under eventChecklist.activity.* */
  action: 'created' | 'status' | 'unchecked' | 'photo' | 'photoRemoved' | 'note' | 'assigned' | 'edited' | 'emailQueued' | 'signedOff' | 'reopened';
  detail?: string;
}

export interface ChecklistItem {
  id: number;
  eventId: number;
  groupId: number;
  templateId: number | null;
  title: string;
  required: boolean;
  requiresPhoto: boolean;
  requiresReport: boolean;
  status: ChecklistStatus;
  /** The report / description written when the task was done (or the reason for N/A / Issue). */
  note: string;
  photos: ChecklistPhoto[];
  dueDate: string | null;
  /** Assigned user (from /v1/get-all-user). The name is kept so the row still reads well if the user is removed. */
  assigneeId: number | null;
  assignee: string | null;
  /** Who/when the current status was set (null while open). */
  statusBy: string | null;
  statusAt: string | null;
  activity: ChecklistActivity[];
}

/** Sign-off of one group of one event. */
export interface GroupSignOff {
  id: number;
  eventId: number;
  groupId: number;
  role: 'supervisor' | 'client';
  name: string;
  /** PNG data URL of the drawn signature, or null when signatures are not required. */
  signature: string | null;
  note: string;
  at: string;
}

/** A task counts as resolved when it is Done or Not applicable. */
export const isResolved = (item: Pick<ChecklistItem, 'status'>) => item.status === 'done' || item.status === 'na';

function isoDay(offsetDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const todayIso = () => isoDay(0);

/** Sample template groups, copied into the preview store the first time it is used. */
export const SAMPLE_TEMPLATE_GROUPS: ChecklistTemplateGroup[] = [
  { id: 1, name: 'Planning', order: 1 },
  { id: 2, name: 'Preparation & logistics', order: 2 },
  { id: 3, name: 'On-site setup', order: 3 },
  { id: 4, name: 'After the event', order: 4 },
];

export const SAMPLE_TEMPLATES: ChecklistTemplateItem[] = [
  { id: 101, groupId: 1, title: 'Confirm event brief and guest count with client', required: true, requiresPhoto: false, requiresReport: true, dueOffsetDays: -21 },
  { id: 102, groupId: 1, title: 'Assign area and sub-area for each zone', required: false, requiresPhoto: false, requiresReport: false, dueOffsetDays: -18 },
  { id: 103, groupId: 1, title: 'Send quotation for approval', required: true, requiresPhoto: false, requiresReport: false, dueOffsetDays: -17 },
  { id: 104, groupId: 2, title: 'Lock the item list (no more changes from client)', required: true, requiresPhoto: false, requiresReport: false, dueOffsetDays: -7 },
  { id: 105, groupId: 2, title: 'Confirm rent and outsource vendors', required: true, requiresPhoto: false, requiresReport: true, dueOffsetDays: -6 },
  { id: 106, groupId: 2, title: 'Check broken units and request replacements', required: false, requiresPhoto: true, requiresReport: true, dueOffsetDays: -5 },
  { id: 107, groupId: 2, title: 'Book truck and driver for loading', required: true, requiresPhoto: false, requiresReport: false, dueOffsetDays: -2 },
  { id: 108, groupId: 3, title: 'Walk-through with client on site', required: true, requiresPhoto: true, requiresReport: false, dueOffsetDays: 0 },
  { id: 109, groupId: 3, title: 'Take setup photos for the report', required: false, requiresPhoto: true, requiresReport: false, dueOffsetDays: 0 },
  { id: 110, groupId: 4, title: 'Report broken or missing items', required: true, requiresPhoto: true, requiresReport: true, dueOffsetDays: 1 },
  { id: 111, groupId: 4, title: 'Return rented items to vendors', required: true, requiresPhoto: true, requiresReport: false, dueOffsetDays: 3 },
  { id: 112, groupId: 4, title: 'Send final invoice', required: false, requiresPhoto: false, requiresReport: false, dueOffsetDays: 5 },
];
