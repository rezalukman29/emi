import { useSyncExternalStore } from 'react';
import {
  SAMPLE_TEMPLATE_GROUPS,
  SAMPLE_TEMPLATES,
  addDays,
  isResolved,
  type ChecklistGroup,
  type ChecklistItem,
  type ChecklistTemplateGroup,
  type ChecklistTemplateItem,
  type GroupSignOff,
} from '../data/eventChecklistMock';

// Event Checklist — PREVIEW store (owner approved mock data, 2026-11-20).
// One store for the Event Checklist page AND the Checklist view inside Event Detail, so both
// always show the same data. Events are the real ones from the API (/v2/event-filter, /v1/event/{id})
// and assignees are real users (/v1/get-all-user); the checklist itself (groups, templates, tasks,
// photos, reports, sign-offs, queued e-mails) lives only in this browser (localStorage) until the
// backend in src/hooks/api/eventChecklistContract.ts exists. Not shared between users or devices.
//
// v2 (owner 2026-11-23): free groups instead of stages. New key, so the v1 preview data
// ("emi.checklist.v1", grouped by stage) is not read any more.

export const CHECKLIST_STORAGE_KEY = 'emi.checklist.v2';

/** E-mail the backend would send to admins when a task is ticked (preview: only listed, never sent). */
export interface QueuedEmail {
  id: number;
  at: string;
  eventId: number;
  eventName: string;
  taskTitle: string;
  by: string;
  /** Admin e-mail addresses at that moment. */
  to: string[];
}

export interface ChecklistState {
  version: 2;
  templateGroups: ChecklistTemplateGroup[];
  templates: ChecklistTemplateItem[];
  groups: ChecklistGroup[];
  items: ChecklistItem[];
  signOffs: GroupSignOff[];
  outbox: QueuedEmail[];
  nextId: number;
  /** Sample templates are copied in once. */
  templatesSeeded: boolean;
}

/** What the checklist needs to know about a real event. */
export interface ChecklistEventRef {
  id: number;
  name: string;
  venue: string;
  /** yyyy-mm-dd, '' when unknown (no due dates then). */
  startDate: string;
  /** Real Event Status id the event is at, or null when unknown (shown for information only). */
  currentStageId: number | null;
}

const EMPTY: ChecklistState = { version: 2, templateGroups: [], templates: [], groups: [], items: [], signOffs: [], outbox: [], nextId: 10_000, templatesSeeded: false };

function load(): ChecklistState {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ChecklistState>;
    if (parsed.version !== 2 || !Array.isArray(parsed.items) || !Array.isArray(parsed.groups)) return EMPTY;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

let state: ChecklistState = load();
let storageFull = false;
const listeners = new Set<() => void>();

function emit() {
  try {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state));
    storageFull = false;
  } catch {
    // Quota exceeded (photos): keep working in memory; the page shows a warning.
    storageFull = true;
  }
  listeners.forEach((listener) => listener());
}

export function updateChecklist(change: (current: ChecklistState) => ChecklistState) {
  state = change(state);
  emit();
}

/** Reserves `count` ids for new rows. */
export function takeIds(count = 1) {
  const first = state.nextId;
  state = { ...state, nextId: first + count };
  return first;
}

window.addEventListener('storage', (event) => {
  if (event.key !== CHECKLIST_STORAGE_KEY) return;
  state = load();
  listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChecklistStore() {
  const current = useSyncExternalStore(subscribe, () => state);
  const full = useSyncExternalStore(subscribe, () => storageFull);
  return { ...current, storageFull: full };
}

/** First use: copy the sample template groups so the preview is not empty. */
export function seedTemplates() {
  if (state.templatesSeeded) return;
  const groupStart = takeIds(SAMPLE_TEMPLATE_GROUPS.length);
  const groupIds = new Map(SAMPLE_TEMPLATE_GROUPS.map((group, index) => [group.id, groupStart + index]));
  const itemStart = takeIds(SAMPLE_TEMPLATES.length);
  updateChecklist((current) => ({
    ...current,
    templateGroups: SAMPLE_TEMPLATE_GROUPS.map((group) => ({ ...group, id: groupIds.get(group.id)! })),
    templates: SAMPLE_TEMPLATES.map((template, index) => ({ ...template, id: itemStart + index, groupId: groupIds.get(template.groupId)! })),
    templatesSeeded: true,
  }));
}

/**
 * Gives a real event its checklist the first time it is seen: a copy of every template group and
 * its tasks (like the backend will do on event creation). Copy, not link: later template edits do
 * not change an event that already has its checklist.
 */
export function ensureEventChecklist(event: ChecklistEventRef, createdBy = 'System') {
  if (!state.templatesSeeded || state.groups.some((group) => group.eventId === event.id)) return;
  const groupsToCopy = [...state.templateGroups].sort((a, b) => a.order - b.order);
  if (!groupsToCopy.length) return;
  const groupStart = takeIds(groupsToCopy.length);
  const groupIds = new Map(groupsToCopy.map((group, index) => [group.id, groupStart + index]));
  const templates = state.templates.filter((template) => groupIds.has(template.groupId));
  const itemStart = takeIds(Math.max(1, templates.length));
  const now = new Date().toISOString();
  const groups: ChecklistGroup[] = groupsToCopy.map((group, index) => ({
    id: groupIds.get(group.id)!, eventId: event.id, name: group.name, order: index + 1, templateGroupId: group.id,
  }));
  const items: ChecklistItem[] = templates.map((template, index) => ({
    id: itemStart + index,
    eventId: event.id,
    groupId: groupIds.get(template.groupId)!,
    templateId: template.id,
    title: template.title,
    required: template.required,
    requiresPhoto: template.requiresPhoto,
    requiresReport: template.requiresReport,
    status: 'open',
    note: '',
    photos: [],
    dueDate: template.dueOffsetDays !== null && /^\d{4}-\d{2}-\d{2}$/.test(event.startDate) ? addDays(event.startDate, template.dueOffsetDays) : null,
    assigneeId: null,
    assignee: null,
    statusBy: null,
    statusAt: null,
    activity: [{ at: now, by: createdBy, action: 'created', detail: 'template' }],
  }));
  updateChecklist((current) => ({ ...current, groups: [...current.groups, ...groups], items: [...current.items, ...items] }));
}

/** Task is assigned to the logged-in user (by id; by name when the id is unknown). */
export function isMine(item: Pick<ChecklistItem, 'assigneeId' | 'assignee'>, me: { id: number | null; name: string }) {
  return me.id !== null && item.assigneeId !== null ? item.assigneeId === me.id : Boolean(item.assignee) && item.assignee === me.name;
}

/** Progress of one event, for list rows and the Event Detail switch. */
export function summarizeEvent(eventId: number, items: ChecklistItem[], today: string, me?: { id: number | null; name: string }) {
  const own = items.filter((item) => item.eventId === eventId);
  const resolved = own.filter(isResolved).length;
  const overdue = own.filter((item) => !isResolved(item) && item.dueDate && item.dueDate < today).length;
  const issues = own.filter((item) => item.status === 'issue').length;
  /** Required tasks that are still open (they block the sign-off of their group). */
  const blocking = own.filter((item) => item.required && !isResolved(item)).length;
  const mine = me ? own.filter((item) => isMine(item, me) && !isResolved(item)).length : 0;
  return { total: own.length, resolved, overdue, issues, blocking, mine, percent: own.length ? Math.round((resolved / own.length) * 100) : 0 };
}

/** Photos are kept as small JPEG data URLs so they survive a reload (preview only). */
export async function photoToDataUrl(file: File, maxSide = 960): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
