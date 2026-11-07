import { Link } from "react-router-dom";

import type { OutsourceItem } from "../hooks/api/useOutsource";
import { fmtNum, formatIDR } from "../lib/format";

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function EventOutsourceItemsPanel({ items, isLoading, isError, locked, isActing, onAdvance, onCancel }: { items: OutsourceItem[]; isLoading: boolean; isError: boolean; locked: boolean; isActing: boolean; onAdvance: (item: OutsourceItem) => void; onCancel: (item: OutsourceItem) => void }) {
  const totalCost = items.reduce((sum, item) => sum + Number(item.total_cost || item.qty * item.cost || 0), 0);
  if (isLoading) return <div className="no-data">Loading...</div>;
  if (isError) return <div className="no-data">Outsource items could not be loaded.</div>;
  return <>
    <p className="summary-text"><strong>{fmtNum(items.length)}</strong> outsourced items{totalCost > 0 && <> · Total cost <strong>{formatIDR(totalCost)}</strong></>}</p>
    {items.length === 0 ? <div className="no-data">No outsource requests yet. Use Outsource Item above to create one.</div> : <div className="production-list">
      {items.map(item => <article className="production-card event-loan-card" key={item.id}>
        <div className="production-card-main">
          <div className="production-card-title"><span className="badge badge-orange">Outsource</span>{item.item_name}<span className={`badge ${item.status === "COMPLETED" ? "badge-green" : item.status === "RECEIVED" ? "badge-blue" : "badge-orange"}`}>{item.status}</span></div>
          <div className="production-card-meta">
            <span>Qty {fmtNum(item.qty)} {item.unit || ""}</span>
            <span>{item.area_name || item.event?.area || "—"}{(item.sub_area_name || item.event?.sub_area) ? ` · ${item.sub_area_name || item.event?.sub_area}` : ""}</span>
            <span>Vendor {item.vendor?.id ? <Link to={`/outsource-vendor-detail?id=${item.vendor.id}`}>{item.vendor.name}</Link> : "—"}</span>
            <span>{dateLabel(item.from_date)} → {dateLabel(item.to_date)}</span>
            {item.cost > 0 && <span>{formatIDR(item.cost)} / {item.unit || "unit"} · Total {formatIDR(item.total_cost || item.qty * item.cost)}</span>}
            <span>Requested by {item.requested_by || "—"} · {dateLabel(item.requested_at)}</span>
          </div>
          {item.note && <div className="production-card-note">{item.note}</div>}
        </div>
        <div className="production-card-actions">
          {!locked && item.status === "REQUESTED" && <button className="btn btn-ghost" disabled={isActing} onClick={() => onCancel(item)}>Cancel</button>}
          {!locked && item.status !== "COMPLETED" && <button className="btn-save-modal" disabled={isActing} onClick={() => onAdvance(item)}>{item.status === "REQUESTED" ? "Mark Received" : "Mark Completed"}</button>}
          {item.status === "COMPLETED" && <span className="production-done-note">Completed</span>}
        </div>
      </article>)}
    </div>}
  </>;
}
