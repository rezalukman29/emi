import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import SignaturePad from './SignaturePad';
import type { SignerRole } from '../../lib/checklistSettings';

export interface SignOffInput {
  role: SignerRole;
  name: string;
  signature: string | null;
  note: string;
}

/** Collects one sign-off (name, optional drawn signature, note) for a stage. */
export default function SignOffModal({ open, stageName, roles, defaultName, requireSignature, summary, onClose, onConfirm }: {
  open: boolean;
  stageName: string;
  /** Roles still missing a signature; the first is preselected. */
  roles: SignerRole[];
  defaultName: string;
  requireSignature: boolean;
  summary: string;
  onClose: () => void;
  onConfirm: (input: SignOffInput) => void;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<SignerRole>(roles[0] ?? 'supervisor');
  const [name, setName] = useState(roles[0] === 'client' ? '' : defaultName);
  const [signature, setSignature] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const canSubmit = name.trim() && confirmed && (!requireSignature || signature);

  function pickRole(next: SignerRole) {
    setRole(next);
    setName(next === 'client' ? '' : defaultName);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('eventChecklist.signOff.title', { stage: stageName })}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('eventChecklist.cancel')}</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canSubmit}
          onClick={() => onConfirm({ role, name: name.trim(), signature, note: note.trim() })}
        >
          {t('eventChecklist.signOff.confirm')}
        </button>
      </>}
    >
      <div className="ck-signoff-form">
        <p className="ck-signoff-summary">{summary}</p>
        {roles.length > 1 && (
          <div className="ck-segment" role="group" aria-label={t('eventChecklist.signOff.signAs')}>
            {roles.map((option) => (
              <button key={option} type="button" className={role === option ? 'active' : ''} aria-pressed={role === option} onClick={() => pickRole(option)}>
                {t(`eventChecklist.signOff.roles.${option}`)}
              </button>
            ))}
          </div>
        )}
        <label className="ck-field grow">
          <span>{t(`eventChecklist.signOff.nameLabel.${role}`)}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('eventChecklist.signOff.namePlaceholder')} />
        </label>
        {requireSignature && (
          <div className="ck-field grow">
            <span>{t('eventChecklist.signOff.signature')}</span>
            <SignaturePad onChange={setSignature} />
          </div>
        )}
        <label className="ck-field grow">
          <span>{t('eventChecklist.signOff.note')}</span>
          <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('eventChecklist.signOff.notePlaceholder')} />
        </label>
        <label className="ck-check-inline ck-confirm">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          {t('eventChecklist.signOff.confirmText')}
        </label>
      </div>
    </Modal>
  );
}
