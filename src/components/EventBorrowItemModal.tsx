import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import useGetAreaList from "../hooks/api/useGetAreaList";
import {
  type LoanItemPayload,
  useBorrowItemToEvent,
} from "../hooks/api/useGetItemLoans";
import { useGetLoanVendors } from "../hooks/api/useLoanVendors";
import useGetSubArea from "../hooks/api/useGetSubArea";
import useGetUnit from "../hooks/api/useGetUnit";
import { formatIDR } from "../lib/format";
import Modal from "./Modal";
import SearchableSelect from "./SearchableSelect";
import { IconCheck, IconClose } from "./icons";

interface EventBorrowItemModalProps {
  eventId: number;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

interface BorrowForm {
  itemName: string;
  qty: string;
  unit: string;
  areaId: string;
  subAreaId: string;
  vendorId: string;
  borrowFrom: string;
  returnBy: string;
  rentalCost: string;
  notes: string;
}

function todayIso() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

const INITIAL_FORM: BorrowForm = {
  itemName: "",
  qty: "1",
  unit: "pcs",
  areaId: "",
  subAreaId: "",
  vendorId: "",
  borrowFrom: todayIso(),
  returnBy: "",
  rentalCost: "",
  notes: "",
};

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

export default function EventBorrowItemModal({ eventId, onClose, onCreated }: EventBorrowItemModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<BorrowForm>(INITIAL_FORM);
  const createMutation = useBorrowItemToEvent();
  const vendorQuery = useGetLoanVendors({ params: { page: 1, limit: 100 } });
  const areaQuery = useGetAreaList({});
  const subAreaQuery = useGetSubArea({ params: { page: 1, limit: 999 } });
  const unitQuery = useGetUnit({});

  const vendors = vendorQuery.data?.data?.items ?? [];
  const areas: Array<{ id: number; name: string }> = areaQuery.data?.data?.data ?? [];
  const allSubAreas = subAreaQuery.data?.data?.data ?? [];
  const subAreas: Array<{ id: number; area_id: number; sub_area_name: string }> = useMemo(
    () => allSubAreas.filter(item => item.area_id === Number(form.areaId)),
    [allSubAreas, form.areaId],
  );
  const units: Array<{ id: number; name: string }> = unitQuery.data?.data ?? [];
  const qty = Number(form.qty);
  const rentalCost = Number(form.rentalCost || 0);
  const total = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(rentalCost) ? rentalCost : 0);
  const valid = Boolean(
    form.itemName.trim()
    && Number.isInteger(qty) && qty >= 1
    && form.unit.trim()
    && Number(form.areaId) > 0
    && Number(form.vendorId) > 0
    && form.borrowFrom
    && form.returnBy
    && form.returnBy >= form.borrowFrom
    && rentalCost >= 0,
  );

  function setField<K extends keyof BorrowForm>(key: K, value: BorrowForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!valid || createMutation.isLoading) return;
    const payload: LoanItemPayload = {
      event_id: eventId,
      item_name: form.itemName.trim(),
      qty,
      unit: form.unit.trim(),
      area_id: Number(form.areaId),
      ...(Number(form.subAreaId) > 0 ? { sub_area_id: Number(form.subAreaId) } : {}),
      vendor_id: Number(form.vendorId),
      borrow_from: form.borrowFrom,
      return_by: form.returnBy,
      rental_cost_per_unit: rentalCost,
      purpose: "",
      notes: form.notes.trim(),
    };
    try {
      const response = await createMutation.mutateAsync({ eventId, payload });
      toast.success(response.message || t("eventBorrow.created"));
      await onCreated();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, t("eventBorrow.createError")));
    }
  }

  return <Modal
    open
    title={t("eventBorrow.title")}
    onClose={() => { if (!createMutation.isLoading) onClose(); }}
    footer={<>
      <button className="btn-cancel-modal" disabled={createMutation.isLoading} onClick={onClose}><IconClose /> {t("wording.cancel")}</button>
      <button className="btn-save-modal" disabled={!valid || createMutation.isLoading} onClick={() => void submit()}><IconCheck /> {t(createMutation.isLoading ? "wording.saving" : "eventBorrow.submit")}</button>
    </>}
  >
    <p className="loan-form-intro">{t("eventBorrow.intro")}</p>
    <div className="form-group"><label>{t("borrowedItemsApi.item")} <span className="required-mark">*</span></label><input value={form.itemName} onChange={event => setField("itemName", event.target.value)} placeholder={t("borrowedItemsApi.itemPlaceholder")} /></div>
    <div className="form-row">
      <div className="form-group"><label>{t("wording.qty")} <span className="required-mark">*</span></label><input type="number" min="1" step="1" value={form.qty} onChange={event => setField("qty", event.target.value)} /></div>
      <div className="form-group"><label>{t("borrowedItemsApi.unit")}</label><SearchableSelect value={form.unit} onChange={value => setField("unit", String(value))} options={(units.length ? units.map(unit => unit.name) : ["pcs", "unit", "set", "roll", "meter"]).map(value => ({ value, label: value }))} /></div>
    </div>
    <div className="form-row">
      <div className="form-group"><label>{t("wording.area")} <span className="required-mark">*</span></label><SearchableSelect value={form.areaId} onChange={value => setForm(current => ({ ...current, areaId: String(value), subAreaId: "" }))} options={areas.map(area => ({ value: area.id, label: area.name }))} placeholder={t("wording.selectArea")} /></div>
      <div className="form-group"><label>{t("wording.subArea")}</label><SearchableSelect value={form.subAreaId} onChange={value => setField("subAreaId", String(value))} disabled={!form.areaId || subAreas.length === 0} options={subAreas.map(item => ({ value: item.id, label: item.sub_area_name }))} placeholder={subAreas.length ? t("wording.selectSubArea") : t("wording.noSubAreas")} /></div>
    </div>
    <div className="form-group"><label>{t("borrowedItemsApi.loanVendor")} <span className="required-mark">*</span></label><SearchableSelect value={form.vendorId} onChange={value => setField("vendorId", String(value))} options={vendors.map(vendor => ({ value: vendor.id, label: vendor.name, meta: vendor.phone || "" }))} placeholder={t("borrowedItemsApi.selectVendor")} />{!vendorQuery.isLoading && vendors.length === 0 && <small className="loan-form-warning">{t("borrowedItemsApi.noVendors")}</small>}</div>
    <div className="form-row">
      <div className="form-group"><label>{t("borrowedItemsApi.borrowFrom")} <span className="required-mark">*</span></label><input type="date" value={form.borrowFrom} onChange={event => setField("borrowFrom", event.target.value)} /></div>
      <div className="form-group"><label>{t("borrowedItemsApi.returnBy")} <span className="required-mark">*</span></label><input type="date" min={form.borrowFrom} value={form.returnBy} onChange={event => setField("returnBy", event.target.value)} /></div>
    </div>
    <div className="form-group"><label>{t("borrowedItemsApi.costPerUnit")}</label><input type="number" min="0" value={form.rentalCost} onChange={event => setField("rentalCost", event.target.value)} placeholder={t("borrowedItemsApi.optional")} />{total > 0 && <small>{t("borrowedItemsApi.total")}: {formatIDR(total)}</small>}</div>
    <div className="form-group"><label>{t("wording.notes")}</label><textarea rows={2} value={form.notes} onChange={event => setField("notes", event.target.value)} placeholder={t("borrowedItemsApi.optional")} /></div>
  </Modal>;
}
