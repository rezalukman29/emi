import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconArrowLeft, IconChevronDown, IconDelete, IconPlus, IconSearch } from '../components/icons';
import ChecklistItemDrawer from '../components/checklist/ChecklistItemDrawer';
import SignOffModal, { type SignOffInput } from '../components/checklist/SignOffModal';
import {
  CHECKLIST_STAGES,
  INITIAL_EVENTS,
  INITIAL_ITEMS,
  INITIAL_SIGNOFFS,
  INITIAL_TEMPLATES,
  isResolved,
  todayIso,
  type ChecklistActivity,
  type ChecklistEvent,
  type ChecklistItem,
  type ChecklistStage,
  type ChecklistStatus,
  type ChecklistTemplateItem,
  type StageSignOff,
} from '../data/eventChecklistMock';
import { useChecklistSettings, type ChecklistSettings, type SignerRole } from '../lib/checklistSettings';
import { currentUserName, isTenantAdminUser } from '../lib/tenantUser';
import '../eventChecklist.css';

// Event Checklist — front-end preview on mock data.
// Design: templates per stage; every event has ONE checklist grouped by stage; field evidence
// (photos, notes, Not applicable / Issue) and stage sign-off, all switchable in Checklist Settings.
// Backend contract: src/hooks/api/eventChecklistContract.ts.

type Tab = 'checklists' | 'templates';
type Scope = 'current' | 'all';

function stageOf(id: number): ChecklistStage | undefined {
  return CHECKLIST_STAGES.find((stage) => stage.id === id);
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(`${toIso}T12:00:00`).getTime() - new Date(`${fromIso}T12:00:00`).getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function requiredRoles(settings: ChecklistSettings): SignerRole[] {
  return settings.signOff.signer === 'both' ? ['supervisor', 'client'] : [settings.signOff.signer];
}

function summarize(event: ChecklistEvent, items: ChecklistItem[], today: string) {
  const own = items.filter((item) => item.eventId === event.id);
  const resolved = own.filter(isResolved).length;
  const overdue = own.filter((item) => !isResolved(item) && item.dueDate && item.dueDate < today).length;
  const issues = own.filter((item) => item.status === 'issue').length;
  const blocking = own.filter((item) => item.stageId === event.currentStageId && item.required && !isResolved(item)).length;
  return { total: own.length, resolved, overdue, issues, blocking, percent: own.length ? Math.round((resolved / own.length) * 100) : 0 };
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="ck-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span className={`ck-progress-fill${percent === 100 ? ' green' : ''}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

const StatusIcon = ({ status }: { status: ChecklistStatus }) => {
  if (status === 'na') return <span className="ck-status-icon na" aria-hidden="true">–</span>;
  if (status === 'issue') return <span className="ck-status-icon issue" aria-hidden="true">!</span>;
  return null;
};

export default function EventChecklistPage() {
  const { t, i18n } = useTranslation();
  const settings = useChecklistSettings();
  const isAdmin = isTenantAdminUser();
  const me = currentUserName(t('eventChecklist.you'));
  const today = todayIso();
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';

  const [tab, setTab] = useState<Tab>('checklists');
  const [items, setItems] = useState<ChecklistItem[]>(INITIAL_ITEMS);
  const [templates, setTemplates] = useState<ChecklistTemplateItem[]>(INITIAL_TEMPLATES);
  const [signOffs, setSignOffs] = useState<StageSignOff[]>(INITIAL_SIGNOFFS);
  const [selectedId, setSelectedId] = useState<number>(INITIAL_EVENTS[0].id);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [query, setQuery] = useState('');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [scope, setScope] = useState<Scope>('current');
  const [hideDone, setHideDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [newItemTitle, setNewItemTitle] = useState<Record<number, string>>({});
  const [addOpen, setAddOpen] = useState<Record<number, boolean>>({});
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [signOffStageId, setSignOffStageId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(5000);

  const canDelete = settings.deleteTasks === 'everyone' || (settings.deleteTasks === 'admin' && isAdmin);

  const formatDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

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
    return offset < 0 ? t('eventChecklist.offset.before', { count: -offset }) : t('eventChecklist.offset.after', { count: offset });
  };

  const summaries = useMemo(
    () => new Map(INITIAL_EVENTS.map((event) => [event.id, summarize(event, items, today)])),
    [items, today],
  );

  const visibleEvents = INITIAL_EVENTS.filter((event) => {
    const summary = summaries.get(event.id)!;
    const q = query.trim().toLowerCase();
    const matches = !q || `${event.name} ${event.client} ${event.venue}`.toLowerCase().includes(q);
    return matches && (!attentionOnly || summary.overdue > 0 || summary.blocking > 0 || summary.issues > 0);
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
  const openItem = items.find((item) => item.id === openItemId) ?? null;

  const stageSignOffs = (stageId: number) =>
    signOffs.filter((entry) => entry.eventId === selectedEvent.id && entry.stageId === stageId);
  const missingRoles = (stageId: number) => {
    const signed = new Set(stageSignOffs(stageId).map((entry) => entry.role));
    return requiredRoles(settings).filter((role) => !signed.has(role));
  };
  const isStageSigned = (stageId: number) => settings.signOff.enabled && missingRoles(stageId).length === 0;
  const isLocked = (stageId: number) => settings.signOff.enabled && settings.signOff.lockAfterSignOff && isStageSigned(stageId);

  function log(item: ChecklistItem, action: ChecklistActivity['action'], detail?: string): ChecklistActivity[] {
    return [...item.activity, { at: new Date().toISOString(), by: me, action, detail }];
  }

  function updateItem(id: number, change: (item: ChecklistItem) => ChecklistItem) {
    setItems((list) => list.map((item) => (item.id === id ? change(item) : item)));
  }

  function setStatus(id: number, status: ChecklistStatus, note?: string) {
    updateItem(id, (item) => ({
      ...item,
      status,
      note: note ?? item.note,
      statusBy: status === 'open' ? null : me,
      statusAt: status === 'open' ? null : new Date().toISOString(),
      activity: log(item, 'status', status),
    }));
  }

  /** Quick tick from the list. Opens the task instead when it needs a photo first. */
  function quickToggle(item: ChecklistItem) {
    if (item.status === 'done' || item.status === 'na') {
      setStatus(item.id, 'open');
      return;
    }
    if (settings.photos.enabled && item.requiresPhoto && item.photos.length === 0) {
      setOpenItemId(item.id);
      toast.info(t('eventChecklist.drawer.needPhoto'));
      return;
    }
    setStatus(item.id, 'done');
  }

  function addPhotos(id: number, files: File[]) {
    const now = new Date().toISOString();
    updateItem(id, (item) => ({
      ...item,
      photos: [...item.photos, ...files.map((file, index) => ({ id: Date.now() + index, url: URL.createObjectURL(file), name: file.name, by: me, at: now }))],
      activity: log(item, 'photo', String(files.length)),
    }));
  }

  function removeItem(item: ChecklistItem) {
    setOpenItemId(null);
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
      id: nextId, eventId: selectedEvent.id, stageId, templateId: null, title, required: false, requiresPhoto: false,
      status: 'open', note: '', photos: [], dueDate: null, assignee: null, statusBy: null, statusAt: null,
      activity: [{ at: new Date().toISOString(), by: me, action: 'created', detail: 'manual' }],
    }]);
    setNextId((id) => id + 1);
    setNewItemTitle((map) => ({ ...map, [stageId]: '' }));
  }

  function confirmSignOff(stageId: number, input: SignOffInput) {
    setSignOffs((list) => [...list, { id: Date.now(), eventId: selectedEvent.id, stageId, ...input, at: new Date().toISOString() }]);
    setSignOffStageId(null);
    toast.success(t('eventChecklist.signOff.done', { name: input.name }));
  }

  function reopenStage(stageId: number) {
    if (!window.confirm(t('eventChecklist.signOff.reopenConfirm'))) return;
    setSignOffs((list) => list.filter((entry) => !(entry.eventId === selectedEvent.id && entry.stageId === stageId)));
  }

  function selectEvent(id: number) {
    setSelectedId(id);
    setMobileDetail(true);
    setCollapsed({});
    setAddOpen({});
  }

  const signOffStage = signOffStageId === null ? undefined : stageOf(signOffStageId);

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
                        {settings.issues && summary.issues > 0 && <span className="badge badge-red">{t('eventChecklist.issueCount', { count: summary.issues })}</span>}
                        {settings.dueDates && summary.overdue > 0 && <span className="badge badge-red">{t('eventChecklist.overdueCount', { count: summary.overdue })}</span>}
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
                  <b>{selectedSummary.resolved}<span>/{selectedSummary.total}</span></b>
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
              const shown = hideDone ? stageItems.filter((item) => !isResolved(item)) : stageItems;
              const resolvedCount = stageItems.filter(isResolved).length;
              const isCurrent = stage.id === selectedEvent.currentStageId;
              const isPast = (currentStage?.order ?? 0) > stage.order;
              const openRequired = stageItems.filter((item) => item.required && !isResolved(item));
              const openIssues = stageItems.filter((item) => item.status === 'issue');
              const signed = stageSignOffs(stage.id);
              const missing = missingRoles(stage.id);
              const locked = isLocked(stage.id);
              const fullySigned = isStageSigned(stage.id);
              const isCollapsed = collapsed[stage.id] ?? (scope === 'all' && isPast);
              const readyToSign = openRequired.length === 0 && openIssues.length === 0;
              return (
                <div key={stage.id} className={`card ck-stage${isCurrent ? ' current' : ''}`}>
                  <button type="button" className="ck-stage-head" aria-expanded={!isCollapsed} onClick={() => setCollapsed((map) => ({ ...map, [stage.id]: !isCollapsed }))}>
                    <span className="ck-stage-num">{stage.order}</span>
                    <span className="ck-stage-name">{stage.name}</span>
                    {isCurrent && <span className="badge badge-blue">{t('eventChecklist.current')}</span>}
                    {fullySigned
                      ? <span className="badge badge-green">{locked ? t('eventChecklist.signOff.signedLocked') : t('eventChecklist.signOff.signed')}</span>
                      : !isCurrent && stageItems.length > 0 && resolvedCount === stageItems.length && <span className="badge badge-green">{t('eventChecklist.complete')}</span>}
                    <span className="ck-stage-count">{resolvedCount}/{stageItems.length}</span>
                    <span className={`ck-chevron${isCollapsed ? '' : ' open'}`} aria-hidden="true"><IconChevronDown /></span>
                  </button>

                  {!isCollapsed && <>
                    {isCurrent && !fullySigned && (openRequired.length > 0 || openIssues.length > 0) && (
                      <div className="ck-blocking" role="status">
                        {openRequired.length > 0 && <strong>{t('eventChecklist.blockingTitle', { count: openRequired.length })} </strong>}
                        {openIssues.length > 0 && <strong>{t('eventChecklist.issuesOpen', { count: openIssues.length })} </strong>}
                        {t('eventChecklist.blockingBody')}
                      </div>
                    )}
                    <ul className="ck-items">
                      {shown.map((item) => {
                        const resolved = isResolved(item);
                        const overdue = settings.dueDates && !resolved && item.dueDate !== null && item.dueDate < today;
                        const dueToday = settings.dueDates && !resolved && item.dueDate === today;
                        return (
                          <li key={item.id} className={`ck-item status-${item.status}`}>
                            {item.status === 'na' || item.status === 'issue'
                              ? <StatusIcon status={item.status} />
                              : <input
                                type="checkbox"
                                className="ck-box"
                                checked={item.status === 'done'}
                                disabled={locked}
                                aria-label={t('eventChecklist.markDone', { title: item.title })}
                                onChange={() => quickToggle(item)}
                              />}
                            <button type="button" className="ck-item-body" onClick={() => setOpenItemId(item.id)}>
                              <span className="ck-item-title">{item.title}</span>
                              <span className="ck-item-meta">
                                {item.status === 'na' && <span className="ck-tag">{t('eventChecklist.status.na')}</span>}
                                {item.status === 'issue' && <span className="ck-tag issue">{t('eventChecklist.status.issue')}</span>}
                                {item.required && <span className="ck-tag required">{t('eventChecklist.required')}</span>}
                                {settings.photos.enabled && item.requiresPhoto && item.photos.length === 0 && !resolved && <span className="ck-tag">{t('eventChecklist.photoRequired')}</span>}
                                {item.templateId === null && <span className="ck-tag">{t('eventChecklist.addedManually')}</span>}
                                {resolved && item.statusBy && item.statusAt
                                  ? <span>{t(item.status === 'na' ? 'eventChecklist.naBy' : 'eventChecklist.doneBy', { name: item.statusBy, date: formatDate(item.statusAt) })}</span>
                                  : <>
                                    {settings.dueDates && item.dueDate && <span className={overdue ? 'ck-due overdue' : dueToday ? 'ck-due today' : 'ck-due'}>
                                      {overdue ? t('eventChecklist.overdueSince', { date: formatDate(item.dueDate) }) : t('eventChecklist.dueOn', { date: formatDate(item.dueDate) })}
                                    </span>}
                                    {settings.assignees && item.assignee && <span className="ck-assignee"><i aria-hidden="true">{initials(item.assignee)}</i>{item.assignee}</span>}
                                  </>}
                                {settings.photos.enabled && item.photos.length > 0 && <span className="ck-count" title={t('eventChecklist.drawer.photos')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>{item.photos.length}</span>}
                                {settings.notes.enabled && item.note && <span className="ck-count ck-note-preview" title={item.note}>“{item.note}”</span>}
                              </span>
                            </button>
                            {canDelete && !locked && (
                              <button type="button" className="btn-icon delete" aria-label={t('eventChecklist.deleteItem', { title: item.title })} title={t('eventChecklist.delete')} onClick={() => removeItem(item)}>
                                <IconDelete />
                              </button>
                            )}
                          </li>
                        );
                      })}
                      {shown.length === 0 && (
                        <li className="ck-empty-small">{stageItems.length ? t('eventChecklist.allDoneInStage') : t('eventChecklist.noItemsInStage')}</li>
                      )}
                    </ul>

                    {settings.extraTasks && !locked && (
                      !isCurrent && !addOpen[stage.id] ? (
                        <button type="button" className="ck-add-link" onClick={() => setAddOpen((map) => ({ ...map, [stage.id]: true }))}>
                          <IconPlus /> {t('eventChecklist.addItemPlaceholder')}
                        </button>
                      ) : (
                        <form className="ck-add" onSubmit={(e) => addItem(e, stage.id)}>
                          <IconPlus />
                          <input
                            autoFocus={!isCurrent}
                            value={newItemTitle[stage.id] ?? ''}
                            onChange={(e) => setNewItemTitle((map) => ({ ...map, [stage.id]: e.target.value }))}
                            placeholder={t('eventChecklist.addItemPlaceholder')}
                            aria-label={t('eventChecklist.addItemTo', { stage: stage.name })}
                          />
                          <button type="submit" className="btn btn-primary" disabled={!(newItemTitle[stage.id] ?? '').trim()}>{t('eventChecklist.add')}</button>
                        </form>
                      )
                    )}

                    {settings.signOff.enabled && stageItems.length > 0 && (
                      <div className={`ck-signoff${fullySigned ? ' signed' : ''}`}>
                        {signed.map((entry) => (
                          <div key={entry.id} className="ck-signoff-card">
                            {entry.signature && <img src={entry.signature} alt={t('eventChecklist.signOff.signatureOf', { name: entry.name })} />}
                            <div>
                              <strong>{entry.name}</strong>
                              <span>{t(`eventChecklist.signOff.roles.${entry.role}`)} · {formatDateTime(entry.at)}</span>
                              {entry.note && <em>“{entry.note}”</em>}
                            </div>
                          </div>
                        ))}
                        {missing.length > 0 ? (
                          <div className="ck-signoff-action">
                            <span>
                              {readyToSign
                                ? t('eventChecklist.signOff.ready', { roles: missing.map((role) => t(`eventChecklist.signOff.roles.${role}`)).join(' + ') })
                                : t('eventChecklist.signOff.notReady')}
                            </span>
                            <button type="button" className="btn btn-primary" disabled={!readyToSign} onClick={() => setSignOffStageId(stage.id)}>
                              {t('eventChecklist.signOff.button')}
                            </button>
                          </div>
                        ) : isAdmin && (
                          <button type="button" className="ck-add-link ck-reopen" onClick={() => reopenStage(stage.id)}>{t('eventChecklist.signOff.reopen')}</button>
                        )}
                      </div>
                    )}
                  </>}
                </div>
              );
            })}
          </section>
        </div>
      ) : (
        <TemplatesTab templates={templates} setTemplates={setTemplates} offsetLabel={offsetLabel} settings={settings} />
      )}

      {openItem && (
        <ChecklistItemDrawer
          key={openItem.id}
          item={openItem}
          stageName={stageOf(openItem.stageId)?.name ?? ''}
          settings={settings}
          locked={isLocked(openItem.stageId)}
          canDelete={canDelete}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          onClose={() => setOpenItemId(null)}
          onSetStatus={(status, note) => setStatus(openItem.id, status, note)}
          onSaveNote={(note) => updateItem(openItem.id, (item) => ({ ...item, note, activity: log(item, 'note') }))}
          onAddPhotos={(files) => addPhotos(openItem.id, files)}
          onRemovePhoto={(photoId) => updateItem(openItem.id, (item) => ({ ...item, photos: item.photos.filter((photo) => photo.id !== photoId), activity: log(item, 'photoRemoved') }))}
          onDelete={() => removeItem(openItem)}
        />
      )}

      {signOffStage && (
        <SignOffModal
          open
          stageName={signOffStage.name}
          roles={missingRoles(signOffStage.id)}
          defaultName={me}
          requireSignature={settings.signOff.requireSignature}
          summary={t('eventChecklist.signOff.summary', {
            event: selectedEvent.name,
            done: eventItems.filter((item) => item.stageId === signOffStage.id && item.status === 'done').length,
            na: eventItems.filter((item) => item.stageId === signOffStage.id && item.status === 'na').length,
          })}
          onClose={() => setSignOffStageId(null)}
          onConfirm={(input) => confirmSignOff(signOffStage.id, input)}
        />
      )}
    </>
  );
}

function TemplatesTab({ templates, setTemplates, offsetLabel, settings }: {
  templates: ChecklistTemplateItem[];
  setTemplates: Dispatch<SetStateAction<ChecklistTemplateItem[]>>;
  offsetLabel: (offset: number | null) => string;
  settings: ChecklistSettings;
}) {
  const { t } = useTranslation();
  const [openForm, setOpenForm] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: '', required: false, requiresPhoto: false, offset: '' });
  const [nextId, setNextId] = useState(900);

  function startAdd(stageId: number) {
    setOpenForm(stageId);
    setDraft({ title: '', required: false, requiresPhoto: false, offset: '' });
  }

  function save(event: FormEvent, stageId: number) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const offset = draft.offset.trim() === '' ? null : Number(draft.offset);
    setTemplates((list) => [...list, { id: nextId, stageId, title, required: draft.required, requiresPhoto: draft.requiresPhoto, dueOffsetDays: Number.isFinite(offset) ? offset : null }]);
    setNextId((id) => id + 1);
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
