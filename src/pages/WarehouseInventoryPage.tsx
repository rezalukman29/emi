import { useState, useMemo, useEffect } from "react";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import {
  IconSearch,
  IconPlus,
  IconDelete,
  IconClose,
} from "../components/icons";
import { wiData } from "../data/warehouseInventory";
import { SortType } from "../interfaces/interfaces";
import { ISelect } from "./InventoryPage";
import { InventoryService } from "../service/InventoryService";
import {
  STORAGE_BOOQABLE,
  currency,
  isValidUrl,
  noImage,
} from "../utils/function";
import moment from "moment";

const PAGE_SIZE = 10;

function statusBadge(s: any) {
  if (s === "Safe") return <span className="badge badge-green">Safe</span>;
  if (s === "Warning")
    return <span className="badge badge-orange">Warning</span>;
  if (s === "Critical")
    return <span className="badge badge-red">Critical</span>;
  return (
    <span
      className="badge"
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        fontWeight: 400,
      }}
    >
      Not Set
    </span>
  );
}

function ImagePlaceholder({ onClick }: any) {
  return (
    <div
      onClick={onClick}
      title="View image"
      style={{
        width: 42,
        height: 42,
        background: "var(--bg)",
        borderRadius: "var(--r)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--border)",
        margin: "auto",
        cursor: "pointer",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ width: 18, height: 18 }}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

function ImageViewerModal({ open, name, src, onClose }: any) {
  if (!open) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          maxWidth: 480,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
            {name}
          </span>
          <button className="modal-close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div
          style={{
            padding: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 220,
            background: "var(--bg)",
          }}
        >
          {src ? (
            <img
              src={src}
              alt={name}
              style={{
                maxWidth: "100%",
                maxHeight: 320,
                borderRadius: 8,
                objectFit: "contain",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                style={{
                  width: 56,
                  height: 56,
                  marginBottom: 12,
                  color: "var(--border)",
                }}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p style={{ fontSize: 13, fontWeight: 500 }}>No image uploaded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WarehouseInventoryPage() {
  const [tab, setTab] = useState("inventory");
  const [query, setQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [imgPopup, setImgPopup] = useState({
    open: false,
    name: "",
    src: null,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPrint, setIsLoadingPrint] = useState<boolean>(false);
  const [isModify, setIsModify] = useState<boolean>(false);
  const [listBarang, setListBarang] = useState<any[]>([]);
  const [sort, setSort] = useState<SortType>("ASC");
  const [sortBy, setSortBy] = useState<string>("name");
  const [searchValue, setSearchValue] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(10);
  const [total, setTotal] = useState<number>(10);
  const [first, setFirst] = useState<number>(0);
  const [listCategory, setListCategory] = useState<ISelect[]>([]);
  const [barang, setBarang] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [base64, setBase64] = useState<string>();
  const [selectedGudang, setSelectedGudang] = useState<any>({
    value: "All",
    label: "All warehouse",
  });

  const getInventoryList = async (size?: number) => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getBarangGudang(
        selectedGudang.value,
        page,
        searchValue,
        size ?? 10,
        sort,
        sortBy
      );
      setListBarang(response.data);
      setTotal(response.total_records);
      setTotalPages(response.total_pages);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setPage(1);
      setFirst(0);
      setListBarang([]);
      setTotal(0);
      setTotalPages(0);
    }
  };

  useEffect(() => {
    getInventoryList();
  }, [page, sort, sortBy]);

  const warehouseNames = useMemo(
    () => [...new Set(wiData.map((r) => r.warehouseName))].sort(),
    []
  );
  const sortKeys = [
    "name",
    "warehouseStock",
    "warehouseName",
    "itemStock",
    "stokMin",
    "stokUsed",
    "valuation",
    "totalValuation",
    "minStatus",
    "flag1",
    "flag2",
    "asile",
    "rack",
    "level",
    "lantai",
    "lorong",
    "updatedAt",
  ];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = sortKeys[sortCol] || "name";
    return wiData
      .filter((r) => {
        const mQ =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.warehouseName.toLowerCase().includes(q);
        const mW = !warehouseFilter || r.warehouseName === warehouseFilter;
        const mS = !statusFilter || r.minStatus === statusFilter;
        return mQ && mW && mS;
      })
      .sort((a: any, b: any) => {
        const va = String(a[key] ?? ""),
          vb = String(b[key] ?? "");
        return sortAsc
          ? va.localeCompare(vb, undefined, { numeric: true })
          : vb.localeCompare(va, undefined, { numeric: true });
      });
  }, [query, warehouseFilter, statusFilter, sortCol, sortAsc]);

  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleSort(col: any) {
    if (sortCol === col) setSortAsc((a) => !a);
    else {
      setSortCol(col);
      setSortAsc(true);
    }
    setPage(1);
  }

  const safeCount = wiData.filter((r) => r.minStatus === "Safe").length;
  const warningCount = wiData.filter((r) => r.minStatus === "Warning").length;
  const criticalCount = wiData.filter((r) => r.minStatus === "Critical").length;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Warehouse Inventory
        </h1>
      </div>

      {/* Stats */}
      <div
        className="stats-bar"
        style={{ gridTemplateColumns: "repeat(4,1fr)" }}
      >
        {[
          {
            label: "Total Items",
            value: total,
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: "Safe",
            value: safeCount,
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: "Warning",
            value: warningCount,
            color: "var(--orange)",
            bg: "var(--orange-bg)",
          },
          {
            label: "Critical",
            value: criticalCount,
            color: "var(--red)",
            bg: "var(--red-bg)",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Pill tabs */}
      <div className="wi-tabs">
        {[
          { id: "inventory", label: "Inventory" },
          { id: "stockopname", label: "Stock Opname" },
        ].map((t) => (
          <button
            key={t.id}
            className={`wi-tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        <div className="card">
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <IconSearch />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search item or warehouse…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="wi-select-wrap">
                <select
                  value={warehouseFilter}
                  onChange={(e) => {
                    setWarehouseFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Warehouses</option>
                  {warehouseNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="wi-select-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Status</option>
                  <option>Safe</option>
                  <option>Warning</option>
                  <option>Critical</option>
                </select>
              </div>
              <button className="btn-search">Search</button>
            </div>
            <div className="toolbar-right">
              <button className="btn-new">
                <IconPlus /> New
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh
                    label="Name"
                    colIndex={0}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ minWidth: 180 }}
                  />
                  <SortTh
                    label="Wh. Stock"
                    colIndex={1}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 80, textAlign: "right" }}
                  />
                  <SortTh
                    label="Warehouse"
                    colIndex={2}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ minWidth: 130 }}
                  />
                  <SortTh
                    label="Item Stock"
                    colIndex={3}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 80, textAlign: "right" }}
                  />
                  <SortTh
                    label="Min"
                    colIndex={4}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 60, textAlign: "right" }}
                  />
                  <SortTh
                    label="Used"
                    colIndex={5}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 60, textAlign: "right" }}
                  />
                  <SortTh
                    label="Valuation"
                    colIndex={6}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 80, textAlign: "right" }}
                  />
                  <SortTh
                    label="Total Val."
                    colIndex={7}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 90, textAlign: "right" }}
                  />
                  <SortTh
                    label="Status"
                    colIndex={8}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 100 }}
                  />
                  <SortTh
                    label="F1"
                    colIndex={9}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 45, textAlign: "center" }}
                  />
                  <SortTh
                    label="F2"
                    colIndex={10}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 45, textAlign: "center" }}
                  />
                  <SortTh
                    label="Asile"
                    colIndex={11}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 50, textAlign: "center" }}
                  />
                  <SortTh
                    label="Rack"
                    colIndex={12}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 50, textAlign: "center" }}
                  />
                  <SortTh
                    label="Level"
                    colIndex={13}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 50, textAlign: "center" }}
                  />
                  <SortTh
                    label="Lantai"
                    colIndex={14}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 55, textAlign: "center" }}
                  />
                  <SortTh
                    label="Lorong"
                    colIndex={15}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 55, textAlign: "center" }}
                  />
                  <th style={{ width: 58, textAlign: "center" }}>Img</th>
                  <SortTh
                    label="Updated"
                    colIndex={16}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 95 }}
                  />
                  <th style={{ width: 80, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {listBarang.length === 0 ? (
                  <tr>
                    <td
                      colSpan={19}
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        padding: 32,
                      }}
                    >
                      No results found.
                    </td>
                  </tr>
                ) : (
                  listBarang.map((r: any) => (
                    <tr key={r.id}>
                      <td className="name-cell">{r.nama_barang}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.stok_gudang}
                      </td>
                      <td>{r.gudang_name}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.stok_barang}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.stok_minimum}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.stock_used}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.valuation ? currency(r.valuation) : "0"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {r.valuation
                          ? currency(Number(r.valuation) * r.stok_barang)
                          : "0"}
                      </td>
                      <td>{statusBadge(r.minStatus)}</td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.flag_1}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.flag_2}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.asile}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.rack}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.level}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.lantai}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {r.lorong}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <ImagePlaceholder
                          onClick={() =>
                            setImgPopup({
                              open: true,
                              name: r.nama_barang,
                              src:
                                isValidUrl(r.photo) &&
                                r.photo.includes("http://66.42.48.163:9000")
                                  ? r?.photo?.replace(
                                      "http://66.42.48.163:9000/booqable/",
                                      STORAGE_BOOQABLE
                                    )
                                  : r.photo
                                  ? `https://democreation.site/home/public/${r.photo}`
                                  : noImage,
                            })
                          }
                        />
                      </td>
                      <td
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "12.5px",
                        }}
                      >
                        {r.updated_at
                          ? moment(r.updated_at as any).format(
                              "D MMM YYYY, HH:MM"
                            )
                          : "-"}
                      </td>
                      <td>
                        <div
                          className="action-btns"
                          style={{ justifyContent: "center" }}
                        >
                          <button
                            className="btn-icon"
                            title="Detail"
                            style={{ color: "var(--green)" }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ width: 15, height: 15 }}
                            >
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </button>
                          <button className="btn-icon delete" title="Delete">
                            <IconDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={safePage}
            total={total}
            pageSize={PAGE_SIZE}
            onPage={(p: any) => setPage(p)}
            label="items"
          />
        </div>
      )}

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup((p) => ({ ...p, open: false }))}
      />

      {tab === "stockopname" && (
        <div
          className="card"
          style={{ padding: "64px 32px", textAlign: "center" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--border)"
            strokeWidth="1.5"
            style={{ width: 48, height: 48, marginBottom: 14 }}
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            Stock Opname
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Feature ini akan segera tersedia
          </p>
        </div>
      )}
    </>
  );
}
