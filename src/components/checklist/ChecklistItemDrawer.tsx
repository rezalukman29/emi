import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Drawer from '../Drawer';
import { IconClose, IconDelete } from '../icons';
import type { ChecklistItem, ChecklistStatus } from '../../data/eventChecklistMock';
import type { ChecklistSettings } from '../../lib/checklistSettings';

const STATUS_ORDER: ChecklistStatus[] = ['open', 'done', 'na', 'issue'];

/** Full task view used in the field: status, photos, note and history. */
export default function ChecklistItemDrawer({
  item, stageName, settings, locked, canDelete, formatDate, formatDateTime, onClose, onSetStatus, onSaveNote, onAddPhotos, onRemovePhoto, onDelete,
}: {
  item: ChecklistItem;
  stageName: string;
  settings: ChecklistSettings;
  locked: boolean;
  canDelete: boolean;
  formatDate: (iso: string) => string;
  formatDateTime: (iso: string) => string;
  onClose: () => void;
  onSetStatus: (status: ChecklistStatus, note: string) => void;
  onSaveNote: (note: string) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (photoId: number) => void;
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

  function choose(status: ChecklistStatus) {
    setError('');
    if (status === item.status) return;
    if (status === 'done' && needsPhoto && item.photos.length === 0) {
      setError(t('eventChecklist.drawer.needPhoto'));
      return;
    }
    if ((status === 'na' || status === 'issue') && noteRequiredFor && !note.trim()) {
      setError(t('eventChecklist.drawer.needNote'));
      noteRef.current?.focus();
      return;
    }
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

  return (
    <Drawer
      open
      title={item.title}
      subtitle={stageName}
      onClose={onClose}
      footer={<>
        {canDelete && !locked && (
          <button type="button" className="btn btn-soft-red" onClick={onDelete}><IconDelete /> {t('eventChecklist.delete')}</button>
        )}
        <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>{t('eventChecklist.drawer.close')}</button>
      </>}
    >
      <div className="ck-drawer">
        <div className="ck-item-meta">
          {item.required && <span className="ck-tag required">{t('eventChecklist.required')}</span>}
          {needsPhoto && <span className="ck-tag">{t('eventChecklist.photoRequired')}</span>}
          {settings.dueDates && item.dueDate && <span>{t('eventChecklist.dueOn', { date: formatDate(item.dueDate) })}</span>}
          {settings.assignees && item.assignee && <span>{t('eventChecklist.drawer.assignee', { name: item.assignee })}</span>}
        </div>

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

        {settings.photos.enabled && (
          <section>
            <h3 className="ck-drawer-label">
              {t('eventChecklist.drawer.photos')} <span>{item.photos.length}/{photoLimit}</span>
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

        {settings.notes.enabled && (
          <section>
            <h3 className="ck-drawer-label">{t('eventChecklist.drawer.note')}</h3>
            <textarea
              ref={noteRef}
              className="ck-note"
              rows={3}
              value={note}
              disabled={locked}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => { if (note.trim() !== item.note) onSaveNote(note.trim()); }}
              placeholder={t('eventChecklist.drawer.notePlaceholder')}
            />
            {noteRequiredFor && <p className="ck-drawer-hint">{t('eventChecklist.drawer.noteHint')}</p>}
          </section>
        )}

        <section>
          <h3 className="ck-drawer-label">{t('eventChecklist.drawer.history')}</h3>
          <ol className="ck-activity">
            {[...item.activity].reverse().map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                <span className="ck-activity-dot" aria-hidden="true" />
                <div>
                  <strong>{entry.by}</strong>{' '}
                  {t(`eventChecklist.activity.${entry.action}`, {
                    status: entry.detail ? t(`eventChecklist.status.${entry.detail}`, entry.detail) : '',
                    detail: entry.detail ?? '',
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
