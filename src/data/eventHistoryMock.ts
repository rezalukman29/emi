// Event History — PREVIEW data (owner asked for dummy data, 2026-11-23).
// There is no activity-log endpoint yet (see src/hooks/api/eventHistoryContract.ts and
// docs/api-impact-log.md, "Needs API"). The log below is GENERATED from the real event
// (name, dates, venue, PIC, current stage) so it looks plausible, but every entry is made up.
// The same event always gets the same log (seeded by its id).

export type HistoryType = 'event' | 'stage' | 'item' | 'scan' | 'file' | 'checklist';

export interface HistoryEntry {
  id: number;
  /** ISO date-time. */
  at: string;
  by: string;
  type: HistoryType;
  /** i18n key under eventHistory.actions */
  action: string;
  /** Values for the i18n message. */
  values: Record<string, string | number>;
  /** Optional "before → after". */
  change?: { field: string; from: string; to: string };
}

export interface HistoryEventRef {
  id: number;
  name: string;
  createdAt?: string | null;
  eventStart?: string | null;
  address?: string | null;
  pic?: string | null;
  /** Stage names in pipeline order. */
  stages: string[];
  /** Index of the stage the event is at now (-1 when unknown). */
  currentStageIndex: number;
  /** Event is in inventory checking / closed. */
  checking: boolean;
}

function seeded(seed: number) {
  let value = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const PEOPLE = ['Anto Wijaya', 'Rina Halim', 'Budi Santoso', 'Sari Dewi'];
const AREAS = ['Bridal Backdrop', 'Main Stage', 'Entrance Gate', 'Photo Booth', 'Dining Area'];
const ITEMS = ['Meja Kaca Elaine', 'Lampu Mini Charles', 'Kursi Tiffany', 'Ranting putih asorted', 'Karpet merah 10m', 'Standing flower'];
const FILES = ['rundown-final.pdf', 'layout-venue.png', 'quotation-rev2.pdf', 'moodboard.jpg'];

export function buildEventHistory(event: HistoryEventRef): HistoryEntry[] {
  const rand = seeded(event.id || 1);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const people = event.pic?.trim() ? [event.pic.trim(), ...PEOPLE] : PEOPLE;

  const start = Date.parse(event.createdAt ?? '') || Date.parse(event.eventStart ?? '') - 30 * 86_400_000 || Date.now() - 20 * 86_400_000;
  let clock = start;
  const step = (minHours: number, maxHours: number) => {
    clock += Math.round((minHours + rand() * (maxHours - minHours)) * 3_600_000);
    return new Date(Math.min(clock, Date.now() - 60_000)).toISOString();
  };

  const log: HistoryEntry[] = [];
  let id = 1;
  const push = (entry: Omit<HistoryEntry, 'id'>) => log.push({ id: id++, ...entry });

  push({ at: new Date(start).toISOString(), by: people[1] ?? PEOPLE[0], type: 'event', action: 'created', values: { name: event.name } });
  push({ at: step(1, 5), by: people[1] ?? PEOPLE[0], type: 'event', action: 'edited', values: {}, change: { field: 'pic', from: '—', to: event.pic?.trim() || pick(PEOPLE) } });
  if (event.address?.trim()) {
    push({ at: step(2, 20), by: pick(people), type: 'event', action: 'edited', values: {}, change: { field: 'venue', from: 'TBC', to: event.address.trim() } });
  }
  push({ at: step(1, 8), by: pick(people), type: 'file', action: 'fileUploaded', values: { file: pick(FILES) } });

  const reached = event.currentStageIndex >= 0 ? event.currentStageIndex : Math.min(2, event.stages.length - 1);
  const areaCount = 2 + Math.floor(rand() * 3);
  for (let stage = 0; stage <= reached && stage < event.stages.length; stage += 1) {
    if (stage === 0 || stage === 1) {
      for (let index = 0; index < areaCount && stage === 1; index += 1) {
        push({ at: step(1, 6), by: pick(people), type: 'item', action: 'itemsAdded', values: { count: 3 + Math.floor(rand() * 12), area: AREAS[index % AREAS.length] } });
      }
    }
    if (stage === 2) {
      push({ at: step(1, 4), by: pick(people), type: 'item', action: 'ownershipAssigned', values: { count: 4 + Math.floor(rand() * 6), owner: 'Vendor' } });
      push({ at: step(1, 4), by: pick(people), type: 'item', action: 'itemRemoved', values: { item: pick(ITEMS) } });
      push({ at: step(1, 3), by: pick(people), type: 'checklist', action: 'checklistDone', values: { task: 'Confirm loading dock time' } });
    }
    if (stage === 3) {
      const total = 10 + Math.floor(rand() * 20);
      push({ at: step(2, 10), by: pick(people), type: 'scan', action: 'scannedIn', values: { done: total - 2, total } });
      push({ at: step(0.5, 2), by: pick(people), type: 'scan', action: 'scannedIn', values: { done: total, total } });
    }
    if (stage === 5) {
      const total = 10 + Math.floor(rand() * 20);
      push({ at: step(4, 30), by: pick(people), type: 'scan', action: 'scannedOut', values: { done: total, total } });
    }
    if (stage < reached && stage + 1 < event.stages.length) {
      push({ at: step(3, 30), by: pick(people), type: 'stage', action: 'stageMoved', values: {}, change: { field: 'stage', from: event.stages[stage], to: event.stages[stage + 1] } });
    }
  }
  if (event.checking) {
    push({ at: step(2, 12), by: pick(people), type: 'stage', action: 'checkingStarted', values: {} });
    push({ at: step(1, 4), by: pick(people), type: 'item', action: 'brokenReported', values: { item: pick(ITEMS), qty: 1 } });
  }
  push({ at: step(1, 6), by: pick(people), type: 'file', action: 'fileUploaded', values: { file: pick(FILES) } });

  return log.sort((a, b) => b.at.localeCompare(a.at));
}
