import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import LayoutCanvas, { type CanvasTool, type MapMode } from '../warehouse/LayoutCanvas';
import useGetEventItem from '../../hooks/api/useGetEventItem';
import {
  KIND_DEFAULTS, bbox, exportLayout, importLayout, isOutside, newId, outlinePreset, pickRoute, shapesOverlap,
  type Layout, type OutlinePreset, type Shape, type ShapeForm, type ShapeKind, type ZoneRole,
} from '../../lib/warehouseLayout';
import {
  EVENT_BLOCKING, EVENT_ROLES, areaIsPlaced, buildPlan, deleteEventPlan, eventAreas, guessRole, saveEventPlan, spaceTemplate, statsByZone, tableLayout,
  useEventPlan, useEventPlans, zoneForItem, type EventLayoutItem, type EventPlan, type SpaceTemplate, type TableArrangement, type TableSpec,
} from '../../lib/eventLayout';
import '../../warehouseHub.css';
import '../../warehouseLayout.css';

// Event layout map (owner 2026-11-27) — tab "Layout" in Event Detail.
// v2: several SPACES per event (akad room, ballroom, foyer, garden…), round / semicircle / arc / L / U / hexagon /
// free-drawn shapes, rotation, venue outlines (round, oval, L…), table arrangements (grid, staggered, ring, half
// ring, theatre). View: areas & items, setup / return progress (real scans), load-in route, item search, print.
// PREVIEW: saved in this browser (api-backlog §17).

type ViewMode = 'areas' | 'setup' | 'return' | 'route';
const ELEMENTS: Array<{ kind: ShapeKind; form?: ShapeForm; key: string; w?: number; h?: number }> = [
  { kind: 'stage', key: 'stage' }, { kind: 'stage', form: 'semi', key: 'stageSemi', w: 10, h: 4 }, { kind: 'decor', key: 'decor' },
  { kind: 'decor', form: 'ellipse', key: 'danceFloor', w: 8, h: 8 }, { kind: 'table', form: 'ellipse', key: 'roundTable' }, { kind: 'table', key: 'longTable', w: 3.2, h: 1 },
  { kind: 'aisle', key: 'walkway' }, { kind: 'dock', key: 'entrance' }, { kind: 'wall', key: 'wall' }, { kind: 'column', form: 'ellipse', key: 'pillar' },
];
const FORMS: ShapeForm[] = ['rect', 'ellipse', 'semi', 'arc', 'L', 'U', 'hex', 'oct', 'tri'];
const SPACE_KINDS: SpaceTemplate[] = ['ceremony', 'ballroom', 'roundBallroom', 'garden', 'foyer', 'blank'];
const OUTLINES: OutlinePreset[] = ['rect', 'round', 'oval', 'oct', 'L', 'T'];
const FORM_ICON: Record<ShapeForm, string> = { rect: '▭', ellipse: '◯', semi: '◓', arc: '◠', L: '⌐', U: '⊔', hex: '⬡', oct: '⯃', tri: '△', poly: '✎' };

export default function EventLayoutPanel({ eventId, eventName }: { eventId: number; eventName: string }) {
  const { t, i18n } = useTranslation();
  const saved = useEventPlan(eventId);
  const all = useEventPlans();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EventPlan | null>(saved);
  const [past, setPast] = useState<EventPlan[]>([]);
  const [future, setFuture] = useState<EventPlan[]>([]);
  const [spaceId, setSpaceId] = useState<string>('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ViewMode>('areas');
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [drawTarget, setDrawTarget] = useState<'zone' | 'stage' | 'decor' | 'wall' | 'outline'>('zone');
  const [q, setQ] = useState('');
  const [itemQ, setItemQ] = useState('');
  const [tables, setTables] = useState<Omit<TableSpec, 'x' | 'y' | 'start'>>({ arrangement: 'grid', rows: 3, cols: 4, count: 10, radius: 6, size: 2, gap: 2, seats: 10, form: 'ellipse', facing: false });
  const [picked, setPicked] = useState<SpaceTemplate[]>([]);
  const dragBase = useRef<EventPlan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const itemsQuery = useGetEventItem({ params: { event_id: eventId, order: 'asc' }, options: { enabled: eventId > 0 } });
  const items = useMemo<EventLayoutItem[]>(() => {
    const raw = (itemsQuery.data as { data?: unknown } | undefined)?.data;
    const rows = (Array.isArray(raw) ? raw : (raw as { data?: unknown[] } | undefined)?.data ?? []) as Array<Record<string, unknown>>;
    return rows.map((r) => ({ id: Number(r.id), name: String(r.nama_barang ?? ''), qty: Number(r.qty) || 0, area: String(r.area_name ?? ''), subArea: String(r.sub_list_name ?? ''), scanOut: Number(r.scan_out) || 0, scanIn: Number(r.scan_in) || 0, photo: String(r.photo ?? '') }));
  }, [itemsQuery.data]);
  const areas = useMemo(() => eventAreas(items), [items]);

  // suggest spaces from the event's areas
  useEffect(() => {
    if (picked.length || !areas.length) return;
    const roles = new Set(areas.map((a) => guessRole(a.name)));
    const s: SpaceTemplate[] = [];
    if (roles.has('ceremony')) s.push('ceremony');
    s.push('ballroom');
    if (roles.has('foyer') || roles.has('photo')) s.push('foyer');
    setPicked(s);
  }, [areas, picked.length]);

  useEffect(() => { if (!editing) setDraft(saved); }, [saved, editing]);
  const plan = editing ? draft : saved;
  const space = plan?.spaces.find((s) => s.id === spaceId) ?? plan?.spaces[0] ?? null;
  const layout = space?.layout ?? null;
  useEffect(() => { if (plan && !plan.spaces.some((s) => s.id === spaceId)) setSpaceId(plan.spaces[0]?.id ?? ''); }, [plan, spaceId]);
  useEffect(() => { setSel(new Set()); setZoom(1); }, [spaceId]);
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(saved);
  const stats = useMemo(() => (plan ? statsByZone(plan, items) : null), [plan, items]);
  const selected = layout ? layout.shapes.filter((s) => sel.has(s.id)) : [];
  const one = selected.length === 1 ? selected[0] : null;

  const commitPlan = (next: EventPlan) => { if (draft) setPast((p) => [...p.slice(-60), draft]); setDraft(next); setFuture([]); };
  const commit = (l: Layout) => { if (draft && space) commitPlan({ ...draft, spaces: draft.spaces.map((s) => (s.id === space.id ? { ...s, layout: l } : s)) }); };
  const patch = (changed: Shape[]) => layout && commit({ ...layout, shapes: layout.shapes.map((s) => changed.find((c) => c.id === s.id) ?? s) });
  const patchOne = (p: Partial<Shape>) => one && patch([{ ...one, ...p }]);
  const undo = () => { const prev = past[past.length - 1]; if (prev && draft) { setFuture((f) => [draft, ...f]); setDraft(prev); setPast((p) => p.slice(0, -1)); } };
  const redo = () => { const next = future[0]; if (next && draft) { setPast((p) => [...p, draft]); setDraft(next); setFuture((f) => f.slice(1)); } };
  const onMove = (shapes: Shape[], done: boolean) => {
    if (!draft || !space) return;
    if (done) { if (dragBase.current) { setPast((p) => [...p.slice(-60), dragBase.current!]); setFuture([]); } dragBase.current = null; return; }
    if (!dragBase.current) dragBase.current = draft;
    setDraft({ ...draft, spaces: draft.spaces.map((sp) => (sp.id === space.id ? { ...sp, layout: { ...sp.layout, shapes: sp.layout.shapes.map((s) => shapes.find((c) => c.id === s.id) ?? s) } } : sp)) });
  };

  const startPlan = (p: EventPlan) => { setDraft(p); setPast([]); setFuture([]); setSel(new Set()); setSpaceId(p.spaces[0]?.id ?? ''); setEditing(true); };
  const save = () => { if (!draft) return; if (saveEventPlan(eventId, draft)) { toast.success(t('evLayout.saved')); setEditing(false); setTool('select'); } else toast.error(t('whLayout.saveFailed')); };
  const cancel = () => { if (dirty && !window.confirm(t('evLayout.discard'))) return; setEditing(false); setDraft(saved); setSel(new Set()); setTool('select'); };

  const center = (w: number, h: number) => (layout ? { x: Math.max(0, Math.round(layout.cols / 2 - w / 2)), y: Math.max(0, Math.round(layout.rows / 2 - h / 2)) } : { x: 0, y: 0 });
  const add = (kind: ShapeKind, opts: { form?: ShapeForm; role?: ZoneRole; name?: string; w?: number; h?: number; key?: string } = {}) => {
    if (!layout) return;
    const d = KIND_DEFAULTS[kind];
    const n = layout.shapes.filter((s) => s.kind === kind).length + 1;
    const name = opts.name ?? (kind === 'zone' ? t(`evLayout.roles.${opts.role ?? 'other'}`) : kind === 'table' ? `T${n}` : t(`evLayout.el.${opts.key ?? kind}`));
    const w = opts.w ?? d.w; const h = opts.h ?? d.h;
    const s: Shape = { id: newId(), kind, role: kind === 'zone' ? opts.role ?? guessRole(name) : undefined, code: name, name, ...center(w, h), w, h, levels: 1, capacity: 0, form: opts.form, seats: kind === 'table' ? (opts.form === 'ellipse' ? 10 : 8) : undefined };
    commit({ ...layout, shapes: [...layout.shapes, s] });
    setSel(new Set([s.id]));
  };
  const onDraw = (pts: Array<[number, number]>) => {
    if (!layout) return;
    if (drawTarget === 'outline') { commit({ ...layout, outline: pts }); setTool('select'); toast.info(t('evLayout.outlineSet')); return; }
    const b = bbox(pts);
    const rel = pts.map(([x, y]) => [(x - b.x) / (b.w || 1), (y - b.y) / (b.h || 1)] as [number, number]);
    const kind: ShapeKind = drawTarget;
    const name = kind === 'zone' ? t('evLayout.roles.other') : t(`evLayout.el.${kind === 'stage' ? 'stage' : kind === 'decor' ? 'decor' : 'wall'}`);
    const s: Shape = { id: newId(), kind, role: kind === 'zone' ? 'other' : undefined, code: name, name, x: b.x, y: b.y, w: Math.max(0.5, b.w), h: Math.max(0.5, b.h), levels: 1, capacity: 0, form: 'poly', points: rel };
    commit({ ...layout, shapes: [...layout.shapes, s] });
    setSel(new Set([s.id])); setTool('select');
  };
  const removeSel = () => { if (!layout) return; const gone = new Set(selected.filter((s) => !s.locked).map((s) => s.id)); commit({ ...layout, shapes: layout.shapes.filter((s) => !gone.has(s.id)), assign: Object.fromEntries(Object.entries(layout.assign).filter(([, v]) => !gone.has(v))) }); setSel(new Set()); };
  const duplicate = () => { if (!layout || !selected.length) return; const copies = selected.map((s) => ({ ...s, id: newId(), locked: false, x: Math.min(s.x + 1, layout.cols - s.w), y: Math.min(s.y + 1, layout.rows - s.h) })); commit({ ...layout, shapes: [...layout.shapes, ...copies] }); setSel(new Set(copies.map((c) => c.id))); };
  const assign = (itemId: number, zoneId: string | null) => {
    if (!draft || !space) return;
    commitPlan({ ...draft, spaces: draft.spaces.map((sp) => { const a = { ...sp.layout.assign }; delete a[itemId]; if (zoneId && sp.id === space.id) a[itemId] = zoneId; return { ...sp, layout: { ...sp.layout, assign: a } }; }) });
  };
  const moveToSpace = (targetId: string) => {
    if (!draft || !space || !selected.length) return;
    const moving = selected.map((s) => s.id);
    commitPlan({ ...draft, spaces: draft.spaces.map((sp) => {
      if (sp.id === space.id) return { ...sp, layout: { ...sp.layout, shapes: sp.layout.shapes.filter((s) => !moving.includes(s.id)) } };
      if (sp.id === targetId) { const l = sp.layout; return { ...sp, layout: { ...l, shapes: [...l.shapes, ...selected.map((s) => ({ ...s, x: Math.min(s.x, Math.max(0, l.cols - s.w)), y: Math.min(s.y, Math.max(0, l.rows - s.h)) }))] } }; }
      return sp;
    }) });
    setSel(new Set());
    toast.info(t('evLayout.moved', { count: moving.length, space: draft.spaces.find((s) => s.id === targetId)?.name }));
  };
  const addSpace = (kind: SpaceTemplate) => { if (!draft) return; const sp = spaceTemplate(kind, t(`evLayout.space.${kind}`)); commitPlan({ ...draft, spaces: [...draft.spaces, sp] }); setSpaceId(sp.id); };
  const renameSpace = (id: string, name: string) => draft && commitPlan({ ...draft, spaces: draft.spaces.map((s) => (s.id === id ? { ...s, name } : s)) });
  const removeSpace = (id: string) => { if (!draft || draft.spaces.length < 2) return; if (!window.confirm(t('evLayout.space.deleteConfirm'))) return; commitPlan({ ...draft, spaces: draft.spaces.filter((s) => s.id !== id) }); };
  const dupSpace = (id: string) => { if (!draft) return; const src = draft.spaces.find((s) => s.id === id); if (!src) return; const sp = { ...src, id: newId(), name: `${src.name} (2)`, layout: { ...src.layout, assign: {}, shapes: src.layout.shapes.map((s) => ({ ...s, id: newId() })) } }; commitPlan({ ...draft, spaces: [...draft.spaces, sp] }); setSpaceId(sp.id); };

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (!layout || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || document.querySelector('.modal-overlay') || tool === 'draw') return;
      const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
      else if (mod && k === 's') { e.preventDefault(); save(); }
      else if ((k === 'delete' || k === 'backspace') && selected.length) { e.preventDefault(); removeSel(); }
      else if (k === 'escape') setSel(new Set());
      else if (k === 'r' && one) patchOne({ rot: (((one.rot ?? 0) + (e.shiftKey ? -15 : 15)) % 360 + 360) % 360 });
      else if (k.startsWith('arrow') && selected.length) {
        e.preventDefault(); const st = e.altKey ? 0.5 : 1;
        const [dx, dy] = ({ arrowleft: [-st, 0], arrowright: [st, 0], arrowup: [0, -st], arrowdown: [0, st] } as Record<string, [number, number]>)[k];
        patch(selected.filter((s) => !s.locked).map((s) => (e.shiftKey ? { ...s, w: Math.max(0.5, s.w + dx), h: Math.max(0.5, s.h + dy) } : { ...s, x: Math.min(Math.max(0, s.x + dx), layout.cols - s.w), y: Math.min(Math.max(0, s.y + dy), layout.rows - s.h) })));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const issues = useMemo(() => {
    if (!layout || !plan) return [];
    const list: Array<{ type: string; ids: string[]; label: string }> = [];
    const blocking = layout.shapes.filter((s) => EVENT_BLOCKING.includes(s.kind));
    for (let i = 0; i < blocking.length; i += 1) for (let j = i + 1; j < blocking.length; j += 1) if (shapesOverlap(blocking[i], blocking[j])) list.push({ type: 'overlap', ids: [blocking[i].id, blocking[j].id], label: `${blocking[i].name} ↔ ${blocking[j].name}` });
    for (const s of layout.shapes) if (isOutside(layout, s)) list.push({ type: 'outside', ids: [s.id], label: s.name });
    if (!layout.shapes.some((s) => s.kind === 'dock')) list.push({ type: 'noEntrance', ids: [], label: '' });
    for (const a of areas) if (!areaIsPlaced(plan, a.name)) list.push({ type: 'areaMissing', ids: [], label: a.name });
    return list;
  }, [layout, plan, areas]);
  const badIds = useMemo(() => new Set(issues.flatMap((i) => i.ids)), [issues]);

  const spaceShapeIds = useMemo(() => new Set(layout?.shapes.map((s) => s.id) ?? []), [layout]);
  const badges = useMemo(() => new Map([...(stats?.map ?? new Map()).entries()].filter(([id]) => spaceShapeIds.has(id)).map(([id, s]) => [id, s.items.length])), [stats, spaceShapeIds]);
  const progress = useMemo(() => new Map([...(stats?.map ?? new Map()).entries()].filter(([id, s]) => spaceShapeIds.has(id) && s.qty > 0).map(([id, s]) => [id, mode === 'return' ? s.back / s.qty : s.out / s.qty])), [stats, mode, spaceShapeIds]);
  const needle = q.trim().toLowerCase();
  const hitsAll = useMemo(() => (plan && needle.length >= 2 ? items.filter((it) => it.name.toLowerCase().includes(needle)).map((it) => zoneForItem(plan, it)).filter(Boolean) as Array<NonNullable<ReturnType<typeof zoneForItem>>> : []), [plan, items, needle]);
  const hits = useMemo(() => new Set(hitsAll.filter((h) => h.space.id === space?.id).map((h) => h.zone.id)), [hitsAll, space]);
  const hitSpaces = useMemo(() => new Set(hitsAll.map((h) => h.space.id)), [hitsAll]);
  const route = useMemo(() => {
    if (!layout || mode !== 'route' || editing) return null;
    const pending = layout.shapes.filter((s) => { const st = stats?.map.get(s.id); return st && st.out < st.qty; });
    const loading = layout.shapes.find((s) => s.kind === 'dock' && /load|bongkar|dock|service/i.test(s.name)) ?? null;
    return pickRoute(layout, pending, { blocking: EVENT_BLOCKING, endAt: null, startAt: loading });
  }, [layout, mode, stats, editing]);
  const totals = useMemo(() => {
    const qty = items.reduce((a, it) => a + it.qty, 0);
    const out = items.reduce((a, it) => a + Math.min(it.qty, it.scanOut), 0);
    const back = items.reduce((a, it) => a + Math.min(it.qty, it.scanIn), 0);
    const shapes = plan?.spaces.flatMap((s) => s.layout.shapes) ?? [];
    const isChair = (s: Shape) => s.kind === 'table' && (s.seats ?? 0) <= 1;
    return { qty, out, back, seats: shapes.reduce((a, s) => a + (s.kind === 'table' ? s.seats ?? 0 : 0), 0), tablesN: shapes.filter((s) => s.kind === 'table' && !isChair(s)).length, chairsN: shapes.filter(isChair).length };
  }, [items, plan]);
  const others = Object.entries(all).filter(([id]) => Number(id) !== eventId);
  const placed = items.length - (stats?.unplaced ?? items.length);

  function print() {
    document.body.classList.add('printing-layout');
    const done = () => { document.body.classList.remove('printing-layout'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  }

  if (!plan || !space || !layout) {
    return (
      <section className="card el-start">
        <div className="el-start-body">
          <span className="ck-preview-badge" title={t('evLayout.previewHint')}>{t('whLayout.previewBadge')}</span>
          <h2>{t('evLayout.startTitle')}</h2>
          <p>{t('evLayout.startBody2', { count: areas.length })}</p>
          <div className="el-space-picker">
            {SPACE_KINDS.map((k) => (
              <label key={k} className={picked.includes(k) ? 'on' : ''}>
                <input type="checkbox" checked={picked.includes(k)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, k] : p.filter((x) => x !== k)))} />
                <span className={`el-space-art k-${k}`} aria-hidden="true" />
                <b>{t(`evLayout.space.${k}`)}</b><small>{t(`evLayout.space.${k}Hint`)}</small>
              </label>
            ))}
          </div>
          <div className="wl-row">
            <button type="button" className="btn btn-primary" disabled={!picked.length} onClick={() => startPlan(buildPlan(SPACE_KINDS.filter((k) => picked.includes(k)).map((k) => ({ kind: k, name: t(`evLayout.space.${k}`) })), areas.map((a) => a.name)))}>{t('evLayout.createPlan', { count: picked.length })}</button>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>{t('whLayout.io.importTitle')}</button>
          </div>
          {others.length > 0 && (
            <label className="el-copy">{t('evLayout.copyFrom')}
              <select defaultValue="" onChange={(e) => { const src = all[Number(e.target.value)]; if (src) startPlan({ spaces: src.spaces.map((s) => ({ ...s, id: newId(), layout: { ...s.layout, assign: {} } })), updatedAt: '' }); }}>
                <option value="" disabled>{t('evLayout.copyPick')}</option>
                {others.map(([id, p]) => <option key={id} value={id}>{t('evLayout.copyOption2', { id, spaces: p.spaces.length })}</option>)}
              </select>
            </label>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { const l = await importLayout(f, eventId); startPlan({ spaces: [{ id: newId(), name: t('evLayout.space.blank'), layout: l }], updatedAt: '' }); } catch { toast.error(t('whLayout.io.importFailed')); } }} />
        </div>
      </section>
    );
  }

  const oneStat = one ? stats?.map.get(one.id) : undefined;
  const candidates = one && editing && itemQ.trim().length >= 2 ? items.filter((it) => it.name.toLowerCase().includes(itemQ.trim().toLowerCase()) && zoneForItem(plan, it)?.zone.id !== one.id).slice(0, 8) : [];
  const missingAreas = areas.filter((a) => !areaIsPlaced(plan, a.name));
  const canvasMode: MapMode = editing ? 'plain' : mode === 'setup' || mode === 'return' ? 'progress' : mode === 'route' ? 'route' : 'plain';
  const spacePct = (id: string) => { const st = stats?.perSpace.get(id); return st && st.qty ? Math.round(((mode === 'return' ? st.back : st.out) / st.qty) * 100) : null; };
  const areaRows = layout.shapes.filter((s) => stats?.map.get(s.id)).sort((a, b) => stats!.map.get(b.id)!.items.length - stats!.map.get(a.id)!.items.length);

  return (
    <section className={`card el-panel${editing ? ' editing' : ''}`}>
      <header className="wl-map-head">
        <div>
          <span className="whm-live"><i aria-hidden="true" />{editing ? t('evLayout.editing') : t('evLayout.title')}</span>
          <h2>{eventName}</h2>
        </div>
        {!editing ? (
          <div className="wl-map-tools">
            <div className="wl-modes" role="group" aria-label={t('whLayout.map.modeAria')}>
              {(['areas', 'setup', 'return', 'route'] as ViewMode[]).map((m) => <button key={m} type="button" className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`evLayout.modes.${m}`)}</button>)}
            </div>
            <input className="wl-search" placeholder={t('evLayout.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('evLayout.searchPh')} />
            <button type="button" className="btn btn-ghost" onClick={print}>{t('evLayout.print')}</button>
            <button type="button" className="btn btn-primary" onClick={() => { setDraft(saved); setPast([]); setFuture([]); setEditing(true); }}>{t('evLayout.edit')}</button>
          </div>
        ) : (
          <div className="wl-map-tools">
            <span className="ck-preview-badge" title={t('evLayout.previewHint')}>{t('whLayout.previewBadge')}</span>
            <button type="button" className="btn btn-ghost" onClick={cancel}>{t('eventChecklist.cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>{t('evLayout.save')}</button>
          </div>
        )}
      </header>

      <nav className="el-spaces" aria-label={t('evLayout.space.tabs')}>
        {plan.spaces.map((sp) => {
          const pct = spacePct(sp.id); const n = stats?.perSpace.get(sp.id)?.items.length ?? 0;
          return (
            <div key={sp.id} className={`el-space-tab${sp.id === space.id ? ' on' : ''}${hitSpaces.has(sp.id) ? ' hit' : ''}`}>
              <button type="button" onClick={() => setSpaceId(sp.id)}>
                {editing && sp.id === space.id ? <input value={sp.name} aria-label={t('evLayout.space.rename')} onChange={(e) => renameSpace(sp.id, e.target.value)} onClick={(e) => e.stopPropagation()} /> : <b>{sp.name}</b>}
                <small>{t('evLayout.lines', { count: n })}{!editing && pct !== null && (mode === 'setup' || mode === 'return') ? ` · ${pct}%` : ''}</small>
              </button>
              {editing && sp.id === space.id && <span className="el-space-actions">
                <button type="button" title={t('whLayout.duplicate')} onClick={() => dupSpace(sp.id)}>⧉</button>
                {plan.spaces.length > 1 && <button type="button" title={t('whLayout.delete')} onClick={() => removeSpace(sp.id)}>×</button>}
              </span>}
            </div>
          );
        })}
        {editing && (
          <select className="el-add-space" value="" onChange={(e) => e.target.value && addSpace(e.target.value as SpaceTemplate)} aria-label={t('evLayout.space.add')}>
            <option value="">{t('evLayout.space.add')}</option>
            {SPACE_KINDS.map((k) => <option key={k} value={k}>{t(`evLayout.space.${k}`)}</option>)}
          </select>
        )}
      </nav>

      {editing && (
        <div className="wl-toolbar" role="toolbar" aria-label={t('whLayout.toolbar')}>
          <div className="wl-tgroup">
            <button type="button" className={tool === 'select' ? 'on' : ''} onClick={() => setTool('select')}>{t('whLayout.tools.select')}</button>
            <button type="button" className={tool === 'pan' ? 'on' : ''} onClick={() => setTool('pan')}>{t('whLayout.tools.pan')}</button>
            <button type="button" className={tool === 'draw' && drawTarget !== 'outline' ? 'on' : ''} onClick={() => { setDrawTarget(drawTarget === 'outline' ? 'zone' : drawTarget); setTool('draw'); }}>{t('evLayout.draw.tool')}</button>
            {tool === 'draw' && drawTarget !== 'outline' && <select value={drawTarget} onChange={(e) => setDrawTarget(e.target.value as typeof drawTarget)} aria-label={t('evLayout.draw.as')}>{(['zone', 'stage', 'decor', 'wall'] as const).map((k) => <option key={k} value={k}>{t(`evLayout.draw.${k}`)}</option>)}</select>}
          </div>
          <div className="wl-tgroup">
            <button type="button" onClick={undo} disabled={!past.length} title="Ctrl+Z">{t('whLayout.undo')}</button>
            <button type="button" onClick={redo} disabled={!future.length} title="Ctrl+Shift+Z">{t('whLayout.redo')}</button>
          </div>
          <div className="wl-tgroup">
            <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label={t('whLayout.zoomOut')}>−</button>
            <span className="wl-zoomval">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((z) => Math.min(5, z + 0.5))} aria-label={t('whLayout.zoomIn')}>+</button>
          </div>
          <div className="wl-tgroup">
            <span className="el-size">{t('evLayout.venueShape')}</span>
            <select value="" onChange={(e) => { const v = e.target.value; if (v === 'draw') { setDrawTarget('outline'); setTool('draw'); } else if (v) commit({ ...layout, outline: outlinePreset(v as OutlinePreset, layout.cols, layout.rows) }); }} aria-label={t('evLayout.venueShape')}>
              <option value="">{layout.outline ? t('evLayout.outline.custom') : t('evLayout.outline.rect')}</option>
              {OUTLINES.map((o) => <option key={o} value={o}>{t(`evLayout.outline.${o}`)}</option>)}
              <option value="draw">{t('evLayout.outline.draw')}</option>
            </select>
            <label className="el-size">{t('whLayout.width')}<input type="number" min={10} max={200} value={layout.cols} onChange={(e) => commit({ ...layout, cols: Math.min(200, Math.max(10, Number(e.target.value) || 10)), outline: null })} /></label>
            <label className="el-size">{t('whLayout.depth')}<input type="number" min={10} max={200} value={layout.rows} onChange={(e) => commit({ ...layout, rows: Math.min(200, Math.max(10, Number(e.target.value) || 10)), outline: null })} /></label>
          </div>
          <div className="wl-tgroup">
            <button type="button" onClick={() => bgRef.current?.click()}>{layout.bg ? t('whLayout.bg.replace') : t('evLayout.venuePhoto')}</button>
            {layout.bg && <>
              <input type="range" min={0.05} max={1} step={0.05} value={layout.bg.opacity} aria-label={t('whLayout.bg.opacity')} onChange={(e) => commit({ ...layout, bg: { ...layout.bg!, opacity: Number(e.target.value) } })} />
              <button type="button" onClick={() => commit({ ...layout, bg: null })}>{t('whLayout.bg.remove')}</button>
            </>}
          </div>
          <div className="wl-tgroup">
            <button type="button" onClick={() => exportLayout(layout, `event-${eventId}-${space.name}`)}>{t('whLayout.io.export')}</button>
            <button type="button" onClick={() => fileRef.current?.click()}>{t('whLayout.io.import')}</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { commit(await importLayout(f, eventId)); } catch { toast.error(t('whLayout.io.importFailed')); } }} />
          <input ref={bgRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 1_500_000) { toast.error(t('whLayout.bg.tooBig')); return; } const r = new FileReader(); r.onload = () => commit({ ...layout, bg: { src: String(r.result), opacity: 0.4 } }); r.readAsDataURL(f); }} />
        </div>
      )}
      {editing && tool === 'draw' && <p className="el-draw-hint">{drawTarget === 'outline' ? t('evLayout.draw.outlineHint') : t('evLayout.draw.hint')}</p>}

      <div className={editing ? 'wl-editor el-editor' : 'wl-map-body'}>
        {editing && (
          <aside className="wl-tools">
            {missingAreas.length > 0 && <>
              <h3>{t('evLayout.eventAreas')}</h3>
              <p className="wl-tip">{t('evLayout.eventAreasHint2', { space: space.name })}</p>
              {missingAreas.slice(0, 14).map((a) => <button key={a.name} type="button" onClick={() => add('zone', { role: guessRole(a.name), name: a.name, w: 8, h: 5 })}><i className={`sw r-${guessRole(a.name)}`} />{a.name}<small className="el-n">{a.lines}</small></button>)}
            </>}
            <h3>{t('evLayout.elements')}</h3>
            {ELEMENTS.map((e) => <button key={e.key} type="button" onClick={() => add(e.kind, { form: e.form, w: e.w, h: e.h, key: e.key })}><i className={`sw k-${e.kind}${e.form ? ` f-${e.form}` : ''}`} />{t(`evLayout.el.${e.key}`)}</button>)}
            <h3>{t('evLayout.zones')}</h3>
            {EVENT_ROLES.map((r) => <button key={r} type="button" onClick={() => add('zone', { role: r })}><i className={`sw r-${r}`} />{t(`evLayout.roles.${r}`)}</button>)}

            <h3>{t('evLayout.tablesTitle')}</h3>
            <label>{t('evLayout.arr.label')}<select value={tables.arrangement} onChange={(e) => setTables({ ...tables, arrangement: e.target.value as TableArrangement, facing: e.target.value === 'theater' || e.target.value === 'arc' })}>{(['grid', 'staggered', 'circle', 'arc', 'theater'] as TableArrangement[]).map((a) => <option key={a} value={a}>{t(`evLayout.arr.${a}`)}</option>)}</select></label>
            <div className="wl-xywh two">
              {(tables.arrangement === 'grid' || tables.arrangement === 'staggered') ? <>
                <label>{t('evLayout.tRows')}<input type="number" min={1} max={20} value={tables.rows} onChange={(e) => setTables({ ...tables, rows: Math.max(1, Number(e.target.value) || 1) })} /></label>
                <label>{t('evLayout.tCols')}<input type="number" min={1} max={20} value={tables.cols} onChange={(e) => setTables({ ...tables, cols: Math.max(1, Number(e.target.value) || 1) })} /></label>
              </> : <>
                {tables.arrangement === 'theater' ? <label>{t('evLayout.tRows')}<input type="number" min={1} max={20} value={tables.rows} onChange={(e) => setTables({ ...tables, rows: Math.max(1, Number(e.target.value) || 1) })} /></label>
                  : <label>{t('evLayout.arr.count')}<input type="number" min={2} max={60} value={tables.count} onChange={(e) => setTables({ ...tables, count: Math.max(2, Number(e.target.value) || 2) })} /></label>}
                <label>{t('evLayout.arr.radius')}<input type="number" min={2} max={60} step={0.5} value={tables.radius} onChange={(e) => setTables({ ...tables, radius: Math.max(1, Number(e.target.value) || 1) })} /></label>
              </>}
              <label>{t('evLayout.tSeats')}<input type="number" min={1} max={30} value={tables.seats} onChange={(e) => setTables({ ...tables, seats: Math.max(1, Number(e.target.value) || 1) })} /></label>
              <label>{t('evLayout.arr.size')}<input type="number" min={0.5} max={6} step={0.25} value={tables.size} onChange={(e) => setTables({ ...tables, size: Math.max(0.5, Number(e.target.value) || 0.5) })} /></label>
            </div>
            <label>{t('evLayout.arr.form')}<select value={tables.form} onChange={(e) => setTables({ ...tables, form: e.target.value as ShapeForm })}>{(['ellipse', 'rect', 'hex', 'oct'] as ShapeForm[]).map((f) => <option key={f} value={f}>{t(`evLayout.form.${f}`)}</option>)}</select></label>
            <button type="button" className="primary" onClick={() => {
              const startN = layout.shapes.filter((s) => s.kind === 'table').length + 1;
              const ring = tables.arrangement === 'circle' || tables.arrangement === 'arc' || tables.arrangement === 'theater';
              const list = tableLayout({ ...tables, x: ring ? layout.cols / 2 : 1, y: ring ? (tables.arrangement === 'circle' ? layout.rows / 2 : 2) : 1, start: startN });
              commit({ ...layout, shapes: [...layout.shapes, ...list] }); setSel(new Set(list.map((s) => s.id)));
              toast.info(t('evLayout.tablesAdded2', { count: list.length }));
            }}><i className="sw k-table" />{t('evLayout.arr.add')}</button>

            <div className="wl-tabs"><button type="button" className="on">{t('whLayout.checks.title')}{issues.length > 0 && <span className="wl-count">{issues.length}</span>}</button></div>
            <ul className="wl-checks">
              {issues.length === 0 ? <li className="ok">{t('whLayout.checks.allGood')}</li> : issues.slice(0, 20).map((iss, i) => (
                <li key={i} className={iss.type === 'areaMissing' || iss.type === 'noEntrance' ? 'narrowAisle' : ''}><button type="button" onClick={() => iss.ids.length && setSel(new Set(iss.ids))}><b>{t(`evLayout.checks.${iss.type}`)}</b>{iss.label && <span>{iss.label}</span>}</button></li>
              ))}
            </ul>
            <button type="button" className="danger" onClick={() => { if (window.confirm(t('evLayout.deleteConfirm'))) { deleteEventPlan(eventId); setEditing(false); setDraft(null); } }}>{t('evLayout.delete')}</button>
          </aside>
        )}

        <div className="wl-stage">
          <div className="wl-frame dark el-print-area">
            <LayoutCanvas layout={layout} editable={editing} selected={sel} onSelect={setSel} onMove={onMove} tool={tool} zoom={zoom} onDraw={onDraw}
              mode={canvasMode} progress={progress} badges={editing || mode === 'areas' ? badges : undefined} highlight={hits} bad={editing ? badIds : undefined} route={route}
              ariaLabel={t('evLayout.aria', { name: `${eventName} · ${space.name}` })} />
            {!editing && <div className="wl-zoom floating">
              <button type="button" onClick={() => setZoom((z) => Math.min(5, z + 0.5))} aria-label={t('whLayout.zoomIn')}>+</button>
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label={t('whLayout.zoomOut')}>−</button>
            </div>}
            {!editing && (mode === 'setup' || mode === 'return') && <div className="wl-legend"><span><i className="crit" />0–25%</span><span><i className="h2" />25–75%</span><span><i className="ok" />75–100%</span></div>}
            {!editing && mode === 'route' && <div className="wl-legend"><span><i className="route" />{t('evLayout.routeLegend', { stops: route?.order.length ?? 0, m: route?.length ?? 0 })}</span></div>}
            <span className="el-space-label">{space.name} · {layout.cols} × {layout.rows} m</span>
          </div>
          <div className="wl-status">
            <span>{t('evLayout.stat.spaces', { count: plan.spaces.length })}</span>
            <span>{t('evLayout.stat.tables', { tables: totals.tablesN, seats: totals.seats })}{totals.chairsN ? ` · ${t('evLayout.stat.chairs', { count: totals.chairsN })}` : ''}</span>
            <span>{t('evLayout.stat.placed', { placed, total: items.length })}</span>
            <span>{t('evLayout.stat.out', { pct: totals.qty ? Math.round((totals.out / totals.qty) * 100) : 0 })}</span>
            <span>{t('evLayout.stat.back', { pct: totals.qty ? Math.round((totals.back / totals.qty) * 100) : 0 })}</span>
            {needle.length >= 2 && <span>{t('evLayout.stat.found', { count: hitsAll.length, spaces: hitSpaces.size })}</span>}
            {saved?.updatedAt && <span>{t('evLayout.stat.saved', { when: new Date(saved.updatedAt).toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</span>}
          </div>
        </div>

        <aside className={editing ? 'wl-props' : 'wl-detail'}>
          {!one ? (
            editing ? <p className="wl-tip">{selected.length > 1 ? t('whLayout.multi', { count: selected.length }) : t('evLayout.selectHint2')}</p> : (
              <>
                <h3>{t('evLayout.areasIn', { space: space.name })}</h3>
                <ul className="el-area-list">
                  {areaRows.map((s) => {
                    const st = stats!.map.get(s.id)!; const pct = st.qty ? Math.round(((mode === 'return' ? st.back : st.out) / st.qty) * 100) : 0;
                    return <li key={s.id}><button type="button" onClick={() => setSel(new Set([s.id]))}><span>{s.name}</span><small>{t('evLayout.lines', { count: st.items.length })}</small><span className="el-bar"><i style={{ width: `${pct}%` }} className={pct >= 75 ? 'ok' : pct >= 25 ? 'mid' : 'low'} /></span><b>{pct}%</b></button></li>;
                  })}
                  {!areaRows.length && <li className="wl-tip">{t('evLayout.noAreasHere')}</li>}
                </ul>
                {(stats?.unplaced ?? 0) > 0 && <p className="wl-note">{t('evLayout.unplaced', { count: stats?.unplaced ?? 0 })}</p>}
              </>
            )
          ) : (
            <>
              <div className="wl-props-head"><h3>{one.kind === 'zone' ? t(`evLayout.roles.${one.role ?? 'other'}`) : t(`evLayout.kind.${one.kind}`)}</h3>{!editing && <button type="button" className="btn btn-ghost" onClick={() => setSel(new Set())}>×</button>}</div>
              {editing ? (
                <>
                  <label>{t('whLayout.name')}<input value={one.name} onChange={(e) => patchOne({ name: e.target.value })} /></label>
                  {one.kind === 'zone' && <label>{t('evLayout.linkArea')}<select value={areas.some((a) => a.name === one.code) ? one.code : ''} onChange={(e) => patchOne({ code: e.target.value || one.name })}><option value="">{t('evLayout.linkNone')}</option>{areas.map((a) => <option key={a.name} value={a.name}>{a.name} ({a.lines})</option>)}</select><small>{t('evLayout.linkHint')}</small></label>}
                  {one.kind === 'zone' && <label>{t('whLayout.role')}<select value={one.role ?? 'other'} onChange={(e) => patchOne({ role: e.target.value as ZoneRole })}>{EVENT_ROLES.map((r) => <option key={r} value={r}>{t(`evLayout.roles.${r}`)}</option>)}</select></label>}
                  <div className="el-forms" role="group" aria-label={t('evLayout.shape')}>
                    {FORMS.map((f) => <button key={f} type="button" className={(one.form ?? (one.round ? 'ellipse' : 'rect')) === f ? 'on' : ''} title={t(`evLayout.form.${f}`)} onClick={() => patchOne({ form: f === 'rect' ? undefined : f, round: f === 'ellipse' ? true : undefined })}>{FORM_ICON[f]}</button>)}
                    {one.form === 'poly' && <button type="button" className="on" title={t('evLayout.form.poly')}>{FORM_ICON.poly}</button>}
                  </div>
                  <label>{t('evLayout.rotation', { deg: one.rot ?? 0 })}
                    <span className="el-rot"><input type="range" min={0} max={359} step={1} value={one.rot ?? 0} onChange={(e) => patchOne({ rot: Number(e.target.value) })} />
                      <button type="button" onClick={() => patchOne({ rot: (((one.rot ?? 0) - 15) % 360 + 360) % 360 })}>−15°</button><button type="button" onClick={() => patchOne({ rot: ((one.rot ?? 0) + 15) % 360 })}>+15°</button></span>
                  </label>
                  {one.kind === 'table' && <label>{t('evLayout.tSeats')}<input type="number" min={1} max={40} value={one.seats ?? 0} onChange={(e) => patchOne({ seats: Math.max(1, Number(e.target.value) || 1) })} /></label>}
                  <div className="wl-xywh">{(['x', 'y', 'w', 'h'] as const).map((k) => <label key={k}>{k === 'w' ? t('whLayout.wShort') : k === 'h' ? t('whLayout.hShort') : k.toUpperCase()}<input type="number" step={0.5} min={k === 'w' || k === 'h' ? 0.5 : 0} value={one[k]} onChange={(e) => patchOne({ [k]: Math.max(k === 'w' || k === 'h' ? 0.5 : 0, Number(e.target.value) || 0) })} /></label>)}</div>
                  <label>{t('whLayout.note')}<input value={one.note ?? ''} placeholder={t('evLayout.notePh')} onChange={(e) => patchOne({ note: e.target.value })} /></label>
                  {plan.spaces.length > 1 && <label>{t('evLayout.moveTo')}<select value="" onChange={(e) => e.target.value && moveToSpace(e.target.value)}><option value="">—</option>{plan.spaces.filter((s) => s.id !== space.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
                  <div className="wl-row">
                    <button type="button" className="btn btn-ghost" onClick={duplicate}>{t('whLayout.duplicate')}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => patchOne({ locked: !one.locked })}>{one.locked ? t('whLayout.unlock') : t('whLayout.lock')}</button>
                    <button type="button" className="btn btn-ghost danger" onClick={removeSel}>{t('whLayout.delete')}</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="el-zone-name">{one.name}</h3>
                  {one.note && <p className="wl-tip">{one.note}</p>}
                  {one.kind === 'table' && <p className="wl-tip">{t('evLayout.seatsInfo', { count: one.seats ?? 0 })}</p>}
                  {oneStat && <dl><div><dt>{t('evLayout.dt.lines')}</dt><dd>{oneStat.items.length}</dd></div><div><dt>{t('evLayout.dt.out')}</dt><dd>{oneStat.out}/{oneStat.qty}</dd></div><div><dt>{t('evLayout.dt.back')}</dt><dd>{oneStat.back}/{oneStat.qty}</dd></div></dl>}
                </>
              )}
              {(one.kind === 'zone' || one.kind === 'stage' || one.kind === 'decor' || one.kind === 'table') && (
                <div className="wl-items">
                  <h3>{t('evLayout.itemsHere', { count: oneStat?.items.length ?? 0 })}</h3>
                  <ul>
                    {(oneStat?.items ?? []).slice(0, 60).map((it) => (
                      <li key={it.id} className={it.scanOut >= it.qty ? '' : 'low'}>
                        <span>{it.name}{it.subArea ? <small> · {it.subArea}</small> : null}</span><b title={t('evLayout.outOf')}>{Math.min(it.scanOut, it.qty)}/{it.qty}</b>
                        {editing && (layout.assign[it.id] ? <button type="button" onClick={() => assign(it.id, null)} aria-label={t('whLayout.unassign')}>×</button> : <small title={t('evLayout.byAreaHint')}>{t('evLayout.byArea')}</small>)}
                      </li>
                    ))}
                    {!oneStat?.items.length && <li className="more">{t('evLayout.noItems')}</li>}
                  </ul>
                  {editing && <>
                    <input className="wl-search" placeholder={t('evLayout.assignPh')} value={itemQ} onChange={(e) => setItemQ(e.target.value)} />
                    {candidates.length > 0 && <ul className="wl-candidates">{candidates.map((it) => <li key={it.id}><button type="button" onClick={() => { assign(it.id, one.id); setItemQ(''); }}><span>{it.name}</span><small>{it.area || '—'} · {it.qty}</small></button></li>)}</ul>}
                  </>}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
