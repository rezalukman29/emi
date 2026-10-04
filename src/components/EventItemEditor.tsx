import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import TextInput from './TextInput';
import useGetAreaList from '../hooks/api/useGetAreaList';
import useGetSubArea from '../hooks/api/useGetSubArea';
import { OWNERSHIPS, type Ownership } from '../lib/eventLifecycle';

export interface EventItemDraft {
  name: string; qty: number; area: string; areaId?: number; subArea?: string;
  subAreaId?: number; pic: string; note: string; neededBy: string; ownerships: Ownership[];
}
export default function EventItemEditor({ initial, production, onSave, onClose }: {
  initial: EventItemDraft; production: boolean; onSave: (value: EventItemDraft) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const { data: areaData } = useGetAreaList({});
  const { data: subData } = useGetSubArea({});
  const areas: { id: number; name: string }[] = areaData?.data?.data ?? [];
  const subAreas = (subData?.data?.data ?? []).filter(row => row.area_id === value.areaId);
  const valid = value.name.trim() && Number.isInteger(value.qty) && value.qty > 0 && areas.some(a => a.id === value.areaId)
    && (!value.subAreaId || subAreas.some(a => a.id === value.subAreaId));
  return <Modal open title={t(production ? 'eventUpgrade.requestProduction' : 'eventUpgrade.modify')} onClose={onClose} footer={<>
    <button className="btn-cancel-modal" onClick={onClose}>{t('wording.cancel')}</button>
    <button className="btn-save-modal" disabled={!valid} onClick={() => onSave(value)}>{t(production ? 'eventUpgrade.submit' : 'wording.save')}</button>
  </>}>
    <p className="ed-lock-note">{t('eventUpgrade.preview')}</p>
    {production ? <TextInput label={t('wording.name')} value={value.name} onChange={name => setValue(v => ({ ...v, name }))} isRequired /> : <strong>{value.name}</strong>}
    <div className="form-group"><label>{t('wording.qty')}</label><input type="number" min="1" step="1" value={value.qty} onChange={e => setValue(v => ({ ...v, qty: Number(e.target.value) }))} /></div>
    <div className="form-group"><label>{t('wording.area')}</label><SearchableSelect value={value.areaId ?? ''} onChange={id => setValue(v => ({ ...v, areaId: Number(id), area: areas.find(a => a.id === Number(id))?.name ?? '', subAreaId: undefined, subArea: '' }))} options={areas.map(a => ({ value: a.id, label: a.name }))} placeholder={t('wording.selectArea')} /></div>
    <div className="form-group"><label>{t('wording.subArea')}</label><SearchableSelect value={value.subAreaId ?? ''} disabled={!value.areaId} onChange={id => setValue(v => ({ ...v, subAreaId: id ? Number(id) : undefined, subArea: subAreas.find(a => a.id === Number(id))?.sub_area_name ?? '' }))} options={[{ value: '', label: '—' }, ...subAreas.map(a => ({ value: a.id, label: a.sub_area_name }))]} placeholder={t('wording.selectSubArea')} /></div>
    {production ? <div className="form-group"><label>{t('eventUpgrade.neededBy')}</label><input type="date" value={value.neededBy} onChange={e => setValue(v => ({ ...v, neededBy: e.target.value }))} /></div> : <>
      <TextInput label="PIC" value={value.pic} onChange={pic => setValue(v => ({ ...v, pic }))} />
      <div className="form-group"><label>{t('lifecycle.allOwnership')}</label><div className="bulk-own-target">{OWNERSHIPS.map(o => <label key={o}><input type="checkbox" checked={value.ownerships.includes(o)} onChange={() => setValue(v => ({ ...v, ownerships: v.ownerships.includes(o) ? v.ownerships.filter(x => x !== o) : [...v.ownerships, o] }))} /> {o}</label>)}</div></div>
    </>}
    <TextInput label={t('wording.notes')} value={value.note} onChange={note => setValue(v => ({ ...v, note }))} />
  </Modal>;
}
