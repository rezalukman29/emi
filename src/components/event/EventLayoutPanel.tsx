import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import LayoutCanvas, { type CanvasTool, type MapMode } from '../warehouse/LayoutCanvas';
import useGetEventItem from '../../hooks/api/useGetEventItem';
import { KIND_DEFAULTS, exportLayout, importLayout, newId, pickRoute, type Layout, type Shape, type ShapeKind, type ZoneRole } from '../../lib/warehouseLayout';
import {
  EVENT_BLOCKING, EVENT_ROLES, deleteEventLayout, eventAreas, guessRole, saveEventLayout, statsByZone, tableGrid, templateEventLayout,
  useEventLayout, useEventLayouts, zoneForItem, type EventLayoutItem, type VenueTemplate,
} from '../../lib/eventLayout';
import '../../warehouseHub.css';
import '../../warehouseLayout.css';

// Event layout map (owner 2026-11-27) — tab "Layout" in Event Detail. View: areas with item counts, setup progress
// (scanned out vs planned), return progress, load-in route, item search. Edit: venue plan with stage, tables,
// decor, walkways, zones for the event's areas. PREVIEW: saved in this browser (api-backlog §17).

type ViewMode = 'areas' | 'setup' | 'return' | 'route';
const ELEMENTS: Array<{ kind: ShapeKind; round?: boolean; key: string }> = [
  { kind: 'stage', key: 'stage' }, { kind: 'decor', key: 'decor' }, { kind: 'table', round: true, key: 'roundTable' }, { kind: 'table', key: 'longTable' },
  { kind: 'aisle', key: 'walkway' }, { kind: 'dock', key: 'entrance' }, { kind: 'wall', key: 'wall' }, { kind: 'column', round: true, key: 'pillar' },
];
const overlap = (a: Shape, b: Shape) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export default function EventLayoutPanel({ eventId, eventName }: { eventId: number; eventName: string }) {
  const { t, i18n } = useTranslation();
  const saved = useEventLayout(eventId);
  const all = useEventLayouts();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Layout | null>(saved);
  const [past, setPast] = useState<Layout[]>([]);
  const [future, setFuture] = useState<Layout[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<ViewMode>('areas');
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [q, setQ] = useState('');
  const [itemQ, setItemQ] = useState('');
  const [tables, setTables] = useState({ rows: 3, cols: 4, size: 2, gap: 2, seats: 10, round: true });
  const dragBase = useRef<Layout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const itemsQuery = useGetEventItem({ params: { event_id: eventId, order: 'asc' }, options: { enabled: eventId > 0 } });
  const items = useMemo<EventLayoutItem[]>(() => {
    const raw = (itemsQuery.data as { data?: unknown } | undefined)?.data;
    const rows = (Array.isArray(raw) ? raw : (raw as { data?: unknown[] } | undefined)?.data ?? []) as Array<Record<string, unknown>>;
    return rows.map((r) => ({ id: Number(r.id), name: String(r.nama_barang ?? ''), qty: Number(r.qty) || 0, area: String(r.area_name ?? ''), subArea: String(r.sub_list_name ?? ''), scanOut: Number(r.scan_out) || 0, scanIn: Number(r.scan_in) || 0, photo: String(r.photo ?? '') }));
  }, [itemsQuery.data]);
  const areas = useMemo(() => eventAreas(items), [items]);

  useEffect(() => { if (!editing) setDraft(saved); }, [saved, editing]);
  const layout = editing ? draft : saved;
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(saved);
  const stats = useMemo(() => (layout ? statsByZone(layout, items) : null), [layout, items]);
  const selected = layout ? layout.shapes.filter((s) => sel.has(s.id)) : [];
  const one = selected.length === 1 ? selected[0] : null;

  const commit = (next: Layout) => { if (draft) setPast((p) => [...p.slice(-60), draft]); setDraft(next); setFuture([]); };
  const patch = (changed: Shape[]) => draft && commit({ ...draft, shapes: draft.shapes.map((s) => changed.find((c) => c.id === s.id) ?? s) });
  const patchOne = (p: Partial<Shape>) => one && patch([{ ...one, ...p }]);
  const undo = () => { const prev = past[past.length - 1]; if (prev && draft) { setFuture((f) => [draft, ...f]); setDraft(prev); setPast((p) => p.slice(0, -1)); } };
  const redo = () => { const next = future[0]; if (next && draft) { setPast((p) => [...p, draft]); setDraft(next); setFuture((f) => f.slice(1)); } };
  const onMove = (shapes: Shape[], done: boolean) => {
    if (!draft) return;
    if (done) { if (dragBase.current) { setPast((p) => [...p.slice(-60), dragBase.current!]); setFuture([]); } dragBase.current = null; return; }
    if (!dragBase.current) dragBase.current = draft;
    setDraft({ ...draft, shapes: draft.shapes.map((s) => shapes.find((c) => c.id === s.id) ?? s) });
  };

  const start = (l: Layout) => { setDraft(l); setPast([]); setFuture([]); setSel(new Set()); setEditing(true); };
  const save = () => { if (!draft) return; if (saveEventLayout(eventId, draft)) { toast.success(t('evLayout.saved')); setEditing(false); } else toast.error(t('whLayout.saveFailed')); };
  const cancel = () => { if (dirty && !window.confirm(t('evLayout.discard'))) return; setEditing(false); setDraft(saved); setSel(new Set()); };
  const add = (kind: ShapeKind, opts: { round?: boolean; role?: ZoneRole; name?: string } = {}) => {
    if (!draft) return;
    const d = KIND_DEFAULTS[kind];
    const n = draft.shapes.filter((s) => s.kind === kind).length + 1;
    const name = opts.name ?? (kind === 'zone' ? t(`evLayout.roles.${opts.role ?? 'other'}`) : kind === 'table' ? `T${n}` : `${t(`evLayout.el.${ELEMENTS.find((e) => e.kind === kind && Boolean(e.round) === Boolean(opts.round))?.key ?? kind}`)} ${n}`);
    const w = kind === 'table' && !opts.round ? 3 : d.w;
    const s: Shape = { id: newId(), kind, role: kind === 'zone' ? opts.role ?? guessRole(name) : undefined, code: name, name, x: Math.max(0, Math.round(draft.cols / 2 - w / 2)), y: Math.max(0, Math.round(draft.rows / 2 - d.h / 2)), w, h: d.h, levels: 1, capacity: 0, round: opts.round, seats: kind === 'table' ? (opts.round ? 10 : 8) : undefined };
    commit({ ...draft, shapes: [...draft.shapes, s] });
    setSel(new Set([s.id]));
  };
  const removeSel = () => { if (!draft) return; const gone = new Set(selected.filter((s) => !s.locked).map((s) => s.id)); commit({ ...draft, shapes: draft.shapes.filter((s) => !gone.has(s.id)), assign: Object.fromEntries(Object.entries(draft.assign).filter(([, v]) => !gone.has(v))) }); setSel(new Set()); };
  const duplicate = () => { if (!draft || !selected.length) return; const copies = selected.map((s) => ({ ...s, id: newId(), locked: false, x: Math.min(s.x + 1, draft.cols - s.w), y: Math.min(s.y + 1, draft.rows - s.h) })); commit({ ...draft, shapes: [...draft.shapes, ...copies] }); setSel(new Set(copies.map((c) => c.id))); };
  const assign = (itemId: number, zoneId: string | null) => { if (!draft) return; const next = { ...draft.assign }; if (zoneId) next[itemId] = zoneId; else delete next[itemId]; commit({ ...draft, assign: next }); };

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (!draft || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || document.querySelector('.modal-overlay')) return;
      const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
      else if (mod && k === 's') { e.preventDefault(); save(); }
      else if ((k === 'delete' || k === 'backspace') && selected.length) { e.preventDefault(); removeSel(); }
      else if (k === 'escape') setSel(new Set());
      else if (k.startsWith('arrow') && selected.length) {
        e.preventDefault(); const st = e.altKey ? 0.5 : 1;
        const [dx, dy] = ({ arrowleft: [-st, 0], arrowright: [st, 0], arrowup: [0, -st], arrowdown: [0, st] } as Record<string, [number, number]>)[k];
        patch(selected.filter((s) => !s.locked).map((s) => (e.shiftKey ? { ...s, w: Math.max(0.5, s.w + dx), h: Math.max(0.5, s.h + dy) } : { ...s, x: Math.min(Math.max(0, s.x + dx), draft.cols - s.w), y: Math.min(Math.max(0, s.y + dy), draft.rows - s.h) })));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // checks (editor)
  const issues = useMemo(() => {
    if (!layout) return [];
    const list: Array<{ type: string; ids: string[]; label: string }> = [];
    const blocking = layout.shapes.filter((s) => EVENT_BLOCKING.includes(s.kind));
    for (let i = 0; i < blocking.length; i += 1) for (let j = i + 1; j < blocking.length; j += 1) if (overlap(blocking[i], blocking[j])) list.push({ type: 'overlap', ids: [blocking[i].id, blocking[j].id], label: `${blocking[i].name} ↔ ${blocking[j].name}` });
    for (const s of layout.shapes) if (s.x < 0 || s.y < 0 || s.x + s.w > layout.cols || s.y + s.h > layout.rows) list.push({ type: 'outside', ids: [s.id], label: s.name });
    if (!layout.shapes.some((s) => s.kind === 'dock')) list.push({ type: 'noEntrance', ids: [], label: '' });
    for (const a of areas) if (!layout.shapes.some((s) => s.kind !== 'dock' && s.kind !== 'wall' && s.kind !== 'column' && s.kind !== 'aisle' && s.name.trim().toLowerCase() === a.name.trim().toLowerCase() || s.code.trim().toLowerCase() === a.name.trim().toLowerCase())) list.push({ type: 'areaMissing', ids: [], label: a.name });
    return list;
  }, [layout, areas]);
  const badIds = useMemo(() => new Set(issues.flatMap((i) => i.ids)), [issues]);

  // view helpers
  const badges = useMemo(() => new Map([...(stats?.map ?? new Map()).entries()].map(([id, s]) => [id, s.items.length])), [stats]);
  const progress = useMemo(() => new Map([...(stats?.map ?? new Map()).entries()].filter(([, s]) => s.qty > 0).map(([id, s]) => [id, mode === 'return' ? s.back / s.qty : s.out / s.qty])), [stats, mode]);
  const needle = q.trim().toLowerCase();
  const hits = useMemo(() => (layout && needle.length >= 2 ? new Set(items.filter((it) => it.name.toLowerCase().includes(needle)).map((it) => zoneForItem(layout, it)?.id).filter(Boolean) as string[]) : new Set<string>()), [layout, items, needle]);
  const route = useMemo(() => {
    if (!layout || mode !== 'route' || editing) return null;
    const pending = layout.shapes.filter((s) => { const st = stats?.map.get(s.id); return st && st.out < st.qty; });
    const loading = layout.shapes.find((s) => s.kind === 'dock' && /load|bongkar|dock|service/i.test(s.name)) ?? layout.shapes.find((s) => s.role === 'loading') ?? null;
    return pickRoute(layout, pending, { blocking: EVENT_BLOCKING, endAt: null, startAt: loading });
  }, [layout, mode, stats, editing]);
  const totals = useMemo(() => {
    const qty = items.reduce((a, it) => a + it.qty, 0);
    const out = items.reduce((a, it) => a + Math.min(it.qty, it.scanOut), 0);
    const back = items.reduce((a, it) => a + Math.min(it.qty, it.scanIn), 0);
    const seats = (layout?.shapes ?? []).reduce((a, s) => a + (s.kind === 'table' ? s.seats ?? 0 : 0), 0);
    const tablesN = (layout?.shapes ?? []).filter((s) => s.kind === 'table').length;
    return { qty, out, back, seats, tablesN, area: layout ? layout.cols * layout.rows : 0 };
  }, [items, layout]);
  const others = Object.entries(all).filter(([id]) => Number(id) !== eventId);
  const placed = items.length - (stats?.unplaced ?? items.length);

  function print() {
    document.body.classList.add('printing-layout');
    const done = () => { document.body.classList.remove('printing-layout'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(done, 1500);
  }

  if (!layout) {
    return (
      <section className="card el-start">
        <div className="wl-empty-art" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div>
        <div className="el-start-body">
          <span className="ck-preview-badge" title={t('evLayout.previewHint')}>{t('whLayout.previewBadge')}</span>
          <h2>{t('evLayout.startTitle')}</h2>
          <p>{t('evLayout.startBody', { count: areas.length })}</p>
          <div className="wl-start-cards three">
            {(['ballroom', 'garden', 'blank'] as VenueTemplate[]).map((k) => (
              <button key={k} type="button" onClick={() => start(templateEventLayout(eventId, k, areas.map((a) => a.name)))}><b>{t(`evLayout.tpl.${k}`)}</b><span>{t(`evLayout.tpl.${k}Hint`)}</span></button>
            ))}
          </div>
          {others.length > 0 && (
            <label className="el-copy">{t('evLayout.copyFrom')}
              <select defaultValue="" onChange={(e) => { const src = all[Number(e.target.value)]; if (src) start({ ...src, warehouseId: eventId, assign: {}, updatedAt: '' }); }}>
                <option value="" disabled>{t('evLayout.copyPick')}</option>
                {others.map(([id, l]) => <option key={id} value={id}>{t('evLayout.copyOption', { id, blocks: l.shapes.length })}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>{t('whLayout.io.importTitle')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { start(await importLayout(f, eventId)); } catch { toast.error(t('whLayout.io.importFailed')); } }} />
        </div>
      </section>
    );
  }

  const oneStat = one ? stats?.map.get(one.id) : undefined;
  const candidates = one && editing && itemQ.trim().length >= 2 ? items.filter((it) => it.name.toLowerCase().includes(itemQ.trim().toLowerCase()) && zoneForItem(layout, it)?.id !== one.id).slice(0, 8) : [];
  const missingAreas = areas.filter((a) => !layout.shapes.some((s) => s.kind !== 'dock' && s.kind !== 'wall' && s.kind !== 'column' && s.kind !== 'aisle' && s.name.trim().toLowerCase() === a.name.trim().toLowerCase() || s.code.trim().toLowerCase() === a.name.trim().toLowerCase()));
  const canvasMode: MapMode = editing ? 'plain' : mode === 'setup' || mode === 'return' ? 'progress' : mode === 'route' ? 'route' : 'plain';

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

      {editing && draft && (
        <div className="wl-toolbar" role="toolbar" aria-label={t('whLayout.toolbar')}>
          <div className="wl-tgroup">
            <button type="button" className={tool === 'select' ? 'on' : ''} onClick={() => setTool('select')}>{t('whLayout.tools.select')}</button>
            <button type="button" className={tool === 'pan' ? 'on' : ''} onClick={() => setTool('pan')}>{t('whLayout.tools.pan')}</button>
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
            <button type="button" onClick={() => bgRef.current?.click()}>{draft.bg ? t('whLayout.bg.replace') : t('evLayout.venuePhoto')}</button>
            {draft.bg && <>
              <input type="range" min={0.05} max={1} step={0.05} value={draft.bg.opacity} aria-label={t('whLayout.bg.opacity')} onChange={(e) => setDraft({ ...draft, bg: { ...draft.bg!, opacity: Number(e.target.value) } })} />
              <button type="button" onClick={() => commit({ ...draft, bg: null })}>{t('whLayout.bg.remove')}</button>
            </>}
          </div>
          <div className="wl-tgroup">
            <button type="button" onClick={() => exportLayout(draft, `event-${eventId}`)}>{t('whLayout.io.export')}</button>
            <button type="button" onClick={() => fileRef.current?.click()}>{t('whLayout.io.import')}</button>
          </div>
          <div className="wl-tgroup">
            <label className="el-size">{t('whLayout.width')}<input type="number" min={10} max={200} value={draft.cols} onChange={(e) => commit({ ...draft, cols: Math.min(200, Math.max(10, Number(e.target.value) || 10)) })} /></label>
            <label className="el-size">{t('whLayout.depth')}<input type="number" min={10} max={200} value={draft.rows} onChange={(e) => commit({ ...draft, rows: Math.min(200, Math.max(10, Number(e.target.value) || 10)) })} /></label>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; try { commit(await importLayout(f, eventId)); } catch { toast.error(t('whLayout.io.importFailed')); } }} />
          <input ref={bgRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 1_500_000) { toast.error(t('whLayout.bg.tooBig')); return; } const r = new FileReader(); r.onload = () => commit({ ...draft, bg: { src: String(r.result), opacity: 0.4 } }); r.readAsDataURL(f); }} />
        </div>
      )}

      <div className={editing ? 'wl-editor el-editor' : 'wl-map-body'}>
        {editing && draft && (
          <aside className="wl-tools">
            {missingAreas.length > 0 && <>
              <h3>{t('evLayout.eventAreas')}</h3>
              <p className="wl-tip">{t('evLayout.eventAreasHint')}</p>
              {missingAreas.slice(0, 12).map((a) => <button key={a.name} type="button" onClick={() => add('zone', { role: guessRole(a.name), name: a.name })}><i className={`sw r-${guessRole(a.name)}`} />{a.name}<small className="el-n">{a.lines}</small></button>)}
            </>}
            <h3>{t('evLayout.elements')}</h3>
            {ELEMENTS.map((e) => <button key={e.key} type="button" onClick={() => add(e.kind, { round: e.round })}><i className={`sw k-${e.kind}`} />{t(`evLayout.el.${e.key}`)}</button>)}
            <h3>{t('evLayout.zones')}</h3>
            {EVENT_ROLES.map((r) => <button key={r} type="button" onClick={() => add('zone', { role: r })}><i className={`sw r-${r}`} />{t(`evLayout.roles.${r}`)}</button>)}
            <h3>{t('evLayout.tablesTitle')}</h3>
            <div className="wl-xywh two">
              <label>{t('evLayout.tRows')}<input type="number" min={1} max={20} value={tables.rows} onChange={(e) => setTables({ ...tables, rows: Math.max(1, Number(e.target.value) || 1) })} /></label>
              <label>{t('evLayout.tCols')}<input type="number" min={1} max={20} value={tables.cols} onChange={(e) => setTables({ ...tables, cols: Math.max(1, Number(e.target.value) || 1) })} /></label>
              <label>{t('evLayout.tSeats')}<input type="number" min={1} max={30} value={tables.seats} onChange={(e) => setTables({ ...tables, seats: Math.max(1, Number(e.target.value) || 1) })} /></label>
              <label>{t('evLayout.tGap')}<input type="number" min={0} max={10} step={0.5} value={tables.gap} onChange={(e) => setTables({ ...tables, gap: Math.max(0, Number(e.target.value) || 0) })} /></label>
            </div>
            <label className="wl-check-inline"><input type="checkbox" checked={tables.round} onChange={(e) => setTables({ ...tables, round: e.target.checked })} />{t('evLayout.tRound')}</label>
            <button type="button" className="primary" onClick={() => { const startN = draft.shapes.filter((s) => s.kind === 'table').length + 1; const list = tableGrid({ ...tables, x: 1, y: 1, start: startN }); commit({ ...draft, shapes: [...draft.shapes, ...list] }); setSel(new Set(list.map((s) => s.id))); toast.info(t('evLayout.tablesAdded', { count: list.length })); }}>
              <i className="sw k-table" />{t('evLayout.tAdd', { count: tables.rows * tables.cols, seats: tables.rows * tables.cols * tables.seats })}</button>
            <div className="wl-tabs"><button type="button" className="on">{t('whLayout.checks.title')}{issues.length > 0 && <span className="wl-count">{issues.length}</span>}</button></div>
            <ul className="wl-checks">
              {issues.length === 0 ? <li className="ok">{t('whLayout.checks.allGood')}</li> : issues.slice(0, 20).map((iss, i) => (
                <li key={i} className={iss.type === 'areaMissing' || iss.type === 'noEntrance' ? 'narrowAisle' : ''}><button type="button" onClick={() => iss.ids.length && setSel(new Set(iss.ids))}><b>{t(`evLayout.checks.${iss.type}`)}</b>{iss.label && <span>{iss.label}</span>}</button></li>
              ))}
            </ul>
            <button type="button" className="danger" onClick={() => { if (window.confirm(t('evLayout.deleteConfirm'))) { deleteEventLayout(eventId); setEditing(false); setDraft(null); } }}>{t('evLayout.delete')}</button>
          </aside>
        )}

        <div className="wl-stage">
          <div className="wl-frame dark el-print-area">
            <LayoutCanvas layout={layout} editable={editing} selected={sel} onSelect={setSel} onMove={onMove} tool={tool} zoom={zoom}
              mode={canvasMode} progress={progress} badges={editing || mode === 'areas' ? badges : undefined} highlight={hits} bad={editing ? badIds : undefined} route={route}
              ariaLabel={t('evLayout.aria', { name: eventName })} />
            {!editing && <div className="wl-zoom floating">
              <button type="button" onClick={() => setZoom((z) => Math.min(5, z + 0.5))} aria-label={t('whLayout.zoomIn')}>+</button>
              <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label={t('whLayout.zoomOut')}>−</button>
            </div>}
            {!editing && (mode === 'setup' || mode === 'return') && <div className="wl-legend"><span><i className="crit" />0–25%</span><span><i className="h2" />25–75%</span><span><i className="ok" />75–100%</span></div>}
            {!editing && mode === 'route' && <div className="wl-legend"><span><i className="route" />{t('evLayout.routeLegend', { stops: route?.order.length ?? 0, m: route?.length ?? 0 })}</span></div>}
          </div>
          <div className="wl-status">
            <span>{t('evLayout.stat.venue', { area: totals.area })}</span>
            <span>{t('evLayout.stat.tables', { tables: totals.tablesN, seats: totals.seats })}</span>
            <span>{t('evLayout.stat.placed', { placed, total: items.length })}</span>
            <span>{t('evLayout.stat.out', { pct: totals.qty ? Math.round((totals.out / totals.qty) * 100) : 0 })}</span>
            <span>{t('evLayout.stat.back', { pct: totals.qty ? Math.round((totals.back / totals.qty) * 100) : 0 })}</span>
            {saved?.updatedAt && <span>{t('evLayout.stat.saved', { when: new Date(saved.updatedAt).toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</span>}
          </div>
        </div>

        <aside className={editing ? 'wl-props' : 'wl-detail'}>
          {!one ? (
            editing ? <p className="wl-tip">{selected.length > 1 ? t('whLayout.multi', { count: selected.length }) : t('evLayout.selectHint')}</p> : (
              <>
                <h3>{t('evLayout.areasTitle')}</h3>
                <ul className="el-area-list">
                  {layout.shapes.filter((s) => stats?.map.get(s.id)).sort((a, b) => (stats!.map.get(b.id)!.items.length - stats!.map.get(a.id)!.items.length)).map((s) => {
                    const st = stats!.map.get(s.id)!; const pct = st.qty ? Math.round(((mode === 'return' ? st.back : st.out) / st.qty) * 100) : 0;
                    return <li key={s.id}><button type="button" onClick={() => setSel(new Set([s.id]))}><span>{s.name}</span><small>{t('evLayout.lines', { count: st.items.length })}</small><span className="el-bar"><i style={{ width: `${pct}%` }} className={pct >= 75 ? 'ok' : pct >= 25 ? 'mid' : 'low'} /></span><b>{pct}%</b></button></li>;
                  })}
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
                  {one.kind === 'table' && <div className="wl-xywh two"><label>{t('evLayout.tSeats')}<input type="number" min={1} max={40} value={one.seats ?? 0} onChange={(e) => patchOne({ seats: Math.max(1, Number(e.target.value) || 1) })} /></label><label className="wl-check-inline"><input type="checkbox" checked={Boolean(one.round)} onChange={(e) => patchOne({ round: e.target.checked })} />{t('evLayout.tRound')}</label></div>}
                  <div className="wl-xywh">{(['x', 'y', 'w', 'h'] as const).map((k) => <label key={k}>{k === 'w' ? t('whLayout.wShort') : k === 'h' ? t('whLayout.hShort') : k.toUpperCase()}<input type="number" step={0.5} min={k === 'w' || k === 'h' ? 0.5 : 0} value={one[k]} onChange={(e) => patchOne({ [k]: Math.max(k === 'w' || k === 'h' ? 0.5 : 0, Number(e.target.value) || 0) })} /></label>)}</div>
                  <label>{t('whLayout.note')}<input value={one.note ?? ''} placeholder={t('evLayout.notePh')} onChange={(e) => patchOne({ note: e.target.value })} /></label>
                  <div className="wl-row">
                    <button type="button" className="btn btn-ghost" onClick={() => patchOne({ w: one.h, h: one.w })}>{t('whLayout.rotate')}</button>
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
