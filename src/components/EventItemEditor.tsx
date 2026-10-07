import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import TextInput from './TextInput';
import useGetAreaList from '../hooks/api/useGetAreaList';
import useGetSubArea from '../hooks/api/useGetSubArea';
import { OWNERSHIPS, type Ownership } from '../lib/eventLifecycle';
import ConversionForm, { type ConversionDraft, type ConversionSourceItem } from './ConversionForm';

export interface EventItemDraft {
  name: string; qty: number; area: string; areaId?: number; subArea?: string;
  subAreaId?: number; pic: string; note: string; ownerships: Ownership[];
}
export default function EventItemEditor({ initial, production, onSave, onClose, onConvert, conversionItems = [] }: {
  initial: EventItemDraft; production: boolean; onSave: (value: EventItemDraft) => void | Promise<void>; onClose: () => void;
  onConvert?: (value: ConversionDraft) => void | Promise<void>;
  conversionItems?: ConversionSourceItem[];
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [tab, setTab] = useState<'new' | 'convert'>('new');
  const [saving, setSaving] = useState(false);
  const { data: areaData } = useGetAreaList({});
  const { data: subData } = useGetSubArea({});
  const areas: { id: number; name: string }[] = areaData?.data?.data ?? [];
  const allSubAreas = subData?.data?.data ?? [];
  const subAreas = useMemo(() => allSubAreas.filter(row => row.area_id === value.areaId), [allSubAreas, value.areaId]);
  useEffect(() => {
    if (!value.areaId || subAreas.length === 0 || subAreas.some(row => row.id === value.subAreaId)) return;
    const first = subAreas[0];
    setValue(current => ({ ...current, subAreaId: first.id, subArea: first.sub_area_name }));
  }, [subAreas, value.areaId, value.subAreaId]);
  const valid = value.name.trim() && Number.isInteger(value.qty) && value.qty > 0 && areas.some(a => a.id === value.areaId)
    && (production ? (!value.subAreaId || subAreas.some(a => a.id === value.subAreaId)) : Boolean(value.subAreaId && subAreas.some(a => a.id === value.subAreaId)));
  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    try { await onSave(value); } finally { setSaving(false); }
  }
  return <Modal open title={t(production ? 'eventUpgrade.requestProduction' : 'eventUpgrade.modify')} onClose={() => { if (!saving) onClose(); }} footer={<>
    <button className="btn-cancel-modal" disabled={saving} onClick={onClose}>{t('wording.cancel')}</button>
    {tab === 'new' && <button className="btn-save-modal" disabled={!valid || saving} onClick={() => void save()}>{t(saving ? 'wording.saving' : production ? 'eventUpgrade.submit' : 'wording.save')}</button>}
  </>}>
    {production && onConvert && <div className="wi-tabs" role="tablist">{(['new', 'convert'] as const).map(mode => <button type="button" role="tab" aria-selected={tab === mode} className={`wi-tab-btn${tab === mode ? ' active' : ''}`} key={mode} onClick={() => setTab(mode)}>{t(mode === 'new' ? 'conversion.newProduction' : 'conversion.convert')}</button>)}</div>}
    {tab === 'convert' && onConvert ? <ConversionForm onSave={onConvert} eventItems={conversionItems} /> : <>
    {production && <p className="prod-notice prod-notice-info">{t('conversion.completeInfo')}</p>}
    {production ? <TextInput label={t('wording.name')} value={value.name} onChange={name => setValue(v => ({ ...v, name }))} isRequired /> : <strong>{value.name}</strong>}
    <div className="form-group"><label>{t('wording.qty')}</label><input type="number" min="1" step="1" value={value.qty} onChange={e => setValue(v => ({ ...v, qty: Number(e.target.value) }))} /></div>
    <div className="form-group"><label>{t('wording.area')}</label><SearchableSelect value={value.areaId ?? ''} onChange={id => { const areaId = Number(id); const first = allSubAreas.find(row => row.area_id === areaId); setValue(v => ({ ...v, areaId, area: areas.find(a => a.id === areaId)?.name ?? '', subAreaId: first?.id, subArea: first?.sub_area_name ?? '' })); }} options={areas.map(a => ({ value: a.id, label: a.name }))} placeholder={t('wording.selectArea')} /></div>
    <div className="form-group"><label>{t('wording.subArea')}</label><SearchableSelect value={value.subAreaId ?? ''} disabled={!value.areaId || subAreas.length === 0} onChange={id => setValue(v => ({ ...v, subAreaId: Number(id), subArea: subAreas.find(a => a.id === Number(id))?.sub_area_name ?? '' }))} options={subAreas.map(a => ({ value: a.id, label: a.sub_area_name }))} placeholder={t('wording.selectSubArea')} /></div>
    {!production && <>
      <TextInput label="PIC" value={value.pic} onChange={pic => setValue(v => ({ ...v, pic }))} />
      <fieldset className="form-group ownership-fieldset"><legend>{t('lifecycle.allOwnership')}</legend><div className="ownership-choice-list">{OWNERSHIPS.map(o => <label className="ownership-choice" key={o}><input type="checkbox" checked={value.ownerships.includes(o)} onChange={() => setValue(v => ({ ...v, ownerships: v.ownerships.includes(o) ? v.ownerships.filter(x => x !== o) : [...v.ownerships, o] }))} /><span>{o}</span></label>)}</div></fieldset>
    </>}
    <TextInput label={t('wording.notes')} value={value.note} onChange={note => setValue(v => ({ ...v, note }))} />
    </>}
  </Modal>;
}
