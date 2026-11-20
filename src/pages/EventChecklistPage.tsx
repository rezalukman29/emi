import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconArrowLeft, IconDelete, IconPlus, IconSearch } from '../components/icons';
import EventChecklistPanel, { ChecklistProgressBar, useChecklistFormatters } from '../components/checklist/EventChecklistPanel';
import {
  type ChecklistStage,
  type ChecklistTemplateItem,
} from '../data/eventChecklistMock';
import useGetEvents from '../hooks/api/useGetEvents';
import useGetEventStatus from '../hooks/api/useGetEventStatus';
import { useChecklistSettings, type ChecklistSettings } from '../lib/checklistSettings';
import {
  ensureEventChecklist,
  seedTemplates,
  summarizeEvent,
  takeIds,
  toChecklistStages,
  updateChecklist,
  useChecklistStore,
  type ChecklistEventRef,
} from '../lib/checklistStore';
import { isTenantAdminUser } from '../lib/tenantUser';
import '../eventChecklist.css';

// Event Checklist — overview of every active event's checklist (preview on mock data).
// Events and stages are real (API); the checklist lives in this browser (src/lib/checklistStore.ts).
// The same checklist opens inside Event Detail (Checklist view). Backend contract:
// src/hooks/api/eventChecklistContract.ts.

type Tab = 'checklists' | 'templates';

/** Lifecycles that still have work on their checklist. */
const ACTIVE_LIFECYCLES = ['on-going', 'upcoming', 'ready-to-close', 'checking-inventory'] as const;
const EVENT_LIMIT = 100;

function toEventRef(record: Record<string, any> & { id: number }): ChecklistEventRef {
  const date = String(record.event_start || record.date_event || '').slice(0, 10);
  const stage = Number(record.status);
  return {
    id: record.id,
    name: String(record.name || `#${record.id}`),
    venue: String(record.address || ''),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    currentStageId: Number.isFinite(stage) && stage > 0 ? stage : null,
  };
}

/** Real Event Status list as checklist stages. */
export function useChecklistStages() {
  const query = useGetEventStatus({ params: { page: 1, limit: 999, sort: 'ASC', sortBy: 'order_data' } });
  const stages = useMemo<ChecklistStage[]>(() => toChecklistStages(query.data?.data?.data ?? []), [query.data]);
  useEffect(() => { seedTemplates(stages); }, [stages]);
  return { stages, isLoading: query.isLoading, isError: query.isError };
}

export default function EventChecklistPage() {
  const { t } = useTranslation();
  const settings = useChecklistSettings();
  const store = useChecklistStore();
  const isAdmin = isTenantAdminUser();
  const { today, formatDate, relativeLabel } = useChecklistFormatters();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stages, isLoading: stagesLoading } = useChecklistStages();

  const onGoing = useGetEvents({ status: 'on-going', limit: EVENT_LIMIT, sort_by: 'date_event', sort: 'ASC' });
  const upcoming = useGetEvents({ status: 'upcoming', limit: EVENT_LIMIT, sort_by: 'date_event', sort: 'ASC' });
  const readyToClose = useGetEvents({ status: 'ready-to-close', limit: EVENT_LIMIT, sort_by: 'date_event', sort: 'ASC' });
  const checking = useGetEvents({ status: 'checking-inventory', limit: EVENT_LIMIT, sort_by: 'date_event', sort: 'ASC' });
  const queries = [onGoing, upcoming, readyToClose, checking];
  const eventsLoading = queries.some((query) => query.isLoading);
  const eventsError = queries.every((query) => query.isError);
  const events = useMemo(() => {
    const byId = new Map<number, ChecklistEventRef>();
    for (const query of [onGoing, upcoming, readyToClose, checking]) {
      for (const record of query.data?.data?.data ?? []) if (!byId.has(record.id)) byId.set(record.id, toEventRef(record));
    }
    return [...byId.values()].sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'));
  }, [onGoing.data, upcoming.data, readyToClose.data, checking.data]);

  // Every listed event gets its checklist (copied from the templates) the first time it is seen.
  useEffect(() => {
    if (!store.templatesSeeded || !stages.length) return;
    for (const event of events) ensureEventChecklist(event, stages);
  }, [events, stages, store.templatesSeeded]);

  const [tab, setTab] = useState<Tab>('checklists');
  const [mobileDetail, setMobileDetail] = useState(Boolean(searchParams.get('event')));
  const [query, setQuery] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);

  const offsetLabel = (offset: number | null) => {
    if (offset === null) return t('eventChecklist.offset.none');
    if (offset === 0) return t('eventChecklist.offset.eventDay');
    return offset < 0 ? t('eventChecklist.offset.before', { count: -offset }) : t('eventChecklist.offset.after', { count: offset });
  };

  const summaries = useMemo(
    () => new Map(events.map((event) => [event.id, summarizeEvent(event.id, event.currentStageId, store.items, today)])),
    [events, store.items, today],
  );

  const visibleEvents = events.filter((event) => {
    const summary = summaries.get(event.id)!;
    const q = query.trim().toLowerCase();
    const matches = !q || `${event.name} ${event.venue}`.toLowerCase().includes(q);
    return matches && (!attentionOnly || summary.overdue > 0 || summary.blocking > 0 || summary.issues > 0);
  });

  const requestedId = Number(searchParams.get('event'));
  const selectedEvent = events.find((event) => event.id === requestedId) ?? visibleEvents[0] ?? events[0];
  const stageName = (id: number | null) => stages.find((stage) => stage.id === id);

  function selectEvent(id: number) {
    setSearchParams((params) => { params.set('event', String(id)); return params; }, { replace: true });
    setMobileDetail(true);
  }

  return (
    <>
      <div className="ck-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t('navigation.items.eventChecklist')}</h1>
          <p className="ck-intro">{t('eventChecklist.intro')}</p>
        </div>
        <div className="ck-header-actions">
          <span className="ck-preview-badge" title={t('eventChecklist.previewHint')}>{t('eventChecklist.preview')}</span>
          {isAdmin && (
            <Link to="/event-checklist-settings" className="btn btn-ghost ck-settings-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
              {t('navigation.items.checklistSettings')}
            </Link>
          )}
        </div>
      </div>

      <div className="wi-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'checklists'} className={`wi-tab-btn${tab === 'checklists' ? ' active' : ''}`} onClick={() => setTab('checklists')}>
          {t('eventChecklist.tabs.checklists')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'templates'} className={`wi-tab-btn${tab === 'templates' ? ' active' : ''}`} onClick={() => setTab('templates')}>
          {t('eventChecklist.tabs.templates')}
        </button>
      </div>

      {tab === 'checklists' ? (
        <div className={`ck-layout${mobileDetail && selectedEvent ? ' show-detail' : ''}`}>
          <aside className="card ck-events" aria-label={t('eventChecklist.eventsLabel')}>
            <div className="search-wrap ck-search">
              <IconSearch />
              <input className="search-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('eventChecklist.searchEvents')} />
            </div>
            <label className="ck-check-inline">
              <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} />
              {t('eventChecklist.attentionOnly')}
            </label>
            <ul className="ck-event-list">
              {(eventsLoading || stagesLoading) && events.length === 0 && <li className="ck-empty-small">{t('wording.loading')}</li>}
              {eventsError && <li className="ck-empty-small" role="alert">{t('eventChecklist.eventsLoadError')}</li>}
              {visibleEvents.map((event) => {
                const summary = summaries.get(event.id)!;
                const stage = stageName(event.currentStageId);
                return (
                  <li key={event.id}>
                    <button type="button" className={`ck-event${event.id === selectedEvent?.id ? ' active' : ''}`} onClick={() => selectEvent(event.id)} aria-current={event.id === selectedEvent?.id}>
                      <span className="ck-event-top">
                        <strong>{event.name}</strong>
                        <span className="ck-event-pct">{summary.percent}%</span>
                      </span>
                      {event.startDate && <span className="ck-event-meta">{formatDate(event.startDate)} · {relativeLabel(event.startDate)}</span>}
                      <ChecklistProgressBar percent={summary.percent} />
                      <span className="ck-event-tags">
                        {stage && <span className="ck-stage-pill">{stage.order}. {stage.name}</span>}
                        {settings.issues && summary.issues > 0 && <span className="badge badge-red">{t('eventChecklist.issueCount', { count: summary.issues })}</span>}
                        {settings.dueDates && summary.overdue > 0 && <span className="badge badge-red">{t('eventChecklist.overdueCount', { count: summary.overdue })}</span>}
                        {summary.blocking > 0 && <span className="badge badge-orange">{t('eventChecklist.blockingCount', { count: summary.blocking })}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!eventsLoading && !eventsError && visibleEvents.length === 0 && <li className="ck-empty-small">{t('eventChecklist.noEvents')}</li>}
            </ul>
          </aside>

          <section className="ck-detail" aria-label={selectedEvent?.name}>
            <button type="button" className="btn btn-ghost ck-back" onClick={() => setMobileDetail(false)}>
              <IconArrowLeft /> {t('eventChecklist.backToEvents')}
            </button>
            {selectedEvent ? (
              <EventChecklistPanel
                key={selectedEvent.id}
                event={selectedEvent}
                stages={stages}
                headerActions={<Link className="btn btn-ghost" to={`/event-detail?id=${selectedEvent.id}&view=checklist`}>{t('eventChecklist.openInEvent')}</Link>}
              />
            ) : !eventsLoading && <div className="card ck-empty-state">{t('eventChecklist.noActiveEvents')}</div>}
          </section>
        </div>
      ) : (
        <TemplatesTab stages={stages} templates={store.templates} offsetLabel={offsetLabel} settings={settings} />
      )}
    </>
  );
}

type TemplateUpdate = (change: (list: ChecklistTemplateItem[]) => ChecklistTemplateItem[]) => void;
const setTemplates: TemplateUpdate = (change) => updateChecklist((current) => ({ ...current, templates: change(current.templates) }));

function TemplatesTab({ stages, templates, offsetLabel, settings }: {
  stages: ChecklistStage[];
  templates: ChecklistTemplateItem[];
  offsetLabel: (offset: number | null) => string;
  settings: ChecklistSettings;
}) {
  const { t } = useTranslation();
  const [openForm, setOpenForm] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: '', required: false, requiresPhoto: false, offset: '' });

  function startAdd(stageId: number) {
    setOpenForm(stageId);
    setDraft({ title: '', required: false, requiresPhoto: false, offset: '' });
  }

  function save(event: FormEvent, stageId: number) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const offset = draft.offset.trim() === '' ? null : Number(draft.offset);
    const id = takeIds();
    setTemplates((list) => [...list, { id, stageId, title, required: draft.required, requiresPhoto: draft.requiresPhoto, dueOffsetDays: Number.isFinite(offset) ? offset : null }]);
    setOpenForm(null);
  }

  function toggle(id: number, key: 'required' | 'requiresPhoto') {
    setTemplates((list) => list.map((entry) => (entry.id === id ? { ...entry, [key]: !entry[key] } : entry)));
  }

  function remove(template: ChecklistTemplateItem) {
    setTemplates((list) => list.filter((entry) => entry.id !== template.id));
    toast(({ closeToast }) => (
      <span className="ck-toast">
        {t('eventChecklist.toast.templateDeleted')}
        <button type="button" onClick={() => { setTemplates((list) => [...list, template]); closeToast?.(); }}>{t('eventChecklist.undo')}</button>
      </span>
    ));
  }

  return (
    <div className="ck-templates">
      <div className="ck-template-note">
        <strong>{t('eventChecklist.templates.howTitle')}</strong> {t('eventChecklist.templates.howBody')}
      </div>
      {stages.length === 0 && <div className="card ck-empty-state">{t('eventChecklist.noStages')}</div>}
      {stages.map((stage) => {
        const stageTemplates = templates.filter((template) => template.stageId === stage.id);
        return (
          <div key={stage.id} className="card ck-stage">
            <div className="ck-stage-head static">
              <span className="ck-stage-num">{stage.order}</span>
              <span className="ck-stage-name">{stage.name}</span>
              <span className="ck-stage-count">{t('eventChecklist.templates.count', { count: stageTemplates.length })}</span>
            </div>
            <ul className="ck-items">
              {stageTemplates.map((template) => (
                <li key={template.id} className="ck-item template">
                  <div className="ck-item-body static">
                    <span className="ck-item-title">{template.title}</span>
                    <span className="ck-item-meta">
                      {settings.dueDates && <span className="ck-due">{offsetLabel(template.dueOffsetDays)}</span>}
                      {settings.assignees && template.role && <span>{template.role}</span>}
                    </span>
                  </div>
                  <div className="ck-template-flags">
                    {settings.photos.enabled && (
                      <button type="button" className={`ck-flag-toggle${template.requiresPhoto ? ' on photo' : ''}`} aria-pressed={template.requiresPhoto} title={t('eventChecklist.templates.photoHint')} onClick={() => toggle(template.id, 'requiresPhoto')}>
                        {t('eventChecklist.templates.photoFlag')}
                      </button>
                    )}
                    <button type="button" className={`ck-flag-toggle${template.required ? ' on' : ''}`} aria-pressed={template.required} title={t('eventChecklist.templates.requiredHint')} onClick={() => toggle(template.id, 'required')}>
                      {template.required ? t('eventChecklist.required') : t('eventChecklist.optional')}
                    </button>
                  </div>
                  <button type="button" className="btn-icon delete" aria-label={t('eventChecklist.deleteItem', { title: template.title })} onClick={() => remove(template)}>
                    <IconDelete />
                  </button>
                </li>
              ))}
              {stageTemplates.length === 0 && <li className="ck-empty-small">{t('eventChecklist.templates.empty')}</li>}
            </ul>
            {openForm === stage.id ? (
              <form className="ck-template-form" onSubmit={(e) => save(e, stage.id)}>
                <label className="ck-field grow">
                  <span>{t('eventChecklist.templates.task')}</span>
                  <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t('eventChecklist.addItemPlaceholder')} />
                </label>
                {settings.dueDates && (
                  <label className="ck-field">
                    <span>{t('eventChecklist.templates.dueOffset')}</span>
                    <input type="number" inputMode="numeric" value={draft.offset} onChange={(e) => setDraft({ ...draft, offset: e.target.value })} placeholder="-3" />
                  </label>
                )}
                <label className="ck-check-inline">
                  <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
                  {t('eventChecklist.required')}
                </label>
                {settings.photos.enabled && (
                  <label className="ck-check-inline">
                    <input type="checkbox" checked={draft.requiresPhoto} onChange={(e) => setDraft({ ...draft, requiresPhoto: e.target.checked })} />
                    {t('eventChecklist.photoRequired')}
                  </label>
                )}
                <div className="ck-form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setOpenForm(null)}>{t('eventChecklist.cancel')}</button>
                  <button type="submit" className="btn btn-primary" disabled={!draft.title.trim()}>{t('eventChecklist.add')}</button>
                </div>
                {settings.dueDates && <p className="ck-form-hint">{t('eventChecklist.templates.offsetHint')}</p>}
              </form>
            ) : (
              <button type="button" className="ck-add-link" onClick={() => startAdd(stage.id)}><IconPlus /> {t('eventChecklist.templates.addTask')}</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
