import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
import { IconCheck, IconClose, IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
import useGetWarehouse from "../hooks/api/useGetWarehouse";
import useGetUnit from "../hooks/api/useGetUnit";
import {
  getLoanItem,
  loanItemToUpdatePayload,
  type LoanItem,
  type LoanItemPayload,
  type LoanItemStatus,
  useCreateLoanItem,
  useDeleteLoanItem,
  useGetLoanItems,
  useUpdateLoanItem,
} from "../hooks/api/useGetItemLoans";
import { useGetLoanVendors } from "../hooks/api/useLoanVendors";
import { fmtNum, formatIDR } from "../lib/format";
import { translateApiValue } from "../utils/function";

const PAGE_SIZE = 15;
const STATUSES: LoanItemStatus[] = ["REQUESTED", "BORROWED", "OVERDUE", "RETURNED"];

interface ItemLoanPageProps {
  embedded?: boolean;
  vendorId?: number;
  allowCreate?: boolean;
}

type LoanForm = {
  item_name: string;
  qty: string;
  unit: string;
  warehouse_id: string;
  purpose: string;
  vendor_id: string;
  borrow_from: string;
  return_by: string;
  rental_cost_per_unit: string;
  notes: string;
};

function localIsoDate() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function emptyForm(vendorId?: number): LoanForm {
  return {
    item_name: "",
    qty: "1",
    unit: "pcs",
    warehouse_id: "",
    purpose: "",
    vendor_id: vendorId ? String(vendorId) : "",
    borrow_from: localIsoDate(),
    return_by: "",
    rental_cost_per_unit: "",
    notes: "",
  };
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function badge(status: string) {
  if (status === "RETURNED") return "badge-green";
  if (status === "OVERDUE") return "badge-red";
  if (status === "REQUESTED") return "badge-orange";
  return "badge-blue";
}

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (error as Error)?.message
    || fallback;
}

export default function ItemLoanPage({ embedded = false, vendorId, allowCreate = true }: ItemLoanPageProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query.trim());
  const [status, setStatus] = useState<LoanItemStatus | "">("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<LoanItem | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [form, setForm] = useState<LoanForm>(() => emptyForm(vendorId));
  const [deleteTarget, setDeleteTarget] = useState<LoanItem | null>(null);
  const [transitionTarget, setTransitionTarget] = useState<LoanItem | null>(null);

  const listQuery = useGetLoanItems({
    params: {
      page,
      limit: PAGE_SIZE,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(vendorId ? { vendor_id: vendorId } : selectedVendor ? { vendor_id: Number(selectedVendor) } : {}),
    },
    options: { keepPreviousData: true },
  });
  const vendorQuery = useGetLoanVendors({
    params: { page: 1, limit: 100 },
    options: { enabled: formOpen || (!vendorId && embedded) },
  });
  const warehouseQuery = useGetWarehouse({ options: { enabled: formOpen } });
  const unitQuery = useGetUnit({ options: { enabled: formOpen } });
  const createMutation = useCreateLoanItem();
  const updateMutation = useUpdateLoanItem();
  const deleteMutation = useDeleteLoanItem();

  const result = listQuery.data?.data;
  const loans = result?.data ?? [];
  const summary = result?.summary;
  const totalPages = Math.max(1, result?.total_pages || 1);
  const currentPage = Math.min(result?.page || page, totalPages);
  const vendors = vendorQuery.data?.data?.items ?? [];
  const warehouseData = warehouseQuery.data?.data;
  const warehouses: Array<{ id: number; nama: string }> = (Array.isArray(warehouseData) ? warehouseData : warehouseData?.data ?? [])
    .filter((item: { nama?: string }) => item.nama?.trim().toLowerCase() !== "buy");
  const units: Array<{ id: number; name: string }> = unitQuery.data?.data ?? [];
  const isSaving = createMutation.isLoading || updateMutation.isLoading;
  const isActing = updateMutation.isLoading || deleteMutation.isLoading;
  const totalCost = Number(summary?.total_rental_cost || 0);

  useEffect(() => setPage(1), [search, status, selectedVendor, vendorId]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const valid = useMemo(() => {
    const qty = Number(form.qty);
    const cost = Number(form.rental_cost_per_unit || 0);
    return Boolean(
      form.item_name.trim()
      && Number.isInteger(qty) && qty >= 1
      && form.unit.trim()
      && Number(form.warehouse_id) > 0
      && Number(form.vendor_id) > 0
      && form.borrow_from
      && form.return_by
      && form.return_by >= form.borrow_from
      && cost >= 0,
    );
  }, [form]);

  const rentalTotal = (Number(form.qty) || 0) * (Number(form.rental_cost_per_unit) || 0);

  function setField<K extends keyof LoanForm>(key: K, value: LoanForm[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setEditingItem(null);
    setForm(emptyForm(vendorId));
    setFormOpen(true);
  }

  async function openEdit(item: LoanItem) {
    setLoadingEdit(true);
    try {
      const response = await getLoanItem(item.id);
      const detail = response.data;
      setEditingId(detail.id);
      setEditingItem(detail);
      setForm({
        item_name: detail.item_name || "",
        qty: String(detail.qty || 1),
        unit: detail.unit || "pcs",
        warehouse_id: detail.warehouse_id ? String(detail.warehouse_id) : "",
        purpose: detail.purpose || "",
        vendor_id: detail.vendor_id ? String(detail.vendor_id) : "",
        borrow_from: detail.borrow_from?.slice(0, 10) || localIsoDate(),
        return_by: detail.return_by?.slice(0, 10) || "",
        rental_cost_per_unit: detail.rental_cost_per_unit ? String(detail.rental_cost_per_unit) : "",
        notes: detail.notes || "",
      });
      setFormOpen(true);
    } catch (error) {
      toast.error(errorMessage(error, t("borrowedItemsApi.loadDetailError")));
    } finally {
      setLoadingEdit(false);
    }
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setEditingId(null);
    setEditingItem(null);
    setForm(emptyForm(vendorId));
  }

  function payload(): LoanItemPayload {
    return {
      item_name: form.item_name.trim(),
      qty: Number(form.qty),
      unit: form.unit.trim(),
      vendor_id: Number(form.vendor_id),
      warehouse_id: Number(form.warehouse_id),
      borrow_from: form.borrow_from,
      return_by: form.return_by,
      rental_cost_per_unit: Number(form.rental_cost_per_unit || 0),
      purpose: form.purpose.trim(),
      notes: form.notes.trim(),
      ...(Number(editingItem?.event_id || editingItem?.event?.id || 0) > 0 ? { event_id: Number(editingItem?.event_id || editingItem?.event?.id) } : {}),
      ...(Number(editingItem?.area_id || 0) > 0 ? { area_id: Number(editingItem?.area_id) } : {}),
      ...(Number(editingItem?.sub_area_id || 0) > 0 ? { sub_area_id: Number(editingItem?.sub_area_id) } : {}),
    };
  }

  async function refresh() {
    await queryClient.invalidateQueries("useGetLoanItems");
    await queryClient.invalidateQueries("useGetLoanVendors");
  }

  async function save() {
    if (!valid || isSaving) return;
    try {
      const response = editingId
        ? await updateMutation.mutateAsync({ id: editingId, payload: payload() })
        : await createMutation.mutateAsync(payload());
      toast.success(response.message || t(editingId ? "borrowedItemsApi.updated" : "borrowedItemsApi.created"));
      closeForm();
      setPage(1);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, t("borrowedItemsApi.saveError")));
    }
  }

  async function remove() {
    if (!deleteTarget || deleteMutation.isLoading) return;
    try {
      const response = await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(response.message || t("borrowedItemsApi.deleted"));
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, t("borrowedItemsApi.deleteError")));
    }
  }

  async function advance() {
    if (!transitionTarget || updateMutation.isLoading) return;
    const nextStatus = transitionTarget.status === "REQUESTED" ? "BORROWED" : "RETURNED";
    try {
      const detailResponse = await getLoanItem(transitionTarget.id);
      const response = await updateMutation.mutateAsync({
        id: transitionTarget.id,
        payload: loanItemToUpdatePayload(detailResponse.data, nextStatus),
      });
      toast.success(response.message || t("borrowedItemsApi.statusUpdated"));
      setTransitionTarget(null);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error, t("borrowedItemsApi.statusError")));
    }
  }

  const cards = [
    ["borrowedItemsApi.loanRecords", summary?.total_records ?? 0, "var(--brand)", "var(--brand-bg)"],
    ["borrowedItemsApi.currentlyBorrowed", summary?.borrowed ?? 0, "var(--purple)", "var(--purple-bg)"],
    ["borrowedItemsApi.overdue", summary?.overdue ?? 0, "var(--red)", "var(--red-bg)"],
    ["borrowedItemsApi.waiting", summary?.waiting_to_arrive ?? 0, "var(--orange)", "var(--orange-bg)"],
  ] as const;

  return <>
    {!embedded && <div className="vendor-page-header loan-page-header"><h1 className="page-title">{t("loanVendor.borrowedItems")}</h1>{allowCreate && <button className="btn-new" onClick={openCreate}><IconPlus /> {t("loanVendor.newRental")}</button>}</div>}

    <div className="stats-bar loan-borrowed-stats">{cards.map(([label, value, color, background]) => <div className="stat-card" key={label}><span className="stat-icon" style={{ background }}><strong className="stat-value" style={{ color }}>{fmtNum(value)}</strong></span><span className="stat-label">{t(label)}</span></div>)}</div>

    <section className="card loan-items-card">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap"><IconSearch /><input className="search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("borrowedItemsApi.search")} /></div>
          <SearchableSelect inline value={status} onChange={value => setStatus(String(value) as LoanItemStatus | "")} options={[{ value: "", label: t("borrowedItemsApi.allStatuses") }, ...STATUSES.map(value => ({ value, label: translateApiValue(value) }))]} placeholder={t("borrowedItemsApi.allStatuses")} />
          {!vendorId && <SearchableSelect inline value={selectedVendor} onChange={value => setSelectedVendor(String(value))} options={[{ value: "", label: t("borrowedItemsApi.allVendors") }, ...vendors.map(vendor => ({ value: vendor.id, label: vendor.name }))]} placeholder={t("borrowedItemsApi.allVendors")} />}
        </div>
        <div className="toolbar-right loan-items-toolbar-right"><span>{t("borrowedItemsApi.totalCost")} <strong>{formatIDR(totalCost)}</strong></span>{allowCreate && <button className="btn-new" onClick={openCreate}><IconPlus /> {t("loanVendor.newRental")}</button>}</div>
      </div>
      <p className="loan-borrowed-description">{t("borrowedItemsApi.description")}</p>
      <div className="table-wrap"><table className="loan-items-table">
        <thead><tr><th>{t("borrowedItemsApi.item")}</th><th className="number-cell">{t("wording.qty")}</th>{!vendorId && <th>{t("borrowedItemsApi.vendor")}</th>}<th>{t("borrowedItemsApi.for")}</th><th>{t("borrowedItemsApi.period")}</th><th className="number-cell">{t("borrowedItemsApi.rentalCost")}</th><th>{t("wording.status")}</th><th className="loan-action-cell">{t("wording.action")}</th></tr></thead>
        <tbody>
          {listQuery.isLoading && !loans.length && <tr><td colSpan={vendorId ? 7 : 8} className="vendor-empty-cell">{t("wording.loading")}</td></tr>}
          {listQuery.isError && <tr><td colSpan={vendorId ? 7 : 8} className="vendor-empty-cell vendor-error-cell">{errorMessage(listQuery.error, t("borrowedItemsApi.loadError"))}</td></tr>}
          {!listQuery.isLoading && !listQuery.isError && loans.length === 0 && <tr><td colSpan={vendorId ? 7 : 8} className="vendor-empty-cell">{t("borrowedItemsApi.empty")}</td></tr>}
          {loans.map(item => {
            const isEvent = Boolean(item.event?.id || item.event_id);
            const canAdvance = item.status === "REQUESTED" || item.status === "BORROWED" || item.status === "OVERDUE";
            return <tr key={item.id}>
              <td className="name-cell">{item.item_name}<small>{item.notes || ""}</small></td>
              <td className="number-cell loan-nowrap">{fmtNum(item.qty)} <small>{item.unit}</small></td>
              {!vendorId && <td>{item.vendor?.id ? <Link to={`/loan-vendor-detail?id=${item.vendor.id}`}>{item.vendor.name}</Link> : "—"}</td>}
              <td>{isEvent ? <><Link to={`/event-detail?id=${item.event?.id || item.event_id}`}>{item.event?.name || t("borrowedItemsApi.event")}</Link><small>{[item.event?.area, item.event?.sub_area].filter(Boolean).join(" · ")}</small></> : <><span className="badge badge-gray">{t("wording.warehouse")}</span> {item.warehouse?.name || "—"}<small>{item.purpose || ""}</small></>}</td>
              <td className="loan-nowrap">{dateLabel(item.borrow_from)} → {dateLabel(item.return_by)}{item.returned_at && <small>{t("borrowedItemsApi.returnedOn", { date: dateLabel(item.returned_at) })}</small>}</td>
              <td className="number-cell loan-nowrap">{item.rental_cost ? formatIDR(item.rental_cost) : "—"}{item.rental_cost_per_unit > 0 && <small>{formatIDR(item.rental_cost_per_unit)} / {item.unit}</small>}</td>
              <td><span className={`badge ${badge(item.status)}`}>{translateApiValue(item.status)}</span></td>
              <td className="loan-action-cell"><div className="action-btns loan-row-actions">
                {isEvent ? <span className="loan-event-action">{item.status === "RETURNED" ? t("borrowedItemsApi.returned") : t("borrowedItemsApi.updateInEvent")}</span> : <>
                  {item.status !== "RETURNED" && <button className="btn-icon edit" disabled={loadingEdit || isActing} title={t("wording.edit")} onClick={() => void openEdit(item)}><IconEdit /></button>}
                  {item.status === "REQUESTED" && <button className="btn btn-ghost loan-small-btn" disabled={isActing} onClick={() => setDeleteTarget(item)}>{t("wording.cancel")}</button>}
                  {canAdvance && <button className="btn-save-modal loan-small-btn" disabled={isActing} onClick={() => setTransitionTarget(item)}>{t(item.status === "REQUESTED" ? "borrowedItemsApi.markReceived" : "borrowedItemsApi.markReturned")}</button>}
                  {item.status === "RETURNED" && <span className="production-complete">{t("borrowedItemsApi.returned")}</span>}
                </>}
              </div></td>
            </tr>;
          })}
        </tbody>
      </table></div>
      <Pagination currentPage={currentPage} total={result?.total_records ?? 0} pageSize={result?.record_per_page || PAGE_SIZE} onPage={setPage} label={t("loanVendor.borrowedItems")} />
    </section>

    <Modal open={formOpen} title={t(editingId ? "borrowedItemsApi.editRental" : "loanVendor.newRental")} onClose={closeForm} footer={<><button className="btn-cancel-modal" disabled={isSaving} onClick={closeForm}><IconClose /> {t("wording.cancel")}</button><button className="btn-save-modal" disabled={!valid || isSaving} onClick={() => void save()}><IconCheck /> {t(isSaving ? "wording.saving" : "borrowedItemsApi.submit")}</button></>}>
      <p className="loan-form-intro">{t("borrowedItemsApi.formIntro")}</p>
      <div className="form-group"><label>{t("borrowedItemsApi.item")} <span className="required-mark">*</span></label><input value={form.item_name} onChange={event => setField("item_name", event.target.value)} placeholder={t("borrowedItemsApi.itemPlaceholder")} /></div>
      <div className="form-row"><div className="form-group"><label>{t("wording.qty")} <span className="required-mark">*</span></label><input type="number" min="1" step="1" value={form.qty} onChange={event => setField("qty", event.target.value)} /></div><div className="form-group"><label>{t("borrowedItemsApi.unit")}</label><SearchableSelect value={form.unit} onChange={value => setField("unit", String(value))} options={(units.length ? units.map(unit => unit.name) : ["pcs", "unit", "set", "roll", "meter"]).map(value => ({ value, label: value }))} /></div></div>
      <div className="form-row"><div className="form-group"><label>{t("borrowedItemsApi.warehouse")} <span className="required-mark">*</span></label><SearchableSelect value={form.warehouse_id} onChange={value => setField("warehouse_id", String(value))} options={warehouses.map(item => ({ value: item.id, label: item.nama }))} placeholder={t("borrowedItemsApi.selectWarehouse")} /></div><div className="form-group"><label>{t("wording.purpose")}</label><input value={form.purpose} onChange={event => setField("purpose", event.target.value)} placeholder={t("borrowedItemsApi.purposePlaceholder")} /></div></div>
      <div className="form-group"><label>{t("borrowedItemsApi.loanVendor")} <span className="required-mark">*</span></label><SearchableSelect value={form.vendor_id} onChange={value => setField("vendor_id", String(value))} disabled={Boolean(vendorId)} options={vendors.map(item => ({ value: item.id, label: item.name, meta: item.phone || "" }))} placeholder={t("borrowedItemsApi.selectVendor")} />{vendors.length === 0 && !vendorQuery.isLoading && <small className="loan-form-warning">{t("borrowedItemsApi.noVendors")}</small>}</div>
      <div className="form-row"><div className="form-group"><label>{t("borrowedItemsApi.borrowFrom")} <span className="required-mark">*</span></label><input type="date" value={form.borrow_from} onChange={event => setField("borrow_from", event.target.value)} /></div><div className="form-group"><label>{t("borrowedItemsApi.returnBy")} <span className="required-mark">*</span></label><input type="date" min={form.borrow_from} value={form.return_by} onChange={event => setField("return_by", event.target.value)} /></div></div>
      <div className="form-group"><label>{t("borrowedItemsApi.costPerUnit")}</label><input type="number" min="0" value={form.rental_cost_per_unit} onChange={event => setField("rental_cost_per_unit", event.target.value)} placeholder={t("borrowedItemsApi.optional")} />{rentalTotal > 0 && <small>{t("borrowedItemsApi.total")}: {formatIDR(rentalTotal)}</small>}</div>
      <div className="form-group"><label>{t("wording.notes")}</label><textarea rows={2} value={form.notes} onChange={event => setField("notes", event.target.value)} placeholder={t("borrowedItemsApi.optional")} /></div>
    </Modal>

    <Modal open={Boolean(deleteTarget)} title={t("borrowedItemsApi.cancelTitle")} onClose={() => { if (!deleteMutation.isLoading) setDeleteTarget(null); }} footer={<><button className="btn-cancel-modal" disabled={deleteMutation.isLoading} onClick={() => setDeleteTarget(null)}>{t("wording.cancel")}</button><button className="btn-del-ok" disabled={deleteMutation.isLoading} onClick={() => void remove()}><IconDelete /> {t("borrowedItemsApi.cancelRental")}</button></>}><p>{t("borrowedItemsApi.cancelConfirm", { item: deleteTarget?.item_name })}</p></Modal>

    <Modal open={Boolean(transitionTarget)} title={t(transitionTarget?.status === "REQUESTED" ? "borrowedItemsApi.markReceived" : "borrowedItemsApi.markReturned")} onClose={() => { if (!updateMutation.isLoading) setTransitionTarget(null); }} footer={<><button className="btn-cancel-modal" disabled={updateMutation.isLoading} onClick={() => setTransitionTarget(null)}>{t("wording.cancel")}</button><button className="btn-save-modal" disabled={updateMutation.isLoading} onClick={() => void advance()}><IconCheck /> {t("eventUpgrade.confirm")}</button></>}><p>{t(transitionTarget?.status === "REQUESTED" ? "borrowedItemsApi.receiveConfirm" : "borrowedItemsApi.returnConfirmNew", { item: transitionTarget?.item_name })}</p></Modal>
  </>;
}
