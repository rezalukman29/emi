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
  /** Days relative to the event start. Negative = before. Null = no due date. */
  dueOffsetDays: number | null;
  role?: string;
}

export interface ChecklistItem {
  id: number;
  eventId: number;
  stageId: number;
  templateId: number | null;
  title: string;
  required: boolean;
  done: boolean;
  dueDate: string | null;
  assignee: string | null;
  doneBy: string | null;
  doneAt: string | null;
}

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
  { id: 101, stageId: 2, title: 'Confirm event brief and guest count with client', required: true, dueOffsetDays: -21, role: 'Event lead' },
  { id: 102, stageId: 2, title: 'Assign area and sub-area for each zone', required: false, dueOffsetDays: -18, role: 'Event lead' },
  { id: 103, stageId: 2, title: 'Send quotation for approval', required: true, dueOffsetDays: -17, role: 'Admin' },
  { id: 104, stageId: 3, title: 'Lock the item list (no more changes from client)', required: true, dueOffsetDays: -7, role: 'Event lead' },
  { id: 105, stageId: 3, title: 'Confirm rent and outsource vendors', required: true, dueOffsetDays: -6, role: 'Purchasing' },
  { id: 106, stageId: 3, title: 'Check broken units and request replacements', required: false, dueOffsetDays: -5, role: 'Warehouse' },
  { id: 107, stageId: 4, title: 'Book truck and driver for loading', required: true, dueOffsetDays: -2, role: 'Logistics' },
  { id: 108, stageId: 4, title: 'Scan every item out of the warehouse', required: true, dueOffsetDays: -1, role: 'Warehouse' },
  { id: 109, stageId: 5, title: 'Walk-through with client on site', required: true, dueOffsetDays: 0, role: 'Event lead' },
  { id: 110, stageId: 5, title: 'Take setup photos for the report', required: false, dueOffsetDays: 0, role: 'Crew' },
  { id: 111, stageId: 6, title: 'Assign on-site crew for the event day', required: false, dueOffsetDays: 0, role: 'Event lead' },
  { id: 112, stageId: 7, title: 'Scan every item back in', required: true, dueOffsetDays: 1, role: 'Warehouse' },
  { id: 113, stageId: 7, title: 'Report broken or missing items', required: true, dueOffsetDays: 1, role: 'Warehouse' },
  { id: 114, stageId: 8, title: 'Return rented items to vendors', required: true, dueOffsetDays: 3, role: 'Purchasing' },
  { id: 115, stageId: 8, title: 'Send final invoice', required: false, dueOffsetDays: 5, role: 'Admin' },
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

/** Builds each event's checklist from the templates, like the backend would on event creation. */
function buildInitialItems(): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  let nextId = 1000;
  for (const event of INITIAL_EVENTS) {
    const current = CHECKLIST_STAGES.find((stage) => stage.id === event.currentStageId)?.order ?? 0;
    for (const template of INITIAL_TEMPLATES) {
      const stageOrder = CHECKLIST_STAGES.find((stage) => stage.id === template.stageId)?.order ?? 0;
      const pastStage = stageOrder < current;
      // In the current stage, mark roughly every other item done to show partial progress.
      const done = pastStage || (stageOrder === current && template.id % 2 === 0);
      items.push({
        id: nextId++,
        eventId: event.id,
        stageId: template.stageId,
        templateId: template.id,
        title: template.title,
        required: template.required,
        done,
        dueDate: template.dueOffsetDays === null ? null : addDays(event.startDate, template.dueOffsetDays),
        assignee: template.role ? ASSIGNEES[template.role] ?? null : null,
        doneBy: done ? (template.role ? ASSIGNEES[template.role] ?? 'Admin' : 'Admin') : null,
        doneAt: done ? `${addDays(event.startDate, template.dueOffsetDays ?? 0)}T10:00:00` : null,
      });
    }
  }
  items.push({
    id: nextId++, eventId: 1, stageId: 3, templateId: null, title: 'Order extra fairy lights for the arch (client request)',
    required: false, done: false, dueDate: isoDay(1), assignee: 'Darmian', doneBy: null, doneAt: null,
  });
  return items;
}

export const INITIAL_ITEMS: ChecklistItem[] = buildInitialItems();
