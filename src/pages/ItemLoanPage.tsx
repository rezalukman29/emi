import { useEffect, useState } from "react";
import { useFormik } from "formik";
import { useQueryClient } from "react-query";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import TextInput from "../components/TextInput";
import { IconCheck, IconClose, IconPlus, IconSearch } from "../components/icons";
import useGetBarangGudang from "../hooks/api/useGetBarangGudang";
import useGetItemLoans, {
  type ItemLoanStatus,
} from "../hooks/api/useGetItemLoans";
import usePostItemLoan from "../hooks/api/usePostItemLoan";
import usePutReturnItemLoan from "../hooks/api/usePutReturnItemLoan";
import SearchableSelect from "../components/SearchableSelect";

const PAGE_SIZE = 10;
const ITEM_PAGE_SIZE = 30;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusBadgeClass(status: string) {
  if (status.toLowerCase() === "returned") return "badge-green";
  if (status.toLowerCase() === "overdue") return "badge-red";
  return "badge-blue";
}

function statusLabel(status: string) {
  if (!status) return "-";
  return `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`;
}

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

export default function ItemLoanPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemLoanStatus | "">("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemSearchInput, setItemSearchInput] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [returningId, setReturningId] = useState<number | null>(null);

  const {
    data: loansResponse,
    isLoading: isLoansLoading,
    isError: isLoansError,
  } = useGetItemLoans({
    params: {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: statusFilter || undefined,
    },
    options: { keepPreviousData: true },
  });
  const { data: loanedResponse } = useGetItemLoans({
    params: { page: 1, limit: 1, status: "Loaned" },
  });
  const { data: overdueResponse } = useGetItemLoans({
    params: { page: 1, limit: 1, status: "Overdue" },
  });
  const { data: returnedResponse } = useGetItemLoans({
    params: { page: 1, limit: 1, status: "Returned" },
  });
  const {
    data: inventoryResponse,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useGetBarangGudang({
    params: {
      page: 1,
      limit: ITEM_PAGE_SIZE,
      search: itemSearch || undefined,
      sort: "ASC",
      sortBy: "name",
    },
    options: {
      enabled: modalOpen,
      keepPreviousData: true,
    },
  });
  const { mutateAsync: createItemLoan, isLoading: isCreating } = usePostItemLoan();
  const { mutateAsync: returnItemLoan } = usePutReturnItemLoan();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setItemSearch(itemSearchInput.trim());
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [itemSearchInput]);

  const loans = loansResponse?.data.data ?? [];
  const totalRecords = loansResponse?.data.total_records ?? 0;
  const totalPages = Math.max(1, loansResponse?.data.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);
  const inventoryRows = inventoryResponse?.data ?? [];
  const loanedCount = loanedResponse?.data.total_records ?? 0;
  const overdueCount = overdueResponse?.data.total_records ?? 0;
  const returnedCount = returnedResponse?.data.total_records ?? 0;
  const totalLoanCount = loanedCount + overdueCount + returnedCount;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const formik = useFormik({
    initialValues: {
      barang_gudang_id: "",
      qty: "1",
      borrower_name: "",
      borrower_contact: "",
      purpose: "",
      loan_date: todayIso(),
      due_date: "",
    },
    validationSchema: Yup.object({
      barang_gudang_id: Yup.string().required("Required"),
      qty: Yup.number().typeError("Must be a number").integer("Must be a whole number").min(1, "Minimum quantity is 1").required("Required"),
      borrower_name: Yup.string().trim().required("Required"),
      borrower_contact: Yup.string().trim().required("Required"),
      purpose: Yup.string().trim().required("Required"),
      loan_date: Yup.string().required("Required"),
      due_date: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      try {
        const response = await createItemLoan({
          barang_gudang_id: Number(values.barang_gudang_id),
          borrower_contact: values.borrower_contact.trim(),
          borrower_name: values.borrower_name.trim(),
          due_date: values.due_date,
          loan_date: values.loan_date,
          purpose: values.purpose.trim(),
          qty: Number(values.qty),
        });
        toast(response.message, { type: "success" });
        setModalOpen(false);
        resetForm();
        setItemSearchInput("");
        setItemSearch("");
        setPage(1);
        await queryClient.invalidateQueries(["useGetItemLoans"]);
      } catch (error) {
        toast(errorMessage(error, "Failed to create item loan."), { type: "error" });
      }
    },
  });

  function openNew() {
    formik.resetForm();
    setItemSearchInput("");
    setItemSearch("");
    setModalOpen(true);
  }

  function closeModal() {
    if (isCreating) return;
    formik.resetForm();
    setModalOpen(false);
  }

  async function handleReturn(id: number) {
    try {
      setReturningId(id);
      const response = await returnItemLoan(id);
      toast(response.message, { type: "success" });
      await queryClient.invalidateQueries(["useGetItemLoans"]);
    } catch (error) {
      toast(errorMessage(error, "Failed to return item loan."), { type: "error" });
    } finally {
      setReturningId(null);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Item Loan</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> Loan Item</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "Total Loans", value: totalLoanCount, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Currently Borrowed", value: loanedCount, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Overdue", value: overdueCount, color: "var(--red)", bg: "var(--red-bg)" },
          { label: "Returned", value: returnedCount, color: "var(--green)", bg: "var(--green-bg)" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <span className="stat-value" style={{ color: stat.color }}>{stat.value}</span>
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
              <input className="search-input" type="text" placeholder="Search items or borrowers…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
            <SearchableSelect
              inline
              value={statusFilter}
              onChange={(value) => { setStatusFilter(String(value) as ItemLoanStatus | ""); setPage(1); }}
              options={[
                { value: "", label: "All Statuses" },
                { value: "Loaned", label: "Loaned" },
                { value: "Overdue", label: "Overdue" },
                { value: "Returned", label: "Returned" },
              ]}
              placeholder="All Statuses"
              searchPlaceholder="Search statuses…"
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Borrower</th>
                <th style={{ width: 80, textAlign: "right" }}>Qty</th>
                <th>Warehouse</th>
                <th style={{ width: 110 }}>Loan Date</th>
                <th style={{ width: 110 }}>Due Date</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 100, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoansLoading && !loans.length ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>Loading loans…</td></tr>
              ) : isLoansError ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--red)", padding: 32 }}>Unable to load loans.</td></tr>
              ) : !loans.length ? (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}>No loans found.</td></tr>
              ) : loans.map((loan) => {
                const isReturned = loan.status.toLowerCase() === "returned";
                return (
                  <tr key={loan.id}>
                    <td className="name-cell">{loan.item_name}<div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{loan.purpose || "-"}</div></td>
                    <td>{loan.borrower_name}<div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{loan.borrower_contact || "-"}</div></td>
                    <td style={{ textAlign: "right" }}>{loan.qty} {loan.unit_name}</td>
                    <td style={{ color: "var(--text-muted)" }}>{loan.warehouse_name || "-"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(loan.loan_date)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{fmtDate(loan.due_date)}</td>
                    <td><span className={`badge ${statusBadgeClass(loan.status)}`}>{statusLabel(loan.status)}</span></td>
                    <td style={{ textAlign: "center" }}>
                      {isReturned ? (
                        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{fmtDate(loan.return_date)}</span>
                      ) : (
                        <button className="btn-icon" title="Mark as Returned" disabled={returningId === loan.id} style={{ color: "var(--green)" }} onClick={() => handleReturn(loan.id)}>
                          <IconCheck />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={totalRecords} pageSize={PAGE_SIZE} onPage={setPage} label="loans" />
      </div>

      <Modal
        open={modalOpen}
        title="Loan Item"
        onClose={closeModal}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isCreating} onClick={closeModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={isCreating} onClick={() => formik.handleSubmit()}><IconCheck /> {isCreating ? "Saving…" : "Save"}</button>
          </>
        )}
      >
        <div className="form-group">
          <label>Search Item</label>
          <div className="search-wrap" style={{ width: "100%" }}>
            <IconSearch />
            <input
              className="search-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search item name…"
              value={itemSearchInput}
              onChange={(event) => setItemSearchInput(event.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Item <span style={{ color: "var(--red)" }}>*</span></label>
          <SearchableSelect
            value={formik.values.barang_gudang_id}
            onChange={(value) => formik.setFieldValue("barang_gudang_id", String(value))}
            options={[
              { value: "", label: "Select an item" },
              ...inventoryRows.map((item) => ({
                value: item.barang_gudang_id,
                label: item.nama_barang,
                meta: `${item.gudang_name || item.gudang?.gudang_name || "Unknown warehouse"} · ${item.stok_gudang} ${item.nama_satuan}`,
              })),
            ]}
            placeholder="Select an item"
            searchPlaceholder="Search items…"
            disabled={isInventoryLoading}
          />
          {isInventoryLoading && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading items…</span>}
          {isInventoryError && <span style={{ color: "var(--red)", fontSize: 12 }}>Unable to load items.</span>}
          {formik.errors.barang_gudang_id && <span style={{ color: "var(--red)", fontSize: 12 }}>{formik.errors.barang_gudang_id}</span>}
        </div>
        <div className="form-row">
          <TextInput value={formik.values.qty} onChange={(value) => formik.setFieldValue("qty", value)} isRequired isNumeric label="Qty" errorText={formik.errors.qty as string} />
          <TextInput value={formik.values.borrower_name} onChange={(value) => formik.setFieldValue("borrower_name", value)} isRequired label="Borrower Name" errorText={formik.errors.borrower_name} />
        </div>
        <TextInput value={formik.values.borrower_contact} onChange={(value) => formik.setFieldValue("borrower_contact", value)} isRequired label="Contact" placeholder="Phone number / email" errorText={formik.errors.borrower_contact} />
        <TextInput value={formik.values.purpose} onChange={(value) => formik.setFieldValue("purpose", value)} isRequired label="Purpose" placeholder="What is the item being borrowed for?" errorText={formik.errors.purpose} />
        <div className="form-row">
          <TextInput value={formik.values.loan_date} onChange={(value) => formik.setFieldValue("loan_date", value)} isRequired inputType="date" label="Loan Date" errorText={formik.errors.loan_date} />
          <TextInput value={formik.values.due_date} onChange={(value) => formik.setFieldValue("due_date", value)} isRequired inputType="date" label="Due Date" errorText={formik.errors.due_date} />
        </div>
      </Modal>
    </>
  );
}
