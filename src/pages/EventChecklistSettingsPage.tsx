import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IconArrowLeft } from '../components/icons';
import {
  DEFAULT_CHECKLIST_SETTINGS,
  saveChecklistSettings,
  useChecklistSettings,
  type ChecklistSettings,
  type DeletePermission,
  type SignerMode,
} from '../lib/checklistSettings';
import { isTenantAdminUser } from '../lib/tenantUser';
import { useChecklistStore } from '../lib/checklistStore';
import { useChecklistUsers } from '../components/checklist/useChecklistUsers';
import '../eventChecklist.css';

// Admin page that switches Event Checklist features on/off.
// Preview: saved in this browser. Backend: GET/PUT /v1/event-checklist-settings (tenant-wide).

function SwitchRow({ label, description, checked, disabled, onChange, children }: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className={`cks-row${disabled ? ' disabled' : ''}`}>
      <label className="cks-row-main">
        <span className="cks-row-text"><strong>{label}</strong><span>{description}</span></span>
        <input className="es-switch" type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      </label>
      {children && checked && !disabled && <div className="cks-row-sub">{children}</div>}
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="cks-choice">
      <span>{label}</span>
      <div className="ck-segment" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button key={option.value} type="button" role="radio" aria-checked={value === option.value} className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function EventChecklistSettingsPage() {
  const { t } = useTranslation();
  const saved = useChecklistSettings();
  const [draft, setDraft] = useState<ChecklistSettings>(saved);
  const isAdmin = isTenantAdminUser();
  const people = useChecklistUsers();
  const { outbox } = useChecklistStore();
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const k = (key: string) => t(`checklistSettings.${key}`);

  function patch<K extends keyof ChecklistSettings>(key: K, value: ChecklistSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    saveChecklistSettings(draft);
    toast.success(k('saved'));
  }

  if (!isAdmin) {
    return (
      <div className="card cks-denied">
        <h1 className="page-title">{t('navigation.items.checklistSettings')}</h1>
        <p>{k('adminOnly')}</p>
        <Link to="/event-checklist" className="btn btn-ghost"><IconArrowLeft /> {t('navigation.items.eventChecklist')}</Link>
      </div>
    );
  }

  return (
    <div className="cks">
      <Link to="/event-checklist" className="cks-back"><IconArrowLeft /> {t('navigation.items.eventChecklist')}</Link>
      <div className="ck-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{t('navigation.items.checklistSettings')}</h1>
          <p className="ck-intro">{k('intro')}</p>
        </div>
        <span className="ck-preview-badge" title={k('previewHint')}>{t('eventChecklist.preview')}</span>
      </div>

      <section className="card cks-group">
        <h2>{k('groups.evidence')}</h2>
        <SwitchRow label={k('photos.label')} description={k('photos.description')} checked={draft.photos.enabled} onChange={(enabled) => patch('photos', { ...draft.photos, enabled })}>
          <label className="cks-number">
            <span>{k('photos.max')}</span>
            <input type="number" min={1} max={20} value={draft.photos.maxPerTask} onChange={(event) => patch('photos', { ...draft.photos, maxPerTask: Math.min(20, Math.max(1, Number(event.target.value) || 1)) })} />
          </label>
          <label className="ck-check-inline">
            <input type="checkbox" checked={!draft.photos.allowGallery} onChange={(event) => patch('photos', { ...draft.photos, allowGallery: !event.target.checked })} />
            {k('photos.cameraOnly')}
          </label>
        </SwitchRow>
        <SwitchRow label={k('notes.label')} description={k('notes.description')} checked={draft.notes.enabled} onChange={(enabled) => patch('notes', { ...draft.notes, enabled })}>
          <label className="ck-check-inline">
            <input type="checkbox" checked={draft.notes.requireForException} onChange={(event) => patch('notes', { ...draft.notes, requireForException: event.target.checked })} />
            {k('notes.requireForException')}
          </label>
        </SwitchRow>
      </section>

      <section className="card cks-group">
        <h2>{k('groups.statuses')}</h2>
        <SwitchRow label={k('na.label')} description={k('na.description')} checked={draft.notApplicable} onChange={(value) => patch('notApplicable', value)} />
        <SwitchRow label={k('issues.label')} description={k('issues.description')} checked={draft.issues} onChange={(value) => patch('issues', value)} />
      </section>

      <section className="card cks-group">
        <h2>{k('groups.signOff')}</h2>
        <SwitchRow label={k('signOff.label')} description={k('signOff.description')} checked={draft.signOff.enabled} onChange={(enabled) => patch('signOff', { ...draft.signOff, enabled })}>
          <Choice<SignerMode>
            label={k('signOff.signer')}
            value={draft.signOff.signer}
            onChange={(signer) => patch('signOff', { ...draft.signOff, signer })}
            options={[
              { value: 'supervisor', label: t('eventChecklist.signOff.roles.supervisor') },
              { value: 'client', label: t('eventChecklist.signOff.roles.client') },
              { value: 'both', label: k('signOff.both') },
            ]}
          />
          <label className="ck-check-inline">
            <input type="checkbox" checked={draft.signOff.requireSignature} onChange={(event) => patch('signOff', { ...draft.signOff, requireSignature: event.target.checked })} />
            {k('signOff.requireSignature')}
          </label>
          <label className="ck-check-inline">
            <input type="checkbox" checked={draft.signOff.lockAfterSignOff} onChange={(event) => patch('signOff', { ...draft.signOff, lockAfterSignOff: event.target.checked })} />
            {k('signOff.lock')}
          </label>
        </SwitchRow>
      </section>

      <section className="card cks-group">
        <h2>{k('groups.notifications')}</h2>
        <SwitchRow label={k('notifyAdmins.label')} description={k('notifyAdmins.description')} checked={draft.notifyAdmins.enabled} onChange={(enabled) => patch('notifyAdmins', { ...draft.notifyAdmins, enabled })}>
          <Choice<'all' | 'required'>
            label={k('notifyAdmins.when')}
            value={draft.notifyAdmins.when}
            onChange={(when) => patch('notifyAdmins', { ...draft.notifyAdmins, when })}
            options={[
              { value: 'all', label: k('notifyAdmins.all') },
              { value: 'required', label: k('notifyAdmins.required') },
            ]}
          />
          <p className="cks-note">{k('notifyAdmins.recipients')}{people.admins.length ? ` ${people.admins.map((admin) => admin.email).filter(Boolean).join(', ')}` : ` ${k('notifyAdmins.noAdmins')}`}</p>
          <p className="cks-note">{k('notifyAdmins.previewNote')}</p>
        </SwitchRow>
        {outbox.length > 0 && (
          <div className="cks-outbox">
            <h3>{k('notifyAdmins.outbox')}</h3>
            <ul>
              {outbox.slice(0, 10).map((mail) => (
                <li key={mail.id}>
                  <strong>{mail.taskTitle}</strong>
                  <span>{mail.eventName} · {mail.by} · {new Date(mail.at).toLocaleString()}</span>
                  <span>{k('notifyAdmins.to')} {mail.to.length ? mail.to.join(', ') : '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card cks-group">
        <h2>{k('groups.planning')}</h2>
        <SwitchRow label={k('dueDates.label')} description={k('dueDates.description')} checked={draft.dueDates} onChange={(value) => patch('dueDates', value)} />
        <SwitchRow label={k('assignees.label')} description={k('assignees.description')} checked={draft.assignees} onChange={(value) => patch('assignees', value)} />
      </section>

      <section className="card cks-group">
        <h2>{k('groups.permissions')}</h2>
        <SwitchRow label={k('extraTasks.label')} description={k('extraTasks.description')} checked={draft.extraTasks} onChange={(value) => patch('extraTasks', value)} />
        <div className="cks-row">
          <Choice<DeletePermission>
            label={k('delete.label')}
            value={draft.deleteTasks}
            onChange={(value) => patch('deleteTasks', value)}
            options={[
              { value: 'everyone', label: k('delete.everyone') },
              { value: 'admin', label: k('delete.admin') },
              { value: 'nobody', label: k('delete.nobody') },
            ]}
          />
        </div>
      </section>

      <div className={`cks-savebar${dirty ? ' visible' : ''}`} aria-hidden={!dirty}>
        <span>{k('unsaved')}</span>
        <button type="button" className="btn btn-ghost" onClick={() => setDraft(saved)} tabIndex={dirty ? 0 : -1}>{k('discard')}</button>
        <button type="button" className="btn btn-primary" onClick={save} tabIndex={dirty ? 0 : -1}>{k('save')}</button>
      </div>

      <button
        type="button"
        className="cks-reset"
        onClick={() => setDraft(DEFAULT_CHECKLIST_SETTINGS)}
        disabled={JSON.stringify(draft) === JSON.stringify(DEFAULT_CHECKLIST_SETTINGS)}
      >
        {k('resetDefaults')}
      </button>
    </div>
  );
}
