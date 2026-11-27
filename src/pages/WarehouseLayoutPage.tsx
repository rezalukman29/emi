import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import LayoutCanvas, { type CanvasTool } from '../components/warehouse/LayoutCanvas';
import RackElevation from '../components/warehouse/RackElevation';
import { fetchWarehouseStock, fetchWarehouses } from '../lib/warehouseHub';
import {
  KIND_DEFAULTS, STORAGE, baysOf, blankLayout, deleteLayout, exportLayout, generateRow, importLayout, metrics, newId,
  placementForItem, saveLayout, slotCode, statsByShape, templateLayout, useLayout, validate,
  type Layout, type RowSpec, type Shape, type ShapeKind, type ZoneRole,
} from '../lib/warehouseLayout';
import { alignShapes, type Align } from '../lib/warehouseLayout';
import { isTenantAdminUser } from '../lib/tenantUser';
import '../warehouseHub.css';
import '../warehouseLayout.css';

// Warehouse layout editor (owner 2026-11-27, v2 "much more advanced and detailed"). PREVIEW — stored in this
// browser until the layout API exists (docs/api-backlog.md §16). Route: /warehouse-hub/layout?wh=<id>

const ROLES: ZoneRole[] = ['receiving', 'shipping', 'staging', 'qa', 'returns', 'charging', 'office', 'other'];
const KINDS: ShapeKind[] = ['rack', 'bulk', 'zone', 'aisle', 'wall', 'column', 'dock'];
const MAX_BG = 1_500_000;

function RowGenerator({ layout, onClose, onCreate }: { layout: Layout; onClose: () => void; onCreate: (s: Shape[]) => void }) {
  const { t } = useTranslation();
  const used = new Set(layout.shapes.map((s) => s.code.charAt(0)));
  const freeLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((c) => !used.has(c)) ?? 'R';
  const [spec, setSpec] = useState<RowSpec>(() => {
    // first free spot (top-left first) where the default double row does not hit anything that blocks
    const base: RowSpec = { prefix: freeLetter, start: 1, count: 5, x: 2, y: 2, w: 5, h: 1, gap: 0, direction: 'right', bays: 5, levels: 4, backToBack: true, aisle: 2 };
    const blocks = layout.shapes.filter((s) => ['rack', 'bulk', 'wall', 'column', 'zone', 'aisle'].includes(s.kind));
    for (let y = 1; y < layout.rows - 2; y += 1) for (let x = 1; x < layout.cols - 25; x += 1) {
      const rows = generateRow({ ...base, x, y });
      if (rows.every((r) => !blocks.some((b) => r.x < b.x + b.w + 0.5 && b.x < r.x + r.w + 0.5 && r.y < b.y + b.h + 0.5 && b.y < r.y + r.h + 0.5))) return { ...base, x, y };
    }
    return base;
  });
  const set = (k: keyof RowSpec, v: string | number | boolean) => setSpec((s) => ({ ...s, [k]: v }));
  const num = (k: keyof RowSpec, min = 0, max = 200) => <input type="number" min={min} max={max} value={spec[k] as number} onChange={(e) => set(k, Math.min(max, Math.max(min, Number(e.target.value) || min)))} />;
  const preview = generateRow(spec);
  const outside = preview.some((s) => s.x + s.w > layout.cols || s.y + s.h > layout.rows);
  return (
    <Modal open onClose={onClose} title={t('whLayout.gen.title')} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t('eventChecklist.cancel')}</button>
      <button type="button" className="btn btn-primary" disabled={outside} onClick={() => onCreate(preview)}>{t('whLayout.gen.create', { count: preview.length })}</button>
    </>}>
      <div className="wl-gen">
        <label>{t('whLayout.gen.prefix')}<input value={spec.prefix} maxLength={4} onChange={(e) => set('prefix', e.target.value.toUpperCase())} /></label>
        <label>{t('whLayout.gen.start')}{num('start', 1, 999)}</label>
        <label>{t('whLayout.gen.count')}{num('count', 1, 40)}</label>
        <label>{t('whLayout.gen.direction')}<select value={spec.direction} onChange={(e) => set('direction', e.target.value)}><option value="right">{t('whLayout.gen.right')}</option><option value="down">{t('whLayout.gen.down')}</option></select></label>
        <label>{t('whLayout.gen.length')}{num(spec.direction === 'right' ? 'w' : 'h', 1, 40)}</label>
        <label>{t('whLayout.gen.depth')}{num(spec.direction === 'right' ? 'h' : 'w', 1, 5)}</label>
        <label>{t('whLayout.gen.gap')}{num('gap', 0, 10)}</label>
        <label>{t('whLayout.bays')}{num('bays', 1, 40)}</label>
        <label>{t('whLayout.levels')}{num('levels', 1, 12)}</label>
        <label>X{num('x', 0, layout.cols)}</label>
        <label>Y{num('y', 0, layout.rows)}</label>
        <label className="wl-check"><input type="checkbox" checked={spec.backToBack} onChange={(e) => set('backToBack', e.target.checked)} />{t('whLayout.gen.backToBack')}</label>
      </div>
      <p className={outside ? 'wh-error' : 'wl-tip'}>{outside ? t('whLayout.gen.outside') : t('whLayout.gen.summary', { first: preview[0]?.code, last: preview[preview.length - 1]?.code, slots: preview.reduce((a, s) => a + baysOf(s) * s.levels, 0) })}</p>
    </Modal>
  );
}

export default function WarehouseLayoutPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const whQuery = useQuery(['whHubWarehouses'], fetchWarehouses, { staleTime: 60_000 });
  const physical = (whQuery.data ?? []).filter((w) => !w.virtual);
  const whId = Number(params.get('wh')) || physical[0]?.id || 0;
  const saved = useLayout(whId);
  const [draft, setDraft] = useState<Layout | null>(saved);
  const [past, setPast] = useState<Layout[]>([]);
  const [future, setFuture] = useState<Layout[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [panel, setPanel] = useState<'layers' | 'checks'>('layers');
  const [layerQ, setLayerQ] = useState('');
  const [itemQ, setItemQ] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const clipboard = useRef<Shape[]>([]);
  const dragBase = useRef<Layout | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const admin = isTenantAdminUser();

  useEffect(() => { setDraft(saved); setPast([]); setFuture([]); setSel(new Set()); }, [whId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const stock = useQuery(['whHubStock', whId], () => fetchWarehouseStock(whId), { enabled: whId > 0, staleTime: 60_000 });
  const rows = useMemo(() => stock.data ?? [], [stock.data]);
  const stats = useMemo(() => (draft ? statsByShape(draft, rows) : null), [draft, rows]);
  const issues = useMemo(() => (draft ? validate(draft) : []), [draft]);
  const badIds = useMemo(() => new Set(issues.flatMap((i) => i.ids)), [issues]);
  const m = draft ? metrics(draft) : null;
  const selected = draft ? draft.shapes.filter((s) => sel.has(s.id)) : [];
  const one = selected.length === 1 ? selected[0] : null;
  useEffect(() => { setSlot(null); setItemQ(''); }, [one?.id]);

  const commit = useCallback((next: Layout) => { setDraft((cur) => { if (cur) setPast((p) => [...p.slice(-60), cur]); return next; }); setFuture([]); }, []);
  const patchShapes = (changed: Shape[]) => draft && commit({ ...draft, shapes: draft.shapes.map((s) => changed.find((c) => c.id === s.id) ?? s) });
  const patchOne = (patch: Partial<Shape>) => one && patchShapes([{ ...one, ...patch }]);
  const undo = () => { const prev = past[past.length - 1]; if (prev && draft) { setFuture((f) => [draft, ...f]); setDraft(prev); setPast((p) => p.slice(0, -1)); } };
  const redo = () => { const next = future[0]; if (next && draft) { setPast((p) => [...p, draft]); setDraft(next); setFuture((f) => f.slice(1)); } };

  const onMove = (shapes: Shape[], done: boolean) => {
    if (!draft) return;
    if (done) { if (dragBase.current) { setPast((p) => [...p.slice(-60), dragBase.current!]); setFuture([]); } dragBase.current = null; return; }
    if (!dragBase.current) dragBase.current = draft;
    setDraft({ ...draft, shapes: draft.shapes.map((s) => shapes.find((c) => c.id === s.id) ?? s) });
  };

  const add = (kind: ShapeKind, role?: ZoneRole) => {
    if (!draft) return;
    const n = draft.shapes.filter((s) => s.kind === kind).length + 1;
    const code = kind === 'rack' ? `R${String(n).padStart(2, '0')}` : kind === 'bulk' ? `BULK-${n}` : kind === 'dock' ? `DOOR-${n}` : kind === 'zone' ? (role ?? 'zone').toUpperCase() : `${kind.toUpperCase()}-${n}`;
    const name = kind === 'rack' ? `Rack ${code}` : kind === 'zone' ? t(`whLayout.roles.${role ?? 'other'}`) : `${t(`whLayout.kinds.${kind}`)} ${n}`;
    const d = KIND_DEFAULTS[kind];
    const s: Shape = { id: newId(), kind, role: kind === 'zone' ? role ?? 'other' : undefined, code, name, x: Math.max(0, Math.round(draft.cols / 2 - d.w / 2)), y: Math.max(0, Math.round(draft.rows / 2 - d.h / 2)), ...d };
    commit({ ...draft, shapes: [...draft.shapes, s] });
    setSel(new Set([s.id]));
  };
  const removeSel = () => {
    if (!draft || !selected.length) return;
    const gone = new Set(selected.filter((s) => !s.locked).map((s) => s.id));
    const assign = Object.fromEntries(Object.entries(draft.assign).filter(([, v]) => !gone.has(v.split('@')[0])));
    commit({ ...draft, shapes: draft.shapes.filter((s) => !gone.has(s.id)), assign });
    setSel(new Set());
  };
  const paste = (list: Shape[], offset = 1) => {
    if (!draft || !list.length) return;
    const copies = list.map((s) => ({ ...s, id: newId(), locked: false, x: Math.min(s.x + offset, draft.cols - s.w), y: Math.min(s.y + offset, draft.rows - s.h), code: STORAGE.includes(s.kind) ? `${s.code}-C` : s.code, name: STORAGE.includes(s.kind) ? `${s.name} (copy)` : s.name }));
    commit({ ...draft, shapes: [...draft.shapes, ...copies] });
    setSel(new Set(copies.map((c) => c.id)));
  };
  const nudge = (dx: number, dy: number, resize: boolean) => {
    if (!draft || !selected.length) return;
    patchShapes(selected.filter((s) => !s.locked).map((s) => (resize ? { ...s, w: Math.max(0.5, s.w + dx), h: Math.max(0.5, s.h + dy) } : { ...s, x: Math.min(Math.max(0, s.x + dx), draft.cols - s.w), y: Math.min(Math.max(0, s.y + dy), draft.rows - s.h) })));
  };

  // keyboard shortcuts (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (!draft || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable || document.querySelector('.modal-overlay, [role="dialog"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && k === 'y') { e.preventDefault(); redo(); }
      else if (mod && k === 'a') { e.preventDefault(); setSel(new Set(draft.shapes.map((s) => s.id))); }
      else if (mod && k === 'c') { clipboard.current = selected; }
      else if (mod && k === 'v') { e.preventDefault(); paste(clipboard.current, 2); }
      else if (mod && k === 'd') { e.preventDefault(); paste(selected); }
      else if (mod && k === 's') { e.preventDefault(); save(); }
      else if (k === 'delete' || k === 'backspace') { if (selected.length) { e.preventDefault(); removeSel(); } }
      else if (k === 'escape') setSel(new Set());
      else if (k === 'v' && !mod) setTool('select');
      else if (k === 'h' && !mod) setTool('pan');
      else if (k.startsWith('arrow') && selected.length) {
        e.preventDefault();
        const step = e.altKey ? 0.5 : 1;
        const [dx, dy] = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[k] as [number, number];
        nudge(dx, dy, e.shiftKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function save() {
    if (!draft) return;
    if (saveLayout(draft)) toast.success(t('whLayout.saved'));
    else toast.error(t('whLayout.saveFailed'));
  }
  function assign(bgId: number, target: string | null) {
    if (!draft) return;
    const next = { ...draft.assign }; if (target) next[bgId] = target; else delete next[bgId];
    commit({ ...draft, assign: next });
  }
  async function onImport(file: File | undefined) {
    if (!file || !draft && !whId) return;
    try { const l = await importLayout(file, whId); commit(l); setSel(new Set()); toast.success(t('whLayout.io.imported', { count: l.shapes.length })); }
    catch { toast.error(t('whLayout.io.importFailed')); }
  }
  function onBackground(file: File | undefined) {
    if (!file || !draft) return;
    if (file.size > MAX_BG) { toast.error(t('whLayout.bg.tooBig')); return; }
    const reader = new FileReader();
    reader.onload = () => commit({ ...draft, bg: { src: String(reader.result), opacity: 0.35 } });
    reader.readAsDataURL(file);
  }

  if (!admin) return <div className="card"><h1 className="page-title">{t('whLayout.title')}</h1><p>{t('whLayout.adminOnly')}</p></div>;

  const whName = physical.find((w) => w.id === whId)?.name ?? '';
  const placed = rows.length - (stats?.unplaced ?? rows.length);
  const oneStat = one && stats ? stats.map.get(one.id) : undefined;
  const slotItems = (oneStat?.items ?? []).filter((it) => !slot || `${it.placement?.bay}.${it.placement?.level}` === slot);
  const needle = itemQ.trim().toLowerCase();
  const candidates = one && draft && needle.length >= 2 ? rows.filter((r) => r.name.toLowerCase().includes(needle) && placementForItem(draft, r)?.shape.id !== one.id).slice(0, 8) : [];
  const layerNeedle = layerQ.trim().toLowerCase();
  const layers = draft ? draft.shapes.filter((s) => !layerNeedle || `${s.name} ${s.code}`.toLowerCase().includes(layerNeedle)) : [];
  const grouped = KINDS.map((k) => ({ k, list: layers.filter((s) => s.kind === k) })).filter((g) => g.list.length);

  return (
    <div className="wl-page">
      <header className="wl-head">
        <div>
          <Link to="/warehouse-hub" className="wl-back">← {t('whLayout.backToHub')}</Link>
          <h1 className="page-title" style={{ margin: '4px 0 0' }}>{t('whLayout.title')}</h1>
          <p className="wh-sub">{t('whLayout.subtitle')}</p>
        </div>
        <div className="wl-head-actions">
          <span className="ck-preview-badge" title={t('whLayout.previewHint')}>{t('whLayout.previewBadge')}</span>
          <select className="wl-select" value={whId} onChange={(e) => { if (dirty && !window.confirm(t('whLayout.discardConfirm'))) return; setParams({ wh: e.target.value }); }} aria-label={t('whHub.activeWarehouse')}>
            {physical.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {draft && <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>{dirty ? t('whLayout.save') : t('whLayout.savedShort')}</button>}
        </div>
      </header>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={bgRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { onBackground(e.target.files?.[0]); e.target.value = ''; }} />

      {!draft ? (
        <div className="wl-start">
          <h2>{t('whLayout.startTitle', { name: whName })}</h2>
          <p>{t('whLayout.startBody')}</p>
          <div className="wl-start-cards three">
            <button type="button" onClick={() => { setPast([]); setDraft(templateLayout(whId)); }}><b>{t('whLayout.useTemplate')}</b><span>{t('whLayout.useTemplateHint')}</span></button>
            <button type="button" onClick={() => { setPast([]); setDraft(blankLayout(whId)); }}><b>{t('whLayout.startBlank')}</b><span>{t('whLayout.startBlankHint')}</span></button>
            <button type="button" onClick={() => fileRef.current?.click()}><b>{t('whLayout.io.importTitle')}</b><span>{t('whLayout.io.importHint')}</span></button>
          </div>
        </div>
      ) : (
        <>
          <div className="wl-toolbar" role="toolbar" aria-label={t('whLayout.toolbar')}>
            <div className="wl-tgroup">
              <button type="button" className={tool === 'select' ? 'on' : ''} onClick={() => setTool('select')} title={t('whLayout.tools.selectKey')}>{t('whLayout.tools.select')}</button>
              <button type="button" className={tool === 'pan' ? 'on' : ''} onClick={() => setTool('pan')} title={t('whLayout.tools.panKey')}>{t('whLayout.tools.pan')}</button>
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
              <button type="button" onClick={() => bgRef.current?.click()}>{draft.bg ? t('whLayout.bg.replace') : t('whLayout.bg.add')}</button>
              {draft.bg && <>
                <input type="range" min={0.05} max={1} step={0.05} value={draft.bg.opacity} aria-label={t('whLayout.bg.opacity')} onChange={(e) => setDraft({ ...draft, bg: { ...draft.bg!, opacity: Number(e.target.value) } })} />
                <button type="button" onClick={() => commit({ ...draft, bg: null })}>{t('whLayout.bg.remove')}</button>
              </>}
            </div>
            <div className="wl-tgroup">
              <button type="button" onClick={() => exportLayout(draft, whName)}>{t('whLayout.io.export')}</button>
              <button type="button" onClick={() => fileRef.current?.click()}>{t('whLayout.io.import')}</button>
            </div>
          </div>

          <div className="wl-editor">
            <aside className="wl-tools">
              <h3>{t('whLayout.add')}</h3>
              <button type="button" className="primary" onClick={() => setGenOpen(true)}><i className="sw k-rack" />{t('whLayout.gen.open')}</button>
              <button type="button" onClick={() => add('rack')}><i className="sw k-rack" />{t('whLayout.kinds.rack')}</button>
              <button type="button" onClick={() => add('bulk')}><i className="sw k-bulk" />{t('whLayout.kinds.bulk')}</button>
              <button type="button" onClick={() => add('aisle')}><i className="sw k-aisle" />{t('whLayout.kinds.aisle')}</button>
              <button type="button" onClick={() => add('wall')}><i className="sw k-wall" />{t('whLayout.kinds.wall')}</button>
              <button type="button" onClick={() => add('column')}><i className="sw k-column" />{t('whLayout.kinds.column')}</button>
              <button type="button" onClick={() => add('dock')}><i className="sw k-dock" />{t('whLayout.kinds.dock')}</button>
              <h3>{t('whLayout.kinds.zone')}</h3>
              {ROLES.slice(0, 6).map((r) => <button key={r} type="button" onClick={() => add('zone', r)}><i className={`sw r-${r}`} />{t(`whLayout.roles.${r}`)}</button>)}

              <div className="wl-tabs">
                <button type="button" className={panel === 'layers' ? 'on' : ''} onClick={() => setPanel('layers')}>{t('whLayout.layers')}</button>
                <button type="button" className={panel === 'checks' ? 'on' : ''} onClick={() => setPanel('checks')}>{t('whLayout.checks.title')}{issues.length > 0 && <span className="wl-count">{issues.length}</span>}</button>
              </div>
              {panel === 'layers' ? (
                <div className="wl-layers">
                  <input placeholder={t('whLayout.layerSearch')} value={layerQ} onChange={(e) => setLayerQ(e.target.value)} />
                  {grouped.map((g) => (
                    <details key={g.k} open={g.list.length <= 12}>
                      <summary>{t(`whLayout.kinds.${g.k}`)} <span>{g.list.length}</span></summary>
                      <ul>{g.list.map((s) => (
                        <li key={s.id} className={`${sel.has(s.id) ? 'on' : ''}${badIds.has(s.id) ? ' bad' : ''}`}>
                          <button type="button" onClick={(e) => setSel(e.shiftKey ? new Set([...sel, s.id]) : new Set([s.id]))}>{s.kind === 'rack' ? s.code : s.name}</button>
                          <button type="button" className="lock" aria-pressed={Boolean(s.locked)} title={s.locked ? t('whLayout.unlock') : t('whLayout.lock')} onClick={() => patchShapes([{ ...s, locked: !s.locked }])}>{s.locked ? '🔒' : '🔓'}</button>
                        </li>
                      ))}</ul>
                    </details>
                  ))}
                </div>
              ) : (
                <ul className="wl-checks">
                  {issues.length === 0 ? <li className="ok">{t('whLayout.checks.allGood')}</li> : issues.map((iss, i) => (
                    <li key={i} className={iss.type}><button type="button" onClick={() => iss.ids.length && setSel(new Set(iss.ids))}><b>{t(`whLayout.checks.${iss.type}`)}</b>{iss.label && <span>{iss.label}</span>}</button></li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="wl-stage">
              <div className="wl-frame">
                <LayoutCanvas onZoom={setZoom} layout={draft} editable selected={sel} onSelect={setSel} onMove={onMove} onCursor={setCursor} stats={stats?.map} bad={badIds} mode="plain" tool={tool} zoom={zoom} ariaLabel={t('whLayout.canvasAria', { name: whName })} />
              </div>
              <div className="wl-status">
                <span>{cursor ? `X ${cursor.x.toFixed(1)} · Y ${cursor.y.toFixed(1)} m` : t('whLayout.status.hover')}</span>
                {m && <>
                  <span>{t('whLayout.status.floor', { area: m.area })}</span>
                  <span>{t('whLayout.status.storage', { pct: m.storagePct })}</span>
                  <span>{t('whLayout.status.racks', { racks: m.racks, slots: m.slots })}</span>
                  <span>{t('whLayout.coverage', { placed, total: rows.length })}</span>
                </>}
                <span className={issues.length ? 'warn' : 'ok'}>{issues.length ? t('whLayout.checks.count', { count: issues.length }) : t('whLayout.checks.allGood')}</span>
              </div>
            </div>

            <aside className="wl-props">
              {selected.length === 0 && m && (
                <>
                  <h3>{t('whLayout.overview')}</h3>
                  <div className="wl-kpis">
                    <div><b>{m.area}</b><span>m² {t('whLayout.kpi.floor')}</span></div>
                    <div><b>{m.storage}</b><span>m² {t('whLayout.kpi.storage')}</span></div>
                    <div><b>{m.aisles}</b><span>m² {t('whLayout.kpi.aisles')}</span></div>
                    <div><b>{m.slots}</b><span>{t('whLayout.kpi.slots')}</span></div>
                  </div>
                  <h3>{t('whLayout.canvas')}</h3>
                  <div className="wl-xywh two">
                    <label>{t('whLayout.width')}<input type="number" min={16} max={160} value={draft.cols} onChange={(e) => commit({ ...draft, cols: Math.min(160, Math.max(16, Number(e.target.value) || 16)) })} /></label>
                    <label>{t('whLayout.depth')}<input type="number" min={10} max={120} value={draft.rows} onChange={(e) => commit({ ...draft, rows: Math.min(120, Math.max(10, Number(e.target.value) || 10)) })} /></label>
                  </div>
                  <p className="wl-tip">{t('whLayout.tip')}</p>
                  <details className="wl-keys"><summary>{t('whLayout.keys.title')}</summary><ul>{['select', 'move', 'resize', 'copy', 'undo', 'delete', 'all', 'save'].map((k) => <li key={k}>{t(`whLayout.keys.${k}`)}</li>)}</ul></details>
                  <button type="button" className="btn btn-ghost danger" onClick={() => { if (window.confirm(t('whLayout.resetConfirm'))) { deleteLayout(whId); setDraft(null); setPast([]); setFuture([]); } }}>{t('whLayout.reset')}</button>
                </>
              )}

              {selected.length > 1 && (
                <>
                  <h3>{t('whLayout.multi', { count: selected.length })}</h3>
                  <div className="wl-align">
                    {(['left', 'hcenter', 'right', 'top', 'vcenter', 'bottom', 'hdist', 'vdist', 'size'] as Align[]).map((a) => (
                      <button key={a} type="button" onClick={() => patchShapes(alignShapes(selected.filter((s) => !s.locked), a))} disabled={(a === 'hdist' || a === 'vdist') && selected.length < 3}>{t(`whLayout.align.${a}`)}</button>
                    ))}
                  </div>
                  {selected.every((s) => s.kind === 'rack') && (
                    <div className="wl-xywh two">
                      <label>{t('whLayout.bays')}<input type="number" min={1} max={40} placeholder="—" onChange={(e) => { const v = Number(e.target.value); if (v > 0) patchShapes(selected.map((s) => ({ ...s, bays: v }))); }} /></label>
                      <label>{t('whLayout.levels')}<input type="number" min={1} max={12} placeholder="—" onChange={(e) => { const v = Number(e.target.value); if (v > 0) patchShapes(selected.map((s) => ({ ...s, levels: v }))); }} /></label>
                    </div>
                  )}
                  <div className="wl-row">
                    <button type="button" className="btn btn-ghost" onClick={() => paste(selected)}>{t('whLayout.duplicate')}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => patchShapes(selected.map((s) => ({ ...s, locked: !selected.every((x) => x.locked) })))}>{selected.every((s) => s.locked) ? t('whLayout.unlock') : t('whLayout.lock')}</button>
                    <button type="button" className="btn btn-ghost danger" onClick={removeSel}>{t('whLayout.delete')}</button>
                  </div>
                </>
              )}

              {one && (
                <>
                  <div className="wl-props-head"><h3>{t(`whLayout.kinds.${one.kind}`)}</h3>{one.locked && <span className="wl-lockbadge">{t('whLayout.locked')}</span>}</div>
                  <label>{t('whLayout.name')}<input value={one.name} onChange={(e) => patchOne({ name: e.target.value })} /></label>
                  <label>{t('whLayout.code')}<input value={one.code} onChange={(e) => patchOne({ code: e.target.value })} />{STORAGE.includes(one.kind) && <small>{t('whLayout.codeHint')}</small>}</label>
                  <div className="wl-xywh two">
                    <label>{t('whLayout.type')}<select value={one.kind} onChange={(e) => { const k = e.target.value as ShapeKind; patchOne({ kind: k, role: k === 'zone' ? one.role ?? 'other' : undefined, bays: k === 'rack' ? one.bays ?? Math.max(one.w, one.h) : one.bays }); }}>{KINDS.map((k) => <option key={k} value={k}>{t(`whLayout.kinds.${k}`)}</option>)}</select></label>
                    {one.kind === 'zone' && <label>{t('whLayout.role')}<select value={one.role} onChange={(e) => patchOne({ role: e.target.value as ZoneRole })}>{ROLES.map((r) => <option key={r} value={r}>{t(`whLayout.roles.${r}`)}</option>)}</select></label>}
                  </div>
                  {one.kind === 'rack' && (
                    <div className="wl-xywh two">
                      <label>{t('whLayout.bays')}<input type="number" min={1} max={40} value={baysOf(one)} onChange={(e) => patchOne({ bays: Math.min(40, Math.max(1, Number(e.target.value) || 1)) })} /></label>
                      <label>{t('whLayout.levels')}<input type="number" min={1} max={12} value={one.levels} onChange={(e) => patchOne({ levels: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} /></label>
                    </div>
                  )}
                  {STORAGE.includes(one.kind) && <label>{t('whLayout.capacity')}<input type="number" min={0} value={one.capacity} onChange={(e) => patchOne({ capacity: Math.max(0, Number(e.target.value) || 0) })} /><small>{t('whLayout.capacityHint')}</small></label>}
                  <div className="wl-xywh">
                    {(['x', 'y', 'w', 'h'] as const).map((k) => <label key={k}>{k === 'w' ? t('whLayout.wShort') : k === 'h' ? t('whLayout.hShort') : k.toUpperCase()}<input type="number" step={0.5} min={k === 'w' || k === 'h' ? 0.5 : 0} value={one[k]} onChange={(e) => patchOne({ [k]: Math.max(k === 'w' || k === 'h' ? 0.5 : 0, Number(e.target.value) || 0) })} /></label>)}
                  </div>
                  <label>{t('whLayout.note')}<input value={one.note ?? ''} placeholder={t('whLayout.notePh')} onChange={(e) => patchOne({ note: e.target.value })} /></label>
                  <div className="wl-row">
                    <button type="button" className="btn btn-ghost" onClick={() => patchOne({ w: one.h, h: one.w })}>{t('whLayout.rotate')}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => paste([one])}>{t('whLayout.duplicate')}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => patchOne({ locked: !one.locked })}>{one.locked ? t('whLayout.unlock') : t('whLayout.lock')}</button>
                    <button type="button" className="btn btn-ghost danger" onClick={removeSel}>{t('whLayout.delete')}</button>
                  </div>

                  {one.kind === 'rack' && <><h3>{t('whLayout.elev.title')}</h3><RackElevation shape={one} stat={oneStat} selected={slot} onSlot={setSlot} /></>}

                  {STORAGE.includes(one.kind) && (
                    <div className="wl-items">
                      <h3>{slot ? t('whLayout.itemsInSlot', { code: slotCode(one, Number(slot.split('.')[0]), Number(slot.split('.')[1])), count: slotItems.length }) : t('whLayout.itemsHere', { count: slotItems.length })}</h3>
                      <ul>
                        {slotItems.slice(0, 40).map((r) => (
                          <li key={r.bgId} className={r.level}>
                            <span>{r.name}{r.placement?.bay ? <small> · {slotCode(one, r.placement.bay, r.placement.level ?? 1)}</small> : null}</span><b>{r.stock}</b>
                            {r.placement?.manual ? <button type="button" onClick={() => assign(r.bgId, null)} aria-label={t('whLayout.unassign')}>×</button> : <small title={t('whLayout.byRackHint')}>{t('whLayout.byRack')}</small>}
                          </li>
                        ))}
                        {slotItems.length > 40 && <li className="more">{t('whLayout.more', { count: slotItems.length - 40 })}</li>}
                      </ul>
                      <input className="wl-search" placeholder={slot ? t('whLayout.assignSlotPh') : t('whLayout.assignPh')} value={itemQ} onChange={(e) => setItemQ(e.target.value)} />
                      {candidates.length > 0 && (
                        <ul className="wl-candidates">
                          {candidates.map((r) => <li key={r.bgId}><button type="button" onClick={() => { assign(r.bgId, slot ? `${one.id}@${slot}` : one.id); setItemQ(''); }}><span>{r.name}</span><small>{t('whHub.inStock', { count: r.stock })}</small></button></li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        </>
      )}

      {genOpen && draft && <RowGenerator layout={draft} onClose={() => setGenOpen(false)} onCreate={(list) => { commit({ ...draft, shapes: [...draft.shapes, ...list] }); setSel(new Set(list.map((s) => s.id))); setGenOpen(false); }} />}
    </div>
  );
}
