import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { IconClose } from '../icons';
import type { ChecklistItem } from '../../data/eventChecklistMock';
import type { ChecklistSettings } from '../../lib/checklistSettings';

// Form shown when a task is ticked that needs proof (owner 2026-11-23): photo(s) and/or a written
// report, as set on the task. Tasks that need neither are ticked straight away, without this form.

export default function CompleteTaskModal({ item, settings, onClose, onConfirm }: {
  item: ChecklistItem;
  settings: ChecklistSettings;
  onClose: () => void;
  onConfirm: (input: { files: File[]; report: string }) => void;
}) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [report, setReport] = useState(item.note);
  const [tried, setTried] = useState(false);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const needsPhoto = settings.photos.enabled && item.requiresPhoto;
  const needsReport = item.requiresReport;
  const room = Math.max(0, settings.photos.maxPerTask - item.photos.length);
  const photoCount = item.photos.length + files.length;
  const photoMissing = needsPhoto && photoCount === 0;
  const reportMissing = needsReport && !report.trim();

  function add(list: FileList | null) {
    if (!list?.length) return;
    const images = Array.from(list).filter((file) => file.type.startsWith('image/'));
    setFiles((current) => [...current, ...images].slice(0, room));
  }

  function submit() {
    setTried(true);
    if (photoMissing || reportMissing) return;
    onConfirm({ files, report: report.trim() });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('eventChecklist.complete.title')}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('eventChecklist.cancel')}</button>
        <button type="button" className="btn btn-primary" onClick={submit}>{t('eventChecklist.complete.confirm')}</button>
      </>}
    >
      <div className="ck-complete">
        <p className="ck-complete-task">{item.title}</p>
        <p className="ck-drawer-hint">{t('eventChecklist.complete.hint')}</p>

        {needsPhoto && (
          <section>
            <h3 className="ck-drawer-label">{t('eventChecklist.complete.photos')} <span className="ck-req">*</span> <span>{photoCount}/{settings.photos.maxPerTask}</span></h3>
            <div className="ck-photos">
              {item.photos.map((photo) => (
                <figure key={photo.id} className="ck-photo"><span className="ck-photo-open"><img src={photo.url} alt="" /></span></figure>
              ))}
              {previews.map((url, index) => (
                <figure key={url} className="ck-photo">
                  <span className="ck-photo-open"><img src={url} alt="" /></span>
                  <button type="button" className="ck-photo-remove" aria-label={t('eventChecklist.drawer.removePhoto')} onClick={() => setFiles((list) => list.filter((_, i) => i !== index))}><IconClose /></button>
                </figure>
              ))}
              {files.length < room && (
                <label className="ck-photo-add">
                  <input
                    type="file"
                    accept="image/*"
                    multiple={settings.photos.allowGallery}
                    {...(settings.photos.allowGallery ? {} : { capture: 'environment' as const })}
                    onChange={(event) => { add(event.target.files); event.target.value = ''; }}
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <span>{settings.photos.allowGallery ? t('eventChecklist.drawer.addPhoto') : t('eventChecklist.drawer.takePhoto')}</span>
                </label>
              )}
            </div>
            {tried && photoMissing && <p className="ck-drawer-error" role="alert">{t('eventChecklist.drawer.needPhoto')}</p>}
          </section>
        )}

        {needsReport && (
          <section>
            <label className="ck-drawer-label" htmlFor="ck-complete-report">{t('eventChecklist.complete.report')} <span className="ck-req">*</span></label>
            <textarea
              id="ck-complete-report"
              className="ck-note"
              rows={4}
              value={report}
              onChange={(event) => setReport(event.target.value)}
              placeholder={t('eventChecklist.complete.reportPlaceholder')}
            />
            {tried && reportMissing && <p className="ck-drawer-error" role="alert">{t('eventChecklist.complete.needReport')}</p>}
          </section>
        )}
      </div>
    </Modal>
  );
}
