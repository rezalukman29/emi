// Mock data for the Event Checklist page. Replace with the API described in
// src/hooks/api/eventChecklistContract.ts once the backend is ready.
// Dates are generated relative to "today" so overdue/upcoming states always look realistic.

export interface ChecklistStage {
  id: number;
  order: number;
  name: string;
}

export interface ChecklistTemplateItem {
  id: number;
  stageId: number;
  title: string;
  required: boolean;
  /** Task cannot be marked Done without at least one photo (when photos are enabled in settings). */
  requiresPhoto: boolean;
  /** Days relative to the event start. Negative = before. Null = no due date. */
  dueOffsetDays: number | null;
  role?: string;
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
  action: 'created' | 'status' | 'photo' | 'photoRemoved' | 'note' | 'signedOff' | 'reopened';
  detail?: string;
}

export interface ChecklistItem {
  id: number;
  eventId: number;
  stageId: number;
  templateId: number | null;
  title: string;
  required: boolean;
  requiresPhoto: boolean;
  status: ChecklistStatus;
  note: string;
  photos: ChecklistPhoto[];
  dueDate: string | null;
  assignee: string | null;
  /** Who/when the current status was set (null while open). */
  statusBy: string | null;
  statusAt: string | null;
  activity: ChecklistActivity[];
}

export interface StageSignOff {
  id: number;
  eventId: number;
  stageId: number;
  role: 'supervisor' | 'client';
  name: string;
  /** PNG/SVG data URL of the drawn signature, or null when signatures are not required. */
  signature: string | null;
  note: string;
  at: string;
}

/** A task counts as resolved when it is Done or Not applicable. */
export const isResolved = (item: Pick<ChecklistItem, 'status'>) => item.status === 'done' || item.status === 'na';

export interface ChecklistEvent {
  id: number;
  name: string;
  client: string;
  venue: string;
  startDate: string;
  currentStageId: number;
}

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

export const CHECKLIST_STAGES: ChecklistStage[] = [
  { id: 1, order: 0, name: 'Step Zero' },
  { id: 2, order: 1, name: 'Created by admin' },
  { id: 3, order: 2, name: 'Preparing items' },
  { id: 4, order: 3, name: 'Waiting scan in' },
  { id: 5, order: 4, name: 'Finish setup' },
  { id: 6, order: 5, name: 'Event running' },
  { id: 7, order: 6, name: 'Waiting scan out' },
  { id: 8, order: 7, name: 'Finished' },
];

export const INITIAL_TEMPLATES: ChecklistTemplateItem[] = [
  { id: 101, stageId: 2, title: 'Confirm event brief and guest count with client', requiresPhoto: false, required: true, dueOffsetDays: -21, role: 'Event lead' },
  { id: 102, stageId: 2, title: 'Assign area and sub-area for each zone', requiresPhoto: false, required: false, dueOffsetDays: -18, role: 'Event lead' },
  { id: 103, stageId: 2, title: 'Send quotation for approval', requiresPhoto: false, required: true, dueOffsetDays: -17, role: 'Admin' },
  { id: 104, stageId: 3, title: 'Lock the item list (no more changes from client)', requiresPhoto: false, required: true, dueOffsetDays: -7, role: 'Event lead' },
  { id: 105, stageId: 3, title: 'Confirm rent and outsource vendors', requiresPhoto: false, required: true, dueOffsetDays: -6, role: 'Purchasing' },
  { id: 106, stageId: 3, title: 'Check broken units and request replacements', requiresPhoto: true, required: false, dueOffsetDays: -5, role: 'Warehouse' },
  { id: 107, stageId: 4, title: 'Book truck and driver for loading', requiresPhoto: false, required: true, dueOffsetDays: -2, role: 'Logistics' },
  { id: 108, stageId: 4, title: 'Scan every item out of the warehouse', requiresPhoto: true, required: true, dueOffsetDays: -1, role: 'Warehouse' },
  { id: 109, stageId: 5, title: 'Walk-through with client on site', requiresPhoto: true, required: true, dueOffsetDays: 0, role: 'Event lead' },
  { id: 110, stageId: 5, title: 'Take setup photos for the report', requiresPhoto: true, required: false, dueOffsetDays: 0, role: 'Crew' },
  { id: 111, stageId: 6, title: 'Assign on-site crew for the event day', requiresPhoto: false, required: false, dueOffsetDays: 0, role: 'Event lead' },
  { id: 112, stageId: 7, title: 'Scan every item back in', requiresPhoto: true, required: true, dueOffsetDays: 1, role: 'Warehouse' },
  { id: 113, stageId: 7, title: 'Report broken or missing items', requiresPhoto: true, required: true, dueOffsetDays: 1, role: 'Warehouse' },
  { id: 114, stageId: 8, title: 'Return rented items to vendors', requiresPhoto: true, required: true, dueOffsetDays: 3, role: 'Purchasing' },
  { id: 115, stageId: 8, title: 'Send final invoice', requiresPhoto: false, required: false, dueOffsetDays: 5, role: 'Admin' },
];

export const INITIAL_EVENTS: ChecklistEvent[] = [
  { id: 1, name: 'Wedding Spring Garden', client: 'Dewi & Raka', venue: 'Bali Garden Hall', startDate: isoDay(4), currentStageId: 3 },
  { id: 2, name: 'Corporate Gala Nusantara', client: 'PT Nusantara Energi', venue: 'Jakarta Convention Center', startDate: isoDay(1), currentStageId: 4 },
  { id: 3, name: 'Product Launch Aurora', client: 'Aurora Cosmetics', venue: 'Surabaya Grand Ballroom', startDate: isoDay(19), currentStageId: 2 },
  { id: 4, name: 'Heritage Night Yogyakarta', client: 'Dinas Pariwisata DIY', venue: 'Prambanan Open Stage', startDate: isoDay(-2), currentStageId: 7 },
];

const ASSIGNEES: Record<string, string> = {
  'Event lead': 'Dewi Anjani',
  Admin: 'Novi',
  Purchasing: 'Darmian',
  Warehouse: 'Anto',
  Logistics: 'Anto',
  Crew: 'Rizky',
};

function placeholderPhoto(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="hsl(${hue},45%,82%)"/><rect x="24" y="150" width="272" height="60" rx="8" fill="hsl(${hue},40%,70%)"/><circle cx="250" cy="70" r="28" fill="hsl(${hue},55%,92%)"/><text x="24" y="44" font-family="sans-serif" font-size="18" fill="hsl(${hue},40%,30%)">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const MOCK_SIGNATURE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><path d="M20 70 C 40 20, 60 20, 70 60 S 100 90, 120 50 S 150 20, 165 55 S 200 80, 215 45 L 240 60 L 280 40" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/></svg>')}`;

/** Builds each event's checklist from the templates, like the backend would on event creation. */
function buildInitialItems(): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  let nextId = 1000;
  let photoId = 1;
  for (const event of INITIAL_EVENTS) {
    const current = CHECKLIST_STAGES.find((stage) => stage.id === event.currentStageId)?.order ?? 0;
    for (const template of INITIAL_TEMPLATES) {
      const stageOrder = CHECKLIST_STAGES.find((stage) => stage.id === template.stageId)?.order ?? 0;
      const pastStage = stageOrder < current;
      // In the current stage, mark roughly every other item done to show partial progress.
      const done = pastStage || (stageOrder === current && template.id % 2 === 0);
      const who = template.role ? ASSIGNEES[template.role] ?? 'Admin' : 'Admin';
      const at = `${addDays(event.startDate, template.dueOffsetDays ?? 0)}T10:00:00`;
      const photos: ChecklistPhoto[] = done && template.requiresPhoto
        ? [{ id: photoId++, url: placeholderPhoto(template.title.slice(0, 26), (template.id * 47) % 360), name: 'photo.jpg', by: who, at }]
        : [];
      items.push({
        id: nextId++,
        eventId: event.id,
        stageId: template.stageId,
        templateId: template.id,
        title: template.title,
        required: template.required,
        requiresPhoto: template.requiresPhoto,
        status: done ? 'done' : 'open',
        note: '',
        photos,
        dueDate: template.dueOffsetDays === null ? null : addDays(event.startDate, template.dueOffsetDays),
        assignee: template.role ? ASSIGNEES[template.role] ?? null : null,
        statusBy: done ? who : null,
        statusAt: done ? at : null,
        activity: [
          { at: `${addDays(event.startDate, -30)}T09:00:00`, by: 'System', action: 'created', detail: 'template' },
          ...(photos.length ? [{ at, by: who, action: 'photo' as const }] : []),
          ...(done ? [{ at, by: who, action: 'status' as const, detail: 'done' }] : []),
        ],
      });
    }
  }
  // Field examples on the Wedding event (stage "Preparing items").
  items.push({
    id: nextId++, eventId: 1, stageId: 3, templateId: null, title: 'Order extra fairy lights for the arch (client request)',
    required: false, requiresPhoto: false, status: 'open', note: '', photos: [], dueDate: isoDay(1), assignee: 'Darmian',
    statusBy: null, statusAt: null, activity: [{ at: `${isoDay(-2)}T14:20:00`, by: 'Dewi Anjani', action: 'created', detail: 'manual' }],
  });
  const brokenCheck = items.find((item) => item.eventId === 2 && item.templateId === 107);
  if (brokenCheck) {
    brokenCheck.status = 'issue';
    brokenCheck.note = 'Truck from vendor cancelled. Looking for a replacement, need confirmation before 15:00.';
    brokenCheck.statusBy = 'Anto';
    brokenCheck.statusAt = `${isoDay(0)}T08:15:00`;
    brokenCheck.activity.push({ at: brokenCheck.statusAt, by: 'Anto', action: 'status', detail: 'issue' });
  }
  return items;
}

export const INITIAL_ITEMS: ChecklistItem[] = buildInitialItems();

/** Past stages of the sample events are already signed off. */
export const INITIAL_SIGNOFFS: StageSignOff[] = (() => {
  const list: StageSignOff[] = [];
  let id = 1;
  for (const event of INITIAL_EVENTS) {
    const current = CHECKLIST_STAGES.find((stage) => stage.id === event.currentStageId)?.order ?? 0;
    for (const stage of CHECKLIST_STAGES) {
      if (stage.order >= current || !INITIAL_TEMPLATES.some((template) => template.stageId === stage.id)) continue;
      list.push({ id: id++, eventId: event.id, stageId: stage.id, role: 'supervisor', name: 'Dewi Anjani', signature: MOCK_SIGNATURE, note: '', at: `${addDays(event.startDate, -10 + stage.order)}T16:30:00` });
    }
  }
  return list;
})();
