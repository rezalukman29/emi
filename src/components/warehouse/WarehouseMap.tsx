import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LayoutCanvas, { type MapMode } from './LayoutCanvas';
import { pickRoute, shapeForItem, statsByShape, useLayout } from '../../lib/warehouseLayout';
import type { Movement, StockRow, Warehouse } from '../../lib/warehouseHub';

// Warehouse Hub map (owner 2026-11-27): live floor plan of one warehouse — stock heatmap, issues, pick route for an
// event going out, item search. Layout comes from the layout editor (browser preview, api-backlog §16); stock and
// movements are real (existing endpoints).

export default function WarehouseMap({ warehouse, physical, rows, movements, loading, onPick, canEdit }: {
  warehouse: Warehouse | null; physical: Warehouse[]; rows: StockRow[]; movements: Movement[]; loading: boolean; onPick: (id: number) => void; canEdit: boolean;
}) {
  const { t, i18n } = useTranslation();
  const layout = useLayout(warehouse?.id ?? 0);
  const [mode, setMode] = useState<MapMode>('stock');
  const [zoom, setZoom] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const outs = movements.filter((m) => m.type === 'out' && m.warehouseId === warehouse?.id);
  const [routeKey, setRouteKey] = useState<string>('');
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';

  const stats = useMemo(() => (layout ? statsByShape(layout, rows) : null), [layout, rows]);
  const maxUnits = useMemo(() => Math.max(0, ...[...(stats?.map.values() ?? [])].map((s) => s.units)), [stats]);
  const needle = q.trim().toLowerCase();
  const hits = useMemo(() => {
    if (!layout || needle.length < 2) return new Set<string>();
    return new Set(rows.filter((r) => r.name.toLowerCase().includes(needle)).map((r) => shapeForItem(layout, r)?.id).filter(Boolean) as string[]);
  }, [layout, rows, needle]);

  const movement = outs.find((m) => m.key === routeKey) ?? outs[0];
  const route = useMemo(() => {
    if (!layout || mode !== 'route' || !movement) return null;
    const byName = new Map(rows.map((r) => [r.name.trim().toLowerCase(), r]));
    const stops = movement.lines.map((l) => byName.get(l.name.trim().toLowerCase())).map((r) => (r ? shapeForItem(layout, r) : null)).filter(Boolean) as NonNullable<ReturnType<typeof shapeForItem>>[];
    return { ...pickRoute(layout, stops), missing: movement.lines.length - stops.length };
  }, [layout, mode, movement, rows]);

  if (!warehouse) {
    return (
      <section className="wl-map card">
        <header className="wl-map-head"><div><span className="whm-live"><i aria-hidden="true" />{t('whLayout.map.title')}</span><h2>{t('whLayout.map.pickTitle')}</h2></div></header>
        <div className="wl-pick">{physical.map((w) => <button key={w.id} type="button" onClick={() => onPick(w.id)}>{w.name}</button>)}</div>
      </section>
    );
  }
  if (!layout) {
    return (
      <section className="wl-map card wl-map-empty">
        <div className="wl-empty-art" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div>
        <div>
          <h2>{t('whLayout.map.noLayoutTitle', { name: warehouse.name })}</h2>
          <p>{t('whLayout.map.noLayoutBody')}</p>
          {canEdit ? <Link className="btn btn-primary" to={`/warehouse-hub/layout?wh=${warehouse.id}`}>{t('whLayout.map.create')}</Link> : <p className="wh-muted">{t('whLayout.map.askAdmin')}</p>}
        </div>
      </section>
    );
  }

  const shape = layout.shapes.find((s) => s.id === picked) ?? null;
  const st = shape ? stats?.map.get(shape.id) : undefined;
  const pct = shape && st ? (shape.capacity > 0 ? Math.round((st.units / shape.capacity) * 100) : null) : null;
  const modes: MapMode[] = ['stock', 'issues', 'route'];

  return (
    <section className="wl-map card">
      <header className="wl-map-head">
        <div>
          <span className="whm-live"><i aria-hidden="true" />{t('whLayout.map.title')}</span>
          <h2>{warehouse.name}</h2>
        </div>
        <div className="wl-map-tools">
          <div className="wl-modes" role="group" aria-label={t('whLayout.map.modeAria')}>
            {modes.map((m) => <button key={m} type="button" className={mode === m ? 'active' : ''} aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`whLayout.map.modes.${m}`)}</button>)}
          </div>
          <input className="wl-search" placeholder={t('whLayout.map.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('whLayout.map.searchPh')} />
          {canEdit && <Link className="btn btn-ghost" to={`/warehouse-hub/layout?wh=${warehouse.id}`}>{t('whLayout.map.edit')}</Link>}
        </div>
      </header>

      {mode === 'route' && (
        <div className="wl-route-bar">
          {outs.length === 0 ? <span>{t('whLayout.map.noOut')}</span> : <>
            <label>{t('whLayout.map.routeFor')}
              <select value={movement?.key} onChange={(e) => setRouteKey(e.target.value)}>
                {outs.map((m) => <option key={m.key} value={m.key}>{new Date(`${m.date}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · {m.eventName}</option>)}
              </select>
            </label>
            {route && <span>{t('whLayout.map.routeInfo', { stops: route.order.length, meters: Math.round(route.length) })}{route.missing > 0 ? ` · ${t('whLayout.map.routeMissing', { count: route.missing })}` : ''}</span>}
          </>}
        </div>
      )}

      <div className="wl-map-body">
        <div className="wl-frame dark">
          <LayoutCanvas layout={layout} selectedId={picked} onSelect={setPicked} stats={stats?.map} mode={mode} maxUnits={maxUnits} highlight={hits} route={route} zoom={zoom} ariaLabel={t('whLayout.canvasAria', { name: warehouse.name })} />
          <div className="wl-zoom floating">
            <button type="button" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label={t('whLayout.zoomIn')}>+</button>
            <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label={t('whLayout.zoomOut')}>−</button>
          </div>
          {loading && <div className="wl-loading">{t('wording.loading')}</div>}
          <div className="wl-legend">
            {mode === 'stock' && <><span><i className="h4" />{t('whLayout.map.legend.h4')}</span><span><i className="h3" />{t('whLayout.map.legend.h3')}</span><span><i className="h2" />{t('whLayout.map.legend.h2')}</span><span><i className="h1" />{t('whLayout.map.legend.h1')}</span><span><i className="empty" />{t('whLayout.map.legend.empty')}</span></>}
            {mode === 'issues' && <><span><i className="crit" />{t('whLayout.map.legend.crit')}</span><span><i className="low" />{t('whLayout.map.legend.low')}</span><span><i className="ok" />{t('whLayout.map.legend.ok')}</span></>}
            {mode === 'route' && <span><i className="route" />{t('whLayout.map.legend.route')}</span>}
          </div>
        </div>

        <aside className="wl-detail">
          {!shape ? (
            <>
              <h3>{t('whLayout.map.summary')}</h3>
              <dl>
                <div><dt>{t('whLayout.map.placed')}</dt><dd>{rows.length - (stats?.unplaced ?? 0)} / {rows.length}</dd></div>
                <div><dt>{t('whLayout.map.racks')}</dt><dd>{layout.shapes.filter((s) => s.kind === 'rack' || s.kind === 'bulk').length}</dd></div>
                <div><dt>{t('whLayout.map.hits')}</dt><dd>{needle.length >= 2 ? hits.size : '—'}</dd></div>
              </dl>
              {(stats?.unplaced ?? 0) > 0 && <p className="wl-note">{t('whLayout.map.unplacedNote', { count: stats?.unplaced ?? 0 })}</p>}
              <p className="wl-tip">{t('whLayout.map.tapHint')}</p>
            </>
          ) : (
            <>
              <h3>{shape.name}</h3>
              <span className="wl-kind">{shape.role ? t(`whLayout.roles.${shape.role}`) : t(`whLayout.kinds.${shape.kind}`)} · {shape.code}</span>
              {pct !== null && <div className="wl-cap"><span style={{ width: `${Math.min(100, pct)}%` }} className={pct >= 90 ? 'full' : pct >= 75 ? 'high' : ''} /><b>{t('whLayout.map.capPct', { pct })}</b></div>}
              <dl>
                <div><dt>{t('whLayout.map.units')}</dt><dd>{(st?.units ?? 0).toLocaleString('id-ID')}</dd></div>
                <div><dt>{t('whLayout.map.lines')}</dt><dd>{st?.lines ?? 0}</dd></div>
                <div><dt>{t('whLayout.map.toFix')}</dt><dd className={(st?.critical ?? 0) + (st?.low ?? 0) > 0 ? 'bad' : ''}>{(st?.critical ?? 0) + (st?.low ?? 0)}</dd></div>
              </dl>
              <ul className="wl-detail-items">
                {(st?.items ?? []).slice(0, 10).map((r) => <li key={r.bgId} className={r.level}><span>{r.name}</span><b>{r.stock}</b></li>)}
              </ul>
              {(st?.items.length ?? 0) === 0 && <p className="wl-tip">{t('whLayout.map.emptyShape')}</p>}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
