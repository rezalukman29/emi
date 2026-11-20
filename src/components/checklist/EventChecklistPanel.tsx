import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconChevronDown, IconDelete, IconPlus } from '../icons';
import ChecklistItemDrawer from './ChecklistItemDrawer';
import SignOffModal, { type SignOffInput } from './SignOffModal';
import {
  isResolved,
  todayIso,
  type ChecklistActivity,
  type ChecklistItem,
  type ChecklistStage,
  type ChecklistStatus,
} from '../../data/eventChecklistMock';
import { useChecklistSettings, type ChecklistSettings, type SignerRole } from '../../lib/checklistSettings';
import {
  photoToDataUrl,
  summarizeEvent,
  takeIds,
  updateChecklist,
  useChecklistStore,
  type ChecklistEventRef,
} from '../../lib/checklistStore';
import { currentUserName, isTenantAdminUser } from '../../lib/tenantUser';
import '../../eventChecklist.css';

// The checklist of ONE event: summary, stages with their tasks, task drawer and stage sign-off.
// Used on the Event Checklist page (right side) and inside Event Detail (Checklist view).
// Mount it with key={event.id} so its local view state resets when the event changes.

type Scope = 'current' | 'all';

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(`${toIso}T12:00:00`).getTime() - new Date(`${fromIso}T12:00:00`).getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function requiredRoles(settings: ChecklistSettings): SignerRole[] {
  return settings.signOff.signer === 'both' ? ['supervisor', 'client'] : [settings.signOff.signer];
}

export function ChecklistProgressBar({ percent }: { percent: number }) {
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

export function useChecklistFormatters() {
  const { t, i18n } = useTranslation();
  const today = todayIso();
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
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
  return { today, formatDate, formatDateTime, relativeLabel };
}

export default function EventChecklistPanel({ event, stages, headerActions, showTitle = true }: {
  event: ChecklistEventRef;
  stages: ChecklistStage[];
  /** Extra buttons in the summary card (e.g. "Open event" / "All checklists"). */
  headerActions?: ReactNode;
  /** Event Detail already shows the event name, so it hides the title. */
  showTitle?: boolean;
}) {
  const { t } = useTranslation();
  const settings = useChecklistSettings();
  const store = useChecklistStore();
  const isAdmin = isTenantAdminUser();
  const me = currentUserName(t('eventChecklist.you'));
  const { today, formatDate, formatDateTime, relativeLabel } = useChecklistFormatters();

  const [scope, setScope] = useState<Scope>(event.currentStageId === null ? 'all' : 'current');
  const [hideDone, setHideDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [newItemTitle, setNewItemTitle] = useState<Record<number, string>>({});
  const [addOpen, setAddOpen] = useState<Record<number, boolean>>({});
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [signOffStageId, setSignOffStageId] = useState<number | null>(null);

  const canDelete = settings.deleteTasks === 'everyone' || (settings.deleteTasks === 'admin' && isAdmin);
  const stageOf = (id: number) => stages.find((stage) => stage.id === id);
  const currentStage = event.currentStageId === null ? undefined : stageOf(event.currentStageId);
  const summary = summarizeEvent(event.id, event.currentStageId, store.items, today);
  const eventItems = store.items.filter((item) => item.eventId === event.id);
  const stagesToShow = stages.filter((stage) =>
    scope === 'current'
      ? stage.id === event.currentStageId
      : stage.id === event.currentStageId || eventItems.some((item) => item.stageId === stage.id),
  );
  const openItem = store.items.find((item) => item.id === openItemId) ?? null;

  const stageSignOffs = (stageId: number) =>
    store.signOffs.filter((entry) => entry.eventId === event.id && entry.stageId === stageId);
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
    updateChecklist((current) => ({ ...current, items: current.items.map((item) => (item.id === id ? change(item) : item)) }));
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

  async function addPhotos(id: number, files: File[]) {
    const now = new Date().toISOString();
    const urls = await Promise.all(files.map((file) => photoToDataUrl(file)));
    const firstId = takeIds(files.length);
    updateItem(id, (item) => ({
      ...item,
      photos: [...item.photos, ...files.map((file, index) => ({ id: firstId + index, url: urls[index], name: file.name, by: me, at: now }))],
      activity: log(item, 'photo', String(files.length)),
    }));
  }

  function removeItem(item: ChecklistItem) {
    setOpenItemId(null);
    updateChecklist((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }));
    toast(({ closeToast }) => (
      <span className="ck-toast">
        {t('eventChecklist.toast.itemDeleted')}
        <button type="button" onClick={() => { updateChecklist((current) => ({ ...current, items: [...current.items, item] })); closeToast?.(); }}>{t('eventChecklist.undo')}</button>
      </span>
    ));
  }

  function addItem(formEvent: FormEvent, stageId: number) {
    formEvent.preventDefault();
    const title = (newItemTitle[stageId] ?? '').trim();
    if (!title) return;
    const id = takeIds();
    updateChecklist((current) => ({
      ...current,
      items: [...current.items, {
        id, eventId: event.id, stageId, templateId: null, title, required: false, requiresPhoto: false,
        status: 'open', note: '', photos: [], dueDate: null, assignee: null, statusBy: null, statusAt: null,
        activity: [{ at: new Date().toISOString(), by: me, action: 'created', detail: 'manual' }],
      }],
    }));
    setNewItemTitle((map) => ({ ...map, [stageId]: '' }));
  }

  function confirmSignOff(stageId: number, input: SignOffInput) {
    const id = takeIds();
    updateChecklist((current) => ({ ...current, signOffs: [...current.signOffs, { id, eventId: event.id, stageId, ...input, at: new Date().toISOString() }] }));
    setSignOffStageId(null);
    toast.success(t('eventChecklist.signOff.done', { name: input.name }));
  }

  function reopenStage(stageId: number) {
    if (!window.confirm(t('eventChecklist.signOff.reopenConfirm'))) return;
    updateChecklist((current) => ({ ...current, signOffs: current.signOffs.filter((entry) => !(entry.eventId === event.id && entry.stageId === stageId)) }));
  }

  const signOffStage = signOffStageId === null ? undefined : stageOf(signOffStageId);

  return (
    <>
      <div className="card ck-summary">
        <div className="ck-summary-main">
          <div className="ck-summary-text">
            {showTitle && <h2>{event.name}</h2>}
            {event.venue && <p>{event.venue}</p>}
            <p>
              {event.startDate && <>{formatDate(event.startDate)} ({relativeLabel(event.startDate)}) · </>}
              {t('eventChecklist.currentStage')}: <b>{currentStage?.name ?? t('eventChecklist.stageUnknown')}</b>
            </p>
          </div>
          <div className="ck-summary-score">
            <b>{summary.resolved}<span>/{summary.total}</span></b>
            <small>{t('eventChecklist.tasksDone')}</small>
          </div>
        </div>
        <ChecklistProgressBar percent={summary.percent} />
        {(headerActions || store.storageFull) && (
          <div className="ck-summary-actions">
            {store.storageFull && <span className="ck-storage-warning" role="alert">{t('eventChecklist.storageFull')}</span>}
            {headerActions}
          </div>
        )}
      </div>

      {stages.length === 0 && <div className="card ck-empty-state">{t('eventChecklist.noStages')}</div>}
      {stages.length > 0 && eventItems.length === 0 && <div className="card ck-empty-state">{t('eventChecklist.noTasksYet')}</div>}

      {stages.length > 0 && <div className="ck-filters">
        <div className="ck-segment" role="group" aria-label={t('eventChecklist.scopeLabel')}>
          <button type="button" className={scope === 'current' ? 'active' : ''} aria-pressed={scope === 'current'} disabled={event.currentStageId === null} onClick={() => setScope('current')}>{t('eventChecklist.scope.current')}</button>
          <button type="button" className={scope === 'all' ? 'active' : ''} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>{t('eventChecklist.scope.all')}</button>
        </div>
        <label className="ck-check-inline">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          {t('eventChecklist.hideDone')}
        </label>
      </div>}

      {stagesToShow.map((stage) => {
        const stageItems = eventItems.filter((item) => item.stageId === stage.id);
        const shown = hideDone ? stageItems.filter((item) => !isResolved(item)) : stageItems;
        const resolvedCount = stageItems.filter(isResolved).length;
        const isCurrent = stage.id === event.currentStageId;
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
          onAddPhotos={(files) => { void addPhotos(openItem.id, files); }}
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
            event: event.name,
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
