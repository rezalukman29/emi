import { useDeferredValue, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
import TextInput from "../components/TextInput";
import { IconDelete, IconEdit, IconPlus, IconSearch } from "../components/icons";
import {
  type OutsourceItem,
  type OutsourceStatus,
  type OutsourceVendor,
  type OutsourceVendorPayload,
  useCreateOutsourceVendor,
  useDeleteOutsourceItem,
  useDeleteOutsourceVendor,
  useGetOutsourceItems,
  useGetOutsourceVendors,
  useUpdateOutsourceItem,
  useUpdateOutsourceVendor,
  outsourceItemPayload,
} from "../hooks/api/useOutsource";
import { fmtNum, formatIDR } from "../lib/format";

const EMPTY_VENDOR: OutsourceVendorPayload = { name: "", type: "External", description: "", phone: "", address: "" };
const PAGE_SIZE = 10;

function errorMessage(error: unknown, fallback: string) { return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || (error as Error)?.message || fallback; }
function dateLabel(value?: string | null) { if (!value) return "—"; const date = new Date(`${value.slice(0, 10)}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

export default function OutsourcePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "items" ? "items" : "vendors";
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput.trim());
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OutsourceStatus | "">("");
  const [form, setForm] = useState<OutsourceVendorPayload>(EMPTY_VENDOR);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteVendor, setDeleteVendor] = useState<OutsourceVendor | null>(null);
  const [deleteItem, setDeleteItem] = useState<OutsourceItem | null>(null);

  const vendorQuery = useGetOutsourceVendors({ page, limit: PAGE_SIZE, ...(search ? { search } : {}) }, { enabled: tab === "vendors", keepPreviousData: true });
  const itemQuery = useGetOutsourceItems({ page, limit: PAGE_SIZE, ...(search ? { search } : {}), ...(status ? { status } : {}) }, { enabled: tab === "items", keepPreviousData: true });
  const createVendor = useCreateOutsourceVendor();
  const updateVendor = useUpdateOutsourceVendor();
  const removeVendor = useDeleteOutsourceVendor();
  const updateItem = useUpdateOutsourceItem();
  const removeItem = useDeleteOutsourceItem();
  const vendors = vendorQuery.data?.data?.items ?? [];
  const vendorData = vendorQuery.data?.data;
  const itemData = itemQuery.data?.data;
  const items = itemData?.data ?? [];
  const saving = createVendor.isLoading || updateVendor.isLoading;

  function openCreate() { setEditingId(null); setForm(EMPTY_VENDOR); setFormOpen(true); }
  function openEdit(vendor: OutsourceVendor) { setEditingId(vendor.id); setForm({ name: vendor.name, type: "External", description: vendor.description || "", phone: vendor.phone || "", address: vendor.address || "" }); setFormOpen(true); }
  async function saveVendor() {
    if (!form.name.trim() || saving) return;
    const payload: OutsourceVendorPayload = { ...form, type: "External", name: form.name.trim(), description: form.description.trim(), phone: form.phone.trim(), address: form.address.trim() };
    try {
      if (editingId) await updateVendor.mutateAsync({ id: editingId, payload }); else await createVendor.mutateAsync(payload);
      toast.success(editingId ? "Outsource vendor updated." : "Outsource vendor created.");
      setFormOpen(false); setEditingId(null); setForm(EMPTY_VENDOR);
      await queryClient.invalidateQueries("useGetOutsourceVendors");
    } catch (error) { toast.error(errorMessage(error, "Vendor could not be saved.")); }
  }
  async function confirmDeleteVendor() {
    if (!deleteVendor) return;
    try { await removeVendor.mutateAsync(deleteVendor.id); setDeleteVendor(null); toast.success("Outsource vendor deleted."); await queryClient.invalidateQueries("useGetOutsourceVendors"); } catch (error) { toast.error(errorMessage(error, "Vendor could not be deleted.")); }
  }
  async function advance(item: OutsourceItem) {
    const next: OutsourceStatus = item.status === "REQUESTED" ? "RECEIVED" : "COMPLETED";
    try { await updateItem.mutateAsync({ id: item.id, payload: outsourceItemPayload(item, next) }); toast.success(next === "RECEIVED" ? "Item marked received." : "Outsource order completed."); await queryClient.invalidateQueries("useGetOutsourceItems"); } catch (error) { toast.error(errorMessage(error, "Status could not be updated.")); }
  }
  async function confirmDeleteItem() {
    if (!deleteItem) return;
    try { await removeItem.mutateAsync(deleteItem.id); setDeleteItem(null); toast.success("Outsource request cancelled."); await queryClient.invalidateQueries("useGetOutsourceItems"); } catch (error) { toast.error(errorMessage(error, "Request could not be cancelled.")); }
  }

  const vendorStats = vendorData?.stats ?? { total: 0, orders: 0, active_orders: 0 };
  const itemStats = itemData?.summary ?? { outsource_records: 0, waiting_to_arrive: 0, received_now: 0, overdue: 0, completed: 0, total_cost: 0 };
  const summary = tab === "vendors"
    ? [["Total Vendors", vendorStats.total, "var(--brand)", "var(--brand-bg)"], ["Orders", vendorStats.orders, "var(--green)", "var(--green-bg)"], ["Active Orders", vendorStats.active_orders, "var(--orange)", "var(--orange-bg)"]]
    : [["Outsource Records", itemStats.outsource_records, "var(--brand)", "var(--brand-bg)"], ["Waiting to Arrive", itemStats.waiting_to_arrive, "var(--orange)", "var(--orange-bg)"], ["Received", itemStats.received_now, "var(--green)", "var(--green-bg)"], ["Completed", itemStats.completed, "var(--brand)", "var(--brand-bg)"]];

  return <>
    <div className="vendor-page-header loan-page-header"><div><h1 className="page-title">Outsource</h1><p className="vendor-page-description">Manage vendors and items purchased or supplied externally for events.</p></div>{tab === "vendors" && <button className="btn-new" onClick={openCreate}><IconPlus /> New Outsource Vendor</button>}</div>
    <div className="wi-tabs loan-tabs"><button className={`wi-tab-btn${tab === "vendors" ? " active" : ""}`} onClick={() => { setPage(1); setParams({}); }}>Vendors</button><button className={`wi-tab-btn${tab === "items" ? " active" : ""}`} onClick={() => { setPage(1); setParams({ tab: "items" }); }}>Outsourced Items</button></div>
    <div className="stats-bar vendor-stats-bar">{summary.map(([label, value, color, background]) => <div className="stat-card" key={String(label)}><span className="stat-icon" style={{ background: String(background) }}><strong className="stat-value" style={{ color: String(color) }}>{fmtNum(Number(value))}</strong></span><span className="stat-label">{label}</span></div>)}</div>
    <div className="card vendor-list-card loan-vendor-card">
      <div className="toolbar vendor-toolbar"><div className="toolbar-left"><div className="search-wrap"><IconSearch /><input className="search-input" placeholder={tab === "vendors" ? "Search vendor name..." : "Search item, vendor, or event..."} value={searchInput} onChange={event => { setSearchInput(event.target.value); setPage(1); }} /></div>{tab === "items" && <div className="vendor-origin-filter"><SearchableSelect value={status} onChange={value => { setStatus(value as OutsourceStatus | ""); setPage(1); }} options={[{ value: "", label: "All Status" }, ...(["REQUESTED", "RECEIVED", "COMPLETED"] as OutsourceStatus[]).map(value => ({ value, label: value }))]} /></div>}</div>{tab === "items" && <strong>Total cost: {formatIDR(itemStats.total_cost)}</strong>}</div>
      <div className="table-wrap">{tab === "vendors" ? <table className="loan-vendor-table"><thead><tr><th>Name</th><th>Description</th><th>Phone</th><th>Address</th><th className="number-cell">Orders</th><th>Action</th></tr></thead><tbody>
        {vendorQuery.isLoading && <tr><td colSpan={6} className="vendor-empty-cell">Loading...</td></tr>}{!vendorQuery.isLoading && vendors.length === 0 && <tr><td colSpan={6} className="vendor-empty-cell">No outsource vendors found.</td></tr>}
        {vendors.map(vendor => <tr key={vendor.id} className="row-clickable" tabIndex={0} onClick={() => navigate(`/outsource-vendor-detail?id=${vendor.id}`)} onKeyDown={event => { if (event.key === "Enter") navigate(`/outsource-vendor-detail?id=${vendor.id}`); }}><td className="name-cell">{vendor.name}</td><td>{vendor.description || "—"}</td><td>{vendor.phone || "—"}</td><td>{vendor.address || "—"}</td><td className="number-cell">{fmtNum(vendor.orders)}</td><td onClick={event => event.stopPropagation()}><div className="action-btns"><button className="btn-icon edit" onClick={() => openEdit(vendor)}><IconEdit /></button><button className="btn-icon delete" onClick={() => setDeleteVendor(vendor)}><IconDelete /></button></div></td></tr>)}
      </tbody></table> : <table className="loan-vendor-table"><thead><tr><th>Requested</th><th>Item</th><th>Qty</th><th>Vendor</th><th>Event</th><th>Period</th><th>Cost</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {itemQuery.isLoading && <tr><td colSpan={9} className="vendor-empty-cell">Loading...</td></tr>}{!itemQuery.isLoading && items.length === 0 && <tr><td colSpan={9} className="vendor-empty-cell">No outsource items found.</td></tr>}
        {items.map(item => <tr key={item.id}><td>{dateLabel(item.requested_at)}</td><td className="name-cell">{item.item_name}<small className="table-cell-note">{item.note}</small></td><td>{fmtNum(item.qty)} {item.unit}</td><td>{item.vendor?.name || "—"}</td><td>{item.event?.name || "—"}<small className="table-cell-note">{item.event?.area}{item.event?.sub_area ? ` · ${item.event.sub_area}` : ""}</small></td><td>{dateLabel(item.from_date)} → {dateLabel(item.to_date)}</td><td>{formatIDR(item.total_cost || item.qty * item.cost)}</td><td><span className={`badge ${item.status === "COMPLETED" ? "badge-green" : item.status === "RECEIVED" ? "badge-blue" : "badge-orange"}`}>{item.status}</span></td><td>{item.status === "REQUESTED" ? <div className="action-btns"><button className="btn btn-ghost" onClick={() => setDeleteItem(item)}>Cancel</button><button className="btn-save-modal" onClick={() => void advance(item)}>Mark Received</button></div> : item.status === "RECEIVED" ? <button className="btn-save-modal" onClick={() => void advance(item)}>Mark Completed</button> : "Completed"}</td></tr>)}
      </tbody></table>}</div>
      <Pagination currentPage={tab === "vendors" ? vendorData?.page || page : itemData?.page || page} total={tab === "vendors" ? vendorData?.total || 0 : itemData?.total_records || 0} pageSize={tab === "vendors" ? vendorData?.limit || PAGE_SIZE : itemData?.record_per_page || PAGE_SIZE} onPage={setPage} label={tab === "vendors" ? "vendors" : "items"} />
    </div>
    <Modal open={formOpen} title={editingId ? "Edit Outsource Vendor" : "New Outsource Vendor"} onClose={() => !saving && setFormOpen(false)} footer={<><button className="btn-cancel-modal" onClick={() => setFormOpen(false)}>Cancel</button><button className="btn-save-modal" disabled={!form.name.trim() || saving} onClick={() => void saveVendor()}>Save</button></>}><TextInput label="Name" isRequired value={form.name} onChange={name => setForm(current => ({ ...current, name }))} /><div className="form-group"><label>Description</label><textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></div><div className="form-row"><TextInput label="Phone" value={form.phone} onChange={phone => setForm(current => ({ ...current, phone }))} /><TextInput label="Address" value={form.address} onChange={address => setForm(current => ({ ...current, address }))} /></div></Modal>
    <Modal open={Boolean(deleteVendor)} title="Delete Outsource Vendor" onClose={() => setDeleteVendor(null)} footer={<><button className="btn-cancel-modal" onClick={() => setDeleteVendor(null)}>Cancel</button><button className="btn-del-ok" onClick={() => void confirmDeleteVendor()}>Delete</button></>}><p>Delete “{deleteVendor?.name}”?</p></Modal>
    <Modal open={Boolean(deleteItem)} title="Cancel Outsource Request" onClose={() => setDeleteItem(null)} footer={<><button className="btn-cancel-modal" onClick={() => setDeleteItem(null)}>Keep request</button><button className="btn-del-ok" onClick={() => void confirmDeleteItem()}>Cancel request</button></>}><p>Cancel the outsource request for “{deleteItem?.item_name}”?</p></Modal>
  </>;
}
