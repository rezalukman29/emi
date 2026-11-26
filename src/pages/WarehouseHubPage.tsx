import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import MoveStockModal, { type MovePreset } from '../components/warehouse/MoveStockModal';
import {
  fetchItemWarehouses,
  fetchOpenOpname,
  fetchSchedule,
  fetchWarehouseStock,
  fetchWarehouses,
  isoToday,
  addIsoDays,
  type Movement,
  type StockRow,
  type Warehouse,
} from '../lib/warehouseHub';
import '../warehouseHub.css';

// Warehouse Hub "Gudang" (owner 2026-11-26): one task-first menu for warehouse work. New page only — the old
// warehouse menus stay as they are. Data: existing endpoints (see src/lib/warehouseHub.ts).

const KEY = 'emi.whHub.warehouse.v1';
const readSaved = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };

function Section({ title, sub, children, id }: { title: string; sub?: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="card wh-section" id={id}>
      <header><h2>{title}</h2>{sub && <p>{sub}</p>}</header>
      {children}
    </section>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return <div className="wh-load-error" role="alert">{t('whHub.loadError')} <button type="button" className="btn btn-ghost" onClick={onRetry}>{t('whHub.retry')}</button></div>;
}

function OtherWarehouses({ row, warehouseId, onMove }: { row: StockRow; warehouseId: number; onMove: (preset: MovePreset) => void }) {
  const { t } = useTranslation();
  const q = useQuery(['whHubOther', row.barangId], () => fetchItemWarehouses(row.name, row.barangId), { staleTime: 60_000 });
  if (q.isLoading) return <p className="wh-muted">{t('wording.loading')}</p>;
  const others = (q.data ?? []).filter((w) => w.warehouseId !== warehouseId && w.stock > 0);
  if (!others.length) return <p className="wh-muted">{t('whHub.noOther')}</p>;
  return (
    <ul className="wh-other">
      {others.map((w) => (
        <li key={w.bgId}><span>{w.warehouse}</span><b>{t('whHub.inStock', { count: w.stock })}</b>
          <button type="button" className="btn btn-ghost" onClick={() => onMove({ fromId: w.warehouseId, toId: warehouseId, barangId: row.barangId })}>{t('whHub.moveHere')}</button></li>
      ))}
    </ul>
  );
}

export default function WarehouseHubPage() {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<number>(readSaved());
  const [range, setRange] = useState<2 | 14>(2);
  const [openMove, setOpenMove] = useState<MovePreset | null>(null);
  const [openPick, setOpenPick] = useState<string | null>(null);
  const [openOther, setOpenOther] = useState<number | null>(null);
  const [stockTab, setStockTab] = useState<'critical' | 'low'>('critical');
  const today = isoToday();
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  const whQuery = useQuery(['whHubWarehouses'], fetchWarehouses, { staleTime: 60_000 });
  const warehouses = useMemo(() => whQuery.data ?? [], [whQuery.data]);
  const physical = warehouses.filter((w) => !w.virtual);
  const virtual = warehouses.filter((w) => w.virtual);
  const scope = selected ? warehouses.filter((w) => w.id === selected) : physical;

  const stockQueries = useQueries(scope.map((w) => ({ queryKey: ['whHubStock', w.id], queryFn: () => fetchWarehouseStock(w.id), staleTime: 60_000 })));
  const stockByWarehouse = new Map<number, StockRow[]>(scope.map((w, i) => [w.id, (stockQueries[i]?.data as StockRow[] | undefined) ?? []]));
  const stockLoading = stockQueries.some((q) => q.isLoading);
  const stockError = stockQueries.some((q) => q.isError);
  const flagged = scope.flatMap((w) => (stockByWarehouse.get(w.id) ?? []).filter((r) => r.level !== 'ok').map((r) => ({ ...r, warehouse: w })));
  const critical = flagged.filter((r) => r.level === 'critical');
  const low = flagged.filter((r) => r.level === 'low');

  const scheduleQuery = useQuery(['whHubSchedule', 14], () => fetchSchedule(14), { staleTime: 60_000 });
  const opnameQuery = useQuery(['whHubOpname'], fetchOpenOpname, { staleTime: 60_000 });
  const inScope = (m: Movement) => (selected ? m.warehouseId === selected : physical.some((w) => w.id === m.warehouseId));
  const movements = (scheduleQuery.data ?? []).filter(inScope);
  const overdue = movements.filter((m) => m.type === 'overdue');
  const upcoming = movements.filter((m) => m.type !== 'overdue' && m.date <= addIsoDays(today, range - 1));

  const dupNames = Object.entries(warehouses.reduce<Record<string, number>>((acc, w) => { const k = w.name.toLowerCase(); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {})).filter(([, n]) => n > 1).map(([name]) => name);
  const emptyWarehouses = physical.filter((w) => w.totalItems === 0);

  function choose(id: number) {
    setSelected(id);
    try { localStorage.setItem(KEY, String(id)); } catch { /* ignore */ }
  }
  const whName = (id: number) => warehouses.find((w) => w.id === id)?.name ?? `#${id}`;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const actionCards = [
    { key: 'critical', tone: 'red', value: critical.length, label: t('whHub.cards.critical'), onClick: () => { setStockTab('critical'); scrollTo('wh-stock'); }, loading: stockLoading },
    { key: 'low', tone: 'orange', value: low.length, label: t('whHub.cards.low'), onClick: () => { setStockTab('low'); scrollTo('wh-stock'); }, loading: stockLoading },
    { key: 'overdue', tone: 'red', value: overdue.length, label: t('whHub.cards.overdue'), onClick: () => scrollTo('wh-schedule'), loading: scheduleQuery.isLoading },
    { key: 'opname', tone: 'purple', value: opnameQuery.data ?? 0, label: t('whHub.cards.opname'), to: '/stock-opname', loading: opnameQuery.isLoading },
  ];

  const renderMovement = (m: Movement) => {
    const qty = m.lines.reduce((sum, l) => sum + l.qty, 0);
    const open = openPick === m.key;
    return (
      <li key={m.key} className={`wh-move-row ${m.type}`}>
        <div className="wh-move-main">
          <span className={`wh-tag ${m.type}`}>{t(`whHub.type.${m.type}`)}</span>
          <span className="wh-date">{m.type === 'overdue' ? t('whHub.lateSince', { date: fmt(m.date) }) : fmt(m.date)}</span>
          <Link className="wh-event" to={`/event-detail?id=${m.eventId}`}>{m.eventName}</Link>
          {!selected && <span className="wh-muted">{whName(m.warehouseId)}</span>}
          <span className="wh-qty-sum">{t('whHub.linesQty', { lines: m.lines.length, qty })}</span>
          <button type="button" className="btn btn-ghost" aria-expanded={open} onClick={() => setOpenPick(open ? null : m.key)}>{m.type === 'out' ? t('whHub.pickList') : t('whHub.itemList')}</button>
        </div>
        {open && (
          <div className="wh-pick">
            <table>
              <thead><tr><th>{t('whHub.col.item')}</th><th>{t('whHub.col.area')}</th><th className="num">{t('whHub.col.qty')}</th><th className="num">{m.type === 'out' ? t('whHub.col.scannedOut') : t('whHub.col.scannedIn')}</th></tr></thead>
              <tbody>{m.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.area || '—'}</td><td className="num">{l.qty}</td><td className="num">{m.type === 'out' ? l.scannedOut : l.scannedIn}/{l.qty}</td></tr>)}</tbody>
            </table>
            <div className="wh-pick-actions">
              <Link className="btn btn-primary" to={`/event-detail?id=${m.eventId}`}>{m.type === 'out' ? t('whHub.goScanOut') : t('whHub.goReturn')}</Link>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>{t('whHub.print')}</button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="wh-hub">
      <header className="wh-head">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t('whHub.title')}</h1>
          <p className="wh-sub">{t('whHub.subtitle')}</p>
        </div>
        <label className="wh-picker">
          <span>{t('whHub.activeWarehouse')}</span>
          <select id="wh-active" value={selected} onChange={(e) => choose(Number(e.target.value))}>
            <option value={0}>{t('whHub.allPhysical')}</option>
            <optgroup label={t('whHub.physical')}>{physical.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</optgroup>
            {virtual.length > 0 && <optgroup label={t('whHub.virtualGroup')}>{virtual.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</optgroup>}
          </select>
        </label>
      </header>

      <div className="wh-quick">
        <button type="button" className="btn btn-primary" onClick={() => setOpenMove({ fromId: selected || undefined })}>{t('whHub.actions.move')}</button>
        <Link className="btn btn-ghost" to="/stock-opname">{t('whHub.actions.opname')}</Link>
        <Link className="btn btn-ghost" to="/warehouse-inventory">{t('whHub.actions.receive')}</Link>
        <Link className="btn btn-ghost" to="/warehouse">{t('whHub.actions.oldMenu')}</Link>
      </div>

      {whQuery.isError ? <LoadError onRetry={() => void whQuery.refetch()} /> : (
        <div className="wh-cards">
          {actionCards.map((card) => {
            const inner = <><b>{card.loading ? '…' : card.value}</b><span>{card.label}</span></>;
            return card.to
              ? <Link key={card.key} to={card.to} className={`wh-card ${card.tone}${!card.loading && card.value === 0 ? ' zero' : ''}`}>{inner}</Link>
              : <button key={card.key} type="button" className={`wh-card ${card.tone}${!card.loading && card.value === 0 ? ' zero' : ''}`} onClick={card.onClick}>{inner}</button>;
          })}
        </div>
      )}

      <div className="wh-grid">
        <Section id="wh-schedule" title={t('whHub.scheduleTitle')} sub={t('whHub.scheduleSub')}>
          <div className="wh-range ck-segment" role="group">
            {([2, 14] as const).map((r) => <button key={r} type="button" className={range === r ? 'active' : ''} aria-pressed={range === r} onClick={() => setRange(r)}>{r === 2 ? t('whHub.todayTomorrow') : t('whHub.next14')}</button>)}
          </div>
          {scheduleQuery.isError ? <LoadError onRetry={() => void scheduleQuery.refetch()} /> : scheduleQuery.isLoading ? <p className="wh-muted">{t('whHub.loadingSchedule')}</p> : (
            <>
              {overdue.length > 0 && <ul className="wh-moves">{overdue.map(renderMovement)}</ul>}
              {upcoming.length > 0 ? <ul className="wh-moves">{upcoming.map(renderMovement)}</ul> : <p className="wh-empty">{range === 2 ? t('whHub.nothingSoon') : t('whHub.nothing14')}</p>}
            </>
          )}
        </Section>

        <Section id="wh-stock" title={t('whHub.stockTitle')} sub={selected ? whName(selected) : t('whHub.allPhysical')}>
          <div className="ck-segment" role="group">
            <button type="button" className={stockTab === 'critical' ? 'active' : ''} aria-pressed={stockTab === 'critical'} onClick={() => setStockTab('critical')}>{t('whHub.cards.critical')} <span className="ck-seg-count">{critical.length}</span></button>
            <button type="button" className={stockTab === 'low' ? 'active' : ''} aria-pressed={stockTab === 'low'} onClick={() => setStockTab('low')}>{t('whHub.cards.low')} <span className="ck-seg-count">{low.length}</span></button>
          </div>
          {stockError ? <LoadError onRetry={() => stockQueries.forEach((q) => void q.refetch())} /> : stockLoading ? <p className="wh-muted">{t('wording.loading')}</p> : (
            (stockTab === 'critical' ? critical : low).length === 0 ? <p className="wh-empty">{stockTab === 'critical' ? t('whHub.noCritical') : t('whHub.noLow')}</p> : (
              <ul className="wh-stock-list">
                {(stockTab === 'critical' ? critical : low).slice(0, 40).map((r) => (
                  <li key={`${r.warehouse.id}-${r.bgId}`}>
                    <div className="wh-stock-main">
                      <span className="wh-stock-name">{r.name}</span>
                      {!selected && <span className="wh-muted">{r.warehouse.name}</span>}
                      <span className={`wh-level ${r.level}`}>{r.level === 'critical' ? t('whHub.empty') : t('whHub.stockOfMin', { stock: r.stock, min: r.min })}</span>
                      <button type="button" className="btn btn-ghost" aria-expanded={openOther === r.bgId} onClick={() => setOpenOther(openOther === r.bgId ? null : r.bgId)}>{t('whHub.findElsewhere')}</button>
                      <Link className="btn btn-ghost" to={`/inventory-detail?id=${r.barangId}`}>{t('whHub.openItem')}</Link>
                    </div>
                    {openOther === r.bgId && <OtherWarehouses row={r} warehouseId={r.warehouse.id} onMove={(p) => setOpenMove(p)} />}
                  </li>
                ))}
              </ul>
            )
          )}
        </Section>
      </div>

      <Section title={t('whHub.warehousesTitle')} sub={t('whHub.warehousesSub')}>
        {whQuery.isLoading ? <p className="wh-muted">{t('wording.loading')}</p> : (
          <div className="wh-wh-grid">
            {[...physical, ...virtual].map((w) => (
              <article key={w.id} className={`wh-wh${w.id === selected ? ' active' : ''}${w.virtual ? ' virtual' : ''}`}>
                <div className="wh-wh-top"><b>{w.name}</b>{w.virtual && <span className="wh-badge">{t('whHub.virtual')}</span>}</div>
                <span className="wh-muted">{[w.location, w.pic && `PIC ${w.pic}`].filter(Boolean).join(' · ') || '—'}</span>
                <span>{t('whHub.itemTypes', { count: w.totalItems })}</span>
                <div className="wh-wh-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => choose(w.id)} disabled={w.id === selected}>{w.id === selected ? t('whHub.selected') : t('whHub.choose')}</button>
                  <Link className="btn btn-ghost" to={`/warehouse-detail?id=${w.id}`}>{t('whHub.open')}</Link>
                  <button type="button" className="btn btn-ghost" onClick={() => setOpenMove({ fromId: w.id })}>{t('whHub.moveFrom')}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      {(dupNames.length > 0 || emptyWarehouses.length > 0 || virtual.length > 0) && (
        <Section title={t('whHub.healthTitle')} sub={t('whHub.healthSub')}>
          <ul className="wh-health">
            {dupNames.length > 0 && <li className="warn">{t('whHub.health.dup', { names: dupNames.join(', ') })}</li>}
            {emptyWarehouses.length > 0 && <li>{t('whHub.health.empty', { count: emptyWarehouses.length, names: [...new Set(emptyWarehouses.map((w) => w.name))].slice(0, 5).join(', ') })}</li>}
            {virtual.length > 0 && <li>{t('whHub.health.virtual', { names: virtual.map((w) => w.name).join(', ') })}</li>}
          </ul>
        </Section>
      )}

      {openMove && <MoveStockModal warehouses={warehouses} preset={openMove} onClose={() => setOpenMove(null)} />}
    </div>
  );
}
