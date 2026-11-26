import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import ax from '../service/axios';
import { EMPTY_FINANCE, fetchAutoCosts, invoiceState, paidOf, rupiah, summarize, totalOf, useFinance } from '../lib/financeStore';
import { isTenantAdminUser } from '../lib/tenantUser';
import '../finance.css';

// "Keuangan" (owner 2026-11-26) — PREVIEW overview of every project: contract, cost, margin, receivables.

type Filter = 'all' | 'receivable' | 'overdue' | 'nocontract';
const STATUSES = ['upcoming', 'on-going', 'ready-to-close', 'checking-inventory', 'returned-completed', 'transferred'];

async function fetchEvents() {
  const lists = await Promise.all(STATUSES.map((status) => ax.get('/v2/event-filter', { params: { page: 1, limit: 100, status } }).then((r) => (r.data?.data?.data ?? []) as Array<Record<string, any>>).catch(() => [])));
  const map = new Map<number, { id: number; name: string; start: string; status: string }>();
  lists.forEach((rows, i) => rows.forEach((r) => { if (!map.has(Number(r.id))) map.set(Number(r.id), { id: Number(r.id), name: String(r.name || `#${r.id}`), start: String(r.event_start ?? '').slice(0, 10), status: STATUSES[i] }); }));
  return [...map.values()].sort((a, b) => b.start.localeCompare(a.start));
}

export default function FinancePage() {
  const { t, i18n } = useTranslation();
  const store = useFinance();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const events = useQuery(['financeEvents'], fetchEvents, { staleTime: 60_000 });
  const auto = useQuery(['financeAutoCosts'], fetchAutoCosts, { staleTime: 60_000 });
  const today = new Date().toISOString().slice(0, 10);
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  const fmt = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  const rows = useMemo(() => (events.data ?? []).map((ev) => {
    const f = store.events[ev.id] ?? EMPTY_FINANCE;
    return { ev, f, sum: summarize(f, auto.data?.[ev.id], today) };
  }), [events.data, store.events, auto.data, today]);

  const totals = rows.reduce((acc, r) => ({ dueSoon: acc.dueSoon + r.sum.dueSoon, overdue: acc.overdue + r.sum.overdue, outstanding: acc.outstanding + r.sum.outstanding, revenue: acc.revenue + (r.f.contract ? r.sum.revenue : 0), margin: acc.margin + (r.f.contract ? r.sum.margin : 0), vendor: acc.vendor + r.sum.vendor }), { dueSoon: 0, overdue: 0, outstanding: 0, revenue: 0, margin: 0, vendor: 0 });
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!needle || r.ev.name.toLowerCase().includes(needle)) && (
    filter === 'all' ? true : filter === 'receivable' ? r.sum.outstanding > 0 : filter === 'overdue' ? r.sum.overdue > 0 : !r.f.contract));
  const counts = { all: rows.length, receivable: rows.filter((r) => r.sum.outstanding > 0).length, overdue: rows.filter((r) => r.sum.overdue > 0).length, nocontract: rows.filter((r) => !r.f.contract).length };

  if (!isTenantAdminUser()) return <div className="card fin-denied"><h1 className="page-title">{t('fin.title')}</h1><p>{t('fin.adminOnly')}</p></div>;

  return (
    <div className="fin-page">
      <header className="fin-head">
        <div><h1 className="page-title" style={{ margin: 0 }}>{t('fin.title')}</h1><p className="fin-sub">{t('fin.subtitle')}</p></div>
        <span className="ck-preview-badge" title={t('fin.previewHint')}>{t('fin.previewBadge')}</span>
      </header>

      <div className="fin-cards">
        <div className="fin-card"><span>{t('fin.kpi.dueSoon')}</span><b>{rupiah(totals.dueSoon)}</b></div>
        <div className={`fin-card${totals.overdue > 0 ? ' neg' : ''}`}><span>{t('fin.kpi.overdue')}</span><b>{rupiah(totals.overdue)}</b></div>
        <div className="fin-card"><span>{t('fin.kpi.outstanding')}</span><b>{rupiah(totals.outstanding)}</b></div>
        <div className={`fin-card ${totals.margin < 0 ? 'neg' : 'pos'}`}><span>{t('fin.kpi.margin')}</span><b>{totals.revenue ? `${Math.round((totals.margin / totals.revenue) * 100)}%` : '—'}</b><small>{totals.revenue ? rupiah(totals.margin) : t('fin.kpi.noContracts')}</small></div>
      </div>

      <div className="fin-toolbar">
        <div className="ck-segment" role="group">
          {(['all', 'receivable', 'overdue', 'nocontract'] as Filter[]).map((k) => <button key={k} type="button" className={filter === k ? 'active' : ''} aria-pressed={filter === k} onClick={() => setFilter(k)}>{t(`fin.filter.${k}`)} <span className="ck-seg-count">{counts[k]}</span></button>)}
        </div>
        <div className="search-wrap"><input className="search-input" placeholder={t('fin.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <section className="card fin-block">
        {events.isError ? <p className="fin-hint warn">{t('whHub.loadError')} <button type="button" className="btn btn-ghost" onClick={() => void events.refetch()}>{t('whHub.retry')}</button></p> : events.isLoading ? <p className="fin-hint">{t('wording.loading')}</p> : shown.length === 0 ? <p className="fin-hint">{t('fin.emptyList')}</p> : (
          <div className="fin-table"><table>
            <thead><tr><th>{t('fin.event')}</th><th>{t('fin.date')}</th><th className="num">{t('fin.contractValue')}</th><th className="num">{t('fin.cost')}</th><th className="num">{t('fin.margin')}</th><th>{t('fin.billing')}</th><th /></tr></thead>
            <tbody>{shown.map(({ ev, f, sum }) => {
              const nextDue = f.invoices.filter((i) => ['sent', 'partial', 'overdue', 'draft'].includes(invoiceState(i, today))).sort((a, b) => a.due.localeCompare(b.due))[0];
              return (
                <tr key={ev.id}>
                  <td><Link to={`/event-detail?id=${ev.id}&view=finance`}>{ev.name}</Link></td>
                  <td>{fmt(ev.start)}</td>
                  <td className="num">{f.contract ? rupiah(f.contract) : <span className="fin-muted">{t('fin.notSet')}</span>}</td>
                  <td className="num">{rupiah(sum.cost)}{sum.vendor > 0 && <small className="fin-muted"><br />{t('fin.autoShort', { amount: rupiah(sum.vendor) })}</small>}</td>
                  <td className={`num ${sum.margin < 0 ? 'neg' : ''}`}>{f.contract ? `${rupiah(sum.margin)} · ${sum.marginPct}%` : '—'}</td>
                  <td>{f.invoices.length === 0 ? <span className="fin-muted">{t('fin.noInvoices')}</span> : sum.overdue > 0 ? <span className="fin-status overdue">{t('fin.st.overdue')} · {rupiah(sum.overdue)}</span> : sum.outstanding <= 0 ? <span className="fin-status paid">{t('fin.st.paid')}</span> : nextDue ? <span className="fin-status sent">{t('fin.nextDue', { amount: rupiah(totalOf(nextDue) - paidOf(nextDue)), date: fmt(nextDue.due) })}</span> : null}</td>
                  <td><Link className="btn btn-ghost" to={`/event-detail?id=${ev.id}&view=finance`}>{t('fin.open')}</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>
      <p className="fin-hint">{t('fin.exportSoon')}</p>
    </div>
  );
}
