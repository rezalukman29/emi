// Event Calendar filters. Pure functions, run in the browser on the data the calendar
// already receives from /v1/event-calendar and /v1/event-calendar/clashes, so no API change.
// Filters that need data the calendar API does not send (stage, lifecycle status, PIC,
// warehouse, item category) are NOT here; see docs/api-impact-log.md (2026-11-20, Event Calendar).

export type ClashView = 'all' | 'shortages';

export interface CalendarFilters {
  search: string;
  locations: string[];
  eventIds: number[];
  itemIds: number[];
  clashView: ClashView;
  /** Only events that share at least one item with another event (after the clash view). */
  onlyWithClashes: boolean;
}

export const EMPTY_CALENDAR_FILTERS: CalendarFilters = {
  search: '',
  locations: [],
  eventIds: [],
  itemIds: [],
  clashView: 'all',
  onlyWithClashes: false,
};

export interface CalEvent { id: number; name: string; location: string; booking_from: string; booking_to: string }
export interface CalDay { date: string; events: CalEvent[] }
export interface CalClash {
  item_id: number;
  item_name: string;
  from: string;
  to: string;
  shortage: number;
  demand: number;
  stock: number;
  events: { id: number; name: string; qty: number }[];
}

const day = (value: string) => value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || value;
const norm = (value: string | null | undefined) => (value || '').toLocaleLowerCase().trim();

/** Number of filters in use, for the badge on the Filter button (search and clash view not counted). */
export function activeFilterCount(f: CalendarFilters) {
  return (f.locations.length ? 1 : 0) + (f.eventIds.length ? 1 : 0) + (f.itemIds.length ? 1 : 0) + (f.onlyWithClashes ? 1 : 0);
}

export function isFiltering(f: CalendarFilters) {
  return activeFilterCount(f) > 0 || f.search.trim() !== '';
}

/** Every distinct event in the month, sorted by name. */
export function monthEvents(days: CalDay[]): CalEvent[] {
  const byId = new Map<number, CalEvent>();
  for (const d of days) for (const e of d.events || []) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function monthLocations(days: CalDay[]): string[] {
  return [...new Set(monthEvents(days).map(e => (e.location || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function monthItems(clashes: CalClash[]): { id: number; name: string }[] {
  const byId = new Map<number, string>();
  for (const c of clashes) if (!byId.has(c.item_id)) byId.set(c.item_id, c.item_name);
  return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export interface FilteredCalendar {
  /** Events kept, by id. */
  eventIds: Set<number>;
  /** Clash rows kept (also respects the clash view). */
  clashes: CalClash[];
  /** Day → events kept that day. */
  eventsByDay: Map<string, CalEvent[]>;
  /** Day → distinct clashing items and short items that day, from the kept clash rows. */
  clashCountByDay: Map<string, { clash: number; short: number }>;
  summary: { events: number; daysWithClashes: number; itemsClashing: number; itemsShort: number };
}

export function filterCalendar(days: CalDay[], clashes: CalClash[], f: CalendarFilters, month: string): FilteredCalendar {
  const q = norm(f.search);
  const all = monthEvents(days);
  const viewRows = clashes.filter(c => f.clashView === 'all' || c.shortage > 0);
  const itemRows = f.itemIds.length ? viewRows.filter(c => f.itemIds.includes(c.item_id)) : viewRows;
  const itemMatch = (c: CalClash) => q !== '' && norm(c.item_name).includes(q);
  const clashEventIds = new Set(itemRows.flatMap(c => c.events.map(e => e.id)));
  const searchItemEventIds = new Set(itemRows.filter(itemMatch).flatMap(c => c.events.map(e => e.id)));

  const keep = new Set<number>();
  for (const e of all) {
    if (f.locations.length && !f.locations.includes((e.location || '').trim())) continue;
    if (f.eventIds.length && !f.eventIds.includes(e.id)) continue;
    // Picking items narrows events to the ones that book those items.
    if (f.itemIds.length && !clashEventIds.has(e.id)) continue;
    if (f.onlyWithClashes && !clashEventIds.has(e.id)) continue;
    if (q && !norm(e.name).includes(q) && !norm(e.location).includes(q) && !searchItemEventIds.has(e.id)) continue;
    keep.add(e.id);
  }

  // Clash rows: must involve a kept event when locations / events are picked. With a search,
  // rows whose item name matches win (searching "chair" lists only chairs); otherwise rows of the
  // events the search found are kept.
  const searchHitsItems = q !== '' && itemRows.some(itemMatch);
  const keptClashes = itemRows.filter(c => {
    const involvesKept = c.events.some(e => keep.has(e.id));
    if ((f.locations.length || f.eventIds.length) && !involvesKept) return false;
    if (q) return searchHitsItems ? itemMatch(c) : involvesKept;
    return true;
  });

  const eventsByDay = new Map<string, CalEvent[]>();
  for (const d of days) eventsByDay.set(day(d.date), (d.events || []).filter(e => keep.has(e.id)));

  const clashSets = new Map<string, { clash: Set<number>; short: Set<number> }>();
  for (const c of keptClashes) {
    const from = day(c.from);
    const to = day(c.to);
    for (const date = new Date(`${from}T00:00:00Z`); date.toISOString().slice(0, 10) <= to; date.setUTCDate(date.getUTCDate() + 1)) {
      const iso = date.toISOString().slice(0, 10);
      if (!iso.startsWith(month)) continue;
      const entry = clashSets.get(iso) ?? { clash: new Set<number>(), short: new Set<number>() };
      entry.clash.add(c.item_id);
      if (c.shortage > 0) entry.short.add(c.item_id);
      clashSets.set(iso, entry);
    }
  }
  const clashCountByDay = new Map([...clashSets].map(([iso, s]) => [iso, { clash: s.clash.size, short: s.short.size }]));

  return {
    eventIds: keep,
    clashes: keptClashes,
    eventsByDay,
    clashCountByDay,
    summary: {
      events: keep.size,
      daysWithClashes: clashCountByDay.size,
      itemsClashing: new Set(keptClashes.map(c => c.item_id)).size,
      itemsShort: new Set(keptClashes.filter(c => c.shortage > 0).map(c => c.item_id)).size,
    },
  };
}
