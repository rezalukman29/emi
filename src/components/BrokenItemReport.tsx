import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Modal from './Modal';
import TextInput from './TextInput';
import SourcePreviewNotice from './SourcePreviewNotice';
import { updateSourcePreview, validBrokenQuantity, type BrokenReport } from '../lib/sourcePreview';

export default function BrokenItemReport({ eventId, item, report, onClose }: {
  eventId: number; item: { id: number; name: string; qty: number }; report?: BrokenReport; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [qty, setQty] = useState(report?.qty ?? 1);
  const [note, setNote] = useState(report?.note ?? '');
  const valid = validBrokenQuantity(qty, item.qty);
  function save() {
    if (!valid) return;
    try {
      const auth = JSON.parse(localStorage.getItem('auth') || 'null');
      updateSourcePreview(data => {
        data.reports[eventId] ||= {};
        data.reports[eventId][item.id] = { qty, note: note.trim(), by: auth?.fullname ?? '', at: new Date().toISOString() };
      });
      onClose();
    } catch { toast.error(t('lifecycle.saveFailed')); }
  }
  return <Modal open title={t(report ? 'sourceUpgrade.editReport' : 'sourceUpgrade.report')} onClose={onClose} footer={<><button className="btn-cancel-modal" onClick={onClose}>{t('wording.cancel')}</button><button className="btn-save-modal" disabled={!valid} onClick={save}>{t('wording.save')}</button></>}>
    <SourcePreviewNotice /><h3>{item.name}</h3>
    <div className="form-group"><label htmlFor="broken-quantity">{t('wording.qty')} (1–{item.qty})</label><input id="broken-quantity" type="number" min={1} max={item.qty} step={1} value={qty} onChange={e => setQty(Number(e.target.value))} /></div>
    <TextInput label={t('wording.notes')} value={note} onChange={setNote} />
  </Modal>;
}
