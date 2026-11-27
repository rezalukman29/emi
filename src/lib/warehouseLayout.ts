import { useSyncExternalStore } from 'react';
import type { StockRow } from './warehouseHub';

// Warehouse layout (owner 2026-11-27: "provide a feature to set up the layout too").
// PREVIEW: layouts are stored in THIS browser (localStorage `emi.whLayout.v1`) until the layout API exists
// (docs/api-backlog.md §16). Items are placed on a shape by (1) a manual assignment made in the editor, or
// (2) their existing `rack` value matching the shape code (case-insensitive). Nothing is written to the server.

export type ShapeKind = 'rack' | 'bulk' | 'zone' | 'dock';
export type ZoneRole = 'receiving' | 'shipping' | 'staging' | 'qa' | 'returns' | 'office' | 'other';
export interface Shape {
  id: string;
  kind: ShapeKind;
  code: string; // e.g. "A", "B-12"; matched against barang_gudang.rack
  name: string;
  x: number; y: number; w: number; h: number; // grid units
  levels: number; // racks only
  capacity: number; // units the shape can hold (0 = not set)
  role?: ZoneRole; // zones only
}
export interface Layout { warehouseId: number; cols: number; rows: number; shapes: Shape[]; assign: Record<number, string>; updatedAt: string }
interface State { version: 1; layouts: Record<number, Layout> }

const KEY = 'emi.whLayout.v1';
const EMPTY: State = { version: 1, layouts: {} };
function load(): State { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null') as State | null; return p?.version === 1 ? p : EMPTY; } catch { return EMPTY; } }
let state = load();
const listeners = new Set<() => void>();
function emit() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ } listeners.forEach((l) => l()); }
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); listeners.forEach((l) => l()); } });

export function useLayout(warehouseId: number): Layout | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state.layouts[warehouseId] ?? null);
}
export function useLayoutIds(): number[] {
  const layouts = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state.layouts);
  return Object.keys(layouts).map(Number);
}
export function saveLayout(layout: Layout) {
  state = { ...state, layouts: { ...state.layouts, [layout.warehouseId]: { ...layout, updatedAt: new Date().toISOString() } } };
  emit();
}
export function deleteLayout(warehouseId: number) {
  const next = { ...state.layouts }; delete next[warehouseId]; state = { ...state, layouts: next }; emit();
}

let seq = 0;
export const newId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

export const KIND_DEFAULTS: Record<ShapeKind, Pick<Shape, 'w' | 'h' | 'levels' | 'capacity'>> = {
  rack: { w: 6, h: 2, levels: 4, capacity: 0 },
  bulk: { w: 4, h: 8, levels: 1, capacity: 0 },
  zone: { w: 8, h: 5, levels: 1, capacity: 0 },
  dock: { w: 3, h: 1, levels: 1, capacity: 0 },
};

export function blankLayout(warehouseId: number): Layout {
  return { warehouseId, cols: 48, rows: 28, shapes: [], assign: {}, updatedAt: '' };
}

/** A sensible starting point: 2 rows of racks, 2 bulk lanes, receiving, shipping, QA, returns, an entrance. */
export function templateLayout(warehouseId: number): Layout {
  const shapes: Shape[] = [];
  const rack = (code: string, x: number, y: number, w = 7, h = 2) => shapes.push({ id: newId(), kind: 'rack', code, name: `Rack ${code}`, x, y, w, h, levels: 4, capacity: 0 });
  ['A', 'B', 'C'].forEach((c, i) => rack(c, 2 + i * 9, 2));
  ['D', 'E', 'F'].forEach((c, i) => rack(c, 2 + i * 9, 7));
  ['G', 'H', 'I'].forEach((c, i) => rack(c, 2 + i * 9, 12));
  ['J', 'K', 'L', 'M', 'N'].forEach((c, i) => rack(c, 2 + i * 5, 18, 2, 8));
  shapes.push({ id: newId(), kind: 'bulk', code: 'BULK-A', name: 'Bulk A', x: 29, y: 2, w: 3, h: 12, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'bulk', code: 'BULK-B', name: 'Bulk B', x: 33, y: 2, w: 3, h: 12, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'zone', role: 'shipping', code: 'SHIP', name: 'Shipping', x: 37, y: 2, w: 9, h: 8, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'zone', role: 'returns', code: 'RET', name: 'Returns', x: 37, y: 11, w: 4, h: 3, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'zone', role: 'qa', code: 'QA', name: 'QA', x: 42, y: 11, w: 4, h: 3, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'zone', role: 'staging', code: 'STAGE', name: 'Staging', x: 28, y: 17, w: 9, h: 9, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'zone', role: 'receiving', code: 'RECV', name: 'Receiving', x: 39, y: 16, w: 7, h: 10, levels: 1, capacity: 0 });
  shapes.push({ id: newId(), kind: 'dock', code: 'DOOR', name: 'Entrance', x: 22, y: 27, w: 4, h: 1, levels: 1, capacity: 0 });
  return { warehouseId, cols: 48, rows: 28, shapes, assign: {}, updatedAt: '' };
}

const norm = (v: string) => v.trim().toLowerCase().replace(/^(rack|rak|shelf)\s*/, '');
const PLACEHOLDER = /^(tbc|-|0|n\/a|na|asd)$/i;

/** Which shape an item sits on: manual assignment first, then its `rack` text matching a shape code. */
export function shapeForItem(layout: Layout, item: { bgId: number; rack?: string }): Shape | null {
  const manual = layout.assign[item.bgId];
  if (manual) return layout.shapes.find((s) => s.id === manual) ?? null;
  const rack = String(item.rack ?? '').trim();
  if (!rack || PLACEHOLDER.test(rack)) return null;
  const key = norm(rack);
  return layout.shapes.find((s) => s.kind !== 'dock' && (norm(s.code) === key || norm(s.name) === key)) ?? null;
}

export interface ShapeStat { units: number; lines: number; low: number; critical: number; items: Array<StockRow & { rack?: string }> }
export function statsByShape(layout: Layout, rows: Array<StockRow & { rack?: string }>) {
  const map = new Map<string, ShapeStat>();
  let unplaced = 0;
  for (const row of rows) {
    const shape = shapeForItem(layout, row);
    if (!shape) { unplaced += 1; continue; }
    const s = map.get(shape.id) ?? { units: 0, lines: 0, low: 0, critical: 0, items: [] };
    s.units += Math.max(0, row.stock); s.lines += 1; s.items.push(row);
    if (row.level === 'low') s.low += 1; if (row.level === 'critical') s.critical += 1;
    map.set(shape.id, s);
  }
  return { map, unplaced };
}

/** Fill ratio for the heatmap: units / capacity when capacity is set, else relative to the fullest shape. */
export function fillRatio(stat: ShapeStat | undefined, shape: Shape, maxUnits: number) {
  if (!stat) return 0;
  if (shape.capacity > 0) return Math.min(1.2, stat.units / shape.capacity);
  return maxUnits > 0 ? stat.units / maxUnits : 0;
}

const center = (s: Shape) => ({ x: s.x + s.w / 2, y: s.y + s.h / 2 });
/** Pick route: start at the entrance (or shipping), visit each stop by nearest neighbour, end at shipping/staging.
 *  Paths are drawn as right-angle segments. An approximation — real aisles are not modelled yet. */
export function pickRoute(layout: Layout, stops: Shape[]) {
  const start = layout.shapes.find((s) => s.kind === 'dock') ?? layout.shapes.find((s) => s.role === 'shipping');
  const end = layout.shapes.find((s) => s.role === 'staging') ?? layout.shapes.find((s) => s.role === 'shipping') ?? start;
  const left = [...new Map(stops.map((s) => [s.id, s])).values()];
  const order: Shape[] = [];
  let at = start ? center(start) : { x: 0, y: layout.rows };
  while (left.length) {
    let best = 0; let bestD = Infinity;
    left.forEach((s, i) => { const c = center(s); const d = Math.abs(c.x - at.x) + Math.abs(c.y - at.y); if (d < bestD) { bestD = d; best = i; } });
    const [next] = left.splice(best, 1); order.push(next); at = center(next);
  }
  const points = [start, ...order, end].filter(Boolean).map((s) => center(s as Shape));
  let d = '';
  points.forEach((p, i) => { if (i === 0) d = `M${p.x} ${p.y}`; else { const prev = points[i - 1]; d += ` L${p.x} ${prev.y} L${p.x} ${p.y}`; } });
  const length = points.reduce((sum, p, i) => (i ? sum + Math.abs(p.x - points[i - 1].x) + Math.abs(p.y - points[i - 1].y) : 0), 0);
  return { order, d, length };
}
