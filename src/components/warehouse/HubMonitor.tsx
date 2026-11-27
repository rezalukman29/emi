import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addIsoDays, isoToday, type Movement, type StockRow, type Warehouse } from '../../lib/warehouseHub';

// Warehouse Hub "Live monitor" (owner 2026-11-27: more futuristic, motion, a monitoring dashboard, same style).
// Everything here is computed from data the Hub already loads (existing endpoints) — no new API.
// Motion respects prefers-reduced-motion (see warehouseHub.css).

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts from the previous value to the new one (ease-out, ~0.9 s). */
function useCountUp(target: number, ready: boolean) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!ready) return;
    if (reduceMotion()) { setValue(target); from.current = target; return; }
    const start = performance.now();
    const begin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(begin + (target - begin) * eased));
      if (p < 1) frame = requestAnimationFrame(tick); else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ready]);
  return value;
}

export interface MonitorTile { key: string; tone: 'brand' | 'green' | 'orange' | 'red' | 'purple'; value: number; label: string; hint?: string; loading: boolean; onClick?: () => void; href?: string; suffix?: string }

function Tile({ tile, index, onNavigate }: { tile: MonitorTile; index: number; onNavigate: (href: string) => void }) {
  const shown = useCountUp(tile.value, !tile.loading);
  const clickable = Boolean(tile.onClick || tile.href);
  const body = (
    <>
      <span className="whm-tile-label">{tile.label}</span>
      <b className="whm-tile-value">{tile.loading ? <span className="whm-skel" /> : <>{shown.toLocaleString('id-ID')}{tile.suffix}</>}</b>
      {tile.hint && <span className="whm-tile-hint">{tile.hint}</span>}
      <span className="whm-tile-glow" aria-hidden="true" />
    </>
  );
  const cls = `whm-tile ${tile.tone}${!tile.loading && tile.value === 0 && ['red', 'orange'].includes(tile.tone) ? ' calm' : ''}`;
  const style = { animationDelay: `${index * 60}ms` };
  if (!clickable) return <div className={cls} style={style}>{body}</div>;
  return <button type="button" className={`${cls} clickable`} style={style} onClick={() => (tile.onClick ? tile.onClick() : onNavigate(tile.href!))}>{body}</button>;
}

function HealthRing({ ok, low, critical, loading }: { ok: number; low: number; critical: number; loading: boolean }) {
  const { t } = useTranslation();
  const total = ok + low + critical;
  const pct = total ? Math.round((ok / total) * 100) : 0;
  const shown = useCountUp(pct, !loading);
  const r = 52;
  const c = 2 * Math.PI * r;
  const seg = (n: number) => (total ? (n / total) * c : 0);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { if (!loading) { const id = requestAnimationFrame(() => setDrawn(true)); return () => cancelAnimationFrame(id); } }, [loading]);
  const parts = [
    { key: 'ok', n: ok, cls: 'ok' },
    { key: 'low', n: low, cls: 'low' },
    { key: 'critical', n: critical, cls: 'critical' },
  ];
  let offset = 0;
  return (
    <div className="whm-ring-wrap">
      <svg viewBox="0 0 128 128" className="whm-ring" role="img" aria-label={t('whHub.monitor.healthAria', { pct, ok, low, critical })}>
        <circle cx="64" cy="64" r={r} className="whm-ring-track" />
        {parts.map((p) => {
          const len = drawn ? seg(p.n) : 0;
          const el = <circle key={p.key} cx="64" cy="64" r={r} className={`whm-ring-seg ${p.cls}`} strokeDasharray={`${len} ${c}`} strokeDashoffset={-offset} />;
          offset += seg(p.n);
          return el;
        })}
      </svg>
      <div className="whm-ring-center">
        <b>{loading ? '…' : `${shown}%`}</b>
        <span>{t('whHub.monitor.healthy')}</span>
      </div>
      <ul className="whm-legend">
        <li><i className="ok" />{t('whHub.monitor.okCount', { count: ok })}</li>
        <li><i className="low" />{t('whHub.monitor.lowCount', { count: low })}</li>
        <li><i className="critical" />{t('whHub.monitor.criticalCount', { count: critical })}</li>
      </ul>
    </div>
  );
}

function FlowChart({ movements, loading, onDay }: { movements: Movement[]; loading: boolean; onDay: () => void }) {
  const { t, i18n } = useTranslation();
  const today = isoToday();
  const days = Array.from({ length: 14 }, (_, i) => addIsoDays(today, i));
  const sum = (type: Movement['type'], d: string) => movements.filter((m) => m.type === type && m.date === d).reduce((s, m) => s + m.lines.reduce((a, l) => a + l.qty, 0), 0);
  const data = days.map((d) => ({ d, out: sum('out', d), back: sum('return', d) }));
  const max = Math.max(1, ...data.map((x) => Math.max(x.out, x.back)));
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const label = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric' });
  const dow = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { weekday: 'narrow' });
  const totalOut = data.reduce((s, x) => s + x.out, 0);
  const totalBack = data.reduce((s, x) => s + x.back, 0);
  return (
    <div className="whm-flow">
      <div className="whm-flow-legend">
        <span><i className="out" />{t('whHub.monitor.outUnits', { count: totalOut })}</span>
        <span><i className="back" />{t('whHub.monitor.backUnits', { count: totalBack })}</span>
      </div>
      {loading ? <div className="whm-flow-skel" /> : (
        <div className="whm-flow-grid" role="list" aria-label={t('whHub.monitor.flowAria')}>
          {data.map((x, i) => (
            <button type="button" role="listitem" key={x.d} className={`whm-day${i === 0 ? ' today' : ''}`} onClick={onDay}
              title={t('whHub.monitor.dayTitle', { date: new Date(`${x.d}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' }), out: x.out, back: x.back })}>
              <span className="whm-bar-up"><span className={`whm-bar out${x.out ? '' : ' zero'}`} style={{ height: `${(x.out / max) * 100}%`, animationDelay: `${i * 35}ms` }} /></span>
              <span className="whm-axis"><small>{dow(x.d)}</small>{label(x.d)}</span>
              <span className="whm-bar-down"><span className={`whm-bar back${x.back ? '' : ' zero'}`} style={{ height: `${(x.back / max) * 100}%`, animationDelay: `${i * 35 + 120}ms` }} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadBars({ rows, selected, onPick }: { rows: Array<{ w: Warehouse; units: number; types: number; bad: number }>; selected: number; onPick: (id: number) => void }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...rows.map((r) => r.units));
  return (
    <ul className="whm-load">
      {rows.map((r, i) => (
        <li key={r.w.id}>
          <button type="button" className={r.w.id === selected ? 'active' : ''} onClick={() => onPick(r.w.id)} title={t('whHub.monitor.loadTitle', { name: r.w.name, units: r.units, types: r.types, bad: r.bad })}>
            <span className="whm-load-name">{r.w.name}</span>
            <span className="whm-load-track"><span className="whm-load-fill" style={{ width: `${(r.units / max) * 100}%`, animationDelay: `${i * 50}ms` }} /></span>
            <span className="whm-load-num">{r.units.toLocaleString('id-ID')}</span>
            {r.bad > 0 ? <span className="whm-load-bad">{r.bad}</span> : <span className="whm-load-ok" aria-hidden="true">✓</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Timeline({ movements, whName, showWarehouse }: { movements: Movement[]; whName: (id: number) => string; showWarehouse: boolean }) {
  const { t } = useTranslation();
  const today = isoToday();
  const rel = (d: string) => {
    const diff = Math.round((new Date(`${d}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
    if (diff === 0) return t('whHub.monitor.today');
    if (diff === 1) return t('whHub.monitor.tomorrow');
    if (diff < 0) return t('whHub.monitor.daysLate', { count: -diff });
    return t('whHub.monitor.inDays', { count: diff });
  };
  if (!movements.length) return <p className="whm-calm">{t('whHub.monitor.timelineEmpty')}</p>;
  return (
    <ol className="whm-timeline">
      {movements.slice(0, 6).map((m, i) => (
        <li key={m.key} className={m.type} style={{ animationDelay: `${i * 70}ms` }}>
          <span className="whm-dot" aria-hidden="true" />
          <div>
            <span className="whm-when">{rel(m.date)} · {t(`whHub.type.${m.type}`)}</span>
            <b>{m.eventName}</b>
            <span className="whm-meta">{t('whHub.linesQty', { lines: m.lines.length, qty: m.lines.reduce((s, l) => s + l.qty, 0) })}{showWarehouse ? ` · ${whName(m.warehouseId)}` : ''}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HubMonitor(props: {
  scopeName: string;
  selected: number;
  physical: Warehouse[];
  stockByWarehouse: Map<number, StockRow[]>;
  stockLoading: boolean;
  movements: Movement[];
  scheduleLoading: boolean;
  tiles: MonitorTile[];
  updatedAt: number;
  refreshing: boolean;
  onRefresh: () => void;
  onPick: (id: number) => void;
  onNavigate: (href: string) => void;
  onShowSchedule: () => void;
  whName: (id: number) => string;
}) {
  const { t, i18n } = useTranslation();
  const rows = [...props.stockByWarehouse.values()].flat();
  const ok = rows.filter((r) => r.level === 'ok').length;
  const low = rows.filter((r) => r.level === 'low').length;
  const critical = rows.filter((r) => r.level === 'critical').length;
  const loadRows = props.physical
    .map((w) => { const list = props.stockByWarehouse.get(w.id) ?? []; return { w, units: list.reduce((s, r) => s + Math.max(0, r.stock), 0), types: list.length, bad: list.filter((r) => r.level !== 'ok').length }; })
    .filter((r) => r.types > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);
  const next = [...props.movements].sort((a, b) => (a.type === 'overdue' ? -1 : 0) - (b.type === 'overdue' ? -1 : 0) || a.date.localeCompare(b.date));
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const time = props.updatedAt ? new Date(props.updatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <section className="whm" aria-label={t('whHub.monitor.title')}>
      <div className="whm-hero">
        <div className="whm-hero-text">
          <span className="whm-live"><i aria-hidden="true" />{t('whHub.monitor.live')}</span>
          <h2>{t('whHub.monitor.title')}</h2>
          <p>{props.scopeName}</p>
        </div>
        <div className="whm-hero-meta">
          <span>{t('whHub.monitor.updated', { time })}</span>
          <button type="button" className={`whm-refresh${props.refreshing ? ' spinning' : ''}`} onClick={props.onRefresh} aria-label={t('whHub.monitor.refresh')} title={t('whHub.monitor.refresh')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
          </button>
        </div>
        <div className="whm-scan" aria-hidden="true" />
      </div>

      <div className="whm-tiles">
        {props.tiles.map((tile, i) => <Tile key={tile.key} tile={tile} index={i} onNavigate={props.onNavigate} />)}
      </div>

      <div className="whm-panels">
        <article className="whm-panel">
          <header><h3>{t('whHub.monitor.healthTitle')}</h3><span>{t('whHub.monitor.healthSub', { count: rows.length })}</span></header>
          <HealthRing ok={ok} low={low} critical={critical} loading={props.stockLoading} />
        </article>
        <article className="whm-panel wide">
          <header><h3>{t('whHub.monitor.flowTitle')}</h3><span>{t('whHub.monitor.flowSub')}</span></header>
          <FlowChart movements={props.movements} loading={props.scheduleLoading} onDay={props.onShowSchedule} />
        </article>
        <article className="whm-panel">
          <header><h3>{t('whHub.monitor.nextTitle')}</h3><span>{t('whHub.monitor.nextSub')}</span></header>
          {props.scheduleLoading ? <div className="whm-flow-skel short" /> : <Timeline movements={next} whName={props.whName} showWarehouse={!props.selected} />}
        </article>
        {!props.selected && (
          <article className="whm-panel wide">
            <header><h3>{t('whHub.monitor.loadTitleHead')}</h3><span>{t('whHub.monitor.loadSub')}</span></header>
            {props.stockLoading ? <div className="whm-flow-skel short" /> : loadRows.length ? <LoadBars rows={loadRows} selected={props.selected} onPick={props.onPick} /> : <p className="whm-calm">{t('whHub.monitor.noStock')}</p>}
          </article>
        )}
      </div>
    </section>
  );
}
