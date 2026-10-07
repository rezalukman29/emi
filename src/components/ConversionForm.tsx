import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SearchableSelect from './SearchableSelect';
import { useEventLifecycle, type ConvertRequest } from '../lib/eventLifecycle';
import { availableConversionStock } from '../lib/conversionPreview';
import { loadConversionCatalog, type ConversionItem } from '../lib/conversionInventory';

export type ConversionDraft = Omit<ConvertRequest, 'id' | 'status' | 'stageId'> & {
  fromEventItemId: number;
};
export interface ConversionSourceItem {
  id: number;
  itemId: number;
  stockRowId: number;
  name: string;
  location: string;
  qty: number;
}

export default function ConversionForm({ onSave, eventItems }: {
  onSave: (value: ConversionDraft) => void | Promise<void>;
  eventItems: ConversionSourceItem[];
}) {
  const { t } = useTranslation();
  const store = useEventLifecycle();
  const [catalog, setCatalog] = useState<ConversionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState('');
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [fromQty, setFromQty] = useState(1);
  const [toQty, setToQty] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedCatalogSearch(catalogSearch.trim()),
      350,
    );
    return () => window.clearTimeout(timeoutId);
  }, [catalogSearch]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    loadConversionCatalog(debouncedCatalogSearch).then(items => {
      if (active) setCatalog(items);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedCatalogSearch, retry]);

  const from = eventItems.find(row => String(row.id) === fromId);
  const to = catalog.find(item => String(item.id) === toId);
  const toConversionStock = (item: ConversionSourceItem) => ({
    id: item.stockRowId,
    itemId: item.itemId,
    name: item.name,
    warehouse: item.location,
    stock: item.qty,
  });
  const available = from ? availableConversionStock(toConversionStock(from), store) : 0;
  const valid = !loading && !error && !saving && from && to && from.itemId !== to.id &&
    Number.isSafeInteger(fromQty) && fromQty > 0 && fromQty <= available && Number.isSafeInteger(toQty) && toQty > 0;
  async function submit() {
    if (!valid || !from || !to) return;
    setSaving(true);
    try {
      await onSave({ type: 'convert', fromEventItemId: from.id, fromRowId: from.stockRowId, fromItemId: from.itemId, fromName: from.name,
        fromWarehouse: from.location, fromQty, toItemId: to.id, toName: to.name, toQty, toSku: to.sku, toPhoto: to.photo, toUnit: to.unit });
    } finally {
      setSaving(false);
    }
  }
  return <>
    <p className="prod-notice prod-notice-warn">{t('conversion.warning')}</p>
    {loading && <p role="status">{t('wording.loading')}</p>}
    {error && <p role="alert">{t('wording.failedToLoadData')} <button className="btn btn-ghost" onClick={() => setRetry(n => n + 1)}>{t('conversion.retry')}</button></p>}
    <div className="form-group"><label>{t('conversion.oldItem')}</label><SearchableSelect value={fromId} disabled={false} onChange={id => { setFromId(String(id)); setFromQty(1); setToId(''); }} options={eventItems.filter(row => availableConversionStock(toConversionStock(row), store) > 0).map(row => ({ value: row.id, label: `${row.name} — ${row.location}`, meta: String(availableConversionStock(toConversionStock(row), store)) }))} placeholder={t('conversion.oldItem')} /></div>
    <div className="form-group"><label>{t('conversion.oldQty')}</label><input type="number" min="1" max={available} step="1" disabled={!from} value={fromQty} onChange={e => setFromQty(Number(e.target.value))} />{from && <p>{t('conversion.available', { count: available })}</p>}</div>
    <div className="form-group"><label>{t('conversion.newItem')}</label><SearchableSelect value={toId} disabled={error} onChange={id => setToId(String(id))} onSearchChange={setCatalogSearch} options={catalog.filter(item => item.id !== from?.itemId).map(item => ({ value: item.id, label: item.name, meta: item.sku }))} placeholder={t('conversion.newItem')} /></div>
    <div className="form-group"><label>{t('conversion.newQty')}</label><input type="number" min="1" step="1" value={toQty} onChange={e => setToQty(Number(e.target.value))} /></div>
    <button className="btn-save-modal" disabled={!valid} onClick={() => void submit()}>{t(saving ? 'wording.saving' : 'conversion.submit')}</button>
  </>;
}
