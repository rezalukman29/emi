import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Modal from '../Modal';
import SearchableSelect from '../SearchableSelect';
import { fetchWarehouseStock, type Warehouse } from '../../lib/warehouseHub';
import { postMovingOrder } from '../../hooks/api/usePostMovingOrder';

// Guided "Move stock" (Warehouse Hub). Same endpoint as the old moving order (POST /v1/moving-order), but in steps:
// from → item (stock visible) → qty (cannot exceed the stock) → to → confirm.

export interface MovePreset { fromId?: number; toId?: number; barangId?: number }

export default function MoveStockModal({ warehouses, preset, onClose }: { warehouses: Warehouse[]; preset?: MovePreset; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [fromId, setFromId] = useState<number>(preset?.fromId ?? 0);
  const [toId, setToId] = useState<number>(preset?.toId ?? 0);
  const [bgId, setBgId] = useState<number>(0);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const stock = useQuery(['whHubStock', fromId], () => fetchWarehouseStock(fromId), { enabled: fromId > 0, staleTime: 30_000 });
  const rows = useMemo(() => (stock.data ?? []).filter((row) => row.stock > 0), [stock.data]);
  const row = rows.find((r) => r.bgId === bgId);
  useEffect(() => {
    if (preset?.barangId && rows.length && !bgId) {
      const match = rows.find((r) => r.barangId === preset.barangId);
      if (match) setBgId(match.bgId);
    }
  }, [rows, preset?.barangId, bgId]);

  const qtyNum = Number(qty);
  const qtyError = qty !== '' && (!Number.isInteger(qtyNum) || qtyNum < 1 ? t('whHub.move.qtyInvalid') : row && qtyNum > row.stock ? t('whHub.move.qtyTooMuch', { stock: row.stock }) : '');
  const ready = fromId > 0 && toId > 0 && toId !== fromId && row && qty !== '' && !qtyError;
  const options = warehouses.map((w) => ({ value: w.id, label: w.name, meta: w.virtual ? t('whHub.virtual') : w.location }));

  async function submit() {
    if (!ready || !row) return;
    setSaving(true);
    try {
      const res = await postMovingOrder({ from_gudang_id: fromId, to_gudang_id: toId, notes: notes.trim(), items: [{ barang_gudang_id: row.bgId, barang_id: row.barangId, qty: qtyNum }] });
      if ((res as { success?: boolean })?.success === false) throw new Error((res as { message?: string }).message);
      toast.success(t('whHub.move.done', { qty: qtyNum, item: row.name, to: warehouses.find((w) => w.id === toId)?.name ?? '' }));
      await queryClient.invalidateQueries(['whHubStock']);
      await queryClient.invalidateQueries(['whHubWarehouses']);
      onClose();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (error as Error)?.message;
      toast.error(message || t('whHub.move.failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={t('whHub.move.title')} footer={<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>{t('eventChecklist.cancel')}</button>
      <button type="button" className="btn btn-primary" disabled={!ready || saving} onClick={() => void submit()}>{saving ? t('wording.saving') : t('whHub.move.confirm')}</button>
    </>}>
      <div className="wh-move">
        <div className="wh-step"><span>1</span><div className="form-group"><label>{t('whHub.move.from')}</label>
          <SearchableSelect value={fromId || ''} options={options} placeholder={t('whHub.move.pickWarehouse')} onChange={(v) => { setFromId(Number(v)); setBgId(0); setQty(''); }} /></div></div>
        <div className="wh-step"><span>2</span><div className="form-group"><label>{t('whHub.move.item')}</label>
          <SearchableSelect value={bgId || ''} disabled={!fromId} placeholder={stock.isLoading ? t('wording.loading') : fromId ? t('whHub.move.pickItem') : t('whHub.move.pickFromFirst')}
            options={rows.map((r) => ({ value: r.bgId, label: r.name, meta: t('whHub.inStock', { count: r.stock }) }))} onChange={(v) => { setBgId(Number(v)); setQty(''); }} /></div></div>
        <div className="wh-step"><span>3</span><div className="form-group"><label>{t('whHub.move.qty')}{row ? ` · ${t('whHub.inStock', { count: row.stock })}` : ''}</label>
          <div className="wh-qty"><input id="wh-move-qty" type="number" min={1} max={row?.stock} inputMode="numeric" value={qty} disabled={!row} onChange={(e) => setQty(e.target.value)} />
            {row && <button type="button" className="btn btn-ghost" onClick={() => setQty(String(row.stock))}>{t('whHub.move.all')}</button>}</div>
          {qtyError && <p className="wh-error" role="alert">{qtyError}</p>}</div></div>
        <div className="wh-step"><span>4</span><div className="form-group"><label>{t('whHub.move.to')}</label>
          <SearchableSelect value={toId || ''} options={options.filter((o) => o.value !== fromId)} placeholder={t('whHub.move.pickWarehouse')} onChange={(v) => setToId(Number(v))} /></div></div>
        <div className="form-group"><label>{t('whHub.move.notes')}</label><input id="wh-move-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('whHub.move.notesPh')} /></div>
        {ready && row && <p className="wh-summary">{t('whHub.move.summary', { qty: qtyNum, item: row.name, from: warehouses.find((w) => w.id === fromId)?.name ?? '', to: warehouses.find((w) => w.id === toId)?.name ?? '', left: row.stock - qtyNum })}</p>}
      </div>
    </Modal>
  );
}
