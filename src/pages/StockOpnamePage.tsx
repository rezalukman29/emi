import { useEffect, useMemo, useState } from "react";
import { useFormik } from "formik";
import { useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import TextInput from "../components/TextInput";
import { IconCheck, IconSearch } from "../components/icons";
import useGetBarangGudang, {
  type BarangGudangItem,
} from "../hooks/api/useGetBarangGudang";
import useGetStockOpname from "../hooks/api/useGetStockOpname";
import usePostStockOpname from "../hooks/api/usePostStockOpname";
// import { saveStockOpnameLocalSubmission } from "../lib/stockOpnameSession";
import { useWarehouseController } from "./lib/useWarehouseController";

const GET_ALL_LIMIT = 99999;

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

export default function StockOpnamePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { warehouseOptions } = useWarehouseController();
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState("");
  const [actualStock, setActualStock] = useState<Record<number, string>>({});
  const [condition, setCondition] = useState<Record<number, "Good" | "Poor">>({});
  const [conditionNote, setConditionNote] = useState<Record<number, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: allInventoryResponse } = useGetBarangGudang({
    params: {
      page: 1,
      limit: GET_ALL_LIMIT,
      sort: "ASC",
      sortBy: "name",
    },
    options: { keepPreviousData: true },
  });

  const {
    data: inventoryResponse,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useGetBarangGudang({
    params: {
      page: 1,
      limit: GET_ALL_LIMIT,
      gudang_id: selectedWarehouse ? Number(selectedWarehouse) : undefined,
      sort: "ASC",
      sortBy: "name",
    },
    options: {
      enabled: started && Boolean(selectedWarehouse),
      keepPreviousData: true,
    },
  });

  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useGetStockOpname({
    params: {
      page: 1,
      limit: GET_ALL_LIMIT,
      sort: "DESC",
      sortBy: "created_at",
    },
    options: { keepPreviousData: true },
  });

  const { mutateAsync: postStockOpname, isLoading: isSubmitting } =
    usePostStockOpname();

  const allInventoryRows = allInventoryResponse?.data ?? [];
  const inventoryRows = inventoryResponse?.data ?? [];
  const pendingOpname = (historyResponse?.data ?? []).some(
    (record) => record.flag?.trim().toLowerCase() === "draft",
  );

  const warehouseItemCounts = useMemo(() => {
    return allInventoryRows.reduce<Record<string, number>>((counts, row) => {
      const warehouseId = String(row.gudang_id ?? row.gudang?.gudang_id ?? "");
      if (warehouseId) counts[warehouseId] = (counts[warehouseId] ?? 0) + 1;
      return counts;
    }, {});
  }, [allInventoryRows]);

  const selectedWarehouseLabel =
    warehouseOptions.find((option) => String(option.value) === selectedWarehouse)
      ?.label ?? "Warehouse";

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return inventoryRows;
    return inventoryRows.filter((row) =>
      row.nama_barang.toLowerCase().includes(normalizedQuery),
    );
  }, [inventoryRows, query]);

  useEffect(() => {
    if (!inventoryRows.length) return;
    setActualStock((current) => {
      const next = { ...current };
      inventoryRows.forEach((row) => {
        if (next[row.barang_gudang_id] === undefined) {
          next[row.barang_gudang_id] = String(row.stok_gudang);
        }
      });
      return next;
    });
  }, [inventoryRows]);

  function getActual(row: BarangGudangItem) {
    return actualStock[row.barang_gudang_id] ?? String(row.stok_gudang);
  }

  function getCondition(row: BarangGudangItem) {
    return condition[row.barang_gudang_id] ?? "Good";
  }

  function variance(row: BarangGudangItem) {
    return Number(getActual(row) || 0) - row.stok_gudang;
  }

  const changedRows = inventoryRows.filter(
    (row) => variance(row) !== 0 || getCondition(row) === "Poor",
  );

  const formik = useFormik({
    initialValues: {
      period: "",
      remark: "",
    },
    validationSchema: Yup.object({
      period: Yup.string().trim().required("Required"),
      remark: Yup.string().trim().required("Required"),
    }),
    validateOnChange: false,
    onSubmit: async (values, { resetForm }) => {
      try {
        const response = await postStockOpname({
          period: values.period.trim(),
          remark: values.remark.trim(),
          data: changedRows.map((row) => ({
            condition: getCondition(row) === "Poor" ? "POOR" : "GOOD",
            id: row.barang_gudang_id,
            notes: (conditionNote[row.barang_gudang_id] ?? "").trim(),
            stok: Number(getActual(row) || 0),
          })),
        });

        // Session persistence is intentionally disabled. Keep this block for
        // possible reuse if local stock-opname history is needed again.
        /*
        if (response.data?.id) {
          saveStockOpnameLocalSubmission({
            id: response.data.id,
            period: values.period.trim(),
            remark: values.remark.trim(),
            createdAt: new Date().toISOString(),
            items: changedRows.map((row) => ({
              id: row.barang_gudang_id,
              itemName: row.nama_barang,
              warehouseName: selectedWarehouseLabel,
              systemStock: row.stok_gudang,
              actualStock: Number(getActual(row) || 0),
              condition: getCondition(row),
              note:
                getCondition(row) === "Poor"
                  ? (conditionNote[row.barang_gudang_id] ?? "").trim()
                  : "",
            })),
          });
        }
        */

        toast(response.message, { type: "success" });
        await queryClient.invalidateQueries(["useGetStockOpname"]);
        setConfirmOpen(false);
        resetForm();
        setSubmitted(true);
      } catch (error) {
        toast(errorMessage(error, "Failed to submit stock opname."), {
          type: "error",
        });
      }
    },
  });

  function startCounting() {
    if (!selectedWarehouse || pendingOpname) return;
    setActualStock({});
    setCondition({});
    setConditionNote({});
    setQuery("");
    setStarted(true);
  }

  if (isHistoryLoading && !historyResponse) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          Loading stock opname status…
        </div>
      </>
    );
  }

  if (isHistoryError && !historyResponse) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
            Unable to verify pending stock opname submissions.
          </p>
          <button className="btn-cancel-modal" onClick={() => navigate("/warehouse-inventory?tab=opnamehistory")}>Back to History</button>
        </div>
      </>
    );
  }

  if (pendingOpname && !submitted) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <p style={{ color: "var(--text-2)", fontSize: 13.5, marginBottom: 16 }}>
            A stock opname is awaiting approval. A new count cannot be started
            until the pending submission is resolved.
          </p>
          <button
            className="btn-save-modal"
            onClick={() => navigate("/warehouse-inventory?tab=opnamehistory")}
          >
            View Opname History
          </button>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <p style={{ color: "var(--green)", fontWeight: 700, marginBottom: 8 }}>
            Submitted for approval.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginBottom: 16 }}>
            The submission is Pending. Inventory stock has not been changed yet.
          </p>
          <button
            className="btn-save-modal"
            onClick={() => navigate("/warehouse-inventory?tab=opnamehistory")}
          >
            Go to Opname History
          </button>
        </div>
      </>
    );
  }

  if (!started) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="section-title">Select Warehouse</div>
          <p style={{ color: "var(--text-muted)", fontSize: 12.5, marginBottom: 16 }}>
            Stock opname is counted one warehouse at a time.
          </p>
          <div style={{ marginBottom: 16 }}>
            <SearchableSelect
              value={selectedWarehouse}
              onChange={(value) => setSelectedWarehouse(String(value))}
              placeholder="Choose a warehouse…"
              searchPlaceholder="Search warehouse…"
              options={warehouseOptions.map((warehouse) => ({
                value: warehouse.value,
                label: warehouse.label,
                meta: `${warehouseItemCounts[String(warehouse.value)] ?? 0} items`,
              }))}
            />
          </div>
          <button
            className="btn-save-modal"
            disabled={!selectedWarehouse}
            onClick={startCounting}
          >
            <IconCheck /> Start Counting
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Stock Opname — {selectedWarehouseLabel}</h1>
      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                placeholder="Search item name…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button
              className="btn-save-modal"
              disabled={!changedRows.length}
              onClick={() => {
                formik.resetForm();
                setConfirmOpen(true);
              }}
            >
              <IconCheck /> Submit for Approval ({changedRows.length})
            </button>
          </div>
        </div>

        <p
          style={{
            background: "var(--brand-bg)",
            borderRadius: "var(--r-lg)",
            color: "var(--text-2)",
            fontSize: 12,
            marginBottom: 14,
            padding: "9px 12px",
          }}
        >
          Condition and condition notes are retained for review in this browser
          session. The current API payload persists the counted stock, period,
          and remark.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th style={{ textAlign: "right", width: 100 }}>System Stock</th>
                <th style={{ textAlign: "right", width: 110 }}>Actual Stock</th>
                <th style={{ textAlign: "right", width: 80 }}>Variance</th>
                <th style={{ width: 150 }}>Condition</th>
                <th>Condition Notes</th>
              </tr>
            </thead>
            <tbody>
              {isInventoryLoading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center" }}>Loading items…</td></tr>
              ) : isInventoryError ? (
                <tr><td colSpan={6} style={{ color: "var(--red)", padding: 32, textAlign: "center" }}>Unable to load warehouse items.</td></tr>
              ) : !visibleRows.length ? (
                <tr><td colSpan={6} style={{ color: "var(--text-muted)", padding: 32, textAlign: "center" }}>No items found.</td></tr>
              ) : visibleRows.map((row) => {
                const difference = variance(row);
                const rowCondition = getCondition(row);
                return (
                  <tr key={row.barang_gudang_id}>
                    <td className="name-cell">{row.nama_barang}</td>
                    <td style={{ textAlign: "right" }}>{row.stok_gudang}</td>
                    <td style={{ textAlign: "right" }}>
                      <input
                        className="inv-pick-qty"
                        inputMode="numeric"
                        style={{ width: 76 }}
                        value={getActual(row)}
                        onChange={(event) =>
                          setActualStock((current) => ({
                            ...current,
                            [row.barang_gudang_id]: event.target.value.replace(/\D/g, ""),
                          }))
                        }
                      />
                    </td>
                    <td
                      style={{
                        color: difference === 0
                          ? "var(--text-muted)"
                          : difference > 0
                            ? "var(--brand)"
                            : "var(--red)",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    >
                      {difference > 0 ? `+${difference}` : difference}
                    </td>
                    <td>
                      <div className="condition-toggle">
                        <button
                          type="button"
                          className={`condition-btn good${rowCondition === "Good" ? " active" : ""}`}
                          onClick={() => setCondition((current) => ({ ...current, [row.barang_gudang_id]: "Good" }))}
                        >
                          Good
                        </button>
                        <button
                          type="button"
                          className={`condition-btn poor${rowCondition === "Poor" ? " active" : ""}`}
                          onClick={() => setCondition((current) => ({ ...current, [row.barang_gudang_id]: "Poor" }))}
                        >
                          Poor
                        </button>
                      </div>
                    </td>
                    <td>
                      {rowCondition === "Poor" && (
                        <input
                          placeholder="Describe the issue…"
                          style={{ width: "100%" }}
                          value={conditionNote[row.barang_gudang_id] ?? ""}
                          onChange={(event) =>
                            setConditionNote((current) => ({
                              ...current,
                              [row.barang_gudang_id]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Submit Stock Opname for Approval"
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isSubmitting} onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className="btn-save-modal" disabled={isSubmitting} onClick={() => formik.handleSubmit()}>
              <IconCheck /> {isSubmitting ? "Submitting…" : "Submit"}
            </button>
          </>
        )}
      >
        <TextInput
          value={formik.values.period}
          onChange={(value) => formik.setFieldValue("period", value)}
          isRequired
          label="Period"
          placeholder="Example: July 2026"
          errorText={formik.errors.period}
        />
        <TextInput
          value={formik.values.remark}
          onChange={(value) => formik.setFieldValue("remark", value)}
          isRequired
          label="Remark"
          placeholder="Add a remark"
          errorText={formik.errors.remark}
        />
        <p className="confirm-msg" style={{ marginBottom: 12 }}>
          <strong>{changedRows.length}</strong> item{changedRows.length === 1 ? "" : "s"} will be submitted as Pending. Stock will not change until an Admin approves it.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
          {changedRows.map((row) => {
            const difference = variance(row);
            return (
              <div key={row.barang_gudang_id} style={{ borderBottom: "1px solid var(--border-2)", display: "flex", fontSize: 12.5, justifyContent: "space-between", padding: "6px 0" }}>
                <span>{row.nama_barang}{getCondition(row) === "Poor" && <span className="badge badge-red" style={{ fontSize: 10, marginLeft: 6 }}>Poor</span>}</span>
                <strong>{row.stok_gudang} → {getActual(row)} ({difference > 0 ? "+" : ""}{difference})</strong>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
