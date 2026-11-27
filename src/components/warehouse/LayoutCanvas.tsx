import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { baysOf, type Layout, type Shape, type ShapeStat } from '../../lib/warehouseLayout';

// SVG floor plan shared by the layout editor and the Hub map. 1 grid unit = 1 metre; the viewBox does zoom/pan.
// Editor: click / Shift+click select, drag on empty floor = box select (or pan in Pan tool), drag moves every
// selected block, white corner resizes, alignment guides snap to other blocks' edges and centres.

export type MapMode = 'stock' | 'issues' | 'route' | 'plain';
export type CanvasTool = 'select' | 'pan';

export interface CanvasProps {
  layout: Layout;
  editable?: boolean;
  selected?: Set<string>;
  onSelect?: (ids: Set<string>) => void;
  onMove?: (shapes: Shape[], done: boolean) => void;
  onCursor?: (p: { x: number; y: number } | null) => void;
  stats?: Map<string, ShapeStat>;
  mode?: MapMode;
  maxUnits?: number;
  highlight?: Set<string>;
  bad?: Set<string>;
  route?: { d: string; order: Shape[] } | null;
  zoom: number;
  tool?: CanvasTool;
  showBays?: boolean;
  ariaLabel: string;
}

const heat = (r: number) => (r >= 0.9 ? 'h4' : r >= 0.75 ? 'h3' : r >= 0.5 ? 'h2' : r >= 0.2 ? 'h1' : r > 0 ? 'h0' : 'empty');
const SNAP = 0.6;

export default function LayoutCanvas({ layout, editable, selected, onSelect, onMove, onCursor, stats, mode = 'plain', maxUnits = 0, highlight, bad, route, zoom, tool = 'select', showBays = true, ariaLabel }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ kind: 'move' | 'resize'; start: { x: number; y: number }; orig: Shape[]; moved: boolean } | null>(null);
  const box = useRef<{ x: number; y: number; click?: string } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const sel = selected ?? new Set<string>();

  const vw = layout.cols / zoom;
  const vh = layout.rows / zoom;
  useEffect(() => { setPan((p) => ({ x: Math.min(Math.max(0, p.x), layout.cols - vw), y: Math.min(Math.max(0, p.y), layout.rows - vh) })); }, [zoom, layout.cols, layout.rows, vw, vh]);

  const toGrid = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  const startShape = (e: RPointerEvent, shape: Shape, kind: 'move' | 'resize') => {
    e.stopPropagation();
    // Floor blocks (zones, aisles) cover most of the plan: dragging on one that is not selected yet draws a
    // selection box; a plain click still selects it.
    if (editable && kind === 'move' && tool === 'select' && (shape.kind === 'zone' || shape.kind === 'aisle') && !sel.has(shape.id) && !e.shiftKey) {
      box.current = { ...toGrid(e), click: shape.id };
      return;
    }
    let next = sel;
    if (e.shiftKey || e.metaKey || e.ctrlKey) { next = new Set(sel); if (next.has(shape.id)) next.delete(shape.id); else next.add(shape.id); onSelect?.(next); return; }
    if (!sel.has(shape.id)) { next = new Set([shape.id]); onSelect?.(next); }
    if (!editable || shape.locked) return;
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* synthetic or already released */ }
    const orig = kind === 'resize' ? [shape] : layout.shapes.filter((s) => next.has(s.id) && !s.locked);
    drag.current = { kind, start: toGrid(e), orig, moved: false };
  };

  const snapMove = (shapes: Shape[], dx: number, dy: number) => {
    // alignment guides against blocks that are not being moved
    const others = layout.shapes.filter((s) => !shapes.some((m) => m.id === s.id));
    const lead = shapes[0];
    let sx = dx; let sy = dy; const gv: number[] = []; const gh: number[] = [];
    if (shapes.length === 1 && lead) {
      const xs = [lead.x + dx, lead.x + dx + lead.w / 2, lead.x + dx + lead.w];
      const ys = [lead.y + dy, lead.y + dy + lead.h / 2, lead.y + dy + lead.h];
      for (const o of others) {
        for (const ox of [o.x, o.x + o.w / 2, o.x + o.w]) xs.forEach((x, k) => { if (Math.abs(x - ox) < SNAP && !gv.length) { sx = dx + (ox - x); gv.push(ox); void k; } });
        for (const oy of [o.y, o.y + o.h / 2, o.y + o.h]) ys.forEach((y) => { if (Math.abs(y - oy) < SNAP && !gh.length) { sy = dy + (oy - y); gh.push(oy); } });
      }
    }
    setGuides({ v: gv, h: gh });
    return { dx: Math.round(sx * 2) / 2, dy: Math.round(sy * 2) / 2 };
  };

  const onPointerMove = (e: RPointerEvent) => {
    const g = toGrid(e);
    onCursor?.({ x: Math.max(0, Math.min(layout.cols, g.x)), y: Math.max(0, Math.min(layout.rows, g.y)) });
    if (drag.current && onMove) {
      const d = drag.current;
      const rawDx = g.x - d.start.x; const rawDy = g.y - d.start.y;
      if (!d.moved && Math.abs(rawDx) < 0.25 && Math.abs(rawDy) < 0.25) return;
      d.moved = true;
      if (d.kind === 'move') {
        const minX = Math.min(...d.orig.map((s) => s.x)); const minY = Math.min(...d.orig.map((s) => s.y));
        const maxX = Math.max(...d.orig.map((s) => s.x + s.w)); const maxY = Math.max(...d.orig.map((s) => s.y + s.h));
        let { dx, dy } = snapMove(d.orig, rawDx, rawDy);
        dx = Math.min(Math.max(dx, -minX), layout.cols - maxX); dy = Math.min(Math.max(dy, -minY), layout.rows - maxY);
        onMove(d.orig.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy })), false);
      } else {
        const o = d.orig[0];
        onMove([{ ...o, w: Math.min(Math.max(0.5, Math.round((o.w + rawDx) * 2) / 2), layout.cols - o.x), h: Math.min(Math.max(0.5, Math.round((o.h + rawDy) * 2) / 2), layout.rows - o.y) }], false);
      }
      return;
    }
    if (box.current) {
      const b = box.current;
      setMarquee({ x: Math.min(b.x, g.x), y: Math.min(b.y, g.y), w: Math.abs(g.x - b.x), h: Math.abs(g.y - b.y) });
      return;
    }
    if (panning.current && zoom > 1) {
      const svg = svgRef.current; if (!svg) return; const r = svg.getBoundingClientRect(); const p = panning.current;
      setPan({ x: Math.min(Math.max(0, p.px - ((e.clientX - p.x) / r.width) * vw), layout.cols - vw), y: Math.min(Math.max(0, p.py - ((e.clientY - p.y) / r.height) * vh), layout.rows - vh) });
    }
  };
  const end = () => {
    const d = drag.current;
    if (d?.moved && onMove) onMove([], true);
    if (box.current && marquee && onSelect) {
      const m = marquee;
      const hit = layout.shapes.filter((s) => s.x < m.x + m.w && m.x < s.x + s.w && s.y < m.y + m.h && m.y < s.y + s.h).map((s) => s.id);
      if (m.w > 0.3 || m.h > 0.3) onSelect(new Set(hit.filter((id) => { const sh = layout.shapes.find((x) => x.id === id); return sh && sh.kind !== 'zone' && sh.kind !== 'aisle'; }).length ? hit.filter((id) => { const sh = layout.shapes.find((x) => x.id === id); return sh && sh.kind !== 'zone' && sh.kind !== 'aisle'; }) : hit));
    } else if (box.current?.click && onSelect) onSelect(new Set([box.current.click]));
    drag.current = null; box.current = null; panning.current = null; setMarquee(null); setGuides({ v: [], h: [] });
  };

  const stopIndex = new Map((route?.order ?? []).map((s, i) => [s.id, i + 1]));
  const ordered = [...layout.shapes].sort((a, b) => order(a) - order(b));

  return (
    <svg
      ref={svgRef}
      className={`wl-canvas mode-${mode}${editable ? ' editable' : ''}${zoom > 1 || tool === 'pan' ? ' pannable' : ''}`}
      viewBox={`${pan.x} ${pan.y} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        if (editable && tool === 'select') { box.current = toGrid(e); if (!e.shiftKey) onSelect?.(new Set()); return; }
        onSelect?.(new Set());
        panning.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      }}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerLeave={() => { end(); onCursor?.(null); }}
    >
      <defs>
        <pattern id="wl-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" className="wl-grid-line" /></pattern>
        <pattern id="wl-grid5" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" className="wl-grid-line major" /></pattern>
        <pattern id="wl-hatch" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="0.6" className="wl-hatch-line" /></pattern>
        <pattern id="wl-aisle" width="1.2" height="1.2" patternUnits="userSpaceOnUse"><rect x="0.5" y="0.55" width="0.2" height="0.1" className="wl-aisle-dash" /></pattern>
        <filter id="wl-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.35" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      {layout.bg?.src && <image href={layout.bg.src} x="0" y="0" width={layout.cols} height={layout.rows} preserveAspectRatio="none" opacity={layout.bg.opacity} />}
      <rect x="0" y="0" width={layout.cols} height={layout.rows} fill="url(#wl-grid)" />
      <rect x="0" y="0" width={layout.cols} height={layout.rows} fill="url(#wl-grid5)" />
      <rect x="0.05" y="0.05" width={layout.cols - 0.1} height={layout.rows - 0.1} className="wl-wall-outline" />
      {editable && <g className="wl-ruler">{Array.from({ length: Math.floor(layout.cols / 5) + 1 }, (_, i) => <text key={`x${i}`} x={i * 5 + 0.15} y="0.55" fontSize="0.45">{i * 5}</text>)}{Array.from({ length: Math.floor(layout.rows / 5) }, (_, i) => <text key={`y${i}`} x="0.15" y={(i + 1) * 5 - 0.15} fontSize="0.45">{(i + 1) * 5}</text>)}</g>}

      {ordered.map((s, i) => {
        const st = stats?.get(s.id);
        const storage = s.kind === 'rack' || s.kind === 'bulk';
        const ratio = mode === 'stock' && storage ? (s.capacity > 0 && st ? Math.min(1.2, st.units / s.capacity) : st && maxUnits ? st.units / maxUnits : 0) : 0;
        const issue = st ? (st.critical > 0 ? 'crit' : st.low > 0 ? 'low' : 'ok') : 'none';
        const vertical = s.h > s.w;
        const rotated = vertical && s.h >= s.w * 1.5;
        const fontSize = Math.max(0.4, Math.min(1.5, (rotated ? s.w : Math.min(s.w, s.h)) * 0.5, (rotated ? s.h : s.w) / Math.max(3, s.name.length) * 1.5));
        const isSel = sel.has(s.id);
        const cls = [
          'wl-shape', `k-${s.kind}`, s.role ? `r-${s.role}` : '',
          mode === 'stock' && storage ? heat(ratio) : '',
          mode === 'issues' ? `i-${issue}` : '',
          isSel ? 'selected' : '', s.locked ? 'locked' : '',
          highlight?.has(s.id) ? 'hit' : '', bad?.has(s.id) ? 'bad' : '',
          mode === 'route' && stopIndex.has(s.id) ? 'stop' : '',
        ].filter(Boolean).join(' ');
        const bays = s.kind === 'rack' ? baysOf(s) : 0;
        return (
          <g key={s.id} className={cls} style={{ animationDelay: `${Math.min(i, 40) * 12}ms` }}
            tabIndex={0} role="button" aria-label={`${s.name}${st ? `, ${st.units} units` : ''}`}
            onPointerDown={(e) => startShape(e, s, 'move')}>
            <rect x={s.x + 0.06} y={s.y + 0.06} width={Math.max(0.1, s.w - 0.12)} height={Math.max(0.1, s.h - 0.12)} rx={s.kind === 'column' ? 0.1 : 0.2} className="wl-body" />
            {s.kind === 'wall' && <rect x={s.x + 0.06} y={s.y + 0.06} width={Math.max(0.1, s.w - 0.12)} height={Math.max(0.1, s.h - 0.12)} fill="url(#wl-hatch)" />}
            {s.kind === 'aisle' && <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="url(#wl-aisle)" className="wl-aisle-marks" />}
            {showBays && bays > 1 && Array.from({ length: bays - 1 }, (_, k) => {
              const t = (k + 1) / bays;
              return vertical
                ? <line key={k} x1={s.x + 0.15} x2={s.x + s.w - 0.15} y1={s.y + s.h * t} y2={s.y + s.h * t} className="wl-bay" />
                : <line key={k} y1={s.y + 0.15} y2={s.y + s.h - 0.15} x1={s.x + s.w * t} x2={s.x + s.w * t} className="wl-bay" />;
            })}
            {s.kind !== 'column' && (s.kind !== 'wall' || s.w * s.h > 6) && (
              <text x={s.x + s.w / 2} y={s.y + s.h / 2} className={`wl-label${s.kind === 'aisle' ? ' faint' : ''}`} fontSize={s.kind === 'aisle' ? Math.min(fontSize, 0.7) : fontSize}
                transform={rotated ? `rotate(90 ${s.x + s.w / 2} ${s.y + s.h / 2})` : undefined}>{s.kind === 'rack' ? s.code : s.name}</text>
            )}
            {mode === 'issues' && st && (st.critical + st.low) > 0 && (
              <g className="wl-badge"><circle cx={s.x + s.w - 0.2} cy={s.y + 0.2} r="0.55" /><text x={s.x + s.w - 0.2} y={s.y + 0.22} fontSize="0.6">{st.critical + st.low}</text></g>
            )}
            {mode === 'route' && stopIndex.has(s.id) && (
              <g className="wl-stop"><circle cx={s.x + s.w / 2} cy={s.y + s.h / 2} r="0.6" /><text x={s.x + s.w / 2} y={s.y + s.h / 2 + 0.02} fontSize="0.65">{stopIndex.get(s.id)}</text></g>
            )}
            {editable && isSel && sel.size === 1 && !s.locked && <rect x={s.x + s.w - 0.6} y={s.y + s.h - 0.6} width="0.6" height="0.6" className="wl-handle" onPointerDown={(e) => startShape(e, s, 'resize')} />}
            {editable && isSel && sel.size === 1 && <text x={s.x + s.w / 2} y={s.y - 0.35} className="wl-dim" fontSize="0.5">{`${s.w} × ${s.h} m`}</text>}
          </g>
        );
      })}

      {guides.v.map((x) => <line key={`gv${x}`} x1={x} x2={x} y1={0} y2={layout.rows} className="wl-guide" />)}
      {guides.h.map((y) => <line key={`gh${y}`} y1={y} y2={y} x1={0} x2={layout.cols} className="wl-guide" />)}
      {marquee && <rect {...marquee} className="wl-marquee" />}

      {route?.d && <>
        <path d={route.d} className="wl-route-glow" filter="url(#wl-glow)" />
        <path d={route.d} className="wl-route" />
        <circle r="0.4" className="wl-runner"><animateMotion dur={`${Math.max(5, route.order.length * 1.8)}s`} repeatCount="indefinite" path={route.d} /></circle>
      </>}
    </svg>
  );
}

// draw floor things first so racks sit on top of aisles/zones
function order(s: Shape) { return s.kind === 'zone' ? 0 : s.kind === 'aisle' ? 1 : s.kind === 'dock' ? 2 : s.kind === 'wall' ? 3 : 4; }
