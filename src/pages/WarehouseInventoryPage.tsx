import { useState, useMemo, useEffect } from "react";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import {
  IconSearch,
  IconPlus,
  IconDelete,
  IconClose,
  IconCheck,
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
import Modal from "../components/Modal";
import { initialWarehouses } from "../data/warehouses";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { APIResponse } from "../interfaces/BaseApiResponse";
import TextInput from "../components/TextInput";
import { useWarehouseController } from "./lib/useWarehouseController";
import useGetBarangGudang, {
  type BarangGudangItem,
} from "../hooks/api/useGetBarangGudang";
import usePostStockOpname from "../hooks/api/usePostStockOpname";
import usePutApplyStockOpname from "../hooks/api/usePutApplyStockOpname";

const PAGE_SIZE = 10;

function tokenizeKeyword(value: any) {
  return value.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function ItemThumb({ name }: any) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: any) => part[0]?.toUpperCase())
      .join("") || "IT";
  const hue =
    name
      .split("")
      .reduce((sum: any, char: any) => sum + char.charCodeAt(0), 0) % 360;

  return (
    <div
      className="inventory-item-thumb"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 55% 90%), hsl(${
          (hue + 36) % 360
        } 55% 76%))`,
      }}
      aria-hidden="true"
    >
      <span>{initials}</span>
    </div>
  );
}

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
  const [opnameQuery, setOpnameQuery] = useState("");
  const [opnameWarehouse, setOpnameWarehouse] = useState("");
  const [actualStock, setActualStock] = useState<Record<number, string>>({});
  const [opnameNote, setOpnameNote] = useState<Record<number, string>>({});
  const [opnameConfirmOpen, setOpnameConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [imgPopup, setImgPopup] = useState({
    open: false,
    name: "",
    src: null,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [itemSearchDraft, setItemSearchDraft] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [inventory, setInventory] = useState<any | null>(null);

  const [form, setForm] = useState({
    stock: "",
    stokMin: "",
    kode: "",
    rack: "",
    lantai: "",
    lorong: "",
    flag1: "",
    flag2: "",
    valuation: "",
    warehouseName: "",
  });

  const { warehouseOptions } = useWarehouseController();

  const warehouseNames = useMemo(() => {
    const names = new Set([
      ...wiData.map((r) => r.warehouseName),
      ...initialWarehouses.map((r: any) => r.name),
    ]);
    return [...names].filter(Boolean).sort();
  }, []);

  const itemSearchTokens = useMemo(
    () => tokenizeKeyword(itemSearch),
    [itemSearch]
  );
  const draftKeyword = itemSearchDraft.trim();
  const hasPendingItemSearch = itemSearch !== itemSearchDraft;

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
  const [base64, setBase64] = useState<string>();
  const [selectedGudang, setSelectedGudang] = useState<any>({
    value: "All",
    label: "All warehouse",
  });
  const [listInventory, setListInventory] = useState<any[]>([]);

  const {
    data: opnameResponse,
    isLoading: isOpnameLoading,
    isError: isOpnameError,
    refetch: refetchOpname,
  } = useGetBarangGudang({
    params: {
      page: 1,
      limit: 99999,
      search: opnameQuery.trim() || undefined,
      gudang_id: opnameWarehouse ? Number(opnameWarehouse) : undefined,
      sort,
      sortBy,
    },
    options: {
      enabled: tab === "stockopname",
      keepPreviousData: true,
    },
  });

  const opnameRows = useMemo(
    () => opnameResponse?.data ?? [],
    [opnameResponse?.data],
  );

  useEffect(() => {
    if (!opnameRows.length) return;
    setActualStock((current) => {
      const next = { ...current };
      opnameRows.forEach((row) => {
        if (next[row.barang_gudang_id] === undefined) {
          next[row.barang_gudang_id] = String(row.stok_gudang);
        }
      });
      return next;
    });
  }, [opnameRows]);

  const {
    mutateAsync: postStockOpname,
    isLoading: isPostingStockOpname,
  } = usePostStockOpname();
  const {
    mutateAsync: putApplyStockOpname,
    isLoading: isApplyingStockOpname,
  } = usePutApplyStockOpname();
  const isSubmittingStockOpname =
    isPostingStockOpname || isApplyingStockOpname;

  const formik = useFormik<any>({
    initialValues: {
      stok: isModify ? barang.stok_barang.toString() : "",
      gudang_id: isModify ? barang.gudang_id.toString() : "",
      kode: isModify ? barang.kode_gudang : "",
      keyname: isModify ? barang.keyname : "",
      asile: isModify ? barang.asile : "",
      rack: isModify ? barang.asile : "",
      level: isModify ? barang.level : "",
      stok_minimum: isModify ? barang.stok_minimum.toString() : "",
      lantai: isModify ? barang.lantai : "",
      lorong: isModify ? barang.lorong : "",
      flag_1: isModify ? barang.flag_1 : "",
      flag_2: isModify ? barang.flag_2 : "",
      valuation: isModify ? barang.valuation : "",
    },
    validationSchema: Yup.object({
      stok: Yup.string().required("Required"),
      gudang_id: Yup.string().required("Required"),
      stok_minimum: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!inventory) {
        return toast("Please select item", { type: "error" });
      }
      setModalOpen(false);
      setIsLoading(true);
      const payload = {
        ...values,
        barang_id: inventory?.id,
        gudang_id: Number(values.gudang_id),
        stok: Number(values.stok),
        stok_minimum: Number(values.stok_minimum),
        code: values.kode,
      };
      setModalOpen(false);
      if (isModify) {
        try {
          delete payload.kode;
          const result: APIResponse<any> =
            await InventoryService.editBarangGudang({
              ...payload,
              id: barang.barang_gudang_id,
            });
          if (result.success) {
            toast("Modify warehouse item", { type: "success" });
            setIsModify(false);
            formik.resetForm();
            setBarang(null);
            setIsLoading(false);
            getInventoryList();
          }
        } catch (error: any) {
          setIsLoading(false);
          if (
            error.response.data.message ===
            "Error 1062: Duplicate entry '123' for key 'barang.code'"
          ) {
            formik.setFieldError("code", error.response.data.message);
          }
          toast(error.response.data.message, { type: "error" });
        }
      } else {
        try {
          const result: APIResponse<any> =
            await InventoryService.addBarangGudang(payload);
          if (result.success) {
            toast("Adding warehouse item", { type: "success" });
            setIsModify(false);
            formik.resetForm();
            setBarang(null);
            setIsLoading(false);
            setInventory(null);
            getInventoryList();
            setItemSearch("");
            setItemSearchDraft("");
          }
        } catch (error: any) {
          setIsLoading(false);
          if (
            error.response.data.message ===
            "Error 1062: Duplicate entry '123' for key 'barang.code'"
          ) {
            formik.setFieldError("code", error.response.data.message);
          }

          toast(error.response.data.message, { type: "error" });
        }
      }
    },
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

  const safePage = Math.min(page, totalPages);

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

  function getActual(row: BarangGudangItem) {
    return actualStock[row.barang_gudang_id] ?? String(row.stok_gudang);
  }

  function variance(row: BarangGudangItem) {
    return Number(getActual(row) || 0) - row.stok_gudang;
  }

  const opnameChanged = opnameRows.filter((row) => variance(row) !== 0);
  const opnameMatched = opnameRows.length - opnameChanged.length;

  const stockOpnameFormik = useFormik({
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
          data: opnameChanged.map((row) => ({
            id: row.barang_gudang_id,
            stok: Number(getActual(row)),
          })),
        });

        if (!response.data?.id) {
          throw new Error("Stock opname ID was not found in the response.");
        }

        const applyResponse = await putApplyStockOpname(response.data.id);

        toast(applyResponse.message, { type: "success" });
        setOpnameConfirmOpen(false);
        resetForm();
        setOpnameNote({});
        setActualStock({});
        await refetchOpname();
      } catch (error) {
        toast(
          error instanceof Error
            ? error.message
            : "Failed to save stock opname.",
          { type: "error" },
        );
      }
    },
  });

  function openOpnameConfirm() {
    stockOpnameFormik.resetForm();
    setOpnameConfirmOpen(true);
  }

  function closeOpnameConfirm() {
    stockOpnameFormik.resetForm();
    setOpnameConfirmOpen(false);
  }

  function closeModal() {
    setModalOpen(false);
    setItemSearchDraft("");
    setItemSearch("");
    formik.resetForm();
  }

  function clearItemSearch() {
    setItemSearchDraft("");
    setItemSearch("");
    getBarang(true);
    setSelectedItemId(null);
  }

  const hasActiveItemSearch = itemSearchTokens.length > 0;

  function openModal() {
    setSelectedItemId(null);
    formik.resetForm();
    setItemSearchDraft("");
    setItemSearch("");
    setModalOpen(true);
  }

  const getBarang = async (resetSearch?: boolean) => {
    try {
      const response = await InventoryService.getInventory({
        sort: "ASC",
        page: 1,
        limit: 50,
        search: resetSearch ? "" : itemSearchDraft,
        sortBy: "nama",
      });
      setListInventory(response.data.data);
      !resetSearch && setItemSearch(itemSearchDraft);
    } catch (error) {}
  };

  useEffect(() => {
    getBarang(true);
  }, []);

  const selectedItem =
    listInventory.find((item) => item.id === selectedItemId) || null;

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
              <button className="btn-new" onClick={openModal}>
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

      <Modal
        open={modalOpen}
        title="Add Warehouse Item"
        onClose={closeModal}
        size="xl"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={closeModal}>
              <IconClose /> Cancel
            </button>
            <button
              className="btn-save-modal"
              type="submit"
              onClick={() => formik.handleSubmit()}
            >
              <IconCheck /> Save Item
            </button>
          </>
        }
      >
        <div className="inventory-modal-search-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Keywords</label>
            <input
              type="text"
              value={itemSearchDraft}
              placeholder="Search by item name, e.g. acrylic ball"
              onChange={(e) => setItemSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  getBarang();
                }
              }}
            />
          </div>
          <button
            className="btn-search inventory-modal-search-btn"
            onClick={() => getBarang()}
          >
            <IconSearch /> Search
          </button>
        </div>

        <div className="inventory-search-feedback">
          {hasPendingItemSearch ? (
            <>
              <span className="inventory-search-count">
                Search not applied yet
              </span>
              {draftKeyword && (
                <span className="inventory-search-chip">"{draftKeyword}"</span>
              )}
              <button
                type="button"
                className="inventory-search-clear"
                onClick={clearItemSearch}
              >
                Reset
              </button>
            </>
          ) : (
            <>
              <span className="inventory-search-count">
                {listInventory.length} item
                {listInventory.length === 1 ? "" : "s"} found
              </span>
              {hasActiveItemSearch && (
                <span className="inventory-search-chip">"{itemSearch}"</span>
              )}
              {(hasActiveItemSearch || itemSearchDraft) && (
                <button
                  type="button"
                  className="inventory-search-clear"
                  onClick={clearItemSearch}
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>

        <div
          className="inventory-item-grid"
          role="list"
          aria-label="Inventory item list"
        >
          {listInventory.length === 0 ? (
            <div className="inventory-search-empty">
              <strong>No matching items</strong>
              <span>
                Try a shorter keyword or clear the search to browse all items.
              </span>
            </div>
          ) : (
            listInventory.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`inventory-item-card${
                  item.id === selectedItemId ? " selected" : ""
                }`}
                onClick={() => {
                  if (item.stok_barang === 0) {
                    toast("No stock", { type: "error" });
                  } else {
                    setSelectedItemId(item.id);
                    setInventory(item);
                  }
                }}
              >
                <ItemThumb name={item.nama} />
                <span className="inventory-item-meta">
                  <span className="inventory-item-name">{item.nama}</span>
                  <span className="inventory-item-stock">
                    Stock: {item.stok_barang}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="inventory-selected-item">
          <span>Selected Item</span>
          <strong>{selectedItem?.nama || "No item selected"}</strong>
        </div>

        <div className="inventory-form-grid">
          <TextInput
            value={formik.values.stok}
            onChange={(e) => formik.setFieldValue("stok", e)}
            isRequired
            label="Stock"
            placeholder=""
            errorText={formik.errors.stok as string}
            isNumeric
          />
          <TextInput
            value={formik.values.stok_minimum}
            onChange={(e) => formik.setFieldValue("stok_minimum", e)}
            isRequired
            label="Minimum Stock"
            placeholder=""
            errorText={formik.errors.stok_minimum as string}
            isNumeric
          />
          <TextInput
            value={formik.values.kode}
            onChange={(e) => formik.setFieldValue("kode", e)}
            label="Kode"
            placeholder=""
          />
          <TextInput
            value={formik.values.rack}
            onChange={(e) => formik.setFieldValue("rack", e)}
            label="Rack"
            placeholder=""
          />
          <TextInput
            value={formik.values.lantai}
            onChange={(e) => formik.setFieldValue("lantai", e)}
            label="Lantai"
            placeholder=""
          />
          <TextInput
            value={formik.values.lorong}
            onChange={(e) => formik.setFieldValue("lorong", e)}
            label="Lorong"
            placeholder=""
          />
          <TextInput
            value={formik.values.flag_1}
            onChange={(e) => formik.setFieldValue("flag_1", e)}
            label="Flag 1"
            placeholder=""
          />
          <TextInput
            value={formik.values.flag_2}
            onChange={(e) => formik.setFieldValue("flag_2", e)}
            label="Flag 1"
            placeholder=""
          />
          <TextInput
            value={currency(Number(formik.values.valuation))}
            onChange={(e) => formik.setFieldValue("valuation", e)}
            label="Valuation"
            placeholder=""
          />
          <div className="form-group">
            <label>
              Warehouse <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              onChange={(e) =>
                formik.setFieldValue("gudang_id", e.target.value)
              }
              value={formik.values.gudang_id}
              style={{
                ...(!formik.values.gudang_id && {
                  borderWidth: 1,
                  borderColor: "var(--red)",
                }),
              }}
            >
              <option value="">Select warehouse</option>
              {warehouseOptions?.map((item: any, idx: number) => (
                <option key={`${idx}_${item.value}`} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {(formik.errors.gudang_id as string)?.trim() && (
              <span style={{ color: "var(--red)", fontSize: 12 }}>
                {formik.errors.gudang_id as string}
              </span>
            )}
          </div>
        </div>
      </Modal>

      {tab === "stockopname" && (
        <div className="card">
          <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 18 }}>
            {[
              { label: "Items Checked", value: opnameRows.length, color: "var(--brand)", bg: "var(--brand-bg)" },
              { label: "Matched", value: opnameMatched, color: "var(--green)", bg: "var(--green-bg)" },
              { label: "With Variance", value: opnameChanged.length, color: "var(--orange)", bg: "var(--orange-bg)" },
            ].map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-icon" style={{ background: stat.bg }}><span className="stat-value" style={{ color: stat.color }}>{stat.value}</span></div>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap"><IconSearch /><input className="search-input" placeholder="Search item name…" value={opnameQuery} onChange={(e) => setOpnameQuery(e.target.value)} /></div>
              <div className="wi-select-wrap">
                <select value={opnameWarehouse} onChange={(e) => setOpnameWarehouse(e.target.value)}>
                  <option value="">All Warehouses</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.value} value={warehouse.value}>{warehouse.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="toolbar-right"><button className="btn-save-modal" disabled={!opnameChanged.length} onClick={openOpnameConfirm}><IconCheck /> Apply Opname Results ({opnameChanged.length})</button></div>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Item Name</th><th>Warehouse</th><th style={{ textAlign: "right" }}>System Stock</th><th style={{ textAlign: "right" }}>Actual Stock</th><th style={{ textAlign: "right" }}>Variance</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>{isOpnameLoading ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 32 }}>Loading stock opname data…</td></tr> : isOpnameError ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--red)" }}>Failed to load stock opname data.</td></tr> : opnameRows.length === 0 ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 32 }}>No items found.</td></tr> : opnameRows.map((row) => {
              const difference = variance(row);
              return <tr key={row.barang_gudang_id}>
                <td className="name-cell">{row.nama_barang}</td><td>{row.gudang_name || row.gudang?.gudang_name || "-"}</td><td style={{ textAlign: "right" }}>{row.stok_gudang}</td>
                <td style={{ textAlign: "right" }}><input type="text" inputMode="numeric" className="inv-pick-qty" style={{ width: 76 }} value={getActual(row)} onChange={(e) => setActualStock((state) => ({ ...state, [row.barang_gudang_id]: e.target.value.replace(/\D/g, "") }))} /></td>
                <td style={{ textAlign: "right", fontWeight: 700, color: difference === 0 ? "var(--text-muted)" : difference > 0 ? "var(--brand)" : "var(--red)" }}>{difference > 0 ? `+${difference}` : difference}</td>
                <td>{difference === 0 ? <span className="badge badge-green">Matched</span> : difference > 0 ? <span className="badge badge-blue">Surplus</span> : <span className="badge badge-red">Shortage</span>}</td>
                <td><input placeholder="Optional" value={opnameNote[row.barang_gudang_id] || ""} onChange={(e) => setOpnameNote((state) => ({ ...state, [row.barang_gudang_id]: e.target.value }))} /></td>
              </tr>;
            })}</tbody>
          </table></div>
        </div>
      )}

      <Modal open={opnameConfirmOpen} title="Apply Stock Opname Results" onClose={closeOpnameConfirm} footer={<><button className="btn-cancel-modal" disabled={isSubmittingStockOpname} onClick={closeOpnameConfirm}>Cancel</button><button className="btn-save-modal" type="submit" disabled={isSubmittingStockOpname} onClick={() => stockOpnameFormik.handleSubmit()}><IconCheck /> {isSubmittingStockOpname ? "Saving…" : "Apply"}</button></>}>
        <TextInput
          value={stockOpnameFormik.values.period}
          onChange={(value) => stockOpnameFormik.setFieldValue("period", value)}
          isRequired
          label="Period"
          placeholder="Contoh: Juli 2026"
          errorText={stockOpnameFormik.errors.period}
        />
        <TextInput
          value={stockOpnameFormik.values.remark}
          onChange={(value) => stockOpnameFormik.setFieldValue("remark", value)}
          isRequired
          label="Remark"
          placeholder="Contoh: Testing Remark"
          errorText={stockOpnameFormik.errors.remark}
        />
        <p className="confirm-msg" style={{ marginBottom: 12 }}><strong>{opnameChanged.length}</strong> items will have their stock updated based on the physical count:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>{opnameChanged.map((row) => { const difference = variance(row); return <div key={row.barang_gudang_id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid var(--border-2)" }}><span>{row.nama_barang}</span><span style={{ fontWeight: 700, color: difference > 0 ? "var(--brand)" : "var(--red)" }}>{row.stok_gudang} → {getActual(row)} ({difference > 0 ? "+" : ""}{difference})</span></div>; })}</div>
      </Modal>
    </>
  );
}
