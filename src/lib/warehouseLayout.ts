import { useSyncExternalStore } from 'react';
import type { StockRow } from './warehouseHub';

// Warehouse layout (owner 2026-11-27: layout setup, then "much more advanced and detailed").
// PREVIEW: layouts are stored in THIS browser (localStorage `emi.whLayout.v1`) until the layout API exists
// (docs/api-backlog.md §16). Nothing is written to the server.
//
// Model: 1 grid unit = 1 metre. Racks are split into bays (along the long side) × levels; a slot is
// `<rack code>-<bay 2 digits>-<level>` e.g. "A-03-2". Items are placed (1) by a manual assignment made in the
// editor (`assign[bgId] = "<shapeId>" | "<shapeId>@<bay>.<level>"`) or (2) by their existing `rack` text matching a
// rack code or a full slot code.

// 'stage' | 'table' | 'decor' are used by event layouts (src/lib/eventLayout.ts), which share this model and canvas.
export type ShapeKind = 'rack' | 'bulk' | 'zone' | 'aisle' | 'wall' | 'column' | 'dock' | 'stage' | 'table' | 'decor';
export type ZoneRole = 'receiving' | 'shipping' | 'staging' | 'qa' | 'returns' | 'office' | 'charging' | 'other'
  | 'ceremony' | 'reception' | 'foyer' | 'photo' | 'buffet' | 'vip' | 'backstage' | 'loading';
export interface Shape {
  id: string;
  kind: ShapeKind;
  code: string;
  name: string;
  x: number; y: number; w: number; h: number;
  levels: number;
  bays?: number;
  capacity: number;
  role?: ZoneRole;
  locked?: boolean;
  note?: string;
  round?: boolean; // drawn as an ellipse (round tables, pillars) — same as form 'ellipse'
  form?: ShapeForm; // outline inside the w × h box (default rect)
  points?: Array<[number, number]>; // form 'poly': points relative to the box, 0..1
  rot?: number; // rotation in degrees around the centre
  seats?: number; // event tables
}
export type ShapeForm = 'rect' | 'ellipse' | 'semi' | 'arc' | 'L' | 'U' | 'hex' | 'oct' | 'tri' | 'poly';
export interface LayoutBackground { src: string; opacity: number }
/** `outline`: venue / building walls as an absolute polygon (metres). Empty = the whole rectangle. */
export interface Layout { warehouseId: number; cols: number; rows: number; shapes: Shape[]; assign: Record<number, string>; bg?: LayoutBackground | null; outline?: Array<[number, number]> | null; updatedAt: string }
interface State { version: 1; layouts: Record<number, Layout> }

const KEY = 'emi.whLayout.v1';
const EMPTY: State = { version: 1, layouts: {} };
function load(): State { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null; return p?.version === 1 ? p : EMPTY; } catch { return EMPTY; } }
let state = load();
const listeners = new Set<() => void>();
function emit(): boolean {
  let ok = true;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { ok = false; }
  listeners.forEach((l) => l());
  return ok;
}
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((l) => l()); } });
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useLayout(warehouseId: number): Layout | null {
  return useSyncExternalStore(subscribe, () => state.layouts[warehouseId] ?? null);
}
/** false when the browser refused to store it (usually a background image that is too big). */
export function saveLayout(layout: Layout): boolean {
  state = { ...state, layouts: { ...state.layouts, [layout.warehouseId]: { ...layout, updatedAt: new Date().toISOString() } } };
  return emit();
}
export function deleteLayout(warehouseId: number) {
  const next = { ...state.layouts }; delete next[warehouseId]; state = { ...state, layouts: next }; emit();
}

let seq = 0;
export const newId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;
export const BLOCKING: ShapeKind[] = ['rack', 'bulk', 'wall', 'column'];
export const STORAGE: ShapeKind[] = ['rack', 'bulk'];

export const KIND_DEFAULTS: Record<ShapeKind, Pick<Shape, 'w' | 'h' | 'levels' | 'capacity' | 'bays'>> = {
  rack: { w: 6, h: 1, levels: 4, capacity: 0, bays: 6 },
  bulk: { w: 4, h: 6, levels: 1, capacity: 0 },
  zone: { w: 8, h: 5, levels: 1, capacity: 0 },
  aisle: { w: 12, h: 2, levels: 1, capacity: 0 },
  wall: { w: 8, h: 1, levels: 1, capacity: 0 },
  column: { w: 1, h: 1, levels: 1, capacity: 0 },
  dock: { w: 3, h: 1, levels: 1, capacity: 0 },
  stage: { w: 8, h: 4, levels: 1, capacity: 0 },
  table: { w: 2, h: 2, levels: 1, capacity: 0 },
  decor: { w: 2, h: 1, levels: 1, capacity: 0 },
};

export function blankLayout(warehouseId: number): Layout {
  return { warehouseId, cols: 48, rows: 30, shapes: [], assign: {}, bg: null, updatedAt: '' };
}

export interface RowSpec { prefix: string; start: number; count: number; x: number; y: number; w: number; h: number; gap: number; direction: 'right' | 'down'; bays: number; levels: number; backToBack: boolean; aisle: number }
/** Generate a row (or back-to-back double row) of racks with codes like A01, A02… */
export function generateRow(spec: RowSpec): Shape[] {
  const out: Shape[] = [];
  const lines = spec.backToBack ? 2 : 1;
  for (let line = 0; line < lines; line += 1) {
    for (let i = 0; i < spec.count; i += 1) {
      const n = spec.start + i + line * spec.count;
      const code = `${spec.prefix}${String(n).padStart(2, '0')}`;
      const along = i * (spec.direction === 'right' ? spec.w + spec.gap : spec.h + spec.gap);
      const across = line * (spec.direction === 'right' ? spec.h : spec.w);
      out.push({
        id: newId(), kind: 'rack', code, name: `Rack ${code}`,
        x: spec.x + (spec.direction === 'right' ? along : across), y: spec.y + (spec.direction === 'right' ? across : along),
        w: spec.w, h: spec.h, levels: spec.levels, bays: spec.bays, capacity: 0,
      });
    }
  }
  return out;
}

/** Ready-made plan: 3 aisles of back-to-back racks, bulk lanes, cross aisles, zones, columns, walls, two doors. */
export function templateLayout(warehouseId: number): Layout {
  const shapes: Shape[] = [];
  const zone = (role: ZoneRole, code: string, name: string, x: number, y: number, w: number, h: number) => shapes.push({ id: newId(), kind: 'zone', role, code, name, x, y, w, h, levels: 1, capacity: 0 });
  const aisle = (code: string, x: number, y: number, w: number, h: number) => shapes.push({ id: newId(), kind: 'aisle', code, name: code, x, y, w, h, levels: 1, capacity: 0 });
  // rack blocks: rows A/B, C/D, E/F (back-to-back), 5 racks each, 6 m long, 1 m deep, aisles of 2 m between
  [['A', 3], ['C', 7], ['E', 11]].forEach(([p, y]) => shapes.push(...generateRow({ prefix: p as string, start: 1, count: 4, x: 3, y: y as number, w: 6, h: 1, gap: 0, direction: 'right', bays: 6, levels: 4, backToBack: true, aisle: 2 })));
  aisle('Aisle 1', 3, 5, 24, 2); aisle('Aisle 2', 3, 9, 24, 2); aisle('Aisle 3', 3, 13, 24, 2);
  aisle('Main aisle', 1, 15, 46, 3); aisle('Cross aisle', 27, 1, 3, 14); aisle('Side aisle', 1, 1, 2, 14);
  shapes.push(...generateRow({ prefix: 'G', start: 1, count: 6, x: 3, y: 19, w: 1, h: 7, gap: 2, direction: 'right', bays: 7, levels: 3, backToBack: false, aisle: 2 }).map((s) => ({ ...s, w: 1, h: 7 })));
  shapes.push({ id: newId(), kind: 'bulk', code: 'BULK-1', name: 'Bulk 1', x: 31, y: 2, w: 3, h: 12, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'bulk', code: 'BULK-2', name: 'Bulk 2', x: 35, y: 2, w: 3, h: 12, levels: 1, capacity: 0 });
  zone('shipping', 'SHIP', 'Shipping', 39, 1, 8, 7);
  zone('qa', 'QA', 'QA', 39, 9, 4, 3);
  zone('returns', 'RET', 'Returns', 43, 9, 4, 3);
  zone('charging', 'CHG', 'Charging', 39, 12, 8, 2);
  zone('staging', 'STAGE', 'Staging', 23, 19, 10, 9);
  zone('receiving', 'RECV', 'Receiving', 35, 19, 12, 9);
  [[10, 18], [20, 18], [30, 18], [10, 2], [20, 2]].forEach(([x, y], i) => shapes.push({ id: newId(), kind: 'column', code: `COL-${i + 1}`, name: `Column ${i + 1}`, x, y, w: 1, h: 1, levels: 1, capacity: 0 }));
  shapes.push({ id: newId(), kind: 'wall', code: 'WALL-1', name: 'Wall', x: 22, y: 19, w: 1, h: 6, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'dock', code: 'DOOR-1', name: 'Entrance', x: 26, y: 29, w: 4, h: 1, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'dock', code: 'DOCK-1', name: 'Loading dock', x: 47, y: 3, w: 1, h: 4, levels: 1, capacity: 0 });
  return { warehouseId, cols: 48, rows: 30, shapes, assign: {}, bg: null, updatedAt: '' };
}

// ── Slots ──
export const baysOf = (s: Shape) => (s.kind === 'rack' ? Math.max(1, s.bays ?? Math.max(s.w, s.h)) : 1);
export const slotCode = (s: Shape, bay: number, level: number) => `${s.code}-${String(bay).padStart(2, '0')}-${level}`;
export const slotsOf = (s: Shape) => (s.kind === 'rack' ? baysOf(s) * Math.max(1, s.levels) : s.kind === 'bulk' ? 1 : 0);

const norm = (v: string) => v.trim().toLowerCase().replace(/^(rack|rak|shelf)\s*/, '').replace(/\s+/g, '');
const PLACEHOLDER = /^(tbc|-|0|n\/a|na|asd)$/i;
export interface Placement { shape: Shape; bay?: number; level?: number; manual: boolean }

export function placementForItem(layout: Layout, item: { bgId: number; rack?: string; shelfLevel?: string }): Placement | null {
  const manual = layout.assign[item.bgId];
  if (manual) {
    const [id, slot] = manual.split('@');
    const shape = layout.shapes.find((s) => s.id === id);
    if (!shape) return null;
    if (!slot) return { shape, manual: true };
    const [bay, level] = slot.split('.').map(Number);
    return { shape, bay, level, manual: true };
  }
  const rack = String(item.rack ?? '').trim();
  if (!rack || PLACEHOLDER.test(rack)) return null;
  const key = norm(rack);
  const storage = layout.shapes.filter((s) => STORAGE.includes(s.kind));
  const direct = storage.find((s) => norm(s.code) === key || norm(s.name) === key);
  if (direct) {
    const lvl = Number(item.shelfLevel);
    return { shape: direct, level: Number.isInteger(lvl) && lvl > 0 && lvl <= direct.levels ? lvl : undefined, manual: false };
  }
  // full slot code, e.g. "A01-03-2"
  const m = key.match(/^(.+)-(\d{1,3})-(\d{1,2})$/);
  if (m) {
    const shape = storage.find((s) => norm(s.code) === m[1]);
    if (shape) return { shape, bay: Number(m[2]), level: Number(m[3]), manual: false };
  }
  return null;
}
export const shapeForItem = (layout: Layout, item: { bgId: number; rack?: string }) => placementForItem(layout, item)?.shape ?? null;

export interface ShapeStat { units: number; lines: number; low: number; critical: number; items: Array<StockRow & { placement?: Placement }>; slots: Map<string, number> }
export function statsByShape(layout: Layout, rows: StockRow[]) {
  const map = new Map<string, ShapeStat>();
  let unplaced = 0;
  for (const row of rows) {
    const p = placementForItem(layout, row);
    if (!p) { unplaced += 1; continue; }
    const s: ShapeStat = map.get(p.shape.id) ?? { units: 0, lines: 0, low: 0, critical: 0, items: [], slots: new Map() };
    s.units += Math.max(0, row.stock); s.lines += 1; s.items.push({ ...row, placement: p });
    if (row.level === 'low') s.low += 1; if (row.level === 'critical') s.critical += 1;
    if (p.bay && p.level) { const k = `${p.bay}.${p.level}`; s.slots.set(k, (s.slots.get(k) ?? 0) + 1); }
    map.set(p.shape.id, s);
  }
  return { map, unplaced };
}

// ── Geometry, metrics, validation ──
const overlap = (a: Shape, b: Shape) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function metrics(layout: Layout) {
  const area = layout.cols * layout.rows;
  const sum = (kinds: ShapeKind[]) => layout.shapes.filter((s) => kinds.includes(s.kind)).reduce((a, s) => a + s.w * s.h, 0);
  const storage = sum(STORAGE);
  const aisles = sum(['aisle']);
  const zones = sum(['zone']);
  const slots = layout.shapes.reduce((a, s) => a + slotsOf(s), 0);
  const capacity = layout.shapes.reduce((a, s) => a + (s.capacity || 0), 0);
  return { area, storage, aisles, zones, slots, capacity, storagePct: area ? Math.round((storage / area) * 100) : 0, racks: layout.shapes.filter((s) => s.kind === 'rack').length };
}

export type IssueType = 'overlap' | 'outside' | 'dupCode' | 'unreachable' | 'noEntrance' | 'narrowAisle' | 'inAisle';
export interface LayoutIssue { type: IssueType; ids: string[]; label: string }
export function validate(layout: Layout): LayoutIssue[] {
  const issues: LayoutIssue[] = [];
  const blocking = layout.shapes.filter((s) => BLOCKING.includes(s.kind));
  for (let i = 0; i < blocking.length; i += 1) for (let j = i + 1; j < blocking.length; j += 1) {
    if (shapesOverlap(blocking[i], blocking[j])) issues.push({ type: 'overlap', ids: [blocking[i].id, blocking[j].id], label: `${blocking[i].name} ↔ ${blocking[j].name}` });
  }
  for (const s of layout.shapes) if (isOutside(layout, s)) issues.push({ type: 'outside', ids: [s.id], label: s.name });
  const byCode = new Map<string, Shape[]>();
  for (const s of layout.shapes.filter((x) => STORAGE.includes(x.kind))) { const k = norm(s.code); byCode.set(k, [...(byCode.get(k) ?? []), s]); }
  for (const [code, list] of byCode) if (list.length > 1) issues.push({ type: 'dupCode', ids: list.map((s) => s.id), label: code.toUpperCase() });
  const aisles = layout.shapes.filter((x) => x.kind === 'aisle');
  for (const s of blocking) { const a = aisles.find((x) => overlap(x, s)); if (a) issues.push({ type: 'inAisle', ids: [s.id], label: `${s.name} → ${a.name}` }); }
  for (const s of layout.shapes.filter((x) => x.kind === 'aisle')) if (Math.min(s.w, s.h) < 2) issues.push({ type: 'narrowAisle', ids: [s.id], label: s.name });
  const doors = layout.shapes.filter((s) => s.kind === 'dock');
  if (!doors.length) issues.push({ type: 'noEntrance', ids: [], label: '' });
  else {
    const grid = buildGrid(layout);
    const dist = dijkstra(grid, nearestFree(grid, doors[0]));
    for (const s of layout.shapes.filter((x) => STORAGE.includes(x.kind))) {
      const access = accessCells(grid, s);
      if (access.length && !access.some((c) => Number.isFinite(dist[c]))) issues.push({ type: 'unreachable', ids: [s.id], label: s.name });
      if (!access.length) issues.push({ type: 'unreachable', ids: [s.id], label: s.name });
    }
  }
  return issues;
}

// ── Walking routes on the grid (Dijkstra, 4 directions; aisles are cheaper so routes prefer them) ──
interface Grid { cols: number; rows: number; blocked: Uint8Array; cost: Float32Array }
export function buildGrid(layout: Layout, blockingKinds: ShapeKind[] = BLOCKING): Grid {
  const { cols, rows } = layout;
  const blocked = new Uint8Array(cols * rows);
  const cost = new Float32Array(cols * rows).fill(1.6);
  // outside the venue outline = blocked
  if (layout.outline && layout.outline.length >= 3) {
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if (!pointInPolygon(x + 0.5, y + 0.5, layout.outline)) blocked[y * cols + x] = 1;
  }
  for (const s of layout.shapes) {
    const plain = isPlainRect(s);
    const poly = plain ? null : shapePolygon(s);
    const bb = plain ? { x: s.x, y: s.y, w: s.w, h: s.h } : bbox(poly!);
    for (let y = Math.max(0, Math.floor(bb.y)); y < Math.min(rows, Math.ceil(bb.y + bb.h)); y += 1) for (let x = Math.max(0, Math.floor(bb.x)); x < Math.min(cols, Math.ceil(bb.x + bb.w)); x += 1) {
      if (poly && !pointInPolygon(x + 0.5, y + 0.5, poly)) continue;
      const i = y * cols + x;
      if (blockingKinds.includes(s.kind)) blocked[i] = 1;
      else if (s.kind === 'aisle') cost[i] = Math.min(cost[i], 1);
    }
  }
  return { cols, rows, blocked, cost };
}
function dijkstra(g: Grid, start: number): Float64Array {
  const dist = new Float64Array(g.cols * g.rows).fill(Infinity);
  if (start < 0) return dist;
  dist[start] = 0;
  // binary heap of [dist, index]
  const heap: Array<[number, number]> = [[0, start]];
  const push = (n: [number, number]) => { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1; const r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const x = i % g.cols; const y = (i - x) / g.cols;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const j = ny * g.cols + nx;
      if (g.blocked[j]) continue;
      const nd = d + g.cost[j];
      if (nd < dist[j]) { dist[j] = nd; push([nd, j]); }
    }
  }
  return dist;
}
/** Free cells touching a shape: where a picker stands to reach it. */
function accessCells(g: Grid, s: Shape): number[] {
  const out: number[] = [];
  const x0 = Math.floor(s.x); const y0 = Math.floor(s.y); const x1 = Math.ceil(s.x + s.w); const y1 = Math.ceil(s.y + s.h);
  const add = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < g.cols && y < g.rows && !g.blocked[y * g.cols + x]) out.push(y * g.cols + x); };
  for (let x = x0; x < x1; x += 1) { add(x, y0 - 1); add(x, y1); }
  for (let y = y0; y < y1; y += 1) { add(x0 - 1, y); add(x1, y); }
  return out;
}
function nearestFree(g: Grid, s: Shape): number {
  const inside = Math.floor(s.y + s.h / 2) * g.cols + Math.floor(s.x + s.w / 2);
  if (inside >= 0 && inside < g.blocked.length && !g.blocked[inside]) return inside;
  return accessCells(g, s)[0] ?? -1;
}
function backtrack(g: Grid, dist: Float64Array, target: number): number[] {
  const path = [target];
  let cur = target;
  for (let guard = 0; guard < g.cols * g.rows && dist[cur] > 0; guard += 1) {
    const x = cur % g.cols; const y = (cur - x) / g.cols;
    let best = cur; let bestD = dist[cur];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const j = ny * g.cols + nx;
      if (dist[j] < bestD) { bestD = dist[j]; best = j; }
    }
    if (best === cur) break;
    cur = best; path.push(cur);
  }
  return path.reverse();
}

/** Route from the entrance through every stop (nearest by walking distance) to staging/shipping, along free floor. */
export function pickRoute(layout: Layout, stops: Shape[], opts: { blocking?: ShapeKind[]; endAt?: Shape | null; startAt?: Shape | null } = {}) {
  const g = buildGrid(layout, opts.blocking);
  const start = opts.startAt ?? layout.shapes.find((s) => s.kind === 'dock') ?? layout.shapes.find((s) => s.role === 'shipping');
  const end = opts.endAt !== undefined ? opts.endAt : layout.shapes.find((s) => s.role === 'staging') ?? layout.shapes.find((s) => s.role === 'shipping');
  const left = [...new Map(stops.map((s) => [s.id, s])).values()];
  const order: Shape[] = [];
  const cells: number[] = [];
  let at = start ? nearestFree(g, start) : -1;
  let length = 0;
  let unreachable = 0;
  while (left.length && at >= 0) {
    const dist = dijkstra(g, at);
    let best = -1; let bestCell = -1; let bestD = Infinity;
    left.forEach((s, i) => { for (const c of accessCells(g, s)) if (dist[c] < bestD) { bestD = dist[c]; best = i; bestCell = c; } });
    if (best < 0) { unreachable += left.length; break; }
    const [next] = left.splice(best, 1);
    order.push(next);
    cells.push(...backtrack(g, dist, bestCell));
    length += bestD;
    at = bestCell;
  }
  if (end && at >= 0) {
    const dist = dijkstra(g, at); const target = nearestFree(g, end);
    if (target >= 0 && Number.isFinite(dist[target])) { cells.push(...backtrack(g, dist, target)); length += dist[target]; }
  }
  // cells → simplified polyline through cell centres
  const uniq = cells.filter((c, i) => i === 0 || c !== cells[i - 1]);
  const pts = uniq.map((c) => ({ x: (c % g.cols) + 0.5, y: Math.floor(c / g.cols) + 0.5 }));
  const simple = pts.filter((p, i) => { if (i === 0 || i === pts.length - 1) return true; const a = pts[i - 1]; const b = pts[i + 1]; return !((a.x === p.x && p.x === b.x) || (a.y === p.y && p.y === b.y)); });
  const d = simple.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  return { order, d, length: Math.round(length / 1.3), unreachable };
}

// ── Import / export ──
export function exportLayout(layout: Layout, warehouseName: string) {
  const blob = new Blob([JSON.stringify({ format: 'emi-warehouse-layout', version: 1, warehouse: warehouseName, layout }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `layout-${warehouseName.replace(/\W+/g, '-').toLowerCase() || layout.warehouseId}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export async function importLayout(file: File, warehouseId: number): Promise<Layout> {
  const data = JSON.parse(await file.text());
  const l = data?.layout ?? data;
  if (!l || !Array.isArray(l.shapes) || !Number(l.cols) || !Number(l.rows)) throw new Error('invalid');
  return { warehouseId, cols: Number(l.cols), rows: Number(l.rows), shapes: l.shapes.map((s: Shape) => ({ ...s, id: s.id || newId() })), assign: l.warehouseId === warehouseId ? l.assign ?? {} : {}, bg: l.bg ?? null, updatedAt: '' };
}

// ── Free-form shapes (owner 2026-11-27: "not always square — can be round too") ──
const FORM_POINTS: Partial<Record<ShapeForm, Array<[number, number]>>> = {
  L: [[0, 0], [0.45, 0], [0.45, 0.55], [1, 0.55], [1, 1], [0, 1]],
  U: [[0, 0], [0.3, 0], [0.3, 0.65], [0.7, 0.65], [0.7, 0], [1, 0], [1, 1], [0, 1]],
  hex: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  oct: [[0.3, 0], [0.7, 0], [1, 0.3], [1, 0.7], [0.7, 1], [0.3, 1], [0, 0.7], [0, 0.3]],
  tri: [[0.5, 0], [1, 1], [0, 1]],
};
export const formOf = (s: Shape): ShapeForm => s.form ?? (s.round ? 'ellipse' : 'rect');
export const isPlainRect = (s: Shape) => formOf(s) === 'rect' && !(s.rot ?? 0);
/** Outline of a shape as absolute points (metres), rotation applied. */
export function shapePolygon(s: Shape): Array<[number, number]> {
  const f = formOf(s);
  let rel: Array<[number, number]>;
  if (f === 'ellipse') rel = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)]; });
  else if (f === 'semi') rel = [[0, 0], [1, 0], ...Array.from({ length: 19 }, (_, i) => { const a = (i / 18) * Math.PI; return [0.5 + 0.5 * Math.cos(a), Math.sin(a)] as [number, number]; })];
  else if (f === 'arc') rel = [...Array.from({ length: 19 }, (_, i) => { const a = Math.PI + (i / 18) * Math.PI; return [0.5 + 0.5 * Math.cos(a), 1 + Math.sin(a)] as [number, number]; }), ...Array.from({ length: 19 }, (_, i) => { const a = 2 * Math.PI - (i / 18) * Math.PI; return [0.5 + 0.28 * Math.cos(a), 1 + 0.55 * Math.sin(a)] as [number, number]; })];
  else if (f === 'poly') rel = s.points && s.points.length >= 3 ? s.points : [[0, 0], [1, 0], [1, 1], [0, 1]];
  else rel = FORM_POINTS[f] ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
  const cx = s.x + s.w / 2; const cy = s.y + s.h / 2;
  const r = ((s.rot ?? 0) * Math.PI) / 180; const cos = Math.cos(r); const sin = Math.sin(r);
  return rel.map(([u, v]) => { const px = s.x + u * s.w - cx; const py = s.y + v * s.h - cy; return [cx + px * cos - py * sin, cy + px * sin + py * cos]; });
}
export function bbox(pts: Array<[number, number]>) {
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
export function pointInPolygon(x: number, y: number, poly: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function isOutside(layout: Layout, s: Shape) {
  const pts = isPlainRect(s) ? [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h]] as Array<[number, number]> : shapePolygon(s);
  const out = pts.some(([x, y]) => x < -0.01 || y < -0.01 || x > layout.cols + 0.01 || y > layout.rows + 0.01);
  if (out) return true;
  if (layout.outline && layout.outline.length >= 3 && s.kind !== 'dock') {
    // allow a little tolerance at the walls: check points pulled 0.2 m towards the centre
    const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
    return pts.some(([x, y]) => { const dx = c.x - x; const dy = c.y - y; const d = Math.hypot(dx, dy) || 1; return !pointInPolygon(x + (dx / d) * 0.2, y + (dy / d) * 0.2, layout.outline!); });
  }
  return false;
}
export type OutlinePreset = 'rect' | 'round' | 'oval' | 'oct' | 'L' | 'T';
export function outlinePreset(kind: OutlinePreset, cols: number, rows: number): Array<[number, number]> | null {
  const m = 0.5;
  if (kind === 'rect') return null;
  if (kind === 'round' || kind === 'oval') {
    const rx = kind === 'round' ? Math.min(cols, rows) / 2 - m : cols / 2 - m; const ry = kind === 'round' ? rx : rows / 2 - m;
    return Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2; return [cols / 2 + rx * Math.cos(a), rows / 2 + ry * Math.sin(a)] as [number, number]; });
  }
  const rel: Record<'oct' | 'L' | 'T', Array<[number, number]>> = {
    oct: [[0.25, 0], [0.75, 0], [1, 0.25], [1, 0.75], [0.75, 1], [0.25, 1], [0, 0.75], [0, 0.25]],
    L: [[0, 0], [0.55, 0], [0.55, 0.5], [1, 0.5], [1, 1], [0, 1]],
    T: [[0, 0], [1, 0], [1, 0.45], [0.68, 0.45], [0.68, 1], [0.32, 1], [0.32, 0.45], [0, 0.45]],
  };
  return rel[kind].map(([u, v]) => [m + u * (cols - 2 * m), m + v * (rows - 2 * m)]);
}

/** Overlap that understands round / rotated / free-form shapes (vertex-in-polygon test, plus box test for plain boxes). */
export function shapesOverlap(a: Shape, b: Shape) {
  const boxHit = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  if (isPlainRect(a) && isPlainRect(b)) return boxHit;
  const pa = shapePolygon(a); const pb = shapePolygon(b);
  const ba = bbox(pa); const bb = bbox(pb);
  if (!(ba.x < bb.x + bb.w && bb.x < ba.x + ba.w && ba.y < bb.y + bb.h && bb.y < ba.y + ba.h)) return false;
  const shrink = (pts: Array<[number, number]>, c: { x: number; y: number }) => pts.map(([x, y]) => [x + (c.x - x) * 0.04, y + (c.y - y) * 0.04] as [number, number]);
  const ca = { x: ba.x + ba.w / 2, y: ba.y + ba.h / 2 }; const cb = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
  return shrink(pa, ca).some(([x, y]) => pointInPolygon(x, y, pb)) || shrink(pb, cb).some(([x, y]) => pointInPolygon(x, y, pa)) || pointInPolygon(ca.x, ca.y, pb) || pointInPolygon(cb.x, cb.y, pa);
}
