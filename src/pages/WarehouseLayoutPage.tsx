import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import LayoutCanvas from '../components/warehouse/LayoutCanvas';
import { fetchWarehouseStock, fetchWarehouses } from '../lib/warehouseHub';
import {
  KIND_DEFAULTS, blankLayout, deleteLayout, newId, saveLayout, shapeForItem, statsByShape, templateLayout, useLayout,
  type Layout, type Shape, type ShapeKind, type ZoneRole,
} from '../lib/warehouseLayout';
import { isTenantAdminUser } from '../lib/tenantUser';
import '../warehouseHub.css';
import '../warehouseLayout.css';

// Warehouse layout editor (owner 2026-11-27). PREVIEW — stored in this browser until the layout API exists
// (docs/api-backlog.md §16). Route: /warehouse-hub/layout?wh=<id>

const ROLES: ZoneRole[] = ['receiving', 'shipping', 'staging', 'qa', 'returns', 'office', 'other'];
const KINDS: ShapeKind[] = ['rack', 'bulk', 'zone', 'dock'];

export default function WarehouseLayoutPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const whQuery = useQuery(['whHubWarehouses'], fetchWarehouses, { staleTime: 60_000 });
  const physical = (whQuery.data ?? []).filter((w) => !w.virtual);
  const whId = Number(params.get('wh')) || physical[0]?.id || 0;
  const saved = useLayout(whId);
  const [draft, setDraft] = useState<Layout | null>(saved);
  const [history, setHistory] = useState<Layout[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [itemQ, setItemQ] = useState('');
  const admin = isTenantAdminUser();
  const pendingDrag = useRef(false);

  useEffect(() => { setDraft(saved); setHistory([]); setSelected(null); }, [whId]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const shape = draft?.shapes.find((s) => s.id === selected) ?? null;

  const commit = (next: Layout) => { if (draft) setHistory((h) => [...h.slice(-40), draft]); setDraft(next); };
  const update = (s: Shape) => {
    if (!draft) return;
    if (pendingDrag.current) { setHistory((h) => [...h.slice(-40), draft]); pendingDrag.current = false; }
    setDraft({ ...draft, shapes: draft.shapes.map((x) => (x.id === s.id ? s : x)) });
  };
  const updateCommit = (patch: Partial<Shape>) => { if (draft && shape) commit({ ...draft, shapes: draft.shapes.map((x) => (x.id === shape.id ? { ...x, ...patch } : x)) }); };
  const startDrag = () => { pendingDrag.current = true; };
  const undo = () => { const prev = history[history.length - 1]; if (prev) { setDraft(prev); setHistory((h) => h.slice(0, -1)); } };

  function add(kind: ShapeKind, role?: ZoneRole) {
    if (!draft) return;
    const n = draft.shapes.filter((s) => s.kind === kind).length + 1;
    const code = kind === 'rack' ? String.fromCharCode(65 + ((n - 1) % 26)) + (n > 26 ? Math.ceil(n / 26) : '') : kind === 'bulk' ? `BULK-${n}` : kind === 'dock' ? `DOOR-${n}` : (role ?? 'zone').toUpperCase();
    const name = kind === 'rack' ? `Rack ${code}` : kind === 'bulk' ? `Bulk ${n}` : kind === 'dock' ? t('whLayout.kinds.dock') : t(`whLayout.roles.${role ?? 'other'}`);
    const d = KIND_DEFAULTS[kind];
    const s: Shape = { id: newId(), kind, role: kind === 'zone' ? role ?? 'other' : undefined, code, name, x: Math.max(0, Math.round(draft.cols / 2 - d.w / 2)), y: Math.max(0, Math.round(draft.rows / 2 - d.h / 2)), ...d };
    commit({ ...draft, shapes: [...draft.shapes, s] });
    setSelected(s.id);
  }
  function remove() { if (draft && shape) { const assign = Object.fromEntries(Object.entries(draft.assign).filter(([, v]) => v !== shape.id)); commit({ ...draft, shapes: draft.shapes.filter((s) => s.id !== shape.id), assign }); setSelected(null); } }
  function duplicate() { if (draft && shape) { const s = { ...shape, id: newId(), x: Math.min(shape.x + 1, draft.cols - shape.w), y: Math.min(shape.y + 1, draft.rows - shape.h), code: `${shape.code}-2`, name: `${shape.name} 2` }; commit({ ...draft, shapes: [...draft.shapes, s] }); setSelected(s.id); } }
  function save() { if (!draft) return; saveLayout(draft); toast.success(t('whLayout.saved')); }
  function assign(bgId: number, shapeId: string | null) {
    if (!draft) return;
    const next = { ...draft.assign }; if (shapeId) next[bgId] = shapeId; else delete next[bgId];
    commit({ ...draft, assign: next });
  }

  if (!admin) return <div className="card"><h1 className="page-title">{t('whLayout.title')}</h1><p>{t('whLayout.adminOnly')}</p></div>;

  const placed = rows.length - (stats?.unplaced ?? rows.length);
  const shapeItems = shape && stats ? stats.map.get(shape.id)?.items ?? [] : [];
  const needle = itemQ.trim().toLowerCase();
  const candidates = shape && draft && needle.length >= 2 ? rows.filter((r) => r.name.toLowerCase().includes(needle) && shapeForItem(draft, r)?.id !== shape.id).slice(0, 8) : [];
  const whName = physical.find((w) => w.id === whId)?.name ?? '';

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
          {draft && <>
            <button type="button" className="btn btn-ghost" onClick={undo} disabled={!history.length}>{t('whLayout.undo')}</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty}>{dirty ? t('whLayout.save') : t('whLayout.savedShort')}</button>
          </>}
        </div>
      </header>

      {!draft ? (
        <div className="wl-start">
          <h2>{t('whLayout.startTitle', { name: whName })}</h2>
          <p>{t('whLayout.startBody')}</p>
          <div className="wl-start-cards">
            <button type="button" onClick={() => { const l = templateLayout(whId); setHistory([]); setDraft(l); }}>
              <b>{t('whLayout.useTemplate')}</b><span>{t('whLayout.useTemplateHint')}</span>
            </button>
            <button type="button" onClick={() => { setHistory([]); setDraft(blankLayout(whId)); }}>
              <b>{t('whLayout.startBlank')}</b><span>{t('whLayout.startBlankHint')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="wl-editor">
          <aside className="wl-tools">
            <h3>{t('whLayout.add')}</h3>
            <button type="button" onClick={() => add('rack')}><i className="sw k-rack" />{t('whLayout.kinds.rack')}</button>
            <button type="button" onClick={() => add('bulk')}><i className="sw k-bulk" />{t('whLayout.kinds.bulk')}</button>
            {ROLES.slice(0, 5).map((r) => <button key={r} type="button" onClick={() => add('zone', r)}><i className={`sw r-${r}`} />{t(`whLayout.roles.${r}`)}</button>)}
            <button type="button" onClick={() => add('dock')}><i className="sw k-dock" />{t('whLayout.kinds.dock')}</button>
            <h3>{t('whLayout.canvas')}</h3>
            <label>{t('whLayout.width')}<input type="number" min={16} max={120} value={draft.cols} onChange={(e) => commit({ ...draft, cols: Math.min(120, Math.max(16, Number(e.target.value) || 16)) })} /></label>
            <label>{t('whLayout.depth')}<input type="number" min={10} max={80} value={draft.rows} onChange={(e) => commit({ ...draft, rows: Math.min(80, Math.max(10, Number(e.target.value) || 10)) })} /></label>
            <button type="button" className="danger" onClick={() => { if (window.confirm(t('whLayout.resetConfirm'))) { deleteLayout(whId); setDraft(null); setHistory([]); } }}>{t('whLayout.reset')}</button>
            <p className="wl-tip">{t('whLayout.tip')}</p>
          </aside>

          <div className="wl-stage">
            <div className="wl-stage-bar">
              <span>{t('whLayout.coverage', { placed, total: rows.length })}</span>
              <div className="wl-zoom">
                <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label={t('whLayout.zoomOut')}>−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label={t('whLayout.zoomIn')}>+</button>
              </div>
            </div>
            <div className="wl-frame" onPointerDown={startDrag}>
              <LayoutCanvas layout={draft} editable selectedId={selected} onSelect={setSelected} onChange={update} stats={stats?.map} mode="plain" zoom={zoom} ariaLabel={t('whLayout.canvasAria', { name: whName })} />
            </div>
          </div>

          <aside className="wl-props">
            {!shape ? <p className="wl-tip">{t('whLayout.selectHint')}</p> : (
              <>
                <h3>{t(`whLayout.kinds.${shape.kind}`)}</h3>
                <label>{t('whLayout.name')}<input value={shape.name} onChange={(e) => updateCommit({ name: e.target.value })} /></label>
                <label>{t('whLayout.code')}<input value={shape.code} onChange={(e) => updateCommit({ code: e.target.value })} /><small>{t('whLayout.codeHint')}</small></label>
                <label>{t('whLayout.type')}<select value={shape.kind} onChange={(e) => updateCommit({ kind: e.target.value as ShapeKind, role: e.target.value === 'zone' ? shape.role ?? 'other' : undefined })}>{KINDS.map((k) => <option key={k} value={k}>{t(`whLayout.kinds.${k}`)}</option>)}</select></label>
                {shape.kind === 'zone' && <label>{t('whLayout.role')}<select value={shape.role} onChange={(e) => updateCommit({ role: e.target.value as ZoneRole })}>{ROLES.map((r) => <option key={r} value={r}>{t(`whLayout.roles.${r}`)}</option>)}</select></label>}
                {shape.kind === 'rack' && <label>{t('whLayout.levels')}<input type="number" min={1} max={12} value={shape.levels} onChange={(e) => updateCommit({ levels: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} /></label>}
                {(shape.kind === 'rack' || shape.kind === 'bulk') && <label>{t('whLayout.capacity')}<input type="number" min={0} value={shape.capacity} onChange={(e) => updateCommit({ capacity: Math.max(0, Number(e.target.value) || 0) })} /><small>{t('whLayout.capacityHint')}</small></label>}
                <div className="wl-xywh">
                  {(['x', 'y', 'w', 'h'] as const).map((k) => <label key={k}>{k.toUpperCase()}<input type="number" min={k === 'w' || k === 'h' ? 1 : 0} value={shape[k]} onChange={(e) => updateCommit({ [k]: Math.max(k === 'w' || k === 'h' ? 1 : 0, Number(e.target.value) || 0) })} /></label>)}
                </div>
                <div className="wl-row">
                  <button type="button" className="btn btn-ghost" onClick={() => updateCommit({ w: shape.h, h: shape.w })}>{t('whLayout.rotate')}</button>
                  <button type="button" className="btn btn-ghost" onClick={duplicate}>{t('whLayout.duplicate')}</button>
                  <button type="button" className="btn btn-ghost danger" onClick={remove}>{t('whLayout.delete')}</button>
                </div>

                {shape.kind !== 'dock' && (
                  <div className="wl-items">
                    <h3>{t('whLayout.itemsHere', { count: shapeItems.length })}</h3>
                    <ul>
                      {shapeItems.slice(0, 30).map((r) => (
                        <li key={r.bgId}><span>{r.name}</span><b>{r.stock}</b>
                          {draft.assign[r.bgId] ? <button type="button" onClick={() => assign(r.bgId, null)} aria-label={t('whLayout.unassign')}>×</button> : <small title={t('whLayout.byRackHint')}>{t('whLayout.byRack')}</small>}</li>
                      ))}
                      {shapeItems.length > 30 && <li className="more">{t('whLayout.more', { count: shapeItems.length - 30 })}</li>}
                    </ul>
                    <input className="wl-search" placeholder={t('whLayout.assignPh')} value={itemQ} onChange={(e) => setItemQ(e.target.value)} />
                    {candidates.length > 0 && (
                      <ul className="wl-candidates">
                        {candidates.map((r) => <li key={r.bgId}><button type="button" onClick={() => { assign(r.bgId, shape.id); setItemQ(''); }}><span>{r.name}</span><small>{t('whHub.inStock', { count: r.stock })}</small></button></li>)}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
