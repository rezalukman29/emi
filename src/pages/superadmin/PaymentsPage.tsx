import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SearchableSelect from "../../components/SearchableSelect";
import SortTh from "../../components/SortTh";
import TextInput from "../../components/TextInput";
import {
  IconCheck,
  IconClose,
  IconDelete,
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
} from "../../components/icons";
import useCreateSuperAdminPayment from "../../hooks/api/useCreateSuperAdminPayment";
import useDeleteSuperAdminPayment from "../../hooks/api/useDeleteSuperAdminPayment";
import useGetAdminPlan from "../../hooks/api/useGetAdminPlan";
import useGetSuperAdminCustomers from "../../hooks/api/useGetSuperAdminCustomers";
import useGetSuperAdminPayments, {
  type SuperAdminPayment,
} from "../../hooks/api/useGetSuperAdminPayments";
import useUpdateSuperAdminPayment from "../../hooks/api/useUpdateSuperAdminPayment";
import { formatIDR, paymentStatusBadge } from "../../lib/superAdminUtils";

const PAGE_SIZE = 10;
const STATUS_FILTERS = ["paid", "pending", "failed", "refunded"];
const PAYMENT_STATUSES = ["PAID", "PENDING", "FAILED", "REFUNDED"];
const PAYMENT_METHODS = [
  "QRIS",
  "VIRTUAL_ACCOUNT",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "BANK_TANSFER",
];
const SORT_FIELDS = [
  "invoice_no",
  "customer",
  "plan",
  "amount",
  "method",
  "status",
  "date",
];

interface PaymentForm {
  amount: string;
  companyId: string;
  method: string;
  paidAt: string;
  planId: string;
  status: string;
}

function emptyForm(): PaymentForm {
  return {
    amount: "",
    companyId: "",
    method: "",
    paidAt: "",
    planId: "",
    status: "PENDING",
  };
}

function requestErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : fallback;
}

function toDateTimeInput(value?: string) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

function toApiDateTime(value: string) {
  const normalized = value.trim().replace("T", " ");
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function formatPaymentDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentMethodLabel(value: string) {
  return value.split("_").join(" ");
}

export default function PaymentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortCol, setSortCol] = useState(6);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SuperAdminPayment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SuperAdminPayment | null>(null);

  const {
    data: paymentsResponse,
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
    refetch: refetchPayments,
  } = useGetSuperAdminPayments({
    params: {
      search: search || undefined,
      status: statusFilter || undefined,
      page,
      limit: PAGE_SIZE,
      sort_by: SORT_FIELDS[sortCol] ?? "date",
      sort: sortAsc ? "ASC" : "DESC",
    },
    options: { keepPreviousData: true },
  });
  const { data: customersResponse } = useGetSuperAdminCustomers({
    params: { page: 1, limit: 9999 },
    options: { enabled: formOpen },
  });
  const { data: plansResponse } = useGetAdminPlan({
    options: { enabled: formOpen },
  });
  const { mutateAsync: createPayment, isLoading: isCreating } =
    useCreateSuperAdminPayment();
  const { mutateAsync: updatePayment, isLoading: isUpdating } =
    useUpdateSuperAdminPayment();
  const { mutateAsync: deletePayment, isLoading: isDeleting } =
    useDeleteSuperAdminPayment();
  const isSaving = isCreating || isUpdating;

  const paymentData = paymentsResponse?.data;
  const payments = paymentData?.items ?? [];
  const stats = paymentData?.stats;
  const total = paymentData?.total ?? 0;
  const totalPages = Math.max(1, paymentData?.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);

  const customerOptions = useMemo(
    () =>
      (customersResponse?.data?.items ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
        meta: customer.email,
      })),
    [customersResponse?.data?.items],
  );
  const planOptions = plansResponse?.data ?? [];
  const methodOptions = PAYMENT_METHODS.map((method) => ({
    value: method,
    label: paymentMethodLabel(method),
  }));

  const formik = useFormik<PaymentForm>({
    initialValues: emptyForm(),
    validationSchema: Yup.object({
      amount: Yup.number()
        .typeError("Amount must be a number.")
        .moreThan(0, "Amount must be greater than zero.")
        .required("Amount is required."),
      companyId: Yup.string().required("Company is required."),
      method: Yup.string()
        .oneOf(PAYMENT_METHODS)
        .required("Payment method is required."),
      paidAt: Yup.string().required("Paid date is required."),
      planId: Yup.string().required("Plan is required."),
      status: Yup.string()
        .oneOf(PAYMENT_STATUSES)
        .required("Status is required."),
    }),
    onSubmit: async (values, { resetForm }) => {
      const payload = {
        amount: Number(values.amount),
        company_id: Number(values.companyId),
        method: values.method,
        paid_at: toApiDateTime(values.paidAt),
        plan_id: Number(values.planId),
        status: values.status,
      };

      try {
        const currentEditingId = editingId;
        const response = currentEditingId
          ? await updatePayment({ id: currentEditingId, payload })
          : await createPayment(payload);
        toast(response.message, { type: "success" });
        setFormOpen(false);
        setEditingId(null);
        resetForm();
        if (!currentEditingId && page !== 1) setPage(1);
        else await refetchPayments();
      } catch (error) {
        toast(
          requestErrorMessage(
            error,
            editingId ? "Failed to update payment." : "Failed to create payment.",
          ),
          { type: "error" },
        );
      }
    },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleSort(column: number) {
    if (sortCol === column) setSortAsc((current) => !current);
    else {
      setSortCol(column);
      setSortAsc(true);
    }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    formik.resetForm({ values: emptyForm() });
    setFormOpen(true);
  }

  function openEdit(payment: SuperAdminPayment) {
    setEditingId(payment.id);
    formik.resetForm({
      values: {
        amount: String(payment.amount),
        companyId: String(payment.company_id),
        method: payment.method.toUpperCase(),
        paidAt: toDateTimeInput(payment.paid_at || payment.created_at),
        planId: String(payment.plan_id),
        status: payment.status.toUpperCase(),
      },
    });
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setEditingId(null);
    formik.resetForm();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const response = await deletePayment(deleteTarget.id);
      toast(response.message, { type: "success" });
      setDeleteTarget(null);
      await refetchPayments();
    } catch (error) {
      toast(requestErrorMessage(error, "Failed to delete payment."), {
        type: "error",
      });
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Payments</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> Add Payment</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "Total Revenue", value: formatIDR(stats?.total_revenue ?? 0), color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Total Transactions", value: stats?.total_transactions ?? 0, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Pending", value: stats?.pending ?? 0, color: "var(--orange)", bg: "var(--orange-bg)" },
          { label: "Failed", value: stats?.failed ?? 0, color: "var(--red)", bg: "var(--red-bg)" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <span className="stat-value" style={{ color: stat.color, fontSize: typeof stat.value === "string" ? 13 : 20 }}>{stat.value}</span>
            </div>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder="Search invoice, customer…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <div className="wi-select-wrap">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Status</option>
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> Add Payment</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh label="Invoice #" colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 140 }} />
                <SortTh label="Customer" colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Plan" colIndex={2} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="Amount" colIndex={3} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 130 }} />
                <SortTh label="Method" colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150 }} />
                <SortTh label="Status" colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 100 }} />
                <SortTh label="Date" colIndex={6} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width: 150 }} />
                <th style={{ width: 120, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isPaymentsLoading && !paymentData ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>Loading payments…</td></tr>
              ) : isPaymentsError ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--red)", padding: 40 }}>Unable to load payments.</td></tr>
              ) : !payments.length ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>No payments found.</td></tr>
              ) : payments.map((payment) => {
                const normalizedStatus = payment.status.toLowerCase();
                return (
                  <tr key={payment.id}>
                    <td className="id-cell">{payment.invoice_no || "-"}</td>
                    <td className="name-cell">{payment.company_name || "-"}</td>
                    <td>{payment.plan_name || "-"}</td>
                    <td>{formatIDR(payment.amount)}</td>
                    <td>{paymentMethodLabel(payment.method)}</td>
                    <td><span className={`badge badge-${paymentStatusBadge(normalizedStatus)}`}>{normalizedStatus[0]?.toUpperCase() + normalizedStatus.slice(1)}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>{formatPaymentDate(payment.paid_at || payment.created_at)}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent: "center" }}>
                        <button className="btn-icon" title="View Detail" onClick={() => setDetail(payment)}><IconEye /></button>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(payment)}><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(payment)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={total} pageSize={PAGE_SIZE} onPage={setPage} label="payments" />
      </div>

      <Modal
        open={formOpen}
        title={editingId ? "Edit Payment" : "Add Payment"}
        onClose={closeForm}
        size="lg"
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSaving} onClick={closeForm}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isSaving} onClick={() => formik.handleSubmit()}>
              <IconCheck /> {isSaving ? "Saving…" : "Save"}
            </button>
          </>
        )}
      >
        <div className="form-row">
          <div className="form-group">
            <label>Company <span style={{ color: "var(--red)" }}>*</span></label>
            <SearchableSelect
              value={formik.values.companyId}
              onChange={(value) => formik.setFieldValue("companyId", String(value))}
              options={customerOptions}
              placeholder="Select company…"
              searchPlaceholder="Search company…"
              emptyText="No companies found"
            />
            {formik.touched.companyId && formik.errors.companyId && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.companyId}</span>}
          </div>
          <div className="form-group">
            <label>Plan <span style={{ color: "var(--red)" }}>*</span></label>
            <select value={formik.values.planId} onChange={(event) => formik.setFieldValue("planId", event.target.value)}>
              <option value="">Select plan…</option>
              {planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </select>
            {formik.touched.planId && formik.errors.planId && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.planId}</span>}
          </div>
          <TextInput
            variant="secondary"
            value={formik.values.amount}
            onChange={(value) => formik.setFieldValue("amount", value)}
            isRequired
            isNumeric
            label="Amount"
            placeholder="Enter amount"
            errorText={formik.touched.amount ? formik.errors.amount : undefined}
          />
          <div className="form-group">
            <label>Payment Method <span style={{ color: "var(--red)" }}>*</span></label>
            <SearchableSelect
              value={formik.values.method}
              onChange={(value) => formik.setFieldValue("method", String(value))}
              options={methodOptions}
              placeholder="Select payment method…"
              searchPlaceholder="Search payment method…"
            />
            {formik.touched.method && formik.errors.method && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.method}</span>}
          </div>
          <TextInput
            variant="secondary"
            value={formik.values.paidAt}
            onChange={(value) => formik.setFieldValue("paidAt", value)}
            isRequired
            inputType="datetime-local"
            label="Paid At"
            errorText={formik.touched.paidAt ? formik.errors.paidAt : undefined}
          />
          <div className="form-group">
            <label>Status <span style={{ color: "var(--red)" }}>*</span></label>
            <select value={formik.values.status} onChange={(event) => formik.setFieldValue("status", event.target.value)}>
              {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {formik.touched.status && formik.errors.status && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.status}</span>}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        title="Payment Detail"
        onClose={() => setDetail(null)}
        footer={<button className="btn-cancel-modal" onClick={() => setDetail(null)}><IconClose /> Close</button>}
      >
        {detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Invoice", detail.invoice_no || "-"],
              ["Customer", detail.company_name || "-"],
              ["Plan", detail.plan_name || "-"],
              ["Amount", formatIDR(detail.amount)],
              ["Method", paymentMethodLabel(detail.method)],
              ["Status", detail.status],
              ["Paid At", formatPaymentDate(detail.paid_at)],
            ].map(([key, value]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 20, borderBottom: "1px solid var(--border-2)", paddingBottom: 8 }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{key}</span>
                <strong style={{ fontSize: 13, textAlign: "right" }}>{value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Delete Payment"
        onClose={() => { if (!isDeleting) setDeleteTarget(null); }}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      >
        <p className="confirm-msg">
          Are you sure you want to delete payment <strong>&ldquo;{deleteTarget?.invoice_no || `#${deleteTarget?.id}`}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
