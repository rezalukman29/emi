import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { LoanItem } from "../hooks/api/useGetItemLoans";
import { fmtNum, formatIDR } from "../lib/format";

interface EventBorrowedItemsPanelProps {
  items: LoanItem[];
  isLoading: boolean;
  isError: boolean;
  locked: boolean;
  isActing: boolean;
  onAdvance: (item: LoanItem) => void;
  onCancel: (item: LoanItem) => void;
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

export default function EventBorrowedItemsPanel({ items, isLoading, isError, locked, isActing, onAdvance, onCancel }: EventBorrowedItemsPanelProps) {
  const { t } = useTranslation();
  const totalCost = items.reduce((sum, item) => sum + Number(item.rental_cost || (item.qty * item.rental_cost_per_unit) || 0), 0);

  if (isLoading) return <div className="no-data">{t("wording.loading")}</div>;
  if (isError) return <div className="no-data">{t("eventBorrow.loadError")}</div>;

  return <>
    <p className="summary-text"><strong>{fmtNum(items.length)}</strong> {t("eventBorrow.borrowedItems")}{totalCost > 0 && <> · {t("borrowedItemsApi.totalCost")} <strong>{formatIDR(totalCost)}</strong></>}</p>
    {items.length === 0 ? <div className="no-data">{t("eventBorrow.empty")}</div> : <div className="production-list">
      {items.map(item => {
        const canAdvance = item.status === "REQUESTED" || item.status === "BORROWED" || item.status === "OVERDUE";
        return <article className="production-card event-loan-card" key={item.id}>
          <div className="production-card-main">
            <div className="production-card-title"><span className="badge badge-blue">{t("eventBorrow.loan")}</span>{item.item_name}<span className={`badge ${badge(item.status)}`}>{item.status}</span></div>
            <div className="production-card-meta">
              <span>{t("wording.qty")} {fmtNum(item.qty)} {item.unit}</span>
              <span>{item.event?.area || "—"}{item.event?.sub_area ? ` · ${item.event.sub_area}` : ""}</span>
              <span>{t("eventBorrow.fromVendor")} {item.vendor?.id ? <Link to={`/loan-vendor-detail?id=${item.vendor.id}`}>{item.vendor.name}</Link> : "—"}</span>
              <span>{dateLabel(item.borrow_from)} → {dateLabel(item.return_by)}</span>
              {item.rental_cost_per_unit > 0 && <span>{formatIDR(item.rental_cost_per_unit)} / {item.unit} · {t("borrowedItemsApi.total")} {formatIDR(item.rental_cost || item.qty * item.rental_cost_per_unit)}</span>}
              <span>{t("eventBorrow.requestedBy", { name: item.requested_by || "—", date: dateLabel(item.requested_at) })}</span>
            </div>
            {item.notes && <div className="production-card-note">{item.notes}</div>}
            <div className={`production-card-note ${item.status === "OVERDUE" ? "warn" : "info"}`}>{t(item.status === "REQUESTED" ? "eventBorrow.requestedHint" : item.status === "RETURNED" ? "eventBorrow.returnedHint" : item.status === "OVERDUE" ? "eventBorrow.overdueHint" : "eventBorrow.borrowedHint", { date: dateLabel(item.return_by) })}</div>
          </div>
          <div className="production-card-actions">
            {!locked && item.status === "REQUESTED" && <button className="btn btn-ghost" disabled={isActing} onClick={() => onCancel(item)}>{t("wording.cancel")}</button>}
            {!locked && canAdvance && <button className="btn-save-modal" disabled={isActing} onClick={() => onAdvance(item)}>{t(item.status === "REQUESTED" ? "borrowedItemsApi.markReceived" : "borrowedItemsApi.markReturned")}</button>}
            {item.status === "RETURNED" && <span className="production-done-note">{t("borrowedItemsApi.returned")}</span>}
          </div>
        </article>;
      })}
    </div>}
  </>;
}
