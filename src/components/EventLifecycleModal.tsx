import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Modal from './Modal';
import TextInput from './TextInput';
import SearchableSelect from './SearchableSelect';
import type { EventItem } from '../hooks/api/useGetEventItem';
import type { EventStatusItem } from '../hooks/api/useGetEventStatus';
import useGetUpcomingEvents from '../hooks/api/useGetUpcomingEvents';
import useGetPastEvents from '../hooks/api/useGetPastEvents';
import { OWNERSHIPS, ownershipClass, resolveLifecycle, updateLifecycle, useEventLifecycle, type Ownership } from '../lib/eventLifecycle';

export type LifecycleModalMode = 'ownership' | 'check' | 'return' | null;
export default function EventLifecycleModal({ eventId, eventName, items, stages, mode, onClose }: {
  eventId: number; eventName: string; items: EventItem[]; stages: EventStatusItem[];
  mode: LifecycleModalMode; onClose: () => void;
}) {
  const { t } = useTranslation();
  const store = useEventLifecycle();
  const local = store.events[eventId];
  const [target, setTarget] = useState<Ownership>('IHC');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [transferId, setTransferId] = useState<number | null>(null);
  const [targetEvent, setTargetEvent] = useState('');
  const [targetStage, setTargetStage] = useState('');
  const { data: upcoming } = useGetUpcomingEvents({ search: '', allDates: true, options: { enabled: mode === 'return' } });
  const { data: past } = useGetPastEvents({ search: '', options: { enabled: mode === 'return' } });
  const candidates = [...new Map([...(upcoming?.data?.data || []), ...(past?.data?.data || [])].map(e => [e.id, e])).values()]
    .filter(e => e.id !== eventId && ['upcoming', 'on-going', 'ready-to-close'].includes(resolveLifecycle(e, store.events[e.id], stages[stages.length - 1]?.id)));
  const ownership = (id: number) => local?.items?.[id]?.ownership || 'IHC';
  const shown = items.filter(item => (!query || `${item.nama_barang} ${item.area_name}`.toLowerCase().includes(query.toLowerCase())) && (!from || ownership(item.id) === from));
  const unresolved = items.filter(item => !local?.items?.[item.id]?.resolution);
  const checked = items.filter(item => local?.items?.[item.id]?.checked).length;
  function run(update: Parameters<typeof updateLifecycle>[0], description?: string) {
    try { updateLifecycle(update, description); return true; }
    catch { toast.error(t('lifecycle.saveFailed')); return false; }
  }
  function patchItem(id: number, patch: { checked?: boolean; resolution?: 'returned' }) {
    run(data => {
      const event = data.events[eventId] ||= {};
      event.items ||= {};
      event.items[id] = { ...event.items[id], ...patch };
    }, `${eventName}: ${patch.resolution || 'Cross check'} ${id}`);
  }
  function applyOwnership() {
    const ids = items.filter(item => selected.includes(item.id) && ownership(item.id) !== target).map(item => item.id);
    if (!ids.length) { onClose(); return; }
    if (run(data => {
      const event = data.events[eventId] ||= {}; event.items ||= {};
      ids.forEach(id => { event.items![id] = { ...event.items![id], ownership: target }; });
    }, `${eventName}: Bulk ownership ${target} (${ids.length})`)) onClose();
  }
  function transfer(item: EventItem) {
    if (!candidates.some(e => e.id === Number(targetEvent)) || !stages.some(s => s.id === Number(targetStage))) return;
    if (run(data => {
      const source = data.events[eventId] ||= {}; source.items ||= {};
      if (source.items[item.id]?.resolution) return;
      source.items[item.id] = { ...source.items[item.id], resolution: 'transferred' };
      const destination = data.events[Number(targetEvent)] ||= {};
      const newId = -Date.now();
      destination.incoming = [...(destination.incoming || []), {
        ...item, id: newId, event_id: Number(targetEvent), event_status_id: Number(targetStage),
        scan_in: 0, scan_out: 0, group_detail: '',
        scan_in_date: { Valid: false, Time: '' }, scan_out_date: { Valid: false, Time: '' },
      }];
      destination.itemCount = (destination.itemCount || 0) + 1;
      destination.items ||= {}; destination.items[newId] = { ownership: ownership(item.id) };
    }, `${eventName}: Transfer ${item.nama_barang} → ${targetEvent}`)) {
      setTransferId(null); setTargetEvent(''); setTargetStage('');
    }
  }
  function finalize() {
    if (unresolved.length) return;
    if (run(data => {
      const event = data.events[eventId] ||= {};
      event.closing = items.some(item => event.items?.[item.id]?.resolution === 'returned') ? 'returned-completed' : 'transferred';
    }, `${eventName}: Finalize return & transfer`)) onClose();
  }
  const title = mode === 'ownership' ? t('lifecycle.bulkOwnership') : mode === 'check' ? t('lifecycle.crossCheck') : t('lifecycle.returnTransfer');
  return <Modal open={Boolean(mode)} title={title} onClose={onClose} size="xl" footer={<>
    <button className="btn-cancel-m" onClick={onClose}>{t('common.actions.close')}</button>
    {mode === 'ownership' && <button className="btn-save-modal" disabled={!selected.length} onClick={applyOwnership}>{t('lifecycle.assign', { ownership: target, count: selected.length })}</button>}
    {mode === 'return' && <button className="btn-save-modal" disabled={unresolved.length > 0} onClick={finalize}>{t('lifecycle.finalize')}</button>}
  </>}>
    <p className="stepper-error-banner">{t('lifecycle.preview')}</p>
    {mode === 'ownership' && <>
      <div className="bulk-own-target">{OWNERSHIPS.map(value => <button key={value} className={`bulk-own-segment${target === value ? ' active' : ''}`} onClick={() => setTarget(value)}>{value}</button>)}</div>
      <div className="bulk-own-filters">
        <TextInput label={t('common.actions.search')} value={query} onChange={setQuery} />
        <SearchableSelect value={from} onChange={v => setFrom(String(v))} options={[{ value: '', label: t('lifecycle.allOwnership') }, ...OWNERSHIPS.map(value => ({ value, label: value }))]} />
      </div>
      <label className="lifecycle-check-row"><input type="checkbox" checked={shown.length > 0 && shown.every(item => selected.includes(item.id))} onChange={() => setSelected(ids => shown.every(item => ids.includes(item.id)) ? ids.filter(id => !shown.some(item => item.id === id)) : [...new Set([...ids, ...shown.map(item => item.id)])])} />{t('lifecycle.selectShown')}</label>
    </>}
    {mode === 'return' && <p>{t('lifecycle.logistics', { checked, total: items.length, missing: items.length - checked })}</p>}
    <div className="lifecycle-item-list">
      {(mode === 'ownership' ? shown : items).map(item => {
        const state = local?.items?.[item.id];
        return <div className="lifecycle-item" key={item.id}>
          <div className="lifecycle-item-row">
            {mode !== 'return' && <input type="checkbox" aria-label={item.nama_barang} checked={mode === 'ownership' ? selected.includes(item.id) : Boolean(state?.checked)} onChange={() => mode === 'ownership' ? setSelected(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id]) : patchItem(item.id, { checked: !state?.checked })} />}
            <div className="lifecycle-item-info"><strong>{item.nama_barang}</strong><div>{item.area_name} · {item.qty} {item.satuan}</div></div>
            <span className={`badge ${ownershipClass(ownership(item.id))}`}>{ownership(item.id)}</span>
            {mode === 'ownership' && selected.includes(item.id) && ownership(item.id) !== target && <span>→ {target}</span>}
            {mode === 'return' && (state?.resolution ? <span className="badge badge-green">{t(`lifecycle.${state.resolution}`)}</span> : <>
              <button className="btn-save-modal" onClick={() => patchItem(item.id, { resolution: 'returned' })}>{t('lifecycle.return')}</button>
              <button className="btn-ia-move" onClick={() => { setTransferId(item.id); setTargetEvent(''); setTargetStage(''); }}>{t('lifecycle.transfer')}</button>
            </>)}
          </div>
          {mode === 'return' && transferId === item.id && !state?.resolution && <div className="lifecycle-transfer">
            <SearchableSelect value={targetEvent} onChange={v => setTargetEvent(String(v))} placeholder={t('lifecycle.targetEvent')} options={candidates.map(e => ({ value: e.id, label: e.name }))} />
            <SearchableSelect value={targetStage} onChange={v => setTargetStage(String(v))} placeholder={t('lifecycle.targetStage')} options={stages.map(s => ({ value: s.id, label: s.name }))} />
            <button className="btn-save-modal" disabled={!targetEvent || !targetStage} onClick={() => transfer(item)}>{t('common.actions.confirmTransfer', { defaultValue: t('common.actions.apply') })}</button>
          </div>}
        </div>;
      })}
      {(mode === 'ownership' ? shown : items).length === 0 && <p className="no-data">{t('wording.noItemsFound')}</p>}
    </div>
  </Modal>;
}
