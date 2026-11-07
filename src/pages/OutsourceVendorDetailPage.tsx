import { Link, useSearchParams } from "react-router-dom";

import Pagination from "../components/Pagination";
import { useGetOutsourceItems, useGetOutsourceVendor } from "../hooks/api/useOutsource";
import { fmtNum, formatIDR } from "../lib/format";
import { useState } from "react";

function dateLabel(value?: string | null) { if (!value) return "—"; return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

export default function OutsourceVendorDetailPage() {
  const [params] = useSearchParams();
  const id = Number(params.get("id") || 0);
  const [page, setPage] = useState(1);
  const vendorQuery = useGetOutsourceVendor(id);
  const itemQuery = useGetOutsourceItems({ outsource_vendor_id: id, page, limit: 100 }, { enabled: id > 0, keepPreviousData: true });
  const vendor = vendorQuery.data?.data;
  const data = itemQuery.data?.data;
  const items = data?.data ?? [];
  const active = items.filter(item => item.status !== "COMPLETED");
  const totalCost = data?.summary?.total_cost ?? items.reduce((sum, item) => sum + Number(item.total_cost || item.qty * item.cost || 0), 0);
  if (!id) return <div className="no-data">Invalid outsource vendor.</div>;
  if (vendorQuery.isLoading) return <div className="no-data">Loading...</div>;
  if (!vendor) return <div className="no-data">Outsource vendor not found.</div>;
  return <>
    <div className="vendor-detail-heading"><Link to="/outsource">← Back to Outsource</Link><h1 className="page-title">{vendor.name}</h1><span className={`badge badge-${vendor.type === "Internal" ? "green" : "orange"}`}>{vendor.type}</span></div>
    <div className="loan-vendor-overview-grid">
      <section className="card loan-vendor-info-card"><h3>Vendor Info</h3><dl><div><dt>Type</dt><dd>{vendor.type}</dd></div><div><dt>Phone</dt><dd>{vendor.phone || "—"}</dd></div><div><dt>Address</dt><dd>{vendor.address || "—"}</dd></div><div><dt>Description</dt><dd>{vendor.description || "—"}</dd></div><div><dt>Orders</dt><dd>{fmtNum(vendor.orders)}</dd></div></dl></section>
      <section className="card loan-vendor-info-card"><h3>Active Outsourced Items</h3>{active.length === 0 ? <p className="muted">No active orders.</p> : active.map(item => <div className="vendor-current-item" key={item.id}><div><strong>{item.item_name}</strong><small>{item.event?.name || "No event"}</small></div><div><strong>{fmtNum(item.qty)} {item.unit}</strong><span className={`badge ${item.status === "RECEIVED" ? "badge-blue" : "badge-orange"}`}>{item.status}</span></div></div>)}</section>
    </div>
    <h2 className="section-title">Outsource History</h2>
    <div className="stats-bar vendor-stats-bar"><div className="stat-card"><span className="stat-icon" style={{ background: "var(--brand-bg)" }}><strong className="stat-value" style={{ color: "var(--brand)" }}>{fmtNum(data?.summary?.outsource_records || 0)}</strong></span><span className="stat-label">Orders</span></div><div className="stat-card"><span className="stat-icon" style={{ background: "var(--orange-bg)" }}><strong className="stat-value" style={{ color: "var(--orange)" }}>{fmtNum(active.length)}</strong></span><span className="stat-label">Active</span></div><div className="stat-card"><span className="stat-icon" style={{ background: "var(--green-bg)" }}><strong className="stat-value" style={{ color: "var(--green)" }}>{fmtNum(data?.summary?.completed || 0)}</strong></span><span className="stat-label">Completed</span></div><div className="stat-card"><span className="stat-icon" style={{ background: "var(--brand-bg)" }}><strong className="stat-value" style={{ color: "var(--brand)" }}>{formatIDR(totalCost)}</strong></span><span className="stat-label">Total Cost</span></div></div>
    <div className="card vendor-list-card"><div className="table-wrap"><table className="loan-vendor-table"><thead><tr><th>Requested</th><th>Item</th><th>Qty</th><th>Event</th><th>Period</th><th>Cost</th><th>Status</th></tr></thead><tbody>{itemQuery.isLoading && <tr><td colSpan={7} className="vendor-empty-cell">Loading...</td></tr>}{items.map(item => <tr key={item.id}><td>{dateLabel(item.requested_at)}</td><td className="name-cell">{item.item_name}<small className="table-cell-note">{item.note}</small></td><td>{fmtNum(item.qty)} {item.unit}</td><td>{item.event?.name || "—"}<small className="table-cell-note">{item.event?.area}{item.event?.sub_area ? ` · ${item.event.sub_area}` : ""}</small></td><td>{dateLabel(item.from_date)} → {dateLabel(item.to_date)}</td><td>{formatIDR(item.total_cost || item.qty * item.cost)}</td><td><span className={`badge ${item.status === "COMPLETED" ? "badge-green" : item.status === "RECEIVED" ? "badge-blue" : "badge-orange"}`}>{item.status}</span></td></tr>)}</tbody></table></div><Pagination currentPage={data?.page || page} total={data?.total_records || 0} pageSize={data?.record_per_page || 100} onPage={setPage} label="items" /></div>
  </>;
}
