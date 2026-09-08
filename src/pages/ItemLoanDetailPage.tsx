import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";

import Modal from "../components/Modal";
import { IconCheck, IconClose } from "../components/icons";
import useGetItemLoans, {
  type ItemLoanItem,
} from "../hooks/api/useGetItemLoans";
import usePutReturnItemLoan from "../hooks/api/usePutReturnItemLoan";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  const monthIndex = Number(month) - 1;
  const date = Number.parseInt(day, 10);
  if (!year || !MONTHS_SHORT[monthIndex] || Number.isNaN(date)) return value;
  return `${date} ${MONTHS_SHORT[monthIndex]} ${year}`;
}

function todayIso() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "returned") return "badge-green";
  if (normalized === "overdue") return "badge-red";
  return "badge-blue";
}

function errorMessage(error: unknown) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  return apiMessage || (error instanceof Error ? error.message : "Failed to return item loan.");
}

export default function ItemLoanDetailPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loanId = Number(params.get("id"));
  const routeLoan = (location.state as { loan?: ItemLoanItem } | null)?.loan;
  const [loan, setLoan] = useState<ItemLoanItem | null>(
    routeLoan?.id === loanId ? routeLoan : null,
  );
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const {
    data: loansResponse,
    isLoading,
    isError,
    refetch,
  } = useGetItemLoans({
    params: { page: 1, limit: 100 },
    options: { keepPreviousData: true },
  });
  const { mutateAsync: returnItemLoan, isLoading: isReturning } =
    usePutReturnItemLoan();

  useEffect(() => {
    const fetchedLoan = loansResponse?.data.data.find((item) => item.id === loanId);
    if (fetchedLoan) setLoan(fetchedLoan);
  }, [loanId, loansResponse?.data.data]);

  async function confirmReturn() {
    if (!loan) return;

    try {
      const response = await returnItemLoan(loan.id);
      toast.success(response.message || "Item returned successfully.");
      setLoan((current) =>
        current
          ? { ...current, status: "Returned", return_date: todayIso() }
          : current,
      );
      setReturnModalOpen(false);
      await queryClient.invalidateQueries(["useGetItemLoans"]);
      await refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  if (!loan && isLoading) {
    return <div className="card no-data">Loading loan detail…</div>;
  }

  if (!loan) {
    return (
      <>
        <h1 className="page-title">Item Loan</h1>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ fontSize: 13.5, color: isError ? "var(--red)" : "var(--text-muted)", marginBottom: 16 }}>
            {isError ? "Unable to load loan detail." : "Loan not found."}
          </p>
          <button className="btn btn-ghost" onClick={() => navigate("/item-loan")}>Back to Item Loan</button>
        </div>
      </>
    );
  }

  const isReturned = loan.status.toLowerCase() === "returned";

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={() => navigate("/item-loan")}
          className="detail-back-button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Item Loan
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="item-loan-detail-heading">
          <div>
            <div className="item-loan-detail-title">{loan.borrower_name}</div>
            <div className="item-loan-detail-subtitle">{loan.borrower_contact || "—"}</div>
          </div>
          <span className={`badge ${statusBadgeClass(loan.status)}`}>{loan.status}</span>
        </div>
        <div className="item-detail-grid">
          <div className="item-detail-row"><span>Purpose</span><strong>{loan.purpose || "—"}</strong></div>
          <div className="item-detail-row"><span>Loan Date</span><strong>{fmtDate(loan.loan_date)}</strong></div>
          <div className="item-detail-row"><span>Due Date</span><strong>{fmtDate(loan.due_date)}</strong></div>
          <div className="item-detail-row"><span>Warehouse</span><strong>{loan.warehouse_name || "—"}</strong></div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Items in This Loan</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th style={{ width: 100, textAlign: "right" }}>Qty</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 120 }}>Return Date</th>
                <th style={{ width: 90, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="name-cell">{loan.item_name}</td>
                <td style={{ color: "var(--text-muted)" }}>{loan.warehouse_name || "—"}</td>
                <td style={{ textAlign: "right" }}>{loan.qty} {loan.unit_name}</td>
                <td><span className={`badge ${statusBadgeClass(loan.status)}`}>{loan.status}</span></td>
                <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(loan.return_date)}</td>
                <td style={{ textAlign: "center" }}>
                  {isReturned ? (
                    <span className="item-loan-returned-icon"><IconCheck /></span>
                  ) : (
                    <button className="btn-icon" title="Return Item" style={{ color: "var(--green)" }} onClick={() => setReturnModalOpen(true)}><IconCheck /></button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={returnModalOpen}
        title="Return Item"
        onClose={() => !isReturning && setReturnModalOpen(false)}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isReturning} onClick={() => setReturnModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isReturning} onClick={() => void confirmReturn()}><IconCheck /> {isReturning ? "Returning…" : "Confirm Return"}</button>
          </>
        )}
      >
        <p className="confirm-msg">
          Mark <strong>{loan.qty} {loan.unit_name}</strong> of <strong>&ldquo;{loan.item_name}&rdquo;</strong> as returned?
        </p>
      </Modal>
    </>
  );
}
