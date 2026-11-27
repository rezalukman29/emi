import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { Layout, Shape, ShapeStat } from '../../lib/warehouseLayout';

// SVG floor plan shared by the layout editor (drag / resize) and the Hub map (heatmap, issues, route, search).
// 1 grid unit = 1 SVG unit; the viewBox handles zoom/pan.

export type MapMode = 'stock' | 'issues' | 'route' | 'plain';

export interface CanvasProps {
  layout: Layout;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (shape: Shape) => void;
  stats?: Map<string, ShapeStat>;
  mode?: MapMode;
  maxUnits?: number;
  highlight?: Set<string>;
  route?: { d: string; order: Shape[] } | null;
  zoom: number;
  ariaLabel: string;
}

const heat = (r: number) => (r >= 0.9 ? 'h4' : r >= 0.75 ? 'h3' : r >= 0.5 ? 'h2' : r >= 0.2 ? 'h1' : r > 0 ? 'h0' : 'empty');

export default function LayoutCanvas({ layout, editable, selectedId, onSelect, onChange, stats, mode = 'plain', maxUnits = 0, highlight, route, zoom, ariaLabel }: CanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; kind: 'move' | 'resize'; startX: number; startY: number; orig: Shape } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const vw = layout.cols / zoom;
  const vh = layout.rows / zoom;
  useEffect(() => { setPan((p) => ({ x: Math.min(Math.max(0, p.x), layout.cols - vw), y: Math.min(Math.max(0, p.y), layout.rows - vh) })); }, [zoom, layout.cols, layout.rows, vw, vh]);

  const toGrid = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current; if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: pan.x + ((e.clientX - r.left) / r.width) * vw, y: pan.y + ((e.clientY - r.top) / r.height) * vh };
  };

  const startShape = (e: RPointerEvent, shape: Shape, kind: 'move' | 'resize') => {
    e.stopPropagation();
    onSelect?.(shape.id);
    if (!editable) return;
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* synthetic or already released */ }
    const g = toGrid(e);
    drag.current = { id: shape.id, kind, startX: g.x, startY: g.y, orig: shape };
  };
  const onMove = (e: RPointerEvent) => {
    if (drag.current && onChange) {
      const g = toGrid(e); const d = drag.current; const o = d.orig;
      const dx = Math.round(g.x - d.startX); const dy = Math.round(g.y - d.startY);
      if (d.kind === 'move') onChange({ ...o, x: Math.min(Math.max(0, o.x + dx), layout.cols - o.w), y: Math.min(Math.max(0, o.y + dy), layout.rows - o.h) });
      else onChange({ ...o, w: Math.min(Math.max(1, o.w + dx), layout.cols - o.x), h: Math.min(Math.max(1, o.h + dy), layout.rows - o.y) });
      return;
    }
    if (panning.current && zoom > 1) {
      const svg = svgRef.current; if (!svg) return; const r = svg.getBoundingClientRect(); const p = panning.current;
      setPan({ x: Math.min(Math.max(0, p.px - ((e.clientX - p.x) / r.width) * vw), layout.cols - vw), y: Math.min(Math.max(0, p.py - ((e.clientY - p.y) / r.height) * vh), layout.rows - vh) });
    }
  };
  const end = () => { drag.current = null; panning.current = null; };

  const nudge = (e: React.KeyboardEvent, shape: Shape) => {
    if (!editable || !onChange) { if (e.key === 'Enter') onSelect?.(shape.id); return; }
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const s = step[e.key]; if (!s) return; e.preventDefault();
    if (e.shiftKey) onChange({ ...shape, w: Math.max(1, shape.w + s[0]), h: Math.max(1, shape.h + s[1]) });
    else onChange({ ...shape, x: Math.min(Math.max(0, shape.x + s[0]), layout.cols - shape.w), y: Math.min(Math.max(0, shape.y + s[1]), layout.rows - shape.h) });
  };

  const stopIndex = new Map((route?.order ?? []).map((s, i) => [s.id, i + 1]));

  return (
    <svg
      ref={svgRef}
      className={`wl-canvas mode-${mode}${editable ? ' editable' : ''}${zoom > 1 ? ' pannable' : ''}`}
      viewBox={`${pan.x} ${pan.y} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      onPointerDown={(e) => { onSelect?.(null); panning.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; }}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerLeave={end}
    >
      <defs>
        <pattern id="wl-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" className="wl-grid-line" /></pattern>
        <pattern id="wl-grid4" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4 0H0V4" className="wl-grid-line major" /></pattern>
        <filter id="wl-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.35" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect x="0" y="0" width={layout.cols} height={layout.rows} fill="url(#wl-grid)" />
      <rect x="0" y="0" width={layout.cols} height={layout.rows} fill="url(#wl-grid4)" />
      <rect x="0.05" y="0.05" width={layout.cols - 0.1} height={layout.rows - 0.1} className="wl-wall" />

      {layout.shapes.map((s, i) => {
        const st = stats?.get(s.id);
        const ratio = mode === 'stock' ? (s.capacity > 0 && st ? Math.min(1.2, st.units / s.capacity) : st && maxUnits ? st.units / maxUnits : 0) : 0;
        const issue = st ? (st.critical > 0 ? 'crit' : st.low > 0 ? 'low' : 'ok') : 'none';
        const vertical = s.h > s.w;
        const rotated = vertical && s.h >= s.w * 1.5;
        const fontSize = Math.max(0.5, Math.min(1.6, (rotated ? s.w : Math.min(s.w, s.h)) * 0.42, (rotated ? s.h : s.w) / Math.max(3, s.name.length) * 1.5));
        const cls = [
          'wl-shape', `k-${s.kind}`, s.role ? `r-${s.role}` : '',
          mode === 'stock' && (s.kind === 'rack' || s.kind === 'bulk') ? heat(ratio) : '',
          mode === 'issues' ? `i-${issue}` : '',
          selectedId === s.id ? 'selected' : '',
          highlight?.has(s.id) ? 'hit' : '',
          mode === 'route' && stopIndex.has(s.id) ? 'stop' : '',
        ].filter(Boolean).join(' ');
        return (
          <g key={s.id} className={cls} style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }}
            tabIndex={0} role="button" aria-label={`${s.name}${st ? `, ${st.units} units` : ''}`}
            onPointerDown={(e) => startShape(e, s, 'move')} onKeyDown={(e) => nudge(e, s)}>
            <rect x={s.x + 0.08} y={s.y + 0.08} width={s.w - 0.16} height={s.h - 0.16} rx="0.25" className="wl-body" />
            {s.kind === 'rack' && Array.from({ length: Math.max(0, Math.min(s.levels, 8) - 1) }, (_, k) => {
              const t = (k + 1) / Math.min(s.levels, 8);
              return vertical
                ? <line key={k} x1={s.x + 0.25} x2={s.x + s.w - 0.25} y1={s.y + s.h * t} y2={s.y + s.h * t} className="wl-level" />
                : <line key={k} y1={s.y + 0.25} y2={s.y + s.h - 0.25} x1={s.x + s.w * t} x2={s.x + s.w * t} className="wl-level" />;
            })}
            <text x={s.x + s.w / 2} y={s.y + s.h / 2} className="wl-label" fontSize={fontSize}
              transform={rotated ? `rotate(90 ${s.x + s.w / 2} ${s.y + s.h / 2})` : undefined}>{s.name}</text>
            {mode === 'issues' && st && (st.critical + st.low) > 0 && (
              <g className="wl-badge"><circle cx={s.x + s.w - 0.3} cy={s.y + 0.3} r="0.62" /><text x={s.x + s.w - 0.3} y={s.y + 0.32} fontSize="0.7">{st.critical + st.low}</text></g>
            )}
            {mode === 'route' && stopIndex.has(s.id) && (
              <g className="wl-stop"><circle cx={s.x + s.w / 2} cy={s.y - 0.1} r="0.7" /><text x={s.x + s.w / 2} y={s.y - 0.08} fontSize="0.75">{stopIndex.get(s.id)}</text></g>
            )}
            {editable && selectedId === s.id && <rect x={s.x + s.w - 0.75} y={s.y + s.h - 0.75} width="0.75" height="0.75" className="wl-handle" onPointerDown={(e) => startShape(e, s, 'resize')} />}
          </g>
        );
      })}

      {route?.d && <>
        <path d={route.d} className="wl-route-glow" filter="url(#wl-glow)" />
        <path d={route.d} className="wl-route" />
        <circle r="0.45" className="wl-runner"><animateMotion dur={`${Math.max(4, route.order.length * 1.6)}s`} repeatCount="indefinite" path={route.d} /></circle>
      </>}
    </svg>
  );
}
