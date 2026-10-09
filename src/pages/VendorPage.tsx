import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import TextInput from '../components/TextInput';
import SearchableSelect from '../components/SearchableSelect';
import SourcePreviewNotice from '../components/SourcePreviewNotice';
import { IconPlus, IconEdit, IconDelete } from '../components/icons';
import { updateSourcePreview, useSourcePreview, type Vendor } from '../lib/sourcePreview';

const empty: Omit<Vendor, 'id'> = { name: '', contact: '', type: '', origin: 'External' };
export default function VendorPage() {
  const { t } = useTranslation();
  const { vendors } = useSourcePreview();
  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Vendor | null>(null);
  const filtered = vendors.filter(v => (!origin || v.origin === origin) && `${v.name} ${v.contact} ${v.type}`.toLowerCase().includes(search.trim().toLowerCase()));
  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  const shown = filtered.slice((safePage - 1) * 10, safePage * 10);
  function save() {
    if (!form.name.trim()) return;
    try {
      updateSourcePreview(data => {
        const vendor = { ...form, name: form.name.trim(), contact: form.contact.trim(), type: form.type.trim(), id: editing ?? Math.max(0, ...data.vendors.map(v => v.id)) + 1 };
        data.vendors = editing ? data.vendors.map(v => v.id === editing ? vendor : v) : [...data.vendors, vendor];
      });
      setOpen(false);
    } catch { toast.error(t('lifecycle.saveFailed')); }
  }
  function remove() {
    if (!deleting) return;
    try { updateSourcePreview(data => { data.vendors = data.vendors.filter(v => v.id !== deleting.id); }); setDeleting(null); }
    catch { toast.error(t('lifecycle.saveFailed')); }
  }
  return <>
    <div className="toolbar"><h1 className="page-title">{t('sourceUpgrade.vendors')}</h1><button className="btn-new" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}><IconPlus />{t('sourceUpgrade.newVendor')}</button></div>
    <SourcePreviewNotice />
    <div className="stats-bar">{['all', 'Internal', 'External'].map(value => <div className="stat-card" key={value}><strong className="stat-value">{vendors.filter(v => value === 'all' || v.origin === value).length}</strong><span>{value === 'all' ? t('sourceUpgrade.vendors') : value}</span></div>)}</div>
    <div className="card">
      <div className="toolbar"><div className="toolbar-left"><input aria-label={t('wording.search')} className="search-input" placeholder={t('wording.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /><SearchableSelect value={origin} onChange={v => { setOrigin(String(v)); setPage(1); }} options={[{ value: '', label: t('wording.all') }, ...['Internal', 'External'].map(value => ({ value, label: value }))]} /></div></div>
      <div className="table-wrap"><table><thead><tr>{['name', 'origin', 'category', 'contact', 'action'].map(key => <th key={key}>{t('sourceUpgrade.' + key)}</th>)}</tr></thead><tbody>
        {!shown.length && <tr><td colSpan={5}>{t('wording.noData')}</td></tr>}
        {shown.map(v => <tr key={v.id}><td className="name-cell">{v.name}</td><td><span className={`badge badge-${v.origin === 'Internal' ? 'green' : 'orange'}`}>{v.origin}</span></td><td>{v.type || '—'}</td><td>{v.contact || '—'}</td><td><div className="action-btns"><button className="btn-icon edit" aria-label={t('wording.edit')} onClick={() => { setEditing(v.id); setForm(v); setOpen(true); }}><IconEdit /></button><button className="btn-icon delete" aria-label={t('wording.delete')} onClick={() => setDeleting(v)}><IconDelete /></button></div></td></tr>)}
      </tbody></table></div><Pagination currentPage={safePage} total={filtered.length} pageSize={10} onPage={setPage} label={t('sourceUpgrade.vendors')} />
    </div>
    <Modal open={open} title={t(editing ? 'sourceUpgrade.editVendor' : 'sourceUpgrade.newVendor')} onClose={() => setOpen(false)} footer={<><button className="btn-cancel-modal" onClick={() => setOpen(false)}>{t('wording.cancel')}</button><button className="btn-save-modal" disabled={!form.name.trim()} onClick={save}>{t('wording.save')}</button></>}>
      <TextInput label={t('wording.name')} isRequired value={form.name} onChange={name => setForm(f => ({ ...f, name }))} />
      <div className="form-group"><label>{t('sourceUpgrade.origin')}</label><SearchableSelect value={form.origin} onChange={origin => setForm(f => ({ ...f, origin: origin as Vendor['origin'] }))} options={['Internal', 'External'].map(value => ({ value, label: value }))} /></div>
      <TextInput label={t('sourceUpgrade.category')} value={form.type} onChange={type => setForm(f => ({ ...f, type }))} /><TextInput label={t('sourceUpgrade.contact')} value={form.contact} onChange={contact => setForm(f => ({ ...f, contact }))} />
    </Modal>
    <Modal open={Boolean(deleting)} title={t('wording.delete')} onClose={() => setDeleting(null)} footer={<><button className="btn-cancel-modal" onClick={() => setDeleting(null)}>{t('wording.cancel')}</button><button className="btn-del-ok" onClick={remove}>{t('wording.delete')}</button></>}><p>{t('sourceUpgrade.deleteVendor', { name: deleting?.name })}</p></Modal>
  </>;
}
