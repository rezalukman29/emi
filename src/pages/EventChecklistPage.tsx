import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconArrowLeft, IconDelete, IconEdit, IconPlus, IconSearch } from '../components/icons';
import EventChecklistPanel, { ChecklistProgressBar, useChecklistFormatters } from '../components/checklist/EventChecklistPanel';
import type { ChecklistTemplateGroup, ChecklistTemplateItem } from '../data/eventChecklistMock';
import useGetEvents from '../hooks/api/useGetEvents';
import useGetEventStatus from '../hooks/api/useGetEventStatus';
import { useChecklistSettings, type ChecklistSettings } from '../lib/checklistSettings';
import {
  ensureEventChecklist,
  seedTemplates,
  summarizeEvent,
  takeIds,
  updateChecklist,
  useChecklistStore,
  type ChecklistEventRef,
} from '../lib/checklistStore';
import { currentUserId, currentUserName, isTenantAdminUser } from '../lib/tenantUser';
import '../eventChecklist.css';

// Event Checklist — overview of every active event's checklist (preview on mock data).
// Events and stages are real (API); the checklist lives in this browser (src/lib/checklistStore.ts).
// v2 (owner 2026-11-23): tasks are grouped in free groups (not stages); templates are groups too.
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

/** Event stage names (shown as information on each event; the checklist no longer follows stages). */
function useStageNames() {
  const query = useGetEventStatus({ params: { page: 1, limit: 999, sort: 'ASC', sortBy: 'order_data' } });
  return useMemo(() => {
    const sorted = [...(query.data?.data?.data ?? [])].sort((a, b) => (a.order_data ?? 0) - (b.order_data ?? 0));
    return new Map(sorted.map((status, index) => [Number(status.id), `${index + 1}. ${status.name}`]));
  }, [query.data]);
}

export default function EventChecklistPage() {
  const { t } = useTranslation();
  const settings = useChecklistSettings();
  const store = useChecklistStore();
  const isAdmin = isTenantAdminUser();
  const { today, formatDate, relativeLabel } = useChecklistFormatters();
  const [searchParams, setSearchParams] = useSearchParams();
  const stageNames = useStageNames();
  const me = { id: currentUserId(), name: currentUserName(t('eventChecklist.you')) };
  useEffect(() => { seedTemplates(); }, []);

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
    if (!store.templatesSeeded) return;
    for (const event of events) ensureEventChecklist(event);
  }, [events, store.templatesSeeded]);

  const [tab, setTab] = useState<Tab>('checklists');
  const [mobileDetail, setMobileDetail] = useState(Boolean(searchParams.get('event')));
  const [query, setQuery] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  const offsetLabel = (offset: number | null) => {
    if (offset === null) return t('eventChecklist.offset.none');
    if (offset === 0) return t('eventChecklist.offset.eventDay');
    return offset < 0 ? t('eventChecklist.offset.before', { count: -offset }) : t('eventChecklist.offset.after', { count: offset });
  };

  const summaries = useMemo(
    () => new Map(events.map((event) => [event.id, summarizeEvent(event.id, store.items, today, me)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, store.items, today, me.id, me.name],
  );

  const visibleEvents = events.filter((event) => {
    const summary = summaries.get(event.id)!;
    const q = query.trim().toLowerCase();
    const matches = !q || `${event.name} ${event.venue}`.toLowerCase().includes(q);
    return matches && (!attentionOnly || summary.overdue > 0 || summary.blocking > 0 || summary.issues > 0) && (!mineOnly || summary.mine > 0);
  });

  const requestedId = Number(searchParams.get('event'));
  const selectedEvent = events.find((event) => event.id === requestedId) ?? visibleEvents[0] ?? events[0];

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
            {settings.assignees && (
              <label className="ck-check-inline">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                {t('eventChecklist.filter.eventsMine')}
              </label>
            )}
            <ul className="ck-event-list">
              {eventsLoading && events.length === 0 && <li className="ck-empty-small">{t('wording.loading')}</li>}
              {eventsError && <li className="ck-empty-small" role="alert">{t('eventChecklist.eventsLoadError')}</li>}
              {visibleEvents.map((event) => {
                const summary = summaries.get(event.id)!;
                const stage = event.currentStageId === null ? undefined : stageNames.get(event.currentStageId);
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
                        {stage && <span className="ck-stage-pill">{stage}</span>}
                        {settings.issues && summary.issues > 0 && <span className="badge badge-red">{t('eventChecklist.issueCount', { count: summary.issues })}</span>}
                        {settings.dueDates && summary.overdue > 0 && <span className="badge badge-red">{t('eventChecklist.overdueCount', { count: summary.overdue })}</span>}
                        {summary.blocking > 0 && <span className="badge badge-orange">{t('eventChecklist.blockingCount', { count: summary.blocking })}</span>}
                        {summary.mine > 0 && <span className="badge badge-blue">{t('eventChecklist.mineCount', { count: summary.mine })}</span>}
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
                headerActions={<Link className="btn btn-ghost" to={`/event-detail?id=${selectedEvent.id}&view=checklist`}>{t('eventChecklist.openInEvent')}</Link>}
              />
            ) : !eventsLoading && <div className="card ck-empty-state">{t('eventChecklist.noActiveEvents')}</div>}
          </section>
        </div>
      ) : (
        <TemplatesTab groups={store.templateGroups} templates={store.templates} offsetLabel={offsetLabel} settings={settings} />
      )}
    </>
  );
}

const setTemplates = (change: (list: ChecklistTemplateItem[]) => ChecklistTemplateItem[]) =>
  updateChecklist((current) => ({ ...current, templates: change(current.templates) }));
const setTemplateGroups = (change: (list: ChecklistTemplateGroup[]) => ChecklistTemplateGroup[]) =>
  updateChecklist((current) => ({ ...current, templateGroups: change(current.templateGroups) }));

type TemplateFlag = 'required' | 'requiresPhoto' | 'requiresReport';

function TemplatesTab({ groups, templates, offsetLabel, settings }: {
  groups: ChecklistTemplateGroup[];
  templates: ChecklistTemplateItem[];
  offsetLabel: (offset: number | null) => string;
  settings: ChecklistSettings;
}) {
  const { t } = useTranslation();
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  const [openForm, setOpenForm] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: '', required: false, requiresPhoto: false, requiresReport: false, offset: '' });
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);

  function startAdd(groupId: number) {
    setOpenForm(groupId);
    setDraft({ title: '', required: false, requiresPhoto: false, requiresReport: false, offset: '' });
  }

  function save(event: FormEvent, groupId: number) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const offset = draft.offset.trim() === '' ? null : Number(draft.offset);
    const id = takeIds();
    setTemplates((list) => [...list, { id, groupId, title, required: draft.required, requiresPhoto: draft.requiresPhoto, requiresReport: draft.requiresReport, dueOffsetDays: Number.isFinite(offset) ? offset : null }]);
    setDraft({ ...draft, title: '' });
  }

  function toggle(id: number, key: TemplateFlag) {
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

  function addGroup(event: FormEvent) {
    event.preventDefault();
    const name = (newGroup ?? '').trim();
    if (!name) return;
    const id = takeIds();
    setTemplateGroups((list) => [...list, { id, name, order: Math.max(0, ...list.map((group) => group.order)) + 1 }]);
    setNewGroup(null);
    startAdd(id);
  }

  function rename(event?: FormEvent) {
    event?.preventDefault();
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name) setTemplateGroups((list) => list.map((group) => (group.id === renaming.id ? { ...group, name } : group)));
    setRenaming(null);
  }

  function move(group: ChecklistTemplateGroup, direction: -1 | 1) {
    const other = sorted[sorted.findIndex((entry) => entry.id === group.id) + direction];
    if (!other) return;
    setTemplateGroups((list) => list.map((entry) => (entry.id === group.id ? { ...entry, order: other.order } : entry.id === other.id ? { ...entry, order: group.order } : entry)));
  }

  function removeGroup(group: ChecklistTemplateGroup) {
    const tasks = templates.filter((template) => template.groupId === group.id);
    if (tasks.length && !window.confirm(t('eventChecklist.groups.deleteConfirm', { name: group.name, count: tasks.length }))) return;
    updateChecklist((current) => ({
      ...current,
      templateGroups: current.templateGroups.filter((entry) => entry.id !== group.id),
      templates: current.templates.filter((template) => template.groupId !== group.id),
    }));
  }

  return (
    <div className="ck-templates">
      <div className="ck-template-note">
        <strong>{t('eventChecklist.templates.howTitle')}</strong> {t('eventChecklist.templates.howBody')}
      </div>
      {sorted.length === 0 && <div className="card ck-empty-state">{t('eventChecklist.templates.noGroups')}</div>}
      {sorted.map((group, index) => {
        const groupTemplates = templates.filter((template) => template.groupId === group.id);
        return (
          <div key={group.id} className="card ck-stage ck-group">
            <div className="ck-group-head">
              {renaming?.id === group.id ? (
                <form className="ck-group-rename" onSubmit={rename}>
                  <input autoFocus value={renaming.name} aria-label={t('eventChecklist.groups.name')} onChange={(e) => setRenaming({ id: group.id, name: e.target.value })} onBlur={() => rename()} onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null); }} />
                </form>
              ) : (
                <div className="ck-stage-head static">
                  <span className="ck-stage-num">{index + 1}</span>
                  <span className="ck-stage-name">{group.name}</span>
                  <span className="ck-stage-count">{t('eventChecklist.templates.count', { count: groupTemplates.length })}</span>
                </div>
              )}
              {renaming?.id !== group.id && (
                <div className="ck-group-tools">
                  <button type="button" className="btn-icon" disabled={index === 0} aria-label={t('eventChecklist.groups.moveUp')} title={t('eventChecklist.groups.moveUp')} onClick={() => move(group, -1)}>↑</button>
                  <button type="button" className="btn-icon" disabled={index === sorted.length - 1} aria-label={t('eventChecklist.groups.moveDown')} title={t('eventChecklist.groups.moveDown')} onClick={() => move(group, 1)}>↓</button>
                  <button type="button" className="btn-icon" aria-label={t('eventChecklist.groups.rename')} title={t('eventChecklist.groups.rename')} onClick={() => setRenaming({ id: group.id, name: group.name })}><IconEdit /></button>
                  <button type="button" className="btn-icon delete" aria-label={t('eventChecklist.groups.delete')} title={t('eventChecklist.groups.delete')} onClick={() => removeGroup(group)}><IconDelete /></button>
                </div>
              )}
            </div>
            <ul className="ck-items">
              {groupTemplates.map((template) => (
                <li key={template.id} className="ck-item template">
                  <div className="ck-item-body static">
                    <span className="ck-item-title">{template.title}</span>
                    {settings.dueDates && <span className="ck-item-meta"><span className="ck-due">{offsetLabel(template.dueOffsetDays)}</span></span>}
                  </div>
                  <div className="ck-template-flags">
                    {settings.photos.enabled && (
                      <button type="button" className={`ck-flag-toggle${template.requiresPhoto ? ' on photo' : ''}`} aria-pressed={template.requiresPhoto} title={t('eventChecklist.templates.photoHint')} onClick={() => toggle(template.id, 'requiresPhoto')}>
                        {t('eventChecklist.templates.photoFlag')}
                      </button>
                    )}
                    <button type="button" className={`ck-flag-toggle${template.requiresReport ? ' on photo' : ''}`} aria-pressed={template.requiresReport} title={t('eventChecklist.templates.reportHint')} onClick={() => toggle(template.id, 'requiresReport')}>
                      {t('eventChecklist.templates.reportFlag')}
                    </button>
                    <button type="button" className={`ck-flag-toggle${template.required ? ' on' : ''}`} aria-pressed={template.required} title={t('eventChecklist.templates.requiredHint')} onClick={() => toggle(template.id, 'required')}>
                      {template.required ? t('eventChecklist.required') : t('eventChecklist.optional')}
                    </button>
                  </div>
                  <button type="button" className="btn-icon delete" aria-label={t('eventChecklist.deleteItem', { title: template.title })} onClick={() => remove(template)}>
                    <IconDelete />
                  </button>
                </li>
              ))}
              {groupTemplates.length === 0 && <li className="ck-empty-small">{t('eventChecklist.templates.empty')}</li>}
            </ul>
            {openForm === group.id ? (
              <form className="ck-template-form" onSubmit={(e) => save(e, group.id)}>
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
                    {t('eventChecklist.needsPhoto')}
                  </label>
                )}
                <label className="ck-check-inline">
                  <input type="checkbox" checked={draft.requiresReport} onChange={(e) => setDraft({ ...draft, requiresReport: e.target.checked })} />
                  {t('eventChecklist.needsReport')}
                </label>
                <div className="ck-form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setOpenForm(null)}>{t('eventChecklist.cancel')}</button>
                  <button type="submit" className="btn btn-primary" disabled={!draft.title.trim()}>{t('eventChecklist.add')}</button>
                </div>
                {settings.dueDates && <p className="ck-form-hint">{t('eventChecklist.templates.offsetHint')}</p>}
              </form>
            ) : (
              <button type="button" className="ck-add-link" onClick={() => startAdd(group.id)}><IconPlus /> {t('eventChecklist.templates.addTask')}</button>
            )}
          </div>
        );
      })}
      {newGroup === null ? (
        <button type="button" className="ck-add-group" onClick={() => setNewGroup('')}><IconPlus /> {t('eventChecklist.groups.add')}</button>
      ) : (
        <form className="card ck-add ck-add-group-form" onSubmit={addGroup}>
          <IconPlus />
          <input autoFocus value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder={t('eventChecklist.groups.namePlaceholder')} aria-label={t('eventChecklist.groups.name')} onKeyDown={(e) => { if (e.key === 'Escape') setNewGroup(null); }} />
          <button type="button" className="btn btn-ghost" onClick={() => setNewGroup(null)}>{t('eventChecklist.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!newGroup.trim()}>{t('eventChecklist.add')}</button>
        </form>
      )}
    </div>
  );
}
