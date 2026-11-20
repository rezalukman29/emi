import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconArrowLeft, IconChevronDown, IconDelete, IconPlus, IconSearch } from '../components/icons';
import {
  CHECKLIST_STAGES,
  INITIAL_EVENTS,
  INITIAL_ITEMS,
  INITIAL_TEMPLATES,
  todayIso,
  type ChecklistEvent,
  type ChecklistItem,
  type ChecklistStage,
  type ChecklistTemplateItem,
} from '../data/eventChecklistMock';
import '../eventChecklist.css';

// Event Checklist — front-end preview on mock data.
// Design: templates are defined per stage; every event has ONE checklist grouped by stage.
// The backend contract this page needs is documented in src/hooks/api/eventChecklistContract.ts.

type Tab = 'checklists' | 'templates';
type Scope = 'current' | 'all';

const CURRENT_USER = 'You';

function stageOf(id: number): ChecklistStage | undefined {
  return CHECKLIST_STAGES.find((stage) => stage.id === id);
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(`${toIso}T12:00:00`).getTime() - new Date(`${fromIso}T12:00:00`).getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function summarize(event: ChecklistEvent, items: ChecklistItem[], today: string) {
  const own = items.filter((item) => item.eventId === event.id);
  const done = own.filter((item) => item.done).length;
  const overdue = own.filter((item) => !item.done && item.dueDate && item.dueDate < today).length;
  const blocking = own.filter((item) => !item.done && item.required && item.stageId === event.currentStageId).length;
  return { total: own.length, done, overdue, blocking, percent: own.length ? Math.round((done / own.length) * 100) : 0 };
}

function ProgressBar({ percent, tone = 'brand' }: { percent: number; tone?: 'brand' | 'green' }) {
  return (
    <div className="ck-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span className={`ck-progress-fill ${percent === 100 ? 'green' : tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function EventChecklistPage() {
  const { t, i18n } = useTranslation();
  const today = todayIso();
  const [tab, setTab] = useState<Tab>('checklists');
  const [items, setItems] = useState<ChecklistItem[]>(INITIAL_ITEMS);
  const [templates, setTemplates] = useState<ChecklistTemplateItem[]>(INITIAL_TEMPLATES);
  const [selectedId, setSelectedId] = useState<number>(INITIAL_EVENTS[0].id);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [query, setQuery] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [scope, setScope] = useState<Scope>('current');
  const [hideDone, setHideDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [newItemTitle, setNewItemTitle] = useState<Record<number, string>>({});
  const [nextId, setNextId] = useState(5000);
  const [addOpen, setAddOpen] = useState<Record<number, boolean>>({});

  const formatDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(i18n.language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short' });

  const relativeLabel = (iso: string) => {
    const diff = daysBetween(today, iso);
    if (diff === 0) return t('eventChecklist.relative.today');
    if (diff === 1) return t('eventChecklist.relative.tomorrow');
    if (diff === -1) return t('eventChecklist.relative.yesterday');
    return diff > 0 ? t('eventChecklist.relative.inDays', { count: diff }) : t('eventChecklist.relative.daysAgo', { count: -diff });
  };

  const offsetLabel = (offset: number | null) => {
    if (offset === null) return t('eventChecklist.offset.none');
    if (offset === 0) return t('eventChecklist.offset.eventDay');
    return offset < 0
      ? t('eventChecklist.offset.before', { count: -offset })
      : t('eventChecklist.offset.after', { count: offset });
  };

  const summaries = useMemo(
    () => new Map(INITIAL_EVENTS.map((event) => [event.id, summarize(event, items, today)])),
    [items, today],
  );

  const visibleEvents = INITIAL_EVENTS.filter((event) => {
    const summary = summaries.get(event.id)!;
    const q = query.trim().toLowerCase();
    const matches = !q || `${event.name} ${event.client} ${event.venue}`.toLowerCase().includes(q);
    return matches && (!attentionOnly || summary.overdue > 0 || summary.blocking > 0);
  });

  const selectedEvent = INITIAL_EVENTS.find((event) => event.id === selectedId) ?? INITIAL_EVENTS[0];
  const selectedSummary = summaries.get(selectedEvent.id)!;
  const currentStage = stageOf(selectedEvent.currentStageId);

  const eventItems = items.filter((item) => item.eventId === selectedEvent.id);
  const stagesToShow = CHECKLIST_STAGES.filter((stage) =>
    scope === 'current'
      ? stage.id === selectedEvent.currentStageId
      : stage.id === selectedEvent.currentStageId || eventItems.some((item) => item.stageId === stage.id),
  );

  function toggleItem(id: number) {
    setItems((list) => list.map((item) => item.id === id
      ? { ...item, done: !item.done, doneBy: item.done ? null : CURRENT_USER, doneAt: item.done ? null : new Date().toISOString() }
      : item));
  }

  function removeItem(item: ChecklistItem) {
    setItems((list) => list.filter((entry) => entry.id !== item.id));
    toast(({ closeToast }) => (
      <span className="ck-toast">
        {t('eventChecklist.toast.itemDeleted')}
        <button type="button" onClick={() => { setItems((list) => [...list, item]); closeToast?.(); }}>{t('eventChecklist.undo')}</button>
      </span>
    ));
  }

  function addItem(event: FormEvent, stageId: number) {
    event.preventDefault();
    const title = (newItemTitle[stageId] ?? '').trim();
    if (!title) return;
    setItems((list) => [...list, {
      id: nextId, eventId: selectedEvent.id, stageId, templateId: null, title, required: false, done: false,
      dueDate: null, assignee: null, doneBy: null, doneAt: null,
    }]);
    setNextId((id) => id + 1);
    setNewItemTitle((map) => ({ ...map, [stageId]: '' }));
  }

  function selectEvent(id: number) {
    setSelectedId(id);
    setMobileDetail(true);
    setCollapsed({});
    setAddOpen({});
  }

  return (
    <>
      <div className="ck-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t('navigation.items.eventChecklist')}</h1>
          <p className="ck-intro">{t('eventChecklist.intro')}</p>
        </div>
        <span className="ck-preview-badge" title={t('eventChecklist.previewHint')}>{t('eventChecklist.preview')}</span>
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
        <div className={`ck-layout${mobileDetail ? ' show-detail' : ''}`}>
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
              {visibleEvents.map((event) => {
                const summary = summaries.get(event.id)!;
                const stage = stageOf(event.currentStageId);
                return (
                  <li key={event.id}>
                    <button type="button" className={`ck-event${event.id === selectedEvent.id ? ' active' : ''}`} onClick={() => selectEvent(event.id)} aria-current={event.id === selectedEvent.id}>
                      <span className="ck-event-top">
                        <strong>{event.name}</strong>
                        <span className="ck-event-pct">{summary.percent}%</span>
                      </span>
                      <span className="ck-event-meta">{formatDate(event.startDate)} · {relativeLabel(event.startDate)}</span>
                      <ProgressBar percent={summary.percent} />
                      <span className="ck-event-tags">
                        <span className="ck-stage-pill">{stage?.order}. {stage?.name}</span>
                        {summary.overdue > 0 && <span className="badge badge-red">{t('eventChecklist.overdueCount', { count: summary.overdue })}</span>}
                        {summary.blocking > 0 && <span className="badge badge-orange">{t('eventChecklist.blockingCount', { count: summary.blocking })}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {visibleEvents.length === 0 && <li className="ck-empty-small">{t('eventChecklist.noEvents')}</li>}
            </ul>
          </aside>

          <section className="ck-detail" aria-label={selectedEvent.name}>
            <button type="button" className="btn btn-ghost ck-back" onClick={() => setMobileDetail(false)}>
              <IconArrowLeft /> {t('eventChecklist.backToEvents')}
            </button>

            <div className="card ck-summary">
              <div className="ck-summary-main">
                <div className="ck-summary-text">
                  <h2>{selectedEvent.name}</h2>
                  <p>{selectedEvent.client} · {selectedEvent.venue}</p>
                  <p>{formatDate(selectedEvent.startDate)} ({relativeLabel(selectedEvent.startDate)}) · {t('eventChecklist.currentStage')}: <b>{currentStage?.name}</b></p>
                </div>
                <div className="ck-summary-score">
                  <b>{selectedSummary.done}<span>/{selectedSummary.total}</span></b>
                  <small>{t('eventChecklist.tasksDone')}</small>
                </div>
              </div>
              <ProgressBar percent={selectedSummary.percent} />
            </div>

            <div className="ck-filters">
              <div className="ck-segment" role="group" aria-label={t('eventChecklist.scopeLabel')}>
                <button type="button" className={scope === 'current' ? 'active' : ''} aria-pressed={scope === 'current'} onClick={() => setScope('current')}>{t('eventChecklist.scope.current')}</button>
                <button type="button" className={scope === 'all' ? 'active' : ''} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>{t('eventChecklist.scope.all')}</button>
              </div>
              <label className="ck-check-inline">
                <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
                {t('eventChecklist.hideDone')}
              </label>
            </div>

            {stagesToShow.map((stage) => {
              const stageItems = eventItems.filter((item) => item.stageId === stage.id);
              const shown = hideDone ? stageItems.filter((item) => !item.done) : stageItems;
              const doneCount = stageItems.filter((item) => item.done).length;
              const isCurrent = stage.id === selectedEvent.currentStageId;
              const isPast = (currentStage?.order ?? 0) > stage.order;
              const blocking = stageItems.filter((item) => item.required && !item.done);
              const isCollapsed = collapsed[stage.id] ?? (scope === 'all' && isPast);
              return (
                <div key={stage.id} className={`card ck-stage${isCurrent ? ' current' : ''}`}>
                  <button type="button" className="ck-stage-head" aria-expanded={!isCollapsed} onClick={() => setCollapsed((map) => ({ ...map, [stage.id]: !isCollapsed }))}>
                    <span className="ck-stage-num">{stage.order}</span>
                    <span className="ck-stage-name">{stage.name}</span>
                    {isCurrent && <span className="badge badge-blue">{t('eventChecklist.current')}</span>}
                    {!isCurrent && stageItems.length > 0 && doneCount === stageItems.length && <span className="badge badge-green">{t('eventChecklist.complete')}</span>}
                    <span className="ck-stage-count">{doneCount}/{stageItems.length}</span>
                    <span className={`ck-chevron${isCollapsed ? '' : ' open'}`} aria-hidden="true"><IconChevronDown /></span>
                  </button>

                  {!isCollapsed && <>
                    {isCurrent && blocking.length > 0 && (
                      <div className="ck-blocking" role="status">
                        <strong>{t('eventChecklist.blockingTitle', { count: blocking.length })}</strong>{' '}
                        {t('eventChecklist.blockingBody')}
                      </div>
                    )}
                    <ul className="ck-items">
                      {shown.map((item) => {
                        const overdue = !item.done && item.dueDate !== null && item.dueDate < today;
                        const dueToday = !item.done && item.dueDate === today;
                        return (
                          <li key={item.id} className={`ck-item${item.done ? ' done' : ''}`}>
                            <input id={`ck-${item.id}`} type="checkbox" className="ck-box" checked={item.done} onChange={() => toggleItem(item.id)} />
                            <div className="ck-item-body">
                              <label htmlFor={`ck-${item.id}`} className="ck-item-title">{item.title}</label>
                              <div className="ck-item-meta">
                                {item.required && <span className="ck-tag required">{t('eventChecklist.required')}</span>}
                                {item.templateId === null && <span className="ck-tag">{t('eventChecklist.addedManually')}</span>}
                                {item.done
                                  ? <span>{t('eventChecklist.doneBy', { name: item.doneBy ?? '-', date: item.doneAt ? formatDate(item.doneAt.slice(0, 10)) : '' })}</span>
                                  : <>
                                    {item.dueDate && <span className={overdue ? 'ck-due overdue' : dueToday ? 'ck-due today' : 'ck-due'}>
                                      {overdue ? t('eventChecklist.overdueSince', { date: formatDate(item.dueDate) }) : t('eventChecklist.dueOn', { date: formatDate(item.dueDate) })}
                                    </span>}
                                    {item.assignee && <span className="ck-assignee"><i aria-hidden="true">{initials(item.assignee)}</i>{item.assignee}</span>}
                                  </>}
                              </div>
                            </div>
                            <button type="button" className="btn-icon delete" aria-label={t('eventChecklist.deleteItem', { title: item.title })} title={t('eventChecklist.delete')} onClick={() => removeItem(item)}>
                              <IconDelete />
                            </button>
                          </li>
                        );
                      })}
                      {shown.length === 0 && (
                        <li className="ck-empty-small">{stageItems.length ? t('eventChecklist.allDoneInStage') : t('eventChecklist.noItemsInStage')}</li>
                      )}
                    </ul>
                    {!isCurrent && !addOpen[stage.id] ? (
                      <button type="button" className="ck-add-link" onClick={() => setAddOpen((map) => ({ ...map, [stage.id]: true }))}>
                        <IconPlus /> {t('eventChecklist.addItemPlaceholder')}
                      </button>
                    ) : <form className="ck-add" onSubmit={(e) => addItem(e, stage.id)}>
                      <IconPlus />
                      <input
                        autoFocus={!isCurrent}
                        value={newItemTitle[stage.id] ?? ''}
                        onChange={(e) => setNewItemTitle((map) => ({ ...map, [stage.id]: e.target.value }))}
                        placeholder={t('eventChecklist.addItemPlaceholder')}
                        aria-label={t('eventChecklist.addItemTo', { stage: stage.name })}
                      />
                      <button type="submit" className="btn btn-primary" disabled={!(newItemTitle[stage.id] ?? '').trim()}>{t('eventChecklist.add')}</button>
                    </form>}
                  </>}
                </div>
              );
            })}
          </section>
        </div>
      ) : (
        <TemplatesTab
          templates={templates}
          setTemplates={setTemplates}
          offsetLabel={offsetLabel}
        />
      )}
    </>
  );
}

function TemplatesTab({ templates, setTemplates, offsetLabel }: {
  templates: ChecklistTemplateItem[];
  setTemplates: Dispatch<SetStateAction<ChecklistTemplateItem[]>>;
  offsetLabel: (offset: number | null) => string;
}) {
  const { t } = useTranslation();
  const [openForm, setOpenForm] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: '', required: false, offset: '' });
  const [nextId, setNextId] = useState(900);

  function startAdd(stageId: number) {
    setOpenForm(stageId);
    setDraft({ title: '', required: false, offset: '' });
  }

  function save(event: FormEvent, stageId: number) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const offset = draft.offset.trim() === '' ? null : Number(draft.offset);
    setTemplates((list) => [...list, { id: nextId, stageId, title, required: draft.required, dueOffsetDays: Number.isFinite(offset) ? offset : null }]);
    setNextId((id) => id + 1);
    setOpenForm(null);
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
      {CHECKLIST_STAGES.map((stage) => {
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
                  <div className="ck-item-body">
                    <span className="ck-item-title">{template.title}</span>
                    <div className="ck-item-meta">
                      <span className="ck-due">{offsetLabel(template.dueOffsetDays)}</span>
                      {template.role && <span>{template.role}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`ck-required-toggle${template.required ? ' on' : ''}`}
                    aria-pressed={template.required}
                    title={t('eventChecklist.templates.requiredHint')}
                    onClick={() => setTemplates((list) => list.map((entry) => entry.id === template.id ? { ...entry, required: !entry.required } : entry))}
                  >
                    {template.required ? t('eventChecklist.required') : t('eventChecklist.optional')}
                  </button>
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
                <label className="ck-field">
                  <span>{t('eventChecklist.templates.dueOffset')}</span>
                  <input type="number" inputMode="numeric" value={draft.offset} onChange={(e) => setDraft({ ...draft, offset: e.target.value })} placeholder="-3" />
                </label>
                <label className="ck-check-inline">
                  <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
                  {t('eventChecklist.required')}
                </label>
                <div className="ck-form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setOpenForm(null)}>{t('eventChecklist.cancel')}</button>
                  <button type="submit" className="btn btn-primary" disabled={!draft.title.trim()}>{t('eventChecklist.add')}</button>
                </div>
                <p className="ck-form-hint">{t('eventChecklist.templates.offsetHint')}</p>
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
