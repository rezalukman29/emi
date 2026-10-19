import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadEvents, loadEventItems, loadStockTotals, mapLimited, bookingWindow } from '../lib/reportData';
import { computeClashes } from '../lib/eventClashes';
import Modal from '../components/Modal';
import { fmtNum } from '../lib/format';

export default function EventCalendarPage() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }).slice(0, 7));
  const [checkMonth, setCheckMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [shortagesOnly, setShortagesOnly] = useState(false);
  const query = useQuery(['report-events'], loadEvents);
  const [year, m] = month.split('-').map(Number);
  const days = new Date(year, m, 0).getDate();
  const offset = (new Date(year, m - 1, 1).getDay() + 6) % 7;
  const clashes = useQuery(['event-clashes', month, query.dataUpdatedAt], async () => {
    const from = `${month}-01`;
    const to = `${month}-${days}`;
    const events = (query.data || []).filter(event => {
      const { from: start, to: finish } = bookingWindow(event);
      return start && start <= to && finish >= from && event.closing_status !== 'transferred' && event.status !== 'transferred' && event.is_finished !== 1;
    });
    const bookings = (await mapLimited(events, async event => (await loadEventItems(event.id))
      .filter(item => item.barang_id > 0 && !item.ownerships?.outsource && !item.is_new_production_item && !item.is_returned && !item.is_transfer_to_other_event)
      .map(item => ({ eventId: event.id, eventName: String(event.name || event.description || event.id), itemId: item.barang_id, itemName: item.nama_barang, qty: item.qty, ...bookingWindow(event) })))).flat();
    const stocks = await loadStockTotals();
    return computeClashes(bookings, from, to).map(row => ({ ...row, stock: stocks.get(row.itemId) }));
  }, { enabled: Boolean(query.data) && month === checkMonth, staleTime: 30000 });
  const visibleClashes = (clashes.data || []).filter(row => !shortagesOnly || row.stock != null && row.demand > row.stock);
  const dayEvents = (query.data || []).filter(event => { const window = bookingWindow(event); return window.from && window.from <= selectedDay && window.to >= selectedDay; });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 9, 19 + i)).toLocaleDateString(i18n.language, { weekday: 'short', timeZone: 'UTC' }));
  return <div className="page-content"><h2>{t('october.calendar')}</h2>
    <div className="oct-toolbar"><input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} /><Link to="/event">{t('navigation.items.event', { defaultValue: 'Events' })}</Link><button className="btn btn-ghost" disabled={!query.data || clashes.isFetching} onClick={() => { if (checkMonth === month) void clashes.refetch(); else setCheckMonth(month); }}>{t('october.clashes')}</button></div>
    {query.isLoading ? <p>{t('wording.loading')}</p> : query.isError ? <p role="alert">{t('october.loadError')}</p> : <>
      <p className="ed-lock-note">{t('october.calendarNote')}</p>
      <div className="oct-calendar oct-calendar-weekdays">{weekdays.map(day => <strong key={day}>{day}</strong>)}</div>
      <div className="oct-calendar">{Array.from({ length: offset }, (_, i) => <div className="oct-calendar-empty" key={`empty-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, '0')}`;
          const events = (query.data || []).filter(event => {
            const { from: start, to: end } = bookingWindow(event);
            return start && start <= day && end >= day;
          });
          return <section key={day} className="oct-calendar-day"><button className="btn btn-ghost" aria-label={day} onClick={() => setSelectedDay(day)}>{i + 1}</button><small>{fmtNum(events.length)} {t('october.events')}</small>{events.map(event => <Link key={event.id} to={`/event-detail?id=${event.id}`}>{String(event.name || event.description || event.id)}</Link>)}</section>;
        })}
      </div>
      {checkMonth === month && <section className="card"><p className="ed-lock-note">{t('october.clashNote')}</p><label className="pp-check"><input type="checkbox" checked={shortagesOnly} onChange={e => setShortagesOnly(e.target.checked)} />{t('october.shortagesOnly')}</label><p>{t('october.clashRanges')}: {fmtNum(clashes.data?.length)} · {t('october.shortages')}: {fmtNum(clashes.data?.filter(row => row.stock != null && row.demand > row.stock).length)}</p>{clashes.isFetching ? <p>{t('wording.loading')}</p> : clashes.isError ? <p role="alert">{t('october.loadError')}</p> : visibleClashes.length ? <div className="table-wrap"><table><thead><tr><th>{t('october.item')}</th><th>{t('october.date')}</th><th>{t('october.events')}</th><th>{t('october.qty')} / {t('wording.totalStock')}</th></tr></thead><tbody>{visibleClashes.map(row => <tr key={`${row.itemId}-${row.from}-${row.events.map(e => e.id).join('-')}`}><td>{row.itemName}</td><td>{row.from} – {row.to}</td><td>{row.events.map(event => <div key={event.id}><Link to={`/event-detail?id=${event.id}`}>{event.name}</Link> · {fmtNum(event.qty)}</div>)}</td><td><span className={row.stock != null && row.demand > row.stock ? 'badge badge-red' : 'badge badge-orange'}>{fmtNum(row.demand)} / {fmtNum(row.stock)}</span></td></tr>)}</tbody></table></div> : <p>{t('october.noClashes')}</p>}</section>}
    </>}
    <Modal open={Boolean(selectedDay)} title={selectedDay} onClose={() => setSelectedDay('')}>
      {dayEvents.length ? dayEvents.map(event => <div className="card" key={event.id}><Link to={`/event-detail?id=${event.id}`}>{String(event.name || event.description || event.id)}</Link><p>{bookingWindow(event).from} – {bookingWindow(event).to}</p></div>) : <p>{t('october.notFound')}</p>}
    </Modal>
  </div>;
}
