import { useEffect, useMemo, useState } from "react";

import Pagination from "../components/Pagination";
import { IconPrint, IconSearch } from "../components/icons";
import useGetBarangGudang, {
  type BarangGudangItem,
  type BarangGudangStatus,
} from "../hooks/api/useGetBarangGudang";
import useGetInventoryReportSummary from "../hooks/api/useGetInventoryReportSummary";
import { useCategoryController } from "./lib/useCategoryController";

const PAGE_SIZE = 10;
const STATUS_OPTIONS: Array<{ label: string; value: BarangGudangStatus }> = [
  { label: "Available", value: "SAFE" },
  { label: "Low Stock", value: "WARNING" },
  { label: "Out of Stock", value: "CRITICAL" },
];

function normalizeStatus(item: BarangGudangItem): BarangGudangStatus {
  const status = item.status?.toUpperCase().replace(/\s+/g, "_");
  if (status === "SAFE" || status === "WARNING" || status === "CRITICAL") {
    return status;
  }
  if (item.stok_gudang <= 0) return "CRITICAL";
  if (item.stok_gudang <= item.stok_minimum) return "WARNING";
  return "SAFE";
}

function statusLabel(status: BarangGudangStatus) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function stockBadgeClass(status: BarangGudangStatus) {
  if (status === "WARNING") return "badge-orange";
  if (status === "CRITICAL") return "badge-red";
  return "badge-green";
}

function EmptySummary({ children }: { children: string }) {
  return (
    <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "10px 0" }}>
      {children}
    </div>
  );
}

export default function InventoryReportPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BarangGudangStatus | "">("");
  const [page, setPage] = useState(1);

  const {
    data: summaryResponse,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useGetInventoryReportSummary();
  const { categoryOptions } = useCategoryController();
  const {
    data: inventoryResponse,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useGetBarangGudang({
    params: {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      category: categoryFilter ? Number(categoryFilter) : undefined,
      status: statusFilter || undefined,
      sort: "ASC",
      sortBy: "name",
    },
    options: { keepPreviousData: true },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const summary = summaryResponse?.data;
  const categoryBreakdown = summary?.stock_by_category ?? [];
  const warehouseBreakdown = summary?.stock_by_warehouse ?? [];
  const inventoryRows = inventoryResponse?.data ?? [];
  const totalRecords = inventoryResponse?.total_records ?? 0;
  const totalPages = Math.max(1, inventoryResponse?.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);
  const maxCategoryStock = useMemo(
    () => Math.max(...categoryBreakdown.map((item) => item.total_stock), 1),
    [categoryBreakdown],
  );
  const maxWarehouseStock = useMemo(
    () => Math.max(...warehouseBreakdown.map((item) => item.total_stock), 1),
    [warehouseBreakdown],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryValue = (value?: number) => (
    isSummaryLoading ? "—" : (value ?? 0).toLocaleString("id-ID")
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Inventory Report</h1>
        <button className="btn-print" onClick={() => window.print()}><IconPrint /> Print Report</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total SKU</div>
          <div className="kpi-value">{summaryValue(summary?.total_sku)}</div>
          <div className="kpi-sub">registered item types</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Total Stock</div>
          <div className="kpi-value">{summaryValue(summary?.total_stock)}</div>
          <div className="kpi-sub">units across all warehouses</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Low Stock</div>
          <div className="kpi-value">{summaryValue(summary?.low_stock)}</div>
          <div className="kpi-sub">need immediate restocking</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Out of Stock</div>
          <div className="kpi-value">{summaryValue(summary?.out_of_stock)}</div>
          <div className="kpi-sub">completely out of stock</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginBottom: 22 }}>
        <div className="card">
          <div className="section-title">Stock by Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isSummaryLoading ? <EmptySummary>Loading summary…</EmptySummary>
              : isSummaryError ? <EmptySummary>Unable to load summary.</EmptySummary>
                : !categoryBreakdown.length ? <EmptySummary>No category data available.</EmptySummary>
                  : categoryBreakdown.map((item) => (
                    <div key={item.category_id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>
                          {item.category} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({item.sku_count} SKU)</span>
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{item.total_stock.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${(item.total_stock / maxCategoryStock) * 100}%`, background: "var(--brand)" }} />
                      </div>
                    </div>
                  ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">Stock by Warehouse</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isSummaryLoading ? <EmptySummary>Loading summary…</EmptySummary>
              : isSummaryError ? <EmptySummary>Unable to load summary.</EmptySummary>
                : !warehouseBreakdown.length ? <EmptySummary>No warehouse data available.</EmptySummary>
                  : warehouseBreakdown.map((item, index) => (
                    <div key={`${item.warehouse}-${index}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>
                          {item.warehouse} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({item.sku_count} SKU)</span>
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{item.total_stock.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${(item.total_stock / maxWarehouseStock) * 100}%`, background: "var(--green)" }} />
                      </div>
                    </div>
                  ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input className="search-input" type="text" placeholder="Search name or SKU…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
            <div className="wi-select-wrap">
              <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {categoryOptions.map((category: { value: string; label: string }) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
            <div className="wi-select-wrap">
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as BarangGudangStatus | ""); setPage(1); }}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th style={{ width: 90 }}>SKU</th>
                <th style={{ width: 110 }}>Category</th>
                <th style={{ width: 70 }}>Unit</th>
                <th>Warehouse</th>
                <th style={{ width: 80, textAlign: "right" }}>Stock</th>
                <th style={{ width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isInventoryLoading && !inventoryRows.length ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading inventory…</td></tr>
              ) : isInventoryError ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--red)" }}>Unable to load inventory.</td></tr>
              ) : !inventoryRows.length ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No items found.</td></tr>
              ) : inventoryRows.map((item) => {
                const status = normalizeStatus(item);
                return (
                  <tr key={item.barang_gudang_id}>
                    <td className="name-cell">{item.nama_barang || "-"}</td>
                    <td className="id-cell" style={{ fontFamily: "monospace" }}>{item.kode_barang || item.kode || "-"}</td>
                    <td>{item.nama_kategori || "-"}</td>
                    <td>{item.nama_satuan || "-"}</td>
                    <td style={{ color: "var(--text-muted)" }}>{item.gudang_name || item.gudang?.gudang_name || "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{item.stok_gudang.toLocaleString("id-ID")}</td>
                    <td><span className={`badge ${stockBadgeClass(status)}`}>{statusLabel(status)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={totalRecords} pageSize={PAGE_SIZE} onPage={setPage} label="items" />
      </div>
    </>
  );
}
