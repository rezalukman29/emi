import { useSyncExternalStore } from 'react';
import { bbox, isPlainRect, newId, outlinePreset, pointInPolygon, shapePolygon, type Layout, type Shape, type ShapeForm, type ShapeKind, type ZoneRole } from './warehouseLayout';

// Event layout map (owner 2026-11-27). Same model + canvas as the warehouse layout. PREVIEW: stored in THIS browser
// (localStorage `emi.eventLayout.v2`, per event) until the API in docs/api-backlog.md §17 exists.
//
// v2 (owner: "think more realistically: an event has several areas, and arrangements are not always square"):
// an event plan has several SPACES (e.g. Akad room, Main ballroom, Foyer, Garden), each with its own floor
// (size, outline — rectangle, round, oval, L…, venue photo). Shapes can be round, semicircle, arc, L, U, hexagon,
// free-form polygons and rotated.
//
// Items are linked to a zone by (1) a manual assignment (`assign[eventItemId] = zoneId`) or (2) the item's event
// area / sub-area name matching the zone's code or name (case-insensitive). A zone can sit in any space.

export const EVENT_BLOCKING: ShapeKind[] = ['stage', 'table', 'decor', 'wall', 'column'];
export const EVENT_ROLES: ZoneRole[] = ['ceremony', 'reception', 'foyer', 'photo', 'buffet', 'vip', 'backstage', 'loading', 'other'];

export interface EventLayoutItem { id: number; name: string; qty: number; area: string; subArea: string; scanOut: number; scanIn: number; photo?: string }
export interface EventSpace { id: string; name: string; layout: Layout }
export interface EventPlan { spaces: EventSpace[]; updatedAt: string }

interface StateV1 { version: 1; layouts: Record<number, Layout> }
interface State { version: 2; plans: Record<number, EventPlan> }
const KEY = 'emi.eventLayout.v2';
const OLD_KEY = 'emi.eventLayout.v1';
const EMPTY: State = { version: 2, plans: {} };
function load(): State {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null;
    if (p?.version === 2) return p;
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null') as StateV1 | null; // one-space layouts from v1
    if (old?.version === 1) return { version: 2, plans: Object.fromEntries(Object.entries(old.layouts).map(([id, l]) => [id, { spaces: [{ id: newId(), name: 'Main venue', layout: l }], updatedAt: l.updatedAt }])) };
  } catch { /* corrupt → start empty */ }
  return EMPTY;
}
let state = load();
const listeners = new Set<() => void>();
function emit(): boolean { let ok = true; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { ok = false; } listeners.forEach((l) => l()); return ok; }
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((l) => l()); } });
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useEventPlan(eventId: number) { return useSyncExternalStore(subscribe, () => state.plans[eventId] ?? null); }
export function useEventPlans() { return useSyncExternalStore(subscribe, () => state.plans); }
export function saveEventPlan(eventId: number, plan: EventPlan): boolean {
  state = { ...state, plans: { ...state.plans, [eventId]: { ...plan, updatedAt: new Date().toISOString() } } };
  return emit();
}
export function deleteEventPlan(eventId: number) { const next = { ...state.plans }; delete next[eventId]; state = { ...state, plans: next }; emit(); }

const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const ROLE_HINTS: Array<[RegExp, ZoneRole]> = [
  [/recep|resepsi|ballroom/i, 'reception'], [/akad|ceremon|holy|pemberkatan|matrimony|teapai|tea ?pai|sangjit|chapel/i, 'ceremony'],
  [/foyer|lobby|entrance|gate|welcome|pre.?function/i, 'foyer'], [/photo|booth|backdrop/i, 'photo'], [/buffet|food|catering|stall|pondok|dessert/i, 'buffet'],
  [/vip|family|keluarga|bridal|room|suite/i, 'vip'], [/backstage|room decor|storage|gudang|crew/i, 'backstage'], [/loading|dock/i, 'loading'],
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

const linkable = (s: Shape) => s.kind !== 'wall' && s.kind !== 'column' && s.kind !== 'dock' && s.kind !== 'aisle';
/** Where an item sits: space + zone. Zones first, then stage / decor / tables, across every space. */
export function zoneForItem(plan: EventPlan, item: EventLayoutItem): { space: EventSpace; zone: Shape } | null {
  for (const space of plan.spaces) {
    const manual = space.layout.assign[item.id];
    if (manual) { const zone = space.layout.shapes.find((s) => s.id === manual); if (zone) return { space, zone }; }
  }
  const keys = [item.subArea, item.area].filter(Boolean).map(norm);
  for (const k of keys) {
    for (const space of plan.spaces) {
      const zone = space.layout.shapes.find((s) => s.kind === 'zone' && (norm(s.code) === k || norm(s.name) === k));
      if (zone) return { space, zone };
    }
    for (const space of plan.spaces) {
      const zone = space.layout.shapes.find((s) => linkable(s) && (norm(s.code) === k || norm(s.name) === k));
      if (zone) return { space, zone };
    }
  }
  return null;
}
export const areaIsPlaced = (plan: EventPlan, area: string) => plan.spaces.some((sp) => sp.layout.shapes.some((s) => linkable(s) && (norm(s.name) === norm(area) || norm(s.code) === norm(area))));

export interface ZoneStat { items: EventLayoutItem[]; qty: number; out: number; back: number }
export function statsByZone(plan: EventPlan, items: EventLayoutItem[]) {
  const map = new Map<string, ZoneStat>();
  const perSpace = new Map<string, ZoneStat>();
  let unplaced = 0;
  for (const it of items) {
    const hit = zoneForItem(plan, it);
    if (!hit) { unplaced += 1; continue; }
    for (const [m, key] of [[map, hit.zone.id], [perSpace, hit.space.id]] as const) {
      const s = m.get(key) ?? { items: [], qty: 0, out: 0, back: 0 };
      s.items.push(it); s.qty += it.qty; s.out += Math.min(it.qty, it.scanOut); s.back += Math.min(it.qty, it.scanIn);
      m.set(key, s);
    }
  }
  return { map, perSpace, unplaced };
}

const zone = (role: ZoneRole, name: string, x: number, y: number, w: number, h: number, extra: Partial<Shape> = {}): Shape => ({ id: newId(), kind: 'zone', role, code: name, name, x, y, w, h, levels: 1, capacity: 0, ...extra });
const thing = (kind: ShapeKind, name: string, x: number, y: number, w: number, h: number, extra: Partial<Shape> = {}): Shape => ({ id: newId(), kind, code: name.toUpperCase().replace(/\s+/g, '-'), name, x, y, w, h, levels: 1, capacity: 0, ...extra });

export type TableArrangement = 'grid' | 'staggered' | 'circle' | 'arc' | 'theater';
export interface TableSpec { arrangement: TableArrangement; x: number; y: number; rows: number; cols: number; count: number; radius: number; size: number; gap: number; seats: number; start: number; form: ShapeForm; facing: boolean }
/** Tables (or chairs) in a grid, staggered grid, ring, half ring facing a stage, or curved theatre rows. */
export function tableLayout(spec: TableSpec): Shape[] {
  const out: Shape[] = [];
  let n = spec.start;
  const w = spec.form === 'rect' ? spec.size * 1.6 : spec.size; const h = spec.size;
  const mk = (cx: number, cy: number, rot = 0) => { out.push(thing('table', `T${n}`, Math.round((cx - w / 2) * 4) / 4, Math.round((cy - h / 2) * 4) / 4, w, h, { form: spec.form === 'rect' ? undefined : spec.form, round: spec.form === 'ellipse', seats: spec.seats, code: `T${n}`, rot: spec.facing ? Math.round(rot) : 0 })); n += 1; };
  const step = spec.size + spec.gap;
  if (spec.arrangement === 'grid' || spec.arrangement === 'staggered') {
    for (let r = 0; r < spec.rows; r += 1) for (let c = 0; c < spec.cols; c += 1) {
      const off = spec.arrangement === 'staggered' && r % 2 ? step / 2 : 0;
      mk(spec.x + w / 2 + c * (w + spec.gap) + off, spec.y + h / 2 + r * step);
    }
  } else if (spec.arrangement === 'circle') {
    for (let i = 0; i < spec.count; i += 1) { const a = (i / spec.count) * Math.PI * 2 - Math.PI / 2; mk(spec.x + spec.radius * Math.cos(a), spec.y + spec.radius * Math.sin(a), (a * 180) / Math.PI + 90); }
  } else {
    // arc / theatre: rows of a half ring opening upwards (towards a stage at the top), centre at (x, y)
    const rows = spec.arrangement === 'arc' ? 1 : spec.rows;
    for (let r = 0; r < rows; r += 1) {
      const rad = spec.radius + r * step;
      const count = spec.arrangement === 'arc' ? spec.count : Math.max(3, Math.floor((Math.PI * rad) / step));
      for (let i = 0; i < count; i += 1) { const a = Math.PI * (0.08 + (0.84 * i) / Math.max(1, count - 1)); mk(spec.x + rad * Math.cos(a), spec.y + rad * Math.sin(a), (a * 180) / Math.PI - 90); }
    }
  }
  return out;
}

export type SpaceTemplate = 'ballroom' | 'roundBallroom' | 'garden' | 'ceremony' | 'foyer' | 'blank';
/** Which event areas a space usually takes (by guessed role). */
const SPACE_ROLES: Record<SpaceTemplate, ZoneRole[]> = {
  ballroom: ['reception', 'buffet', 'photo', 'other'], roundBallroom: ['reception', 'buffet', 'photo', 'other'], garden: ['reception', 'ceremony', 'buffet', 'photo', 'other'],
  ceremony: ['ceremony', 'vip'], foyer: ['foyer', 'photo', 'loading', 'backstage'], blank: ['other'],
};

export function spaceTemplate(kind: SpaceTemplate, name: string): EventSpace {
  const shapes: Shape[] = [];
  let cols = 44; let rows = 30; let outline: Layout['outline'] = null;
  if (kind === 'ballroom') {
    shapes.push(thing('stage', 'Stage', 14, 1.5, 16, 4, { form: 'semi', rot: 180 }));
    shapes.push(thing('decor', 'Backdrop', 15, 0.6, 14, 0.6));
    shapes.push(thing('aisle', 'Main walkway', 20, 6, 4, 18));
    shapes.push(...tableLayout({ arrangement: 'staggered', x: 2, y: 7, rows: 4, cols: 4, count: 0, radius: 0, size: 2, gap: 2, seats: 10, start: 1, form: 'ellipse', facing: false }));
    shapes.push(...tableLayout({ arrangement: 'staggered', x: 25, y: 7, rows: 4, cols: 4, count: 0, radius: 0, size: 2, gap: 2, seats: 10, start: 17, form: 'ellipse', facing: false }));
    shapes.push(thing('decor', 'Dance floor', 17, 24, 10, 4, { form: 'ellipse' }));
    shapes.push(thing('dock', 'Guest entrance', 19, 29, 6, 1));
    shapes.push(thing('dock', 'Loading door', 43, 2, 1, 4));
    [[13, 6], [30, 6], [13, 22], [30, 22]].forEach(([x, y], i) => shapes.push(thing('column', `Pillar ${i + 1}`, x, y, 1, 1, { form: 'ellipse' })));
  } else if (kind === 'roundBallroom') {
    cols = 40; rows = 40; outline = outlinePreset('round', cols, rows);
    shapes.push(thing('stage', 'Stage', 13, 3, 14, 5, { form: 'semi', rot: 180 }));
    shapes.push(thing('decor', 'Dance floor', 15, 15, 10, 10, { form: 'ellipse' }));
    shapes.push(...tableLayout({ arrangement: 'circle', x: 20, y: 20, rows: 0, cols: 0, count: 12, radius: 9, size: 2.2, gap: 0, seats: 10, start: 1, form: 'ellipse', facing: false }));
    shapes.push(...tableLayout({ arrangement: 'circle', x: 20, y: 20, rows: 0, cols: 0, count: 18, radius: 14, size: 2.2, gap: 0, seats: 10, start: 13, form: 'ellipse', facing: false }).filter((t) => t.y > 8));
    shapes.push(thing('dock', 'Guest entrance', 17, 39, 6, 1));
    shapes.push(thing('dock', 'Loading door', 36, 12, 1, 4, { rot: 0 }));
  } else if (kind === 'garden') {
    cols = 60; rows = 40; outline = outlinePreset('oval', cols, rows);
    shapes.push(thing('stage', 'Altar', 25, 4, 10, 4, { form: 'arc' }));
    shapes.push(thing('aisle', 'Aisle', 29, 9, 2, 12));
    shapes.push(...tableLayout({ arrangement: 'theater', x: 30, y: 8, rows: 4, cols: 0, count: 0, radius: 4, size: 0.8, gap: 0.6, seats: 1, start: 1, form: 'ellipse', facing: true }).map((s) => ({ ...s, name: s.name.replace('T', 'C'), code: s.code.replace('T', 'C') })));
    shapes.push(...tableLayout({ arrangement: 'circle', x: 30, y: 30, rows: 0, cols: 0, count: 10, radius: 7, size: 2, gap: 0, seats: 8, start: 1, form: 'ellipse', facing: false }));
    shapes.push(thing('decor', 'Gazebo', 27, 27, 6, 6, { form: 'hex' }));
    shapes.push(thing('dock', 'Welcome gate', 27, 39, 6, 1));
    shapes.push(thing('dock', 'Loading', 0, 18, 1, 5));
  } else if (kind === 'ceremony') {
    cols = 24; rows = 18;
    shapes.push(thing('stage', 'Akad / altar table', 8, 1.5, 8, 3, { form: 'arc' }));
    shapes.push(thing('decor', 'Backdrop', 7, 0.5, 10, 0.6));
    shapes.push(...tableLayout({ arrangement: 'theater', x: 12, y: 3, rows: 4, cols: 0, count: 0, radius: 5, size: 0.8, gap: 0.7, seats: 1, start: 1, form: 'ellipse', facing: true }).map((s) => ({ ...s, name: s.name.replace('T', 'C'), code: s.code.replace('T', 'C') })));
    shapes.push(thing('dock', 'Door', 10, 17, 4, 1));
  } else if (kind === 'foyer') {
    cols = 30; rows = 14; outline = outlinePreset('L', cols, rows);
    shapes.push(thing('decor', 'Welcome sign', 3, 9, 3, 1));
    shapes.push(thing('decor', 'Guest book', 8, 9, 3, 1.5));
    shapes.push(thing('dock', 'Main door', 1, 13, 5, 1));
    shapes.push(thing('dock', 'To ballroom', 29, 9, 1, 4));
  } else {
    cols = 40; rows = 30;
  }
  return { id: newId(), name, layout: { warehouseId: 0, cols, rows, shapes, assign: {}, bg: null, outline, updatedAt: '' } };
}

/** Build a plan with the chosen spaces; each event area becomes a zone in the space that fits its kind. */
export function buildPlan(spaces: Array<{ kind: SpaceTemplate; name: string }>, areas: string[]): EventPlan {
  const built = spaces.map((s) => spaceTemplate(s.kind, s.name));
  const kinds = spaces.map((s) => s.kind);
  const queue = new Map<number, string[]>();
  for (const a of areas) {
    const role = guessRole(a);
    let idx = kinds.findIndex((k) => SPACE_ROLES[k].includes(role));
    if (idx < 0) idx = 0;
    queue.set(idx, [...(queue.get(idx) ?? []), a]);
  }
  for (const [idx, list] of queue) {
    const l = built[idx].layout;
    let overflow = 0;
    list.forEach((a) => {
      if (l.shapes.some((s) => s.kind === 'zone' && norm(s.name) === norm(a))) return;
      const role = guessRole(a);
      const form: ShapeForm | undefined = role === 'photo' ? 'hex' : role === 'ceremony' ? 'semi' : undefined;
      const spot = freeSpot(l, [[8, 5], [6, 4], [5, 3], [4, 3]]);
      if (spot) { l.shapes.push(zone(role, a, spot.x, spot.y, spot.w, spot.h, form ? { form } : {})); return; }
      // no room inside the venue: park it in a strip under the plan (shown by the checks until it is moved in)
      const per = Math.max(2, Math.floor((l.cols - 2) / 9));
      if (overflow === 0) l.rows += 1;
      if (overflow % per === 0) l.rows += 6;
      l.shapes.push(zone(role, a, 1 + (overflow % per) * 9, l.rows - 6, 8, 5, form ? { form } : {}));
      overflow += 1;
    });
  }
  return { spaces: built, updatedAt: '' };
}

/** First free rectangle (scanning rows) inside the venue outline that does not touch any shape (0.5 m margin). */
function freeSpot(l: Layout, sizes: Array<[number, number]>) {
  const boxes = l.shapes.map((s) => (isPlainRect(s) ? { x: s.x, y: s.y, w: s.w, h: s.h } : bbox(shapePolygon(s))));
  for (const [w, h] of sizes) {
    for (let y = 1; y + h <= l.rows - 1; y += 1) for (let x = 1; x + w <= l.cols - 1; x += 1) {
      if (boxes.some((b) => x < b.x + b.w + 0.5 && b.x < x + w + 0.5 && y < b.y + b.h + 0.5 && b.y < y + h + 0.5)) continue;
      if (l.outline && ![[x, y], [x + w, y], [x + w, y + h], [x, y + h]].every(([px, py]) => pointInPolygon(px, py, l.outline!))) continue;
      return { x, y, w, h };
    }
  }
  return null;
}
