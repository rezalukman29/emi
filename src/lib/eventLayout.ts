import { useSyncExternalStore } from 'react';
import { newId, type Layout, type Shape, type ShapeKind, type ZoneRole } from './warehouseLayout';

// Event layout map (owner 2026-11-27: "use the same concept to help with an event layout map, reachable from every
// event detail"). Same model + canvas as the warehouse layout. PREVIEW: stored in THIS browser
// (localStorage `emi.eventLayout.v1`, per event) until the API in docs/api-backlog.md §17 exists.
//
// Items are linked to a zone by (1) a manual assignment (`assign[eventItemId] = zoneId`) or (2) the item's event
// area / sub-area name matching the zone's code or name (case-insensitive). Event areas come from the event lines.

export const EVENT_BLOCKING: ShapeKind[] = ['stage', 'table', 'decor', 'wall', 'column'];
export const EVENT_ROLES: ZoneRole[] = ['ceremony', 'reception', 'foyer', 'photo', 'buffet', 'vip', 'backstage', 'loading', 'other'];

export interface EventLayoutItem { id: number; name: string; qty: number; area: string; subArea: string; scanOut: number; scanIn: number; photo?: string }

interface State { version: 1; layouts: Record<number, Layout & { venue?: string }> }
const KEY = 'emi.eventLayout.v1';
const EMPTY: State = { version: 1, layouts: {} };
function load(): State { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null; return p?.version === 1 ? p : EMPTY; } catch { return EMPTY; } }
let state = load();
const listeners = new Set<() => void>();
function emit(): boolean { let ok = true; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { ok = false; } listeners.forEach((l) => l()); return ok; }
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((l) => l()); } });
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useEventLayout(eventId: number) { return useSyncExternalStore(subscribe, () => state.layouts[eventId] ?? null); }
export function useEventLayouts() { return useSyncExternalStore(subscribe, () => state.layouts); }
export function saveEventLayout(eventId: number, layout: Layout & { venue?: string }): boolean {
  state = { ...state, layouts: { ...state.layouts, [eventId]: { ...layout, warehouseId: eventId, updatedAt: new Date().toISOString() } } };
  return emit();
}
export function deleteEventLayout(eventId: number) { const next = { ...state.layouts }; delete next[eventId]; state = { ...state, layouts: next }; emit(); }

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const ROLE_HINTS: Array<[RegExp, ZoneRole]> = [
  [/recep|resepsi/i, 'reception'], [/akad|ceremon|holy|pemberkatan|teapai|tea ?pai/i, 'ceremony'], [/foyer|lobby|entrance|gate|welcome/i, 'foyer'],
  [/photo|booth|backdrop/i, 'photo'], [/buffet|food|catering|stall|pondok/i, 'buffet'], [/vip|family|keluarga|bridal|room/i, 'vip'],
  [/backstage|room decor|storage|gudang/i, 'backstage'], [/loading|dock/i, 'loading'],
];
export const guessRole = (name: string): ZoneRole => ROLE_HINTS.find(([re]) => re.test(name))?.[1] ?? 'other';

/** Distinct event areas (from the event lines), biggest first. */
export function eventAreas(items: EventLayoutItem[]) {
  const map = new Map<string, { name: string; lines: number; qty: number }>();
  for (const it of items) {
    const name = (it.area || '').trim();
    if (!name || /^unassigned$/i.test(name)) continue;
    const k = norm(name);
    const cur = map.get(k) ?? { name, lines: 0, qty: 0 };
    cur.lines += 1; cur.qty += it.qty; map.set(k, cur);
  }
  return [...map.values()].sort((a, b) => b.lines - a.lines);
}

export function zoneForItem(layout: Layout, item: EventLayoutItem): Shape | null {
  const manual = layout.assign[item.id];
  if (manual) return layout.shapes.find((s) => s.id === manual) ?? null;
  const keys = [item.subArea, item.area].filter(Boolean).map(norm);
  const linkable = (s: Shape) => s.kind !== 'wall' && s.kind !== 'column' && s.kind !== 'dock' && s.kind !== 'aisle';
  for (const k of keys) {
    // zones first, then stage / decor / tables
    const hit = layout.shapes.find((s) => s.kind === 'zone' && (norm(s.code) === k || norm(s.name) === k))
      ?? layout.shapes.find((s) => linkable(s) && (norm(s.code) === k || norm(s.name) === k));
    if (hit) return hit;
  }
  return null;
}

export interface ZoneStat { items: EventLayoutItem[]; qty: number; out: number; back: number }
export function statsByZone(layout: Layout, items: EventLayoutItem[]) {
  const map = new Map<string, ZoneStat>();
  let unplaced = 0;
  for (const it of items) {
    const z = zoneForItem(layout, it);
    if (!z) { unplaced += 1; continue; }
    const s = map.get(z.id) ?? { items: [], qty: 0, out: 0, back: 0 };
    s.items.push(it); s.qty += it.qty; s.out += Math.min(it.qty, it.scanOut); s.back += Math.min(it.qty, it.scanIn);
    map.set(z.id, s);
  }
  return { map, unplaced };
}

const zone = (role: ZoneRole, name: string, x: number, y: number, w: number, h: number, code = name): Shape => ({ id: newId(), kind: 'zone', role, code, name, x, y, w, h, levels: 1, capacity: 0 });
const thing = (kind: ShapeKind, name: string, x: number, y: number, w: number, h: number, extra: Partial<Shape> = {}): Shape => ({ id: newId(), kind, code: name.toUpperCase().replace(/\s+/g, '-'), name, x, y, w, h, levels: 1, capacity: 0, ...extra });

/** Round tables in a grid. */
export function tableGrid(spec: { x: number; y: number; rows: number; cols: number; size: number; gap: number; seats: number; start: number; round: boolean }): Shape[] {
  const out: Shape[] = [];
  let n = spec.start;
  for (let r = 0; r < spec.rows; r += 1) for (let c = 0; c < spec.cols; c += 1) {
    out.push(thing('table', `T${n}`, spec.x + c * (spec.size + spec.gap), spec.y + r * (spec.size + spec.gap), spec.round ? spec.size : spec.size * 1.5, spec.size, { round: spec.round, seats: spec.seats, code: `T${n}` }));
    n += 1;
  }
  return out;
}

export type VenueTemplate = 'ballroom' | 'garden' | 'blank';
/** Venue starting points. Event areas are added as zones (named exactly like the areas, so items link up). */
export function templateEventLayout(eventId: number, kind: VenueTemplate, areas: string[]): Layout {
  const shapes: Shape[] = [];
  const cols = kind === 'garden' ? 60 : 44; const rows = kind === 'garden' ? 40 : 30;
  if (kind === 'ballroom') {
    shapes.push(thing('stage', 'Stage', 14, 1, 16, 4));
    shapes.push(thing('decor', 'Backdrop', 16, 0.5, 12, 0.5));
    shapes.push(thing('aisle', 'Main walkway', 20, 6, 4, 20));
    shapes.push(...tableGrid({ x: 3, y: 7, rows: 4, cols: 4, size: 2, gap: 2, seats: 10, start: 1, round: true }));
    shapes.push(...tableGrid({ x: 26, y: 7, rows: 4, cols: 4, size: 2, gap: 2, seats: 10, start: 17, round: true }));
    shapes.push(zone('buffet', 'Buffet', 1, 24, 12, 4));
    shapes.push(zone('photo', 'Photo booth', 34, 24, 9, 4));
    shapes.push(zone('foyer', 'Foyer', 14, 26, 16, 3));
    shapes.push(thing('dock', 'Entrance', 19, 29, 6, 1));
    shapes.push(thing('dock', 'Loading door', 43, 2, 1, 4));
    [[13, 6], [30, 6], [13, 22], [30, 22]].forEach(([x, y], i) => shapes.push(thing('column', `Pillar ${i + 1}`, x, y, 1, 1, { round: true })));
  } else if (kind === 'garden') {
    shapes.push(zone('ceremony', 'Ceremony', 4, 3, 22, 16));
    shapes.push(thing('stage', 'Altar', 11, 3, 8, 3));
    shapes.push(thing('aisle', 'Aisle', 14, 6, 2, 13));
    shapes.push(zone('reception', 'Reception', 30, 3, 26, 22));
    shapes.push(...tableGrid({ x: 33, y: 9, rows: 3, cols: 5, size: 2, gap: 2.5, seats: 8, start: 1, round: true }));
    shapes.push(thing('stage', 'Band stage', 36, 3, 14, 4));
    shapes.push(zone('buffet', 'Food stalls', 30, 27, 26, 5));
    shapes.push(zone('photo', 'Photo spot', 4, 22, 10, 6));
    shapes.push(zone('foyer', 'Welcome gate', 18, 33, 16, 4));
    shapes.push(thing('dock', 'Entrance', 23, 39, 6, 1));
    shapes.push(thing('dock', 'Loading', 0, 30, 1, 5));
  }
  // event areas as zones, in a strip at the bottom-left (blank) or under the plan (others) — the planner drags them
  const strip = kind === 'blank' ? 2 : rows - 1;
  const extraRows = Math.ceil(areas.length / 4);
  const total = kind === 'blank' ? Math.max(rows, 2 + extraRows * 6) : rows + extraRows * 6;
  areas.forEach((a, i) => {
    if (shapes.some((s) => s.kind === 'zone' && norm(s.name) === norm(a))) return;
    const col = i % 4; const row = Math.floor(i / 4);
    shapes.push(zone(guessRole(a), a, 2 + col * (cols - 4) / 4, (kind === 'blank' ? strip : rows + 1) + row * 6, (cols - 4) / 4 - 1, 5));
  });
  return { warehouseId: eventId, cols, rows: total, shapes, assign: {}, bg: null, updatedAt: '' };
}
