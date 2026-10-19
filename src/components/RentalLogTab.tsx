import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useSourcePreview, updateSourcePreview, type RentalPreview } from '../lib/sourcePreview';
import { useGetVendors } from '../hooks/api/useVendors';
import SearchableSelect from './SearchableSelect';
import Modal from './Modal';
import { Link } from 'react-router-dom';
import { fmtNum, formatIDR } from '../lib/format';
import { createPortal } from 'react-dom';

export default function RentalLogTab({ eventId, vendorId, canCreate = true }: { eventId?: number; vendorId?: number; canCreate?: boolean }) {
  const { t } = useTranslation();
  const preview = useSourcePreview();
  const [open, setOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const vendors = useGetVendors({ params: { limit: 100, search: vendorSearch }, options: { enabled: open } });
  const [draft, setDraft] = useState({ vendorId: 0, name: '', qty: 1, cost: 0, due: '', destination: '' });
  const rows = preview.rentals.filter(row => (!eventId || row.eventId === eventId) && (!vendorId || row.vendorId === vendorId));
  function write(update: (rows: RentalPreview[]) => RentalPreview[]) {
    try { updateSourcePreview(data => { data.rentals = update(data.rentals); }); return true; }
    catch { toast.error(t('lifecycle.saveFailed')); return false; }
  }
  function save() {
    const vendor = vendors.data?.data.items.find(row => row.id === draft.vendorId);
    if (!vendor || !draft.name.trim() || !draft.destination.trim() || !draft.due || !Number.isInteger(draft.qty) || draft.qty < 1 || !Number.isFinite(draft.cost) || draft.cost < 0) return;
    if (write(rows => [{ ...draft, id: crypto.randomUUID(), vendorName: vendor.name, eventId, status: 'Requested', createdAt: new Date().toISOString() }, ...rows])) setOpen(false);
  }
  return <section className="card"><div className="oct-toolbar"><h3>{t('october.rentals')}</h3>{canCreate && <button className="btn-new" onClick={() => { setDraft({ vendorId: vendorId || 0, name: '', qty: 1, cost: 0, due: '', destination: '' }); setOpen(true); }}>{t('october.newRental')}</button>}</div><p className="ed-lock-note">{t('october.rentalPreview')}</p><div className="table-wrap"><table><thead><tr>{['item', 'vendor', 'qty', 'cost', 'dueDate', 'status'].map(key => <th key={key}>{t(`october.${key}`)}</th>)}<th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.name}<small style={{ display: 'block' }}>{row.destination}</small></td><td>{row.vendorName}</td><td>{fmtNum(row.qty)}</td><td>{formatIDR(row.cost * row.qty)}</td><td>{row.due}</td><td>{t(`october.${row.status.toLowerCase()}`)}</td><td>{row.eventId && row.eventId !== eventId && <Link to={`/event-detail?id=${row.eventId}`}>{t('october.event')}</Link>}{canCreate && (!row.eventId || row.eventId === eventId) && row.status !== 'Returned' && <button className="btn btn-ghost" onClick={() => write(rows => rows.map(item => item.id === row.id ? { ...item, status: item.status === 'Requested' ? 'Borrowed' : 'Returned' } : item))}>{t(`october.${row.status === 'Requested' ? 'borrowed' : 'returned'}`)}</button>}{canCreate && (!row.eventId || row.eventId === eventId) && row.status === 'Requested' && <button className="btn btn-ghost" onClick={() => window.confirm(t('wording.delete') + '?') && write(rows => rows.filter(item => item.id !== row.id))}>{t('wording.delete')}</button>}</td></tr>)}</tbody></table></div>
    {createPortal(<Modal open={open} onClose={() => setOpen(false)} title={t('october.newRental')} footer={<button className="btn-save-modal" onClick={save} disabled={!draft.vendorId || !draft.name.trim() || !draft.destination.trim() || !draft.due || draft.qty < 1}>{t('october.save')}</button>}>
      <p className="ed-lock-note">{t('october.rentalPreview')}</p>
      <div className="form-group"><label>{t('october.vendor')}</label><SearchableSelect value={draft.vendorId} onChange={value => setDraft({ ...draft, vendorId: Number(value) })} options={(vendors.data?.data.items || []).map(row => ({ value: row.id, label: row.name }))} onSearchChange={setVendorSearch} /></div>
      {[{ key: 'name', label: 'name', type: 'text' }, { key: 'qty', label: 'qty', type: 'number' }, { key: 'cost', label: 'cost', type: 'number' }, { key: 'due', label: 'dueDate', type: 'date' }, { key: 'destination', label: eventId ? 'event' : 'warehouse', type: 'text' }].map(field => <div className="form-group" key={field.key}><label>{t(`october.${field.label}`)}</label><input type={field.type} min={field.key === 'qty' ? 1 : 0} value={draft[field.key as keyof typeof draft]} onChange={e => setDraft({ ...draft, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })} /></div>)}
    </Modal>, document.body)}
  </section>;
}
