import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconChevronDown, IconDelete, IconEdit, IconPlus } from '../icons';
import SearchableSelect from '../SearchableSelect';
import ChecklistItemDrawer from './ChecklistItemDrawer';
import CompleteTaskModal from './CompleteTaskModal';
import SignOffModal, { type SignOffInput } from './SignOffModal';
import { useChecklistUsers } from './useChecklistUsers';
import {
  isResolved,
  todayIso,
  type ChecklistActivity,
  type ChecklistGroup,
  type ChecklistItem,
  type ChecklistStatus,
} from '../../data/eventChecklistMock';
import { useChecklistSettings, type ChecklistSettings, type SignerRole } from '../../lib/checklistSettings';
import {
  isMine,
  photoToDataUrl,
  summarizeEvent,
  takeIds,
  updateChecklist,
  useChecklistStore,
  type ChecklistEventRef,
} from '../../lib/checklistStore';
import { currentUserId, currentUserName, isTenantAdminUser } from '../../lib/tenantUser';
import '../../eventChecklist.css';

// The checklist of ONE event: summary, filter, groups with their tasks, task drawer, tick form
// and group sign-off. Used on the Event Checklist page (right side) and inside Event Detail
// (Checklist view), so both behave the same. Mount it with key={event.id}.
//
// v2 (owner 2026-11-23): free groups instead of stages · assign tasks to users · tasks can need a
// photo and/or a report before they can be ticked · admins are e-mailed when a task is ticked
// (backend; preview only queues it) · unticking is allowed and recorded · Not done / Done filter.

type StatusFilter = 'all' | 'todo' | 'done';

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

interface TaskDraft {
  title: string;
  assigneeId: number | null;
  dueDate: string;
  required: boolean;
  requiresPhoto: boolean;
  requiresReport: boolean;
}
const EMPTY_DRAFT: TaskDraft = { title: '', assigneeId: null, dueDate: '', required: false, requiresPhoto: false, requiresReport: false };

export default function EventChecklistPanel({ event, headerActions, showTitle = true }: {
  event: ChecklistEventRef;
  /** Extra buttons in the summary card (e.g. "Open event" / "All checklists"). */
  headerActions?: ReactNode;
  /** Event Detail already shows the event name, so it hides the title. */
  showTitle?: boolean;
}) {
  const { t } = useTranslation();
  const settings = useChecklistSettings();
  const store = useChecklistStore();
  const people = useChecklistUsers();
  const isAdmin = isTenantAdminUser();
  const me = currentUserName(t('eventChecklist.you'));
  const meRef = { id: currentUserId(), name: me };
  const { today, formatDate, formatDateTime, relativeLabel } = useChecklistFormatters();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, TaskDraft>>({});
  const [addOpen, setAddOpen] = useState<Record<number, boolean>>({});
  const [moreOpen, setMoreOpen] = useState<Record<number, boolean>>({});
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [newGroup, setNewGroup] = useState<string | null>(null);
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [signOffGroupId, setSignOffGroupId] = useState<number | null>(null);

  const canDelete = settings.deleteTasks === 'everyone' || (settings.deleteTasks === 'admin' && isAdmin);
  const summary = summarizeEvent(event.id, store.items, today, meRef);
  const groups = store.groups.filter((group) => group.eventId === event.id).sort((a, b) => a.order - b.order);
  const eventItems = store.items.filter((item) => item.eventId === event.id);
  const scopeItems = mineOnly ? eventItems.filter((item) => isMine(item, meRef)) : eventItems;
  const counts = {
    all: scopeItems.length,
    todo: scopeItems.filter((item) => !isResolved(item)).length,
    done: scopeItems.filter(isResolved).length,
  };
  const matchesFilter = (item: ChecklistItem) =>
    (!mineOnly || isMine(item, meRef)) &&
    (statusFilter === 'all' || (statusFilter === 'done' ? isResolved(item) : !isResolved(item)));
  const filtering = statusFilter !== 'all' || mineOnly;
  const groupOf = (id: number) => groups.find((group) => group.id === id);
  const openItem = store.items.find((item) => item.id === openItemId) ?? null;
  const completing = store.items.find((item) => item.id === completingId) ?? null;

  const groupSignOffs = (groupId: number) =>
    store.signOffs.filter((entry) => entry.eventId === event.id && entry.groupId === groupId);
  const missingRoles = (groupId: number) => {
    const signed = new Set(groupSignOffs(groupId).map((entry) => entry.role));
    return requiredRoles(settings).filter((role) => !signed.has(role));
  };
  const isGroupSigned = (groupId: number) => settings.signOff.enabled && missingRoles(groupId).length === 0;
  const isLocked = (groupId: number) => settings.signOff.enabled && settings.signOff.lockAfterSignOff && isGroupSigned(groupId);

  function log(item: ChecklistItem, action: ChecklistActivity['action'], detail?: string): ChecklistActivity[] {
    return [...item.activity, { at: new Date().toISOString(), by: me, action, detail }];
  }

  function updateItem(id: number, change: (item: ChecklistItem) => ChecklistItem) {
    updateChecklist((current) => ({ ...current, items: current.items.map((item) => (item.id === id ? change(item) : item)) }));
  }

  /** Backend sends this e-mail; the preview only records that it would be sent. */
  function queueAdminEmail(item: ChecklistItem): string | undefined {
    if (!settings.notifyAdmins.enabled || (settings.notifyAdmins.when === 'required' && !item.required)) return undefined;
    const to = people.admins.map((admin) => admin.email).filter(Boolean);
    const id = takeIds();
    updateChecklist((current) => ({
      ...current,
      outbox: [{ id, at: new Date().toISOString(), eventId: event.id, eventName: event.name, taskTitle: item.title, by: me, to }, ...current.outbox].slice(0, 50),
    }));
    toast.info(to.length ? t('eventChecklist.email.queued', { count: to.length }) : t('eventChecklist.email.queuedNoAdmins'));
    return String(to.length);
  }

  function setStatus(id: number, status: ChecklistStatus, note?: string) {
    const before = store.items.find((item) => item.id === id);
    if (!before || before.status === status) return;
    const emailed = status === 'done' ? queueAdminEmail(before) : undefined;
    updateItem(id, (item) => {
      let activity = status === 'open' ? log(item, 'unchecked', item.status) : log(item, 'status', status);
      if (emailed !== undefined) activity = [...activity, { at: new Date().toISOString(), by: 'System', action: 'emailQueued', detail: emailed }];
      return {
        ...item,
        status,
        note: note ?? item.note,
        statusBy: status === 'open' ? null : me,
        statusAt: status === 'open' ? null : new Date().toISOString(),
        activity,
      };
    });
    if (status === 'open') toast(t('eventChecklist.toast.unchecked'));
  }

  const needsForm = (item: Pick<ChecklistItem, 'requiresPhoto' | 'requiresReport' | 'photos' | 'note'>) =>
    (settings.photos.enabled && item.requiresPhoto && item.photos.length === 0) || (item.requiresReport && !item.note.trim());

  /** Tick from the list. Opens the proof form when the task needs a photo or a report. */
  function quickToggle(item: ChecklistItem) {
    if (isResolved(item)) {
      setStatus(item.id, 'open');
      return;
    }
    if (needsForm(item)) {
      setCompletingId(item.id);
      return;
    }
    setStatus(item.id, 'done');
  }

  async function addPhotos(id: number, files: File[]) {
    if (!files.length) return;
    const now = new Date().toISOString();
    const urls = await Promise.all(files.map((file) => photoToDataUrl(file)));
    const firstId = takeIds(files.length);
    updateItem(id, (item) => ({
      ...item,
      photos: [...item.photos, ...files.map((file, index) => ({ id: firstId + index, url: urls[index], name: file.name, by: me, at: now }))],
      activity: log(item, 'photo', String(files.length)),
    }));
  }

  async function completeWithProof(item: ChecklistItem, files: File[], report: string) {
    setCompletingId(null);
    await addPhotos(item.id, files);
    if (report && report !== item.note) updateItem(item.id, (current) => ({ ...current, note: report, activity: log(current, 'note') }));
    setStatus(item.id, 'done', report || undefined);
  }

  function assign(item: ChecklistItem, userId: number | null) {
    const name = userId ? people.nameOf(userId) : null;
    updateItem(item.id, (current) => ({ ...current, assigneeId: name ? userId : null, assignee: name, activity: log(current, 'assigned', name ?? '—') }));
  }

  function editItem(item: ChecklistItem, patch: Partial<Pick<ChecklistItem, 'required' | 'requiresPhoto' | 'requiresReport' | 'dueDate' | 'groupId'>>, detail: string) {
    updateItem(item.id, (current) => ({ ...current, ...patch, activity: log(current, 'edited', detail) }));
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

  function addItem(formEvent: FormEvent, groupId: number) {
    formEvent.preventDefault();
    const draft = drafts[groupId] ?? EMPTY_DRAFT;
    const title = draft.title.trim();
    if (!title) return;
    const id = takeIds();
    const assignee = draft.assigneeId ? people.nameOf(draft.assigneeId) : null;
    const now = new Date().toISOString();
    updateChecklist((current) => ({
      ...current,
      items: [...current.items, {
        id, eventId: event.id, groupId, templateId: null, title,
        required: draft.required, requiresPhoto: draft.requiresPhoto, requiresReport: draft.requiresReport,
        status: 'open', note: '', photos: [], dueDate: draft.dueDate || null,
        assigneeId: assignee ? draft.assigneeId : null, assignee, statusBy: null, statusAt: null,
        activity: [
          { at: now, by: me, action: 'created', detail: 'manual' },
          ...(assignee ? [{ at: now, by: me, action: 'assigned' as const, detail: assignee }] : []),
        ],
      }],
    }));
    // Keep the chosen assignee and options for the next task in the same group.
    setDrafts((map) => ({ ...map, [groupId]: { ...draft, title: '' } }));
  }

  function addGroup(formEvent: FormEvent) {
    formEvent.preventDefault();
    const name = (newGroup ?? '').trim();
    if (!name) return;
    const id = takeIds();
    const order = Math.max(0, ...groups.map((group) => group.order)) + 1;
    updateChecklist((current) => ({ ...current, groups: [...current.groups, { id, eventId: event.id, name, order, templateGroupId: null }] }));
    setNewGroup(null);
    setAddOpen((map) => ({ ...map, [id]: true }));
  }

  function renameGroup(formEvent?: FormEvent) {
    formEvent?.preventDefault();
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name) updateChecklist((current) => ({ ...current, groups: current.groups.map((group) => (group.id === renaming.id ? { ...group, name } : group)) }));
    setRenaming(null);
  }

  function moveGroup(group: ChecklistGroup, direction: -1 | 1) {
    const index = groups.findIndex((entry) => entry.id === group.id);
    const other = groups[index + direction];
    if (!other) return;
    updateChecklist((current) => ({
      ...current,
      groups: current.groups.map((entry) =>
        entry.id === group.id ? { ...entry, order: other.order } : entry.id === other.id ? { ...entry, order: group.order } : entry),
    }));
  }

  function removeGroup(group: ChecklistGroup) {
    const tasks = eventItems.filter((item) => item.groupId === group.id);
    if (tasks.length && !window.confirm(t('eventChecklist.groups.deleteConfirm', { name: group.name, count: tasks.length }))) return;
    updateChecklist((current) => ({
      ...current,
      groups: current.groups.filter((entry) => entry.id !== group.id),
      items: current.items.filter((item) => item.groupId !== group.id),
    }));
    toast(({ closeToast }) => (
      <span className="ck-toast">
        {t('eventChecklist.groups.deleted', { name: group.name })}
        <button type="button" onClick={() => { updateChecklist((current) => ({ ...current, groups: [...current.groups, group], items: [...current.items, ...tasks] })); closeToast?.(); }}>{t('eventChecklist.undo')}</button>
      </span>
    ));
  }

  function confirmSignOff(groupId: number, input: SignOffInput) {
    const id = takeIds();
    updateChecklist((current) => ({ ...current, signOffs: [...current.signOffs, { id, eventId: event.id, groupId, ...input, at: new Date().toISOString() }] }));
    setSignOffGroupId(null);
    toast.success(t('eventChecklist.signOff.done', { name: input.name }));
  }

  function reopenGroup(groupId: number) {
    if (!window.confirm(t('eventChecklist.signOff.reopenConfirm'))) return;
    updateChecklist((current) => ({ ...current, signOffs: current.signOffs.filter((entry) => !(entry.eventId === event.id && entry.groupId === groupId)) }));
  }

  const signOffGroup = signOffGroupId === null ? undefined : groupOf(signOffGroupId);
  const assigneeOptions = [{ value: 0, label: t('eventChecklist.assign.nobody') }, ...people.options];
  const visibleGroups = filtering ? groups.filter((group) => eventItems.some((item) => item.groupId === group.id && matchesFilter(item))) : groups;

  return (
    <>
      <div className="card ck-summary">
        <div className="ck-summary-main">
          <div className="ck-summary-text">
            {showTitle && <h2>{event.name}</h2>}
            {event.venue && <p>{event.venue}</p>}
            {event.startDate && <p>{formatDate(event.startDate)} ({relativeLabel(event.startDate)})</p>}
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

      {groups.length === 0 && <div className="card ck-empty-state">{t('eventChecklist.noTasksYet')}</div>}

      {groups.length > 0 && <div className="ck-filters">
        <div className="ck-segment" role="group" aria-label={t('eventChecklist.filter.label')}>
          {(['all', 'todo', 'done'] as StatusFilter[]).map((key) => (
            <button key={key} type="button" className={statusFilter === key ? 'active' : ''} aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)}>
              {t(`eventChecklist.filter.${key}`)} <span className="ck-seg-count">{counts[key]}</span>
            </button>
          ))}
        </div>
        {settings.assignees && (
          <label className="ck-check-inline">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            {t('eventChecklist.filter.mine')}{summary.mine > 0 && <span className="badge badge-blue">{summary.mine}</span>}
          </label>
        )}
      </div>}

      {filtering && visibleGroups.length === 0 && groups.length > 0 && (
        <div className="card ck-empty-state">{t(statusFilter === 'done' ? 'eventChecklist.filter.emptyDone' : statusFilter === 'todo' ? 'eventChecklist.filter.emptyTodo' : 'eventChecklist.filter.emptyMine')}</div>
      )}

      {visibleGroups.map((group, groupIndex) => {
        const groupItems = eventItems.filter((item) => item.groupId === group.id);
        const shown = groupItems.filter(matchesFilter);
        const resolvedCount = groupItems.filter(isResolved).length;
        const openRequired = groupItems.filter((item) => item.required && !isResolved(item));
        const openIssues = groupItems.filter((item) => item.status === 'issue');
        const signed = groupSignOffs(group.id);
        const missing = missingRoles(group.id);
        const locked = isLocked(group.id);
        const fullySigned = isGroupSigned(group.id);
        const isCollapsed = collapsed[group.id] ?? false;
        const readyToSign = openRequired.length === 0 && openIssues.length === 0;
        const draft = drafts[group.id] ?? EMPTY_DRAFT;
        const setDraft = (patch: Partial<TaskDraft>) => setDrafts((map) => ({ ...map, [group.id]: { ...(map[group.id] ?? EMPTY_DRAFT), ...patch } }));
        return (
          <div key={group.id} className="card ck-stage ck-group">
            <div className="ck-group-head">
              {renaming?.id === group.id ? (
                <form className="ck-group-rename" onSubmit={renameGroup}>
                  <input autoFocus value={renaming.name} aria-label={t('eventChecklist.groups.name')} onChange={(e) => setRenaming({ id: group.id, name: e.target.value })} onBlur={() => renameGroup()} onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null); }} />
                </form>
              ) : (
                <button type="button" className="ck-stage-head" aria-expanded={!isCollapsed} onClick={() => setCollapsed((map) => ({ ...map, [group.id]: !isCollapsed }))}>
                  <span className="ck-stage-num">{groupIndex + 1}</span>
                  <span className="ck-stage-name">{group.name}</span>
                  {fullySigned
                    ? <span className="badge badge-green">{locked ? t('eventChecklist.signOff.signedLocked') : t('eventChecklist.signOff.signed')}</span>
                    : groupItems.length > 0 && resolvedCount === groupItems.length && <span className="badge badge-green">{t('eventChecklist.complete.badge')}</span>}
                  <span className="ck-stage-count">{resolvedCount}/{groupItems.length}</span>
                  <span className={`ck-chevron${isCollapsed ? '' : ' open'}`} aria-hidden="true"><IconChevronDown /></span>
                </button>
              )}
              {!locked && !filtering && renaming?.id !== group.id && (
                <div className="ck-group-tools">
                  <button type="button" className="btn-icon" disabled={groupIndex === 0} aria-label={t('eventChecklist.groups.moveUp')} title={t('eventChecklist.groups.moveUp')} onClick={() => moveGroup(group, -1)}>↑</button>
                  <button type="button" className="btn-icon" disabled={groupIndex === visibleGroups.length - 1} aria-label={t('eventChecklist.groups.moveDown')} title={t('eventChecklist.groups.moveDown')} onClick={() => moveGroup(group, 1)}>↓</button>
                  <button type="button" className="btn-icon" aria-label={t('eventChecklist.groups.rename')} title={t('eventChecklist.groups.rename')} onClick={() => setRenaming({ id: group.id, name: group.name })}><IconEdit /></button>
                  {canDelete && <button type="button" className="btn-icon delete" aria-label={t('eventChecklist.groups.delete')} title={t('eventChecklist.groups.delete')} onClick={() => removeGroup(group)}><IconDelete /></button>}
                </div>
              )}
            </div>

            {!isCollapsed && <>
              {!fullySigned && settings.signOff.enabled && openRequired.length > 0 && statusFilter !== 'done' && (
                <div className="ck-blocking" role="status">
                  <strong>{t('eventChecklist.blockingTitle', { count: openRequired.length })} </strong>
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
                          aria-label={t(item.status === 'done' ? 'eventChecklist.markOpen' : 'eventChecklist.markDone', { title: item.title })}
                          onChange={() => quickToggle(item)}
                        />}
                      <button type="button" className="ck-item-body" onClick={() => setOpenItemId(item.id)}>
                        <span className="ck-item-title">{item.title}</span>
                        <span className="ck-item-meta">
                          {item.status === 'na' && <span className="ck-tag">{t('eventChecklist.status.na')}</span>}
                          {item.status === 'issue' && <span className="ck-tag issue">{t('eventChecklist.status.issue')}</span>}
                          {item.required && <span className="ck-tag required">{t('eventChecklist.required')}</span>}
                          {!resolved && settings.photos.enabled && item.requiresPhoto && <span className="ck-tag need">{t('eventChecklist.needsPhoto')}</span>}
                          {!resolved && item.requiresReport && <span className="ck-tag need">{t('eventChecklist.needsReport')}</span>}
                          {resolved && item.statusBy && item.statusAt
                            ? <span>{t(item.status === 'na' ? 'eventChecklist.naBy' : 'eventChecklist.doneBy', { name: item.statusBy, date: formatDate(item.statusAt) })}</span>
                            : settings.dueDates && item.dueDate && <span className={overdue ? 'ck-due overdue' : dueToday ? 'ck-due today' : 'ck-due'}>
                              {overdue ? t('eventChecklist.overdueSince', { date: formatDate(item.dueDate) }) : t('eventChecklist.dueOn', { date: formatDate(item.dueDate) })}
                            </span>}
                          {settings.assignees && (item.assignee
                            ? <span className="ck-assignee"><i aria-hidden="true">{initials(item.assignee)}</i>{item.assignee}</span>
                            : !resolved && <span className="ck-assignee none">{t('eventChecklist.assign.unassigned')}</span>)}
                          {settings.photos.enabled && item.photos.length > 0 && <span className="ck-count" title={t('eventChecklist.drawer.photos')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>{item.photos.length}</span>}
                          {item.note && <span className="ck-count ck-note-preview" title={item.note}>“{item.note}”</span>}
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
                  <li className="ck-empty-small">{groupItems.length ? t('eventChecklist.allDoneInGroup') : t('eventChecklist.noItemsInGroup')}</li>
                )}
              </ul>

              {settings.extraTasks && !locked && !filtering && (
                !addOpen[group.id] ? (
                  <button type="button" className="ck-add-link" onClick={() => setAddOpen((map) => ({ ...map, [group.id]: true }))}>
                    <IconPlus /> {t('eventChecklist.addItemPlaceholder')}
                  </button>
                ) : (
                  <form className="ck-add ck-add-v2" onSubmit={(e) => addItem(e, group.id)}>
                    <div className="ck-add-row">
                      <IconPlus />
                      <input
                        autoFocus
                        value={draft.title}
                        onChange={(e) => setDraft({ title: e.target.value })}
                        placeholder={t('eventChecklist.addItemPlaceholder')}
                        aria-label={t('eventChecklist.addItemTo', { group: group.name })}
                      />
                      <button type="button" className="btn btn-ghost ck-more-btn" aria-expanded={Boolean(moreOpen[group.id])} onClick={() => setMoreOpen((map) => ({ ...map, [group.id]: !map[group.id] }))}>
                        {t('eventChecklist.addOptions')}
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={!draft.title.trim()}>{t('eventChecklist.add')}</button>
                    </div>
                    {moreOpen[group.id] && (
                      <div className="ck-add-options">
                        {settings.assignees && (
                          <div className="ck-field">
                            <span>{t('eventChecklist.assign.label')}</span>
                            <SearchableSelect
                              value={draft.assigneeId ?? 0}
                              options={assigneeOptions}
                              placeholder={people.isLoading ? t('wording.loading') : t('eventChecklist.assign.nobody')}
                              onChange={(value) => setDraft({ assigneeId: Number(value) || null })}
                            />
                          </div>
                        )}
                        {settings.dueDates && (
                          <label className="ck-field">
                            <span>{t('eventChecklist.dueDate')}</span>
                            <input type="date" value={draft.dueDate} onChange={(e) => setDraft({ dueDate: e.target.value })} />
                          </label>
                        )}
                        <div className="ck-add-flags">
                          <label className="ck-check-inline"><input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ required: e.target.checked })} />{t('eventChecklist.required')}</label>
                          {settings.photos.enabled && <label className="ck-check-inline"><input type="checkbox" checked={draft.requiresPhoto} onChange={(e) => setDraft({ requiresPhoto: e.target.checked })} />{t('eventChecklist.needsPhoto')}</label>}
                          <label className="ck-check-inline"><input type="checkbox" checked={draft.requiresReport} onChange={(e) => setDraft({ requiresReport: e.target.checked })} />{t('eventChecklist.needsReport')}</label>
                        </div>
                      </div>
                    )}
                  </form>
                )
              )}

              {settings.signOff.enabled && groupItems.length > 0 && !filtering && (
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
                      <button type="button" className="btn btn-primary" disabled={!readyToSign} onClick={() => setSignOffGroupId(group.id)}>
                        {t('eventChecklist.signOff.button')}
                      </button>
                    </div>
                  ) : isAdmin && (
                    <button type="button" className="ck-add-link ck-reopen" onClick={() => reopenGroup(group.id)}>{t('eventChecklist.signOff.reopen')}</button>
                  )}
                </div>
              )}
            </>}
          </div>
        );
      })}

      {settings.extraTasks && !filtering && (
        newGroup === null ? (
          <button type="button" className="ck-add-group" onClick={() => setNewGroup('')}><IconPlus /> {t('eventChecklist.groups.add')}</button>
        ) : (
          <form className="card ck-add ck-add-group-form" onSubmit={addGroup}>
            <IconPlus />
            <input autoFocus value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder={t('eventChecklist.groups.namePlaceholder')} aria-label={t('eventChecklist.groups.name')} onKeyDown={(e) => { if (e.key === 'Escape') setNewGroup(null); }} />
            <button type="button" className="btn btn-ghost" onClick={() => setNewGroup(null)}>{t('eventChecklist.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={!newGroup.trim()}>{t('eventChecklist.add')}</button>
          </form>
        )
      )}

      {openItem && (
        <ChecklistItemDrawer
          key={openItem.id}
          item={openItem}
          groupName={groupOf(openItem.groupId)?.name ?? ''}
          groups={groups}
          settings={settings}
          locked={isLocked(openItem.groupId)}
          canDelete={canDelete}
          assigneeOptions={assigneeOptions}
          usersLoading={people.isLoading}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          onClose={() => setOpenItemId(null)}
          onSetStatus={(status, note) => {
            if (status === 'done' && needsForm({ ...openItem, note: note || openItem.note })) { setCompletingId(openItem.id); return; }
            setStatus(openItem.id, status, note);
          }}
          onSaveNote={(note) => updateItem(openItem.id, (item) => ({ ...item, note, activity: log(item, 'note') }))}
          onAddPhotos={(files) => { void addPhotos(openItem.id, files); }}
          onRemovePhoto={(photoId) => updateItem(openItem.id, (item) => ({ ...item, photos: item.photos.filter((photo) => photo.id !== photoId), activity: log(item, 'photoRemoved') }))}
          onAssign={(userId) => assign(openItem, userId)}
          onEdit={(patch, detail) => editItem(openItem, patch, detail)}
          onDelete={() => removeItem(openItem)}
        />
      )}

      {completing && (
        <CompleteTaskModal
          key={completing.id}
          item={completing}
          settings={settings}
          onClose={() => setCompletingId(null)}
          onConfirm={({ files, report }) => { void completeWithProof(completing, files, report); }}
        />
      )}

      {signOffGroup && (
        <SignOffModal
          open
          stageName={signOffGroup.name}
          roles={missingRoles(signOffGroup.id)}
          defaultName={me}
          requireSignature={settings.signOff.requireSignature}
          summary={t('eventChecklist.signOff.summary', {
            event: event.name,
            done: eventItems.filter((item) => item.groupId === signOffGroup.id && item.status === 'done').length,
            na: eventItems.filter((item) => item.groupId === signOffGroup.id && item.status === 'na').length,
          })}
          onClose={() => setSignOffGroupId(null)}
          onConfirm={(input) => confirmSignOff(signOffGroup.id, input)}
        />
      )}
    </>
  );
}
