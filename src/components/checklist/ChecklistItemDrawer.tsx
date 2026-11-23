import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Drawer from '../Drawer';
import { IconClose, IconDelete } from '../icons';
import SearchableSelect, { type SearchableSelectOption } from '../SearchableSelect';
import type { ChecklistGroup, ChecklistItem, ChecklistStatus } from '../../data/eventChecklistMock';
import type { ChecklistSettings } from '../../lib/checklistSettings';

const STATUS_ORDER: ChecklistStatus[] = ['open', 'done', 'na', 'issue'];

type EditablePatch = Partial<Pick<ChecklistItem, 'required' | 'requiresPhoto' | 'requiresReport' | 'dueDate' | 'groupId'>>;

/** Full task view: status, assignee, requirements, photos, report and history. */
export default function ChecklistItemDrawer({
  item, groupName, groups, settings, locked, canDelete, assigneeOptions, usersLoading, formatDate, formatDateTime,
  onClose, onSetStatus, onSaveNote, onAddPhotos, onRemovePhoto, onAssign, onEdit, onDelete,
}: {
  item: ChecklistItem;
  groupName: string;
  groups: ChecklistGroup[];
  settings: ChecklistSettings;
  locked: boolean;
  canDelete: boolean;
  assigneeOptions: SearchableSelectOption[];
  usersLoading: boolean;
  formatDate: (iso: string) => string;
  formatDateTime: (iso: string) => string;
  onClose: () => void;
  onSetStatus: (status: ChecklistStatus, note: string) => void;
  onSaveNote: (note: string) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (photoId: number) => void;
  onAssign: (userId: number | null) => void;
  onEdit: (patch: EditablePatch, detail: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState(item.note);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const statuses = STATUS_ORDER.filter((status) =>
    (status !== 'na' || settings.notApplicable || item.status === 'na') &&
    (status !== 'issue' || settings.issues || item.status === 'issue'));
  const photoLimit = settings.photos.maxPerTask;
  const needsPhoto = settings.photos.enabled && item.requiresPhoto;
  const noteRequiredFor = settings.notes.enabled && settings.notes.requireForException;
  const showNote = settings.notes.enabled || item.requiresReport || Boolean(item.note);

  function choose(status: ChecklistStatus) {
    setError('');
    if (status === item.status) return;
    if ((status === 'na' || status === 'issue') && noteRequiredFor && !note.trim()) {
      setError(t('eventChecklist.drawer.needNote'));
      noteRef.current?.focus();
      return;
    }
    // "Done" on a task that still needs a photo / report opens the proof form (handled by the panel).
    onSetStatus(status, note.trim());
  }

  function pickFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const room = photoLimit - item.photos.length;
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, room));
    if (fileList.length > room) setError(t('eventChecklist.drawer.photoLimit', { count: photoLimit }));
    else setError('');
    if (files.length) onAddPhotos(files);
  }

  const flag = (key: 'required' | 'requiresPhoto' | 'requiresReport', label: string) => (
    <label className="ck-check-inline">
      <input type="checkbox" checked={item[key]} disabled={locked} onChange={(event) => onEdit({ [key]: event.target.checked }, `${label}: ${event.target.checked ? '✓' : '✗'}`)} />
      {label}
    </label>
  );

  return (
    <Drawer
      open
      title={item.title}
      subtitle={groupName}
      onClose={onClose}
      footer={<>
        {canDelete && !locked && (
          <button type="button" className="btn btn-soft-red" onClick={onDelete}><IconDelete /> {t('eventChecklist.delete')}</button>
        )}
        <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>{t('eventChecklist.drawer.close')}</button>
      </>}
    >
      <div className="ck-drawer">
        {locked && <div className="ck-locked-note">{t('eventChecklist.drawer.locked')}</div>}

        <section>
          <h3 className="ck-drawer-label">{t('eventChecklist.drawer.status')}</h3>
          <div className="ck-status-picker" role="radiogroup" aria-label={t('eventChecklist.drawer.status')}>
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={item.status === status}
                className={`ck-status-option ${status}${item.status === status ? ' active' : ''}`}
                disabled={locked}
                onClick={() => choose(status)}
              >
                {t(`eventChecklist.status.${status}`)}
              </button>
            ))}
          </div>
          {item.statusBy && item.statusAt && item.status !== 'open' && (
            <p className="ck-drawer-hint">{t('eventChecklist.drawer.setBy', { status: t(`eventChecklist.status.${item.status}`), name: item.statusBy, date: formatDateTime(item.statusAt) })}</p>
          )}
          {error && <p className="ck-drawer-error" role="alert">{error}</p>}
        </section>

        <section className="ck-drawer-grid">
          {settings.assignees && (
            <div className="ck-field">
              <span>{t('eventChecklist.assign.label')}</span>
              <SearchableSelect
                value={item.assigneeId ?? 0}
                options={assigneeOptions}
                disabled={locked}
                placeholder={usersLoading ? t('wording.loading') : item.assignee ?? t('eventChecklist.assign.nobody')}
                onChange={(value) => onAssign(Number(value) || null)}
              />
            </div>
          )}
          <label className="ck-field">
            <span>{t('eventChecklist.groups.label')}</span>
            <select value={item.groupId} disabled={locked} onChange={(event) => {
              const target = groups.find((group) => group.id === Number(event.target.value));
              if (target) onEdit({ groupId: target.id }, `${t('eventChecklist.groups.label')}: ${target.name}`);
            }}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          {settings.dueDates && (
            <label className="ck-field">
              <span>{t('eventChecklist.dueDate')}</span>
              <input type="date" value={item.dueDate ?? ''} disabled={locked} onChange={(event) => onEdit({ dueDate: event.target.value || null }, `${t('eventChecklist.dueDate')}: ${event.target.value ? formatDate(event.target.value) : '—'}`)} />
            </label>
          )}
        </section>

        <section>
          <h3 className="ck-drawer-label">{t('eventChecklist.drawer.requirements')}</h3>
          <div className="ck-add-flags">
            {flag('required', t('eventChecklist.required'))}
            {settings.photos.enabled && flag('requiresPhoto', t('eventChecklist.needsPhoto'))}
            {flag('requiresReport', t('eventChecklist.needsReport'))}
          </div>
        </section>

        {settings.photos.enabled && (
          <section>
            <h3 className="ck-drawer-label">
              {t('eventChecklist.drawer.photos')} {needsPhoto && <span className="ck-req">*</span>} <span>{item.photos.length}/{photoLimit}</span>
            </h3>
            <div className="ck-photos">
              {item.photos.map((photo) => (
                <figure key={photo.id} className="ck-photo">
                  <button type="button" className="ck-photo-open" onClick={() => setPreview(photo.url)} aria-label={t('eventChecklist.drawer.openPhoto')}>
                    <img src={photo.url} alt="" />
                  </button>
                  <figcaption>{photo.by} · {formatDateTime(photo.at)}</figcaption>
                  {!locked && (
                    <button type="button" className="ck-photo-remove" aria-label={t('eventChecklist.drawer.removePhoto')} onClick={() => onRemovePhoto(photo.id)}>
                      <IconClose />
                    </button>
                  )}
                </figure>
              ))}
              {!locked && item.photos.length < photoLimit && (
                <label className="ck-photo-add">
                  <input
                    type="file"
                    accept="image/*"
                    multiple={settings.photos.allowGallery}
                    {...(settings.photos.allowGallery ? {} : { capture: 'environment' as const })}
                    onChange={(event) => { pickFiles(event.target.files); event.target.value = ''; }}
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <span>{settings.photos.allowGallery ? t('eventChecklist.drawer.addPhoto') : t('eventChecklist.drawer.takePhoto')}</span>
                </label>
              )}
            </div>
            {needsPhoto && item.photos.length === 0 && <p className="ck-drawer-hint">{t('eventChecklist.drawer.photoHint')}</p>}
          </section>
        )}

        {showNote && (
          <section>
            <h3 className="ck-drawer-label">{item.requiresReport ? t('eventChecklist.complete.report') : t('eventChecklist.drawer.note')} {item.requiresReport && <span className="ck-req">*</span>}</h3>
            <textarea
              ref={noteRef}
              className="ck-note"
              rows={3}
              value={note}
              disabled={locked}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => { if (note.trim() !== item.note) onSaveNote(note.trim()); }}
              placeholder={item.requiresReport ? t('eventChecklist.complete.reportPlaceholder') : t('eventChecklist.drawer.notePlaceholder')}
            />
            {noteRequiredFor && !item.requiresReport && <p className="ck-drawer-hint">{t('eventChecklist.drawer.noteHint')}</p>}
          </section>
        )}

        <section>
          <h3 className="ck-drawer-label">{t('eventChecklist.drawer.history')}</h3>
          <p className="ck-drawer-hint">{t('eventChecklist.drawer.historyHint')}</p>
          <ol className="ck-activity">
            {[...item.activity].reverse().map((entry, index) => (
              <li key={`${entry.at}-${index}`} className={`act-${entry.action}`}>
                <span className="ck-activity-dot" aria-hidden="true" />
                <div>
                  <strong>{entry.by}</strong>{' '}
                  {t(`eventChecklist.activity.${entry.action}`, {
                    status: entry.detail ? t(`eventChecklist.status.${entry.detail}`, entry.detail) : '',
                    detail: entry.detail ?? '',
                    count: Number(entry.detail) || 0,
                  })}
                  <time>{formatDateTime(entry.at)}</time>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {preview && (
        <div className="ck-lightbox" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <img src={preview} alt="" />
          <button type="button" className="ck-lightbox-close" aria-label={t('eventChecklist.drawer.close')} onClick={() => setPreview(null)}><IconClose /></button>
        </div>
      )}
    </Drawer>
  );
}
