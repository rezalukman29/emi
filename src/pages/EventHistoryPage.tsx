import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useGetEventDetail from '../hooks/api/useGetEventDetail';
import useGetEventStatus from '../hooks/api/useGetEventStatus';
import { buildEventHistory, type HistoryEntry, type HistoryType } from '../data/eventHistoryMock';
import '../eventChecklist.css';
import '../eventHistory.css';

// Event History (owner 2026-11-23): what happened on one event, newest first.
// PREVIEW: the entries are dummy data generated from the real event (see eventHistoryMock.ts);
// the endpoint it needs is described in src/hooks/api/eventHistoryContract.ts.

const TYPES: Array<'all' | HistoryType> = ['all', 'event', 'stage', 'item', 'scan', 'file', 'checklist'];

const ICONS: Record<HistoryType, ReactNode> = {
  event: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
  stage: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>,
  item: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  scan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  file: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  checklist: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
};

export default function EventHistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const eventId = Number(params.get('id')) || 0;
  const [type, setType] = useState<'all' | HistoryType>('all');
  const [query, setQuery] = useState('');

  const { data: detailResponse, isLoading, isError } = useGetEventDetail({ id: eventId, options: { enabled: eventId > 0 } });
  const { data: statusResponse } = useGetEventStatus({ params: { page: 1, limit: 999, sort: 'ASC', sortBy: 'order_data' } });
  const event = detailResponse?.data;

  const entries = useMemo<HistoryEntry[]>(() => {
    if (!event) return [];
    const stages = [...(statusResponse?.data?.data ?? [])].sort((a, b) => a.order_data - b.order_data);
    return buildEventHistory({
      id: event.id,
      name: event.name,
      createdAt: event.created_at,
      eventStart: event.event_start,
      address: event.address,
      pic: event.PIC,
      stages: stages.map((stage) => stage.name),
      currentStageIndex: stages.findIndex((stage) => Number(stage.id) === Number(event.status)),
      checking: event.is_complete === 1,
    });
  }, [event, statusResponse?.data?.data]);

  const locale = i18n.language?.startsWith('id') ? 'id-ID' : 'en-GB';
  const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const describe = (entry: HistoryEntry) => t(`eventHistory.actions.${entry.action}`, entry.values);
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: entries.length };
    entries.forEach((entry) => { result[entry.type] = (result[entry.type] ?? 0) + 1; });
    return result;
  }, [entries]);
  const needle = query.trim().toLowerCase();
  const visible = entries.filter((entry) => (type === 'all' || entry.type === type)
    && (!needle || [describe(entry), entry.by, entry.change?.from, entry.change?.to].join(' ').toLowerCase().includes(needle)));
  const groups = visible.reduce<Array<{ day: string; items: HistoryEntry[] }>>((list, entry) => {
    const day = entry.at.slice(0, 10);
    const last = list[list.length - 1];
    if (last && last.day === day) last.items.push(entry); else list.push({ day, items: [entry] });
    return list;
  }, []);

  return (
    <>
      <h1 className="page-title">{t('eventHistory.title')}</h1>
      <div className="card eh-card">
        <div className="eh-top">
          <button type="button" className="eh-back" onClick={() => navigate('/event')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            {t('wording.backToEvents')}
          </button>
          {eventId > 0 && <Link className="btn btn-ghost" to={`/event-detail?id=${eventId}`}>{t('eventHistory.openEvent')}</Link>}
        </div>
        <div className="eh-head">
          <div>
            <div className="eh-title">{event?.name || (isLoading ? t('wording.loading') : `#${eventId}`)}</div>
            <div className="eh-sub">{t('eventHistory.subtitle')}</div>
          </div>
          <span className="ck-preview-badge eh-preview" title={t('eventHistory.previewHint')}>{t('eventHistory.preview')}</span>
        </div>

        {!eventId ? <p className="no-data">{t('eventHistory.noEvent')}</p>
          : isError ? <p className="no-data">{t('wording.failedToLoadData')}</p>
          : isLoading ? <p className="no-data">{t('wording.loading')}</p>
          : <>
            <div className="eh-toolbar">
              <div className="search-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input className="search-input" placeholder={t('eventHistory.search')} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            </div>
            <div className="eh-chips" role="tablist">
              {TYPES.filter((key) => key === 'all' || counts[key]).map((key) => (
                <button key={key} type="button" role="tab" aria-selected={type === key} className={`stage-tab${type === key ? ' active' : ''}`} onClick={() => setType(key)}>
                  {t(`eventHistory.types.${key}`)} <span className="stage-tab-count">{counts[key] ?? 0}</span>
                </button>
              ))}
            </div>

            {groups.length === 0 ? <p className="no-data">{t('eventHistory.empty')}</p> : groups.map((group) => (
              <section key={group.day} className="eh-day">
                <h3 className="eh-day-title">{dayLabel(group.items[0].at)}</h3>
                <ol className="eh-list">
                  {group.items.map((entry) => (
                    <li key={entry.id} className={`eh-row eh-${entry.type}`}>
                      <span className="eh-icon" aria-hidden="true">{ICONS[entry.type]}</span>
                      <div className="eh-body">
                        <div className="eh-text">{describe(entry)}</div>
                        {entry.change && <div className="eh-change">
                          <span className="eh-field">{t(`eventHistory.fields.${entry.change.field}`)}</span>
                          <span className="eh-from">{entry.change.from}</span>
                          <span className="eh-arrow">→</span>
                          <span className="eh-to">{entry.change.to}</span>
                        </div>}
                        <div className="eh-meta">{entry.by} · {timeLabel(entry.at)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </>}
      </div>
    </>
  );
}
