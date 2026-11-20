import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconSearch } from '../components/icons';
import Drawer from '../components/Drawer';
import SearchableSelect from '../components/SearchableSelect';
import {
  EMPTY_CALENDAR_FILTERS,
  activeFilterCount,
  filterCalendar,
  isFiltering,
  monthEvents,
  monthItems,
  monthLocations,
  type CalendarFilters,
} from '../lib/calendarFilters';
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
  // Filters stay when the month changes, so the same view can be followed month by month.
  const [filters, setFilters] = useState<CalendarFilters>(EMPTY_CALENDAR_FILTERS);
  const [draft, setDraft] = useState<CalendarFilters>(EMPTY_CALENDAR_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const shortagesOnly = filters.clashView === 'shortages';
  const setShortagesOnly = (value: boolean) => setFilters(current => ({ ...current, clashView: value ? 'shortages' : 'all' }));
  const eventsQuery = useGetEventCalendar(month);
  const clashesQuery = useGetEventCalendarClashes(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const first = `${month}-01`;
  const today = todayJakarta();
  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${first}T00:00:00Z`));

  const serverDays = useMemo(() => eventsQuery.data?.data.days || [], [eventsQuery.data]);
  const allClashes = useMemo(() => clashesQuery.data?.data.clashes || [], [clashesQuery.data]);
  const filtering = isFiltering(filters);
  const filtered = useMemo(
    () => filterCalendar(serverDays, allClashes, filters, month),
    [serverDays, allClashes, filters, month],
  );
  // Without filters the calendar shows the server's numbers exactly as before.
  const eventsByDay = useMemo(() => filtering ? filtered.eventsByDay : new Map(
    serverDays.map(day => [calendarDate(day.date), day.events || []]),
  ), [filtering, filtered, serverDays]);
  const clashDataByDay = useMemo(() => new Map(
    (clashesQuery.data?.data.days || []).map(day => [calendarDate(day.date), day]),
  ), [clashesQuery.data]);
  const isShort = (row: typeof allClashes[number]) => row.shortage > 0;
  const shownClashes = filtered.clashes.slice()
    .sort((a, b) => Number(isShort(b)) - Number(isShort(a)) || a.item_name.localeCompare(b.item_name, locale));
  const selectedEvents = eventsByDay.get(selectedDay) || [];
  const selectedClashes = shownClashes.filter(row => calendarDate(row.from) <= selectedDay && calendarDate(row.to) >= selectedDay);
  const eventSummary = filtering ? { events_this_month: filtered.summary.events } : eventsQuery.data?.data.summary;
  const clashSummary = filtering ? {
    days_with_clashes: filtered.summary.daysWithClashes,
    items_clashing: filtered.summary.itemsClashing,
    items_short: filtered.summary.itemsShort,
  } : clashesQuery.data?.data.summary;
  const filterCount = activeFilterCount(filters);
  const eventOptions = useMemo(() => monthEvents(serverDays).map(event => ({ value: event.id, label: event.name })), [serverDays]);
  const locationOptions = useMemo(() => monthLocations(serverDays).map(location => ({ value: location, label: location })), [serverDays]);
  const itemOptions = useMemo(() => monthItems(allClashes).map(item => ({ value: item.id, label: item.name })), [allClashes]);
  const eventName = (id: number) => eventOptions.find(option => option.value === id)?.label ?? `#${id}`;
  const itemName = (id: number) => itemOptions.find(option => option.value === id)?.label ?? `#${id}`;
  const chips = [
    ...filters.locations.map(location => ({ key: `l-${location}`, label: location, remove: () => setFilters(current => ({ ...current, locations: current.locations.filter(value => value !== location) })) })),
    ...filters.eventIds.map(id => ({ key: `e-${id}`, label: eventName(id), remove: () => setFilters(current => ({ ...current, eventIds: current.eventIds.filter(value => value !== id) })) })),
    ...filters.itemIds.map(id => ({ key: `i-${id}`, label: itemName(id), remove: () => setFilters(current => ({ ...current, itemIds: current.itemIds.filter(value => value !== id) })) })),
    ...(filters.onlyWithClashes ? [{ key: 'clashing', label: t('calendarUi.filter.onlyWithClashes'), remove: () => setFilters(current => ({ ...current, onlyWithClashes: false })) }] : []),
  ];
  function openFilters() {
    setDraft({ ...filters, locations: [...filters.locations], eventIds: [...filters.eventIds], itemIds: [...filters.itemIds] });
    setFilterOpen(true);
  }
  function applyFilters() {
    setFilters(current => ({ ...draft, search: current.search, clashView: current.clashView }));
    setFilterOpen(false);
  }
  function clearFilters() {
    setFilters(current => ({ ...EMPTY_CALENDAR_FILTERS, clashView: current.clashView }));
  }

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
      </div>
    </div>
    <p className="cal-intro">{t('calendarUi.intro')} <span className="cal-chip-key shared">{t('calendarUi.clash')}</span>{t('calendarUi.introMiddle')} <span className="cal-chip-key shortage">{t('calendarUi.shortage')}</span>. {t('calendarUi.introEnd')}</p>
    <div className="cal-toolbar">
      <div className="search-wrap cal-search">
        <IconSearch />
        <input className="search-input" value={filters.search} placeholder={t('calendarUi.filter.searchPlaceholder')}
          aria-label={t('calendarUi.filter.searchPlaceholder')}
          onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} />
      </div>
      <button type="button" className={`event-list-filter${filterCount ? ' active' : ''}`} onClick={openFilters}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {t('calendarUi.filter.button')}{filterCount > 0 && <span className="event-list-filter-count">{fmtNum(filterCount)}</span>}
      </button>
      <label className="pp-check"><input type="checkbox" checked={shortagesOnly} onChange={event => setShortagesOnly(event.target.checked)} />{t('october.shortagesOnly')}</label>
    </div>
    {(chips.length > 0 || filters.search.trim()) && <div className="cal-active-filters">
      <span className="cal-muted">{t('calendarUi.filter.showing', { count: filtered.summary.events })}</span>
      {chips.map(chip => <span className="cal-filter-chip" key={chip.key}>
        {chip.label}
        <button type="button" onClick={chip.remove} aria-label={t('calendarUi.filter.remove', { label: chip.label })}><IconClose /></button>
      </span>)}
      <button type="button" className="cal-filter-clear" onClick={() => { clearFilters(); setFilters(current => ({ ...current, search: '' })); }}>{t('calendarUi.filter.clearAll')}</button>
    </div>}
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
            const localCounts = filtering && cell.inMonth ? filtered.clashCountByDay.get(cell.iso) : undefined;
            const shortCount = filtering ? localCounts?.short || 0 : dayClashData?.item_short_count || 0;
            const clashCount = filtering ? localCounts?.clash || 0 : dayClashData?.item_clash_count || 0;
            const dayClashCount = shortagesOnly ? shortCount : clashCount;
            const hasShortage = Boolean(shortCount);
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

    <Drawer
      open={filterOpen}
      title={t('calendarUi.filter.title')}
      subtitle={t('calendarUi.filter.subtitle')}
      onClose={() => setFilterOpen(false)}
      footer={<>
        <button type="button" className="btn-cancel-modal" onClick={() => setDraft(current => ({ ...EMPTY_CALENDAR_FILTERS, search: current.search, clashView: current.clashView }))}>{t('calendarUi.filter.reset')}</button>
        <button type="button" className="btn-save-modal" onClick={applyFilters}><IconCheck /> {t('calendarUi.filter.apply')}</button>
      </>}
    >
      <div className="form-group">
        <label>{t('calendarUi.filter.location')}</label>
        <SearchableSelect multiple value={draft.locations}
          onChange={values => setDraft(current => ({ ...current, locations: values.map(String) }))}
          options={locationOptions} placeholder={t('calendarUi.filter.allLocations')} searchPlaceholder={t('calendarUi.filter.searchLocation')} />
      </div>
      <div className="form-group">
        <label>{t('calendarUi.filter.events')}</label>
        <SearchableSelect multiple value={draft.eventIds}
          onChange={values => setDraft(current => ({ ...current, eventIds: values.map(Number) }))}
          options={eventOptions} placeholder={t('calendarUi.filter.allEvents')} searchPlaceholder={t('calendarUi.filter.searchEvent')} />
      </div>
      <div className="form-group">
        <label>{t('calendarUi.filter.items')}</label>
        <SearchableSelect multiple value={draft.itemIds}
          onChange={values => setDraft(current => ({ ...current, itemIds: values.map(Number) }))}
          options={itemOptions} placeholder={t('calendarUi.filter.allItems')} searchPlaceholder={t('calendarUi.filter.searchItem')} />
        <p className="cal-muted cal-filter-hint">{t('calendarUi.filter.itemsHint')}</p>
      </div>
      <label className="pp-check">
        <input type="checkbox" checked={draft.onlyWithClashes} onChange={event => setDraft(current => ({ ...current, onlyWithClashes: event.target.checked }))} />
        {t('calendarUi.filter.onlyWithClashes')}
      </label>
      <p className="cal-muted cal-filter-hint">{t('calendarUi.filter.monthScope', { month: monthLabel })}</p>
    </Drawer>
  </div>;
}
