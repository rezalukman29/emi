import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import useGetAreaList from "../hooks/api/useGetAreaList";
import useGetSubArea from "../hooks/api/useGetSubArea";
import useGetUnit from "../hooks/api/useGetUnit";
import { useCreateEventOutsourceItem } from "../hooks/api/useOutsource";
import { formatIDR } from "../lib/format";
import Modal from "./Modal";
import SearchableSelect from "./SearchableSelect";
import { CatalogItemPicker, QuickVendorPicker } from "./QuickRequestPickers";

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error)?.message || "Outsource item could not be created.";
}

export default function EventOutsourceItemModal({ eventId, onClose, onCreated }: { eventId: number; onClose: () => void; onCreated: () => void | Promise<void> }) {
  const [form, setForm] = useState({ itemName: "", barangId: "", qty: "1", unitId: "", areaId: "", subAreaId: "", vendorId: "", fromDate: todayIso(), toDate: "", cost: "", note: "" });
  const createMutation = useCreateEventOutsourceItem();
  const areaQuery = useGetAreaList({});
  const subAreaQuery = useGetSubArea({ params: { page: 1, limit: 999 } });
  const unitQuery = useGetUnit({});
  const areas: Array<{ id: number; name: string }> = areaQuery.data?.data?.data ?? [];
  const allSubAreas = subAreaQuery.data?.data?.data ?? [];
  const subAreas: Array<{ id: number; area_id: number; sub_area_name: string }> = useMemo(() => allSubAreas.filter(row => row.area_id === Number(form.areaId)), [allSubAreas, form.areaId]);
  const units: Array<{ id: number; name: string }> = unitQuery.data?.data ?? [];
  const qty = Number(form.qty);
  const cost = Number(form.cost || 0);
  const valid = Number(form.barangId) > 0 && Number.isInteger(qty) && qty > 0 && Number(form.unitId) > 0 && Number(form.areaId) > 0 && Number(form.vendorId) > 0 && Boolean(form.fromDate && form.toDate && form.toDate >= form.fromDate) && cost >= 0;

  async function submit() {
    if (!valid || createMutation.isLoading) return;
    try {
      const response = await createMutation.mutateAsync({
        eventId,
        payload: {
          event_id: eventId,
          barang_id: Number(form.barangId),
          qty,
          satuan_id: Number(form.unitId),
          area_id: Number(form.areaId),
          ...(Number(form.subAreaId) > 0 ? { sub_area_id: Number(form.subAreaId) } : {}),
          outsource_vendor_id: Number(form.vendorId),
          from_date: form.fromDate,
          to_date: form.toDate,
          cost,
          note: form.note.trim(),
        },
      });
      toast.success(response.message || "Outsource request created.");
      await onCreated();
      onClose();
    } catch (error) { toast.error(errorMessage(error)); }
  }

  return <Modal open title="Outsource Item" onClose={() => !createMutation.isLoading && onClose()} footer={<>
    <button className="btn-cancel-modal" disabled={createMutation.isLoading} onClick={onClose}>Cancel</button>
    <button className="btn-save-modal" disabled={!valid || createMutation.isLoading} onClick={() => void submit()}>{createMutation.isLoading ? "Saving..." : "Submit request"}</button>
  </>}>
    <p className="loan-form-intro">Order an inventory item from an outsource vendor for this event. It will be added to the event with Outsource ownership after it is marked received.</p>
    <div className="form-group"><label>Item <span className="required-mark">*</span></label><CatalogItemPicker value={form.itemName} onChange={(itemName, item) => setForm(current => ({ ...current, itemName, barangId: item?.id ? String(item.id) : "", unitId: item?.satuan_id ? String(item.satuan_id) : current.unitId }))} placeholder="Search Inventory item" /></div>
    <div className="form-row">
      <div className="form-group"><label>Quantity <span className="required-mark">*</span></label><input type="number" min="1" step="1" value={form.qty} onChange={event => setForm(current => ({ ...current, qty: event.target.value }))} /></div>
      <div className="form-group"><label>Unit <span className="required-mark">*</span></label><SearchableSelect value={form.unitId} onChange={value => setForm(current => ({ ...current, unitId: String(value) }))} options={units.map(unit => ({ value: unit.id, label: unit.name }))} placeholder="Select unit" /></div>
    </div>
    <div className="form-row">
      <div className="form-group"><label>Area <span className="required-mark">*</span></label><SearchableSelect value={form.areaId} onChange={value => setForm(current => ({ ...current, areaId: String(value), subAreaId: "" }))} options={areas.map(area => ({ value: area.id, label: area.name }))} placeholder="Select area" /></div>
      <div className="form-group"><label>Sub Area</label><SearchableSelect value={form.subAreaId} onChange={value => setForm(current => ({ ...current, subAreaId: String(value) }))} disabled={!form.areaId || subAreas.length === 0} options={subAreas.map(row => ({ value: row.id, label: row.sub_area_name }))} placeholder="Select sub area" /></div>
    </div>
    <div className="form-group"><label>Outsource Vendor <span className="required-mark">*</span></label><QuickVendorPicker kind="outsource" origin="External" value={form.vendorId} onChange={vendorId => setForm(current => ({ ...current, vendorId: String(vendorId) }))} placeholder="Select outsource vendor" /></div>
    <div className="form-row">
      <div className="form-group"><label>From <span className="required-mark">*</span></label><input type="date" value={form.fromDate} onChange={event => setForm(current => ({ ...current, fromDate: event.target.value }))} /></div>
      <div className="form-group"><label>Until <span className="required-mark">*</span></label><input type="date" min={form.fromDate} value={form.toDate} onChange={event => setForm(current => ({ ...current, toDate: event.target.value }))} /></div>
    </div>
    <div className="form-group"><label>Cost per unit</label><input type="number" min="0" value={form.cost} onChange={event => setForm(current => ({ ...current, cost: event.target.value }))} placeholder="0" />{cost > 0 && qty > 0 && <small>Total: {formatIDR(cost * qty)}</small>}</div>
    <div className="form-group"><label>Notes</label><textarea rows={2} value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} placeholder="Optional" /></div>
  </Modal>;
}
