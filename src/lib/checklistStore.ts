import { useSyncExternalStore } from 'react';
import {
  CHECKLIST_STAGES as SAMPLE_STAGES,
  INITIAL_TEMPLATES as SAMPLE_TEMPLATES,
  addDays,
  type ChecklistItem,
  type ChecklistStage,
  type ChecklistTemplateItem,
  type StageSignOff,
} from '../data/eventChecklistMock';

// Event Checklist — PREVIEW store (owner approved mock data, 2026-11-20).
// One store for the Event Checklist page AND the Checklist view inside Event Detail, so both
// always show the same data. Events and stages are the real ones from the API
// (/v2/event-filter, /v1/event/{id}, /v1/event-status/get-all); the checklist itself
// (templates, tasks, photos, sign-offs) lives only in this browser (localStorage) until the
// backend in src/hooks/api/eventChecklistContract.ts exists. Not shared between users or devices.

export const CHECKLIST_STORAGE_KEY = 'emi.checklist.v1';

export interface ChecklistState {
  version: 1;
  templates: ChecklistTemplateItem[];
  items: ChecklistItem[];
  signOffs: StageSignOff[];
  nextId: number;
  /** Sample templates are copied onto the tenant's real stages once. */
  templatesSeeded: boolean;
}

/** What the checklist needs to know about a real event. */
export interface ChecklistEventRef {
  id: number;
  name: string;
  venue: string;
  /** yyyy-mm-dd, '' when unknown (no due dates then). */
  startDate: string;
  /** Real Event Status id the event is at, or null when unknown. */
  currentStageId: number | null;
}

const EMPTY: ChecklistState = { version: 1, templates: [], items: [], signOffs: [], nextId: 10_000, templatesSeeded: false };

function load(): ChecklistState {
  try {
    const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ChecklistState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.templates)) return EMPTY;
    return { ...EMPTY, ...parsed, signOffs: Array.isArray(parsed.signOffs) ? parsed.signOffs : [] };
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

/** Reserves `count` ids for new items / templates / sign-offs. */
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

/** Real Event Status list → checklist stages, numbered 1…n in pipeline order. */
export function toChecklistStages(statuses: Array<{ id: number; name: string; order_data?: number }>): ChecklistStage[] {
  return [...statuses]
    .sort((a, b) => (a.order_data ?? 0) - (b.order_data ?? 0))
    .map((status, index) => ({ id: Number(status.id), order: index + 1, name: status.name }));
}

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Maps a sample stage to a real stage: same name, then name contained, then same relative position. */
function mapSampleStage(sample: ChecklistStage, real: ChecklistStage[]): number {
  const name = norm(sample.name);
  const exact = real.find((stage) => norm(stage.name) === name);
  if (exact) return exact.id;
  const partial = real.find((stage) => norm(stage.name).includes(name) || name.includes(norm(stage.name)));
  if (partial) return partial.id;
  const index = SAMPLE_STAGES.findIndex((stage) => stage.id === sample.id);
  const position = Math.round((index * (real.length - 1)) / Math.max(1, SAMPLE_STAGES.length - 1));
  return real[Math.min(real.length - 1, Math.max(0, position))].id;
}

/** First time real stages are known: copy the sample templates onto them so the preview is not empty. */
export function seedTemplates(stages: ChecklistStage[]) {
  if (state.templatesSeeded || stages.length === 0) return;
  const firstId = takeIds(SAMPLE_TEMPLATES.length);
  const templates = SAMPLE_TEMPLATES.map((template, index) => {
    const sample = SAMPLE_STAGES.find((stage) => stage.id === template.stageId) ?? SAMPLE_STAGES[0];
    return { ...template, id: firstId + index, stageId: mapSampleStage(sample, stages) };
  });
  updateChecklist((current) => ({ ...current, templates: [...current.templates, ...templates], templatesSeeded: true }));
}

/**
 * Gives a real event its checklist the first time it is opened: a copy of the templates of
 * every stage that exists (like the backend will do on event creation). Copy, not link:
 * later template edits do not change an event that already has its checklist.
 */
export function ensureEventChecklist(event: ChecklistEventRef, stages: ChecklistStage[], createdBy = 'System') {
  if (!state.templatesSeeded || state.items.some((item) => item.eventId === event.id)) return;
  const stageIds = new Set(stages.map((stage) => stage.id));
  const templates = state.templates.filter((template) => stageIds.has(template.stageId));
  if (!templates.length) return;
  const firstId = takeIds(templates.length);
  const now = new Date().toISOString();
  const items: ChecklistItem[] = templates.map((template, index) => ({
    id: firstId + index,
    eventId: event.id,
    stageId: template.stageId,
    templateId: template.id,
    title: template.title,
    required: template.required,
    requiresPhoto: template.requiresPhoto,
    status: 'open',
    note: '',
    photos: [],
    dueDate: template.dueOffsetDays !== null && /^\d{4}-\d{2}-\d{2}$/.test(event.startDate) ? addDays(event.startDate, template.dueOffsetDays) : null,
    assignee: template.role ?? null,
    statusBy: null,
    statusAt: null,
    activity: [{ at: now, by: createdBy, action: 'created', detail: 'template' }],
  }));
  updateChecklist((current) => ({ ...current, items: [...current.items, ...items] }));
}

/** Progress of one event, for list rows and the Event Detail switch. */
export function summarizeEvent(eventId: number, currentStageId: number | null, items: ChecklistItem[], today: string) {
  const own = items.filter((item) => item.eventId === eventId);
  const resolved = own.filter((item) => item.status === 'done' || item.status === 'na').length;
  const overdue = own.filter((item) => item.status !== 'done' && item.status !== 'na' && item.dueDate && item.dueDate < today).length;
  const issues = own.filter((item) => item.status === 'issue').length;
  const blocking = own.filter((item) => item.stageId === currentStageId && item.required && item.status !== 'done' && item.status !== 'na').length;
  return { total: own.length, resolved, overdue, issues, blocking, percent: own.length ? Math.round((resolved / own.length) * 100) : 0 };
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
