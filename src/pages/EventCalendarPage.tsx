import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from '../components/icons';
import {
  useGetEventCalendar,
  useGetEventCalendarClashes,
} from '../hooks/api/useGetEventCalendar';
import { fmtNum } from '../lib/format';

const COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#dc2626'];
const todayJakarta = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
function colorFor(id: number) { return COLORS[Math.abs(id) % COLORS.length]; }
function moveMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
}
function dateLabel(iso: string, locale: string, year = false) {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) }).format(new Date(`${iso}T00:00:00Z`));
}
function rangeLabel(from: string, to: string, locale: string) {
  return from === to ? dateLabel(from, locale) : `${dateLabel(from, locale)} – ${dateLabel(to, locale)}`;
}
function calendarDate(value: string) {
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || value;
}

export default function EventCalendarPage() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => todayJakarta().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState('');
  const [shortagesOnly, setShortagesOnly] = useState(false);
  const eventsQuery = useGetEventCalendar(month);
  const clashesQuery = useGetEventCalendarClashes(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const first = `${month}-01`;
  const today = todayJakarta();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${first}T00:00:00Z`));

  const eventsByDay = useMemo(() => new Map(
    (eventsQuery.data?.data.days || []).map(day => [calendarDate(day.date), day.events || []]),
  ), [eventsQuery.data]);
  const clashDataByDay = useMemo(() => new Map(
    (clashesQuery.data?.data.days || []).map(day => [calendarDate(day.date), day]),
  ), [clashesQuery.data]);
  const allClashes = clashesQuery.data?.data.clashes || [];
  const isShort = (row: typeof allClashes[number]) => row.shortage > 0;
  const shownClashes = allClashes.filter(row => !shortagesOnly || isShort(row))
    .sort((a, b) => Number(isShort(b)) - Number(isShort(a)) || a.item_name.localeCompare(b.item_name, locale));
  const selectedEvents = eventsByDay.get(selectedDay) || [];
  const selectedClashes = shownClashes.filter(row => calendarDate(row.from) <= selectedDay && calendarDate(row.to) >= selectedDay);
  const eventSummary = eventsQuery.data?.data.summary;
  const clashSummary = clashesQuery.data?.data.summary;

  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const cellCount = Math.ceil((offset + lastDay) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index - offset + 1));
    const iso = date.toISOString().slice(0, 10);
    return { iso, day: date.getUTCDate(), inMonth: iso.startsWith(month) };
  });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2026, 9, 19 + index))));

  function changeMonth(delta: number) {
    setMonth(current => moveMonth(current, delta));
    setSelectedDay('');
  }

  return <div className="page-content event-calendar-page">
    <div className="cal-head">
      <h1 className="page-title">{t('october.calendar')}</h1>
      <div className="cal-nav">
        <button type="button" className="cal-nav-btn" onClick={() => changeMonth(-1)} aria-label={t('calendarUi.previousMonth')}><IconChevronLeft /></button>
        <span className="cal-month">{monthLabel}</span>
        <button type="button" className="cal-nav-btn" onClick={() => changeMonth(1)} aria-label={t('calendarUi.nextMonth')}><IconChevronRight /></button>
        <button type="button" className="btn btn-ghost" onClick={() => { const current = todayJakarta(); setMonth(current.slice(0, 7)); setSelectedDay(current); }}>{t('calendarUi.today')}</button>
        <label className="pp-check"><input type="checkbox" checked={shortagesOnly} onChange={event => setShortagesOnly(event.target.checked)} />{t('october.shortagesOnly')}</label>
      </div>
    </div>
    <p className="cal-intro">{t('calendarUi.intro')} <span className="cal-chip-key shared">{t('calendarUi.clash')}</span>{t('calendarUi.introMiddle')} <span className="cal-chip-key shortage">{t('calendarUi.shortage')}</span>. {t('calendarUi.introEnd')}</p>
    {eventsQuery.isError && <p role="alert">{t('october.loadError')}</p>}
    {clashesQuery.isError && <p role="alert">{t('calendarUi.clashLoadError')}</p>}

    <div className="stats-bar cal-stats">
      {[
        { label: t('calendarUi.eventsThisMonth'), value: eventsQuery.isLoading || eventsQuery.isError ? null : eventSummary?.events_this_month, color: 'var(--brand)', bg: 'var(--brand-bg)' },
        { label: t('calendarUi.daysWithClashes'), value: clashesQuery.isLoading || clashesQuery.isError ? null : clashSummary?.days_with_clashes, color: 'var(--orange)', bg: 'var(--orange-bg)' },
        { label: t('calendarUi.itemsClashing'), value: clashesQuery.isLoading || clashesQuery.isError ? null : clashSummary?.items_clashing, color: 'var(--purple)', bg: 'var(--purple-bg)' },
        { label: t('calendarUi.itemsShort'), value: clashesQuery.isLoading || clashesQuery.isError ? null : clashSummary?.items_short, color: 'var(--red)', bg: 'var(--red-bg)' },
      ].map(card => <div className="stat-card" key={card.label}>
        <div className="stat-icon" style={{ background: card.bg }}><span className="stat-value" style={{ color: card.color }}>{fmtNum(card.value)}</span></div>
        <span className="stat-label">{card.label}</span>
      </div>)}
    </div>

    <div className="cal-layout">
      <div className="card cal-card">
        <div className="cal-grid">
          {weekdays.map((day, index) => <div className="cal-weekday" key={index}>{day}</div>)}
          {cells.map(cell => {
            const dayEvents = cell.inMonth ? eventsByDay.get(cell.iso) || [] : [];
            const dayClashData = cell.inMonth ? clashDataByDay.get(cell.iso) : undefined;
            const dayClashCount = shortagesOnly ? dayClashData?.item_short_count || 0 : dayClashData?.item_clash_count || 0;
            const hasShortage = Boolean(dayClashData?.item_short_count);
            return <button type="button" key={cell.iso}
              className={`cal-cell${cell.inMonth ? '' : ' out'}${cell.iso === today ? ' today' : ''}${cell.iso === selectedDay ? ' selected' : ''}${dayClashCount ? hasShortage ? ' has-shortage' : ' has-clash' : ''}`}
              onClick={() => setSelectedDay(cell.iso)} disabled={!cell.inMonth}
              aria-label={`${dateLabel(cell.iso, locale, true)}, ${dayEvents.length} ${t('october.events')}`}>
              <span className="cal-day">{cell.day}</span>
              {dayEvents.slice(0, 3).map(event => {
                const color = colorFor(event.id);
                return <span key={event.id} className="cal-event" style={{ borderLeftColor: color, background: `${color}14` }} title={event.name}>
                  {event.name}
                </span>;
              })}
              {dayEvents.length > 3 && <span className="cal-more">+{fmtNum(dayEvents.length - 3)} {t('calendarUi.more')}</span>}
              {dayClashCount > 0 && <span className={`cal-clash ${hasShortage ? 'shortage' : 'shared'}`}>⚠ {fmtNum(dayClashCount)} {t('october.items')}</span>}
            </button>;
          })}
        </div>
      </div>

      <aside className="card cal-side">
        {!selectedDay ? <div className="cal-side-empty">{t('calendarUi.selectDay')}</div> : <>
          <div className="cal-side-title">{dateLabel(selectedDay, locale, true)} <span>{fmtNum(selectedEvents.length)} {t('october.events')}</span></div>
          {selectedEvents.length === 0 && <p className="cal-muted">{t('calendarUi.noEvents')}</p>}
          <ul className="cal-side-events">{selectedEvents.map(event => {
            return <li key={event.id}>
              <span className="cal-dot" style={{ background: colorFor(event.id) }} />
              <div><Link to={`/event-detail?id=${event.id}`}>{event.name}</Link>
                <div className="cal-muted">{rangeLabel(calendarDate(event.booking_from), calendarDate(event.booking_to), locale)}{event.location ? ` · ${event.location}` : ''}</div>
              </div>
            </li>;
          })}</ul>
          <div className="cal-side-title">{t('calendarUi.itemClashes')} <span>{clashesQuery.isLoading || clashesQuery.isError ? '—' : fmtNum(selectedClashes.length)}</span></div>
          {clashesQuery.isError ? <p className="cal-muted">{t('calendarUi.clashLoadError')}</p> : clashesQuery.isLoading ? <p className="cal-muted">{t('wording.loading')}</p> : selectedClashes.length === 0 ? <p className="cal-muted">{t('calendarUi.noDayClashes')}</p> : <div className="cal-clash-list">
            {selectedClashes.map(row => <div className={`cal-clash-row ${isShort(row) ? 'shortage' : 'shared'}`} key={`${row.item_id}-${row.from}`}>
              <div className="cal-clash-item"><strong>{row.item_name}</strong><span className={`badge ${isShort(row) ? 'badge-red' : 'badge-orange'}`}>{isShort(row) ? `${t('calendarUi.short')} ${fmtNum(row.shortage)}` : t('calendarUi.shared')}</span></div>
              <div className="cal-muted">{row.events.map(event => `${event.name}: ${fmtNum(event.qty)}`).join(' · ')}</div>
              <div className="cal-clash-bar"><div style={{ width: `${Math.min(100, row.stock ? row.demand / row.stock * 100 : 100)}%` }} /></div>
              <div className="cal-muted">{t('calendarUi.needed')} {fmtNum(row.demand)} · {t('calendarUi.inStock')} {fmtNum(row.stock)}</div>
            </div>)}
          </div>}
        </>}
      </aside>
    </div>

    <section className="card cal-table-card">
      <div className="cal-side-title">{t('calendarUi.clashesIn', { month: monthLabel })}<span>{clashesQuery.isLoading || clashesQuery.isError ? '—' : fmtNum(shownClashes.length)} {t('calendarUi.shortagesFirst')}</span></div>
      <div className="table-wrap"><table><thead><tr>
        <th>{t('october.item')}</th><th>{t('october.date')}</th><th>{t('calendarUi.bookedBy')}</th>
        <th className="cal-number">{t('calendarUi.needed')}</th><th className="cal-number">{t('calendarUi.inStock')}</th><th>{t('october.status')}</th>
      </tr></thead><tbody>
        {clashesQuery.isError ? <tr><td colSpan={6}>{t('calendarUi.clashLoadError')}</td></tr> : clashesQuery.isLoading ? <tr><td colSpan={6}>{t('wording.loading')}</td></tr> : shownClashes.length === 0 ? <tr><td colSpan={6} className="cal-table-empty">{t('october.noClashes')}</td></tr> :
          shownClashes.map(row => <tr key={`${row.item_id}-${row.from}-${row.events.map(event => event.id).join('-')}`}>
            <td className="name-cell">{row.item_name}</td><td>{rangeLabel(calendarDate(row.from), calendarDate(row.to), locale)}</td>
            <td>{row.events.map((event, index) => <span key={event.id}>{index > 0 && ' · '}<Link to={`/event-detail?id=${event.id}`}>{event.name}</Link> ({fmtNum(event.qty)})</span>)}</td>
            <td className="cal-number"><strong>{fmtNum(row.demand)}</strong></td><td className="cal-number">{fmtNum(row.stock)}</td>
            <td><span className={`badge ${isShort(row) ? 'badge-red' : 'badge-orange'}`}>{isShort(row) ? `${t('calendarUi.short')} ${fmtNum(row.shortage)}` : t('calendarUi.sharedEnough')}</span></td>
          </tr>)
        }
      </tbody></table></div>
    </section>
  </div>;
}
