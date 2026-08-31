import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "react-query";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import {
  IconSearch,
  IconPlus,
  IconDelete,
  IconEdit,
  IconClose,
  IconCheck,
} from "../components/icons";
import { SortType } from "../interfaces/interfaces";
import { InventoryService } from "../service/InventoryService";
import {
  STORAGE_BOOQABLE,
  currency,
  formatUtcToLocalDateTime,
  isValidUrl,
  noImage,
} from "../utils/function";
import moment from "moment";
import Modal from "../components/Modal";
import { useFormik } from "formik";
import * as Yup from "yup";
import { toast } from "react-toastify";
import { APIResponse } from "../interfaces/BaseApiResponse";
import TextInput from "../components/TextInput";
import SearchableSelect from "../components/SearchableSelect";
import { useWarehouseController } from "./lib/useWarehouseController";
import useGetBarangGudang, {
  type BarangGudangItem,
  type BarangGudangStatus,
} from "../hooks/api/useGetBarangGudang";
import usePutApplyStockOpname from "../hooks/api/usePutApplyStockOpname";
import usePutRollbackStockOpname from "../hooks/api/usePutRollbackStockOpname";
import useGetStockOpname, {
  type StockOpnameHistoryItem,
  type StockOpnameHistoryRecord,
} from "../hooks/api/useGetStockOpname";
import useGetWarehouseInventorySummary from "../hooks/api/useGetWarehouseInventorySummary";
import useGetMovingOrders from "../hooks/api/useGetMovingOrders";
import usePostMovingOrder from "../hooks/api/usePostMovingOrder";
import {
  clearStockOpnameLocalResolution,
  getEffectiveStockOpnameStatus,
  getStockOpnameLocalResolution,
  getStockOpnameLocalSubmission,
} from "../lib/stockOpnameSession";
import type { RootState } from "../store/store";

const PAGE_SIZE = 10;
const GET_ALL_LIMIT = 99999;

function errorMessage(error: unknown, fallback: string) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : fallback;
}

function normalizedOpnameStatus(record: StockOpnameHistoryRecord) {
  return getEffectiveStockOpnameStatus(record);
}

function opnameItems(record: StockOpnameHistoryRecord): StockOpnameHistoryItem[] {
  const apiItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.details)
        ? record.details
        : [];
  const localSubmission = getStockOpnameLocalSubmission(record.id);
  if (!localSubmission) return apiItems;

  const localById = new Map(
    localSubmission.items.map((item) => [item.id, item]),
  );

  if (apiItems.length) {
    return apiItems.map((item) => {
      const itemId = Number(item.barang_gudang_id ?? item.id);
      const localItem = localById.get(itemId);
      if (!localItem) return item;
      return {
        ...item,
        nama_barang: item.nama_barang ?? item.item_name ?? localItem.itemName,
        gudang_name:
          item.gudang_name ?? item.warehouse_name ?? localItem.warehouseName,
        stok_sistem:
          item.stok_sistem
          ?? item.stok_sebelum
          ?? item.stok_awal
          ?? localItem.systemStock,
        stok_aktual:
          item.stok_aktual
          ?? item.actual_stock
          ?? item.stok
          ?? localItem.actualStock,
        condition: item.condition ?? localItem.condition,
        note: item.note ?? localItem.note,
      };
    });
  }

  return localSubmission.items.map((item) => ({
    barang_gudang_id: item.id,
    nama_barang: item.itemName,
    gudang_name: item.warehouseName,
    stok_sistem: item.systemStock,
    stok_aktual: item.actualStock,
    condition: item.condition,
    note: item.note,
  }));
}

function opnameWarehouse(record: StockOpnameHistoryRecord) {
  const firstItem = opnameItems(record)[0];
  return record.warehouse_name
    ?? record.gudang_name
    ?? firstItem?.warehouse_name
    ?? firstItem?.gudang_name
    ?? "-";
}

function opnameItemName(item: StockOpnameHistoryItem) {
  return item.nama_barang ?? item.item_name ?? `Item #${item.barang_gudang_id ?? item.id ?? "-"}`;
}

function opnameBefore(item: StockOpnameHistoryItem) {
  return item.stok_sebelum ?? item.stok_awal ?? item.stok_sistem ?? item.stok ?? 0;
}

function opnameAfter(item: StockOpnameHistoryItem) {
  return item.stok_aktual ?? item.actual_stock ?? item.stok ?? 0;
}

function opnameStatusBadge(record: StockOpnameHistoryRecord) {
  const status = normalizedOpnameStatus(record);
  if (status === "APPROVED" || status === "APPLIED") {
    return <span className="badge badge-green">Approved</span>;
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return <span className="badge badge-red">Rejected</span>;
  }
  return <span className="badge badge-orange">Pending</span>;
}

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
  const status = String(s || "").toUpperCase();
  if (status === "SAFE") return <span className="badge badge-green">Safe</span>;
  if (status === "WARNING")
    return <span className="badge badge-orange">Warning</span>;
  if (status === "CRITICAL")
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const profile = useSelector((state: RootState) => state.profile);
  const isAdmin = profile.user_type?.toUpperCase() === "ADMIN";
  const [tab, setTab] = useState(
    searchParams.get("tab") === "opnamehistory" ? "opnamehistory" : "inventory",
  );
  const [query, setQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BarangGudangStatus | "">("");
  const [appliedWarehouseFilter, setAppliedWarehouseFilter] = useState("");
  const [appliedStatusFilter, setAppliedStatusFilter] = useState<BarangGudangStatus | "">("");
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
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [movingOrderOpen, setMovingOrderOpen] = useState(false);
  const [movingSourceWarehouse, setMovingSourceWarehouse] = useState("");
  const [movingDestinationWarehouse, setMovingDestinationWarehouse] = useState("");
  const [movingItemQuery, setMovingItemQuery] = useState("");
  const [debouncedMovingItemQuery, setDebouncedMovingItemQuery] = useState("");
  const [movingSelection, setMovingSelection] = useState<Record<number, string>>({});
  const [movingOrderPage, setMovingOrderPage] = useState(1);

  const [historyWarehouse, setHistoryWarehouse] = useState("");
  const [historyDetail, setHistoryDetail] = useState<StockOpnameHistoryRecord | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const { warehouseOptions } = useWarehouseController();

  const itemSearchTokens = useMemo(
    () => tokenizeKeyword(itemSearch),
    [itemSearch]
  );
  const draftKeyword = itemSearchDraft.trim();
  const hasPendingItemSearch = itemSearch !== itemSearchDraft;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModify, setIsModify] = useState<boolean>(false);
  const [listBarang, setListBarang] = useState<any[]>([]);
  const [sort, setSort] = useState<SortType>("ASC");
  const [sortBy, setSortBy] = useState<string>("name");
  const [searchValue, setSearchValue] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [barang, setBarang] = useState<any | null>(null);
  const [listInventory, setListInventory] = useState<any[]>([]);

  const { data: warehouseSummaryResponse } =
    useGetWarehouseInventorySummary();
  const warehouseSummary = warehouseSummaryResponse?.data;
  const {
    data: historyResponse,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    refetch: refetchHistory,
  } = useGetStockOpname({
    params: {
      page: 1,
      limit: GET_ALL_LIMIT,
      sort: "DESC",
      sortBy: "created_at",
    },
    options: { keepPreviousData: true },
  });
  const {
    data: movingInventoryResponse,
    isLoading: isMovingInventoryLoading,
    isError: isMovingInventoryError,
    refetch: refetchMovingInventory,
  } = useGetBarangGudang({
    params: {
      page: 1,
      limit: 20,
      gudang_id: movingSourceWarehouse
        ? Number(movingSourceWarehouse)
        : undefined,
      search: debouncedMovingItemQuery || undefined,
      sort: "ASC",
      sortBy: "name",
    },
    options: {
      enabled: movingOrderOpen && Boolean(movingSourceWarehouse),
    },
  });
  const {
    mutateAsync: postMovingOrder,
    isLoading: isCreatingMovingOrder,
  } = usePostMovingOrder();
  const {
    data: movingOrderResponse,
    isLoading: isMovingOrderListLoading,
    isError: isMovingOrderListError,
    refetch: refetchMovingOrders,
  } = useGetMovingOrders({
    params: { page: movingOrderPage, limit: PAGE_SIZE },
    options: {
      enabled: tab === "movingorder",
      keepPreviousData: true,
    },
  });
  const movingOrders = movingOrderResponse?.data ?? [];
  const {
    mutateAsync: putApplyStockOpname,
    isLoading: isApplyingStockOpname,
  } = usePutApplyStockOpname();
  const {
    mutateAsync: putRollbackStockOpname,
    isLoading: isRollingBackStockOpname,
  } = usePutRollbackStockOpname();
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  const historyRecords = historyResponse?.data ?? [];
  const pendingOpname = historyRecords.some(
    (record) => normalizedOpnameStatus(record) === "PENDING",
  );

  const formik = useFormik<any>({
    initialValues: {
      stok: isModify ? String(barang?.stok_gudang ?? barang?.stok_barang ?? "") : "",
      gudang_id: isModify ? String(barang?.gudang_id ?? "") : "",
      kode: isModify ? barang?.kode_gudang ?? barang?.kode ?? "" : "",
      keyname: isModify ? barang?.keyname ?? "" : "",
      asile: isModify ? barang?.asile ?? "" : "",
      rack: isModify ? barang?.rack ?? "" : "",
      level: isModify ? barang?.level ?? "" : "",
      stok_minimum: isModify ? String(barang?.stok_minimum ?? "") : "",
      lantai: isModify ? barang?.lantai ?? "" : "",
      lorong: isModify ? barang?.lorong ?? "" : "",
      flag_1: isModify ? barang?.flag_1 ?? "" : "",
      flag_2: isModify ? barang?.flag_2 ?? "" : "",
      valuation: isModify ? String(barang?.valuation ?? "") : "",
    },
    validationSchema: Yup.object({
      stok: Yup.string().required("Required"),
      gudang_id: Yup.string().required("Required"),
      stok_minimum: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!isModify && !inventory) {
        return toast("Please select item", { type: "error" });
      }
      setIsLoading(true);
      const payload = {
        ...values,
        barang_id: isModify ? barang?.barang_id : inventory?.id,
        gudang_id: Number(values.gudang_id),
        stok: Number(values.stok),
        stok_minimum: Number(values.stok_minimum),
        code: values.kode,
      };
      if (isModify) {
        try {
          delete payload.kode;
          const result: APIResponse<any> =
            await InventoryService.editBarangGudang({
              ...payload,
              id: barang.barang_gudang_id,
            });
          if (result.success) {
            toast(result.message || "Warehouse item updated.", { type: "success" });
            setIsModify(false);
            formik.resetForm();
            setBarang(null);
            setIsLoading(false);
            setInventory(null);
            setModalOpen(false);
            await queryClient.invalidateQueries(["useGetBarangGudang"]);
            await queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]);
            await getInventoryList();
          }
        } catch (error: any) {
          setIsLoading(false);
          const message = errorMessage(error, "Failed to update warehouse item.");
          if (message.includes("Duplicate entry")) {
            formik.setFieldError("kode", message);
          }
          toast(message, { type: "error" });
        }
      } else {
        try {
          const result: APIResponse<any> =
            await InventoryService.addBarangGudang(payload);
          if (result.success) {
            toast(result.message || "Warehouse item added.", { type: "success" });
            setIsModify(false);
            formik.resetForm();
            setBarang(null);
            setIsLoading(false);
            setInventory(null);
            await queryClient.invalidateQueries(["useGetBarangGudang"]);
            await queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]);
            await getInventoryList();
            setItemSearch("");
            setItemSearchDraft("");
            setModalOpen(false);
          }
        } catch (error: any) {
          setIsLoading(false);
          const message = errorMessage(error, "Failed to add warehouse item.");
          if (message.includes("Duplicate entry")) {
            formik.setFieldError("kode", message);
          }
          toast(message, { type: "error" });
        }
      }
    },
  });

  const getInventoryList = async (size?: number) => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getBarangGudang(
        appliedWarehouseFilter || "All",
        page,
        searchValue,
        size ?? 10,
        sort,
        sortBy,
        appliedStatusFilter || undefined,
      );
      setListBarang(response.data);
      setTotal(response.total_records);
      setTotalPages(response.total_pages);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setPage(1);
      setListBarang([]);
      setTotal(0);
      setTotalPages(0);
    }
  };

  useEffect(() => {
    getInventoryList();
  }, [page, sort, sortBy, searchValue, appliedWarehouseFilter, appliedStatusFilter]);

  useEffect(() => {
    if (!movingOrderOpen || !movingSourceWarehouse) {
      setDebouncedMovingItemQuery("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedMovingItemQuery(movingItemQuery.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [movingItemQuery, movingOrderOpen, movingSourceWarehouse]);

  function applyInventoryFilters() {
    setSearchValue(query.trim());
    setAppliedWarehouseFilter(warehouseFilter);
    setAppliedStatusFilter(statusFilter);
    setPage(1);
  }

  const safePage = Math.max(1, Math.min(page, Math.max(1, totalPages)));

  function handleSort(col: any) {
    const sortKeys = [
      "name", "stok_gudang", "gudang_name", "stok_barang",
      "stok_minimum", "stock_used", "valuation", "total_valuation",
      "status", "flag_1", "flag_2", "asile", "rack", "level",
      "lantai", "lorong", "updated_at",
    ];
    if (sortCol === col) {
      const nextAscending = !sortAsc;
      setSortAsc(nextAscending);
      setSort(nextAscending ? "ASC" : "DESC");
    } else {
      setSortCol(col);
      setSortAsc(true);
      setSort("ASC");
    }
    setSortBy(sortKeys[col] ?? "name");
    setPage(1);
  }

  const historyWarehouseOptions = useMemo(() => {
    return Array.from(new Set(historyRecords.map(opnameWarehouse).filter((name) => name !== "-")))
      .sort()
      .map((name) => ({ value: name, label: name }));
  }, [historyRecords]);

  const filteredHistory = useMemo(
    () => historyRecords.filter(
      (record) => !historyWarehouse || opnameWarehouse(record) === historyWarehouse,
    ),
    [historyRecords, historyWarehouse],
  );
  const pendingCount = historyRecords.filter(
    (record) => normalizedOpnameStatus(record) === "PENDING",
  ).length;
  const totalItemsAdjusted = historyRecords.reduce(
    (sum, record) => sum + opnameItems(record).length,
    0,
  );

  const movingApiRows = movingInventoryResponse?.data ?? [];
  const movingRows = movingSourceWarehouse
    ? movingApiRows.filter(
        (row) => Number(row.gudang_id) === Number(movingSourceWarehouse),
      )
    : [];
  const filteredMovingRows = movingRows.filter((row) => row.stok_gudang > 0);
  const selectedMovingRows = movingRows.filter(
    (row) => movingSelection[row.barang_gudang_id] !== undefined,
  );
  const movingOrderValid = Boolean(
    movingSourceWarehouse
      && movingDestinationWarehouse
      && movingSourceWarehouse !== movingDestinationWarehouse
      && selectedMovingRows.length > 0
      && selectedMovingRows.every((row) => {
        const quantity = Number(movingSelection[row.barang_gudang_id]);
        return Number.isFinite(quantity)
          && quantity > 0
          && quantity <= row.stok_gudang;
      }),
  );

  function openEditItem(row: any) {
    setBarang(row);
    setInventory({ id: row.barang_id, nama: row.nama_barang });
    setIsModify(true);
    setItemSearchDraft("");
    setItemSearch("");
    setModalOpen(true);
  }

  async function confirmDeleteItem() {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const response = await InventoryService.deleteBarangGudang(
        deleteTarget.barang_gudang_id,
      );
      toast(response.message || "Warehouse item deleted.", { type: "success" });
      setDeleteTarget(null);
      await getInventoryList();
      await queryClient.invalidateQueries(["useGetBarangGudang"]);
      await queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]);
    } catch (error) {
      toast(errorMessage(error, "Failed to delete warehouse item."), {
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  function openMovingOrder() {
    setMovingSourceWarehouse("");
    setMovingDestinationWarehouse("");
    setMovingItemQuery("");
    setDebouncedMovingItemQuery("");
    setMovingSelection({});
    setMovingOrderOpen(true);
  }

  function toggleMovingItem(row: BarangGudangItem) {
    setMovingSelection((current) => {
      const next = { ...current };
      if (next[row.barang_gudang_id] !== undefined) {
        delete next[row.barang_gudang_id];
      } else {
        next[row.barang_gudang_id] = "1";
      }
      return next;
    });
  }

  function setMovingItemQuantity(row: BarangGudangItem, value: string) {
    setMovingSelection((current) => ({
      ...current,
      [row.barang_gudang_id]: value === ""
        ? ""
        : String(
          Math.max(
            1,
            Math.min(row.stok_gudang, Number(value) || 1),
          ),
        ),
    }));
  }

  async function submitMovingOrder() {
    if (!movingOrderValid) return;

    const payload = {
      from_gudang_id: Number(movingSourceWarehouse),
      items: selectedMovingRows.map((row) => ({
        barang_gudang_id: row.barang_gudang_id,
        barang_id: row.barang_id,
        qty: Number(movingSelection[row.barang_gudang_id]),
      })),
      notes: "",
      to_gudang_id: Number(movingDestinationWarehouse),
    };

    try {
      const response = await postMovingOrder(payload);
      setMovingOrderPage(1);
      await Promise.all([
        refetchMovingInventory(),
        refetchMovingOrders(),
        queryClient.invalidateQueries(["useGetMovingOrders"]),
        queryClient.invalidateQueries(["useGetBarangGudang"]),
        queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]),
      ]);
      setMovingOrderOpen(false);
      setMovingSourceWarehouse("");
      setMovingDestinationWarehouse("");
      setMovingItemQuery("");
      setDebouncedMovingItemQuery("");
      setMovingSelection({});
      toast.success(response.message || "Moving order created successfully.");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to create moving order."));
    }
  }

  async function approveOpname(record: StockOpnameHistoryRecord) {
    if (!window.confirm("Approve this stock opname and apply its stock changes?")) {
      return;
    }
    try {
      setApprovingId(record.id);
      const response = await putApplyStockOpname(record.id);
      clearStockOpnameLocalResolution(record.id);
      toast(response.message, { type: "success" });
      setHistoryDetail(null);
      await Promise.all([
        refetchHistory(),
        queryClient.invalidateQueries(["useGetBarangGudang"]),
        queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]),
        getInventoryList(),
      ]);
    } catch (error) {
      toast(errorMessage(error, "Failed to approve stock opname."), {
        type: "error",
      });
    } finally {
      setApprovingId(null);
    }
  }

  async function rollbackOpname(record: StockOpnameHistoryRecord) {
    if (!window.confirm(
      "Rollback this stock opname?",
    )) {
      return;
    }

    try {
      setRollingBackId(record.id);
      const response = await putRollbackStockOpname(record.id);
      clearStockOpnameLocalResolution(record.id);
      setHistoryDetail(null);
      toast.success(response.message || "Stock opname rolled back successfully.");
      await Promise.all([
        refetchHistory(),
        queryClient.invalidateQueries(["useGetBarangGudang"]),
        queryClient.invalidateQueries(["useGetWarehouseInventorySummary"]),
        getInventoryList(),
      ]);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to rollback stock opname."));
    } finally {
      setRollingBackId(null);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setIsModify(false);
    setBarang(null);
    setInventory(null);
    setSelectedItemId(null);
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
    setIsModify(false);
    setBarang(null);
    setInventory(null);
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
            value: warehouseSummary?.total_items ?? 0,
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: "Safe",
            value: warehouseSummary?.safe ?? 0,
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: "Warning",
            value: warehouseSummary?.warning ?? 0,
            color: "var(--orange)",
            bg: "var(--orange-bg)",
          },
          {
            label: "Critical",
            value: warehouseSummary?.critical ?? 0,
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
          { id: "movingorder", label: "Moving Order" },
          { id: "opnamehistory", label: "Opname History" },
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
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyInventoryFilters();
                    }
                  }}
                />
              </div>
              <SearchableSelect
                inline
                value={warehouseFilter}
                onChange={(value) => setWarehouseFilter(String(value))}
                placeholder="All Warehouses"
                searchPlaceholder="Search warehouse…"
                options={[
                  { value: "", label: "All Warehouses" },
                  ...warehouseOptions,
                ]}
              />
              <SearchableSelect
                inline
                value={statusFilter}
                onChange={(value) => setStatusFilter(String(value) as BarangGudangStatus | "")}
                placeholder="All Status"
                options={[
                  { value: "", label: "All Status" },
                  { value: "SAFE", label: "Safe" },
                  { value: "WARNING", label: "Warning" },
                  { value: "CRITICAL", label: "Critical" },
                ]}
              />
              <button className="btn-search" onClick={applyInventoryFilters}>
                <IconSearch /> Search
              </button>
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
                    label="Aisle"
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
                    label="Floor"
                    colIndex={14}
                    sortCol={sortCol}
                    sortAsc={sortAsc}
                    onSort={handleSort}
                    style={{ width: 55, textAlign: "center" }}
                  />
                  <SortTh
                    label="Lane"
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
                {isLoading && listBarang.length === 0 ? (
                  <tr><td colSpan={19} style={{ padding: 32, textAlign: "center" }}>Loading warehouse inventory…</td></tr>
                ) : listBarang.length === 0 ? (
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
                    <tr key={r.barang_gudang_id}>
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
                      <td>{statusBadge(r.status ?? r.minStatus)}</td>
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
                            onClick={() => setDetailRow(r)}
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
                          <button className="btn-icon edit" title="Edit" onClick={() => openEditItem(r)}>
                            <IconEdit />
                          </button>
                          <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(r)}>
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
        title={isModify ? "Edit Warehouse Item" : "Add Warehouse Item"}
        onClose={closeModal}
        size="xl"
        footer={
          <>
            <button className="btn-cancel-modal" disabled={isLoading} onClick={closeModal}>
              <IconClose /> Cancel
            </button>
            <button
              className="btn-save-modal"
              type="submit"
              disabled={isLoading}
              onClick={() => formik.handleSubmit()}
            >
              <IconCheck /> {isLoading ? "Saving…" : isModify ? "Save Changes" : "Save Item"}
            </button>
          </>
        }
      >
        {isModify ? (
          <div className="inventory-selected-item" style={{ marginBottom: 16 }}>
            <span>Item Name</span>
            <strong>{barang?.nama_barang ?? "-"}</strong>
          </div>
        ) : (
          <>
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
          </>
        )}

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
            label="Code"
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
            label="Floor"
            placeholder=""
          />
          <TextInput
            value={formik.values.lorong}
            onChange={(e) => formik.setFieldValue("lorong", e)}
            label="Lane"
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
            label="Flag 2"
            placeholder=""
          />
          <TextInput
            value={formik.values.valuation}
            onChange={(e) => formik.setFieldValue("valuation", e)}
            label="Valuation"
            placeholder=""
            isNumeric
          />
          <div className="form-group">
            <label>
              Warehouse <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <SearchableSelect
              onChange={(value) =>
                formik.setFieldValue("gudang_id", String(value))
              }
              value={formik.values.gudang_id}
              placeholder="Select warehouse"
              searchPlaceholder="Search warehouse…"
              options={warehouseOptions}
            />
            {(formik.errors.gudang_id as string)?.trim() && (
              <span style={{ color: "var(--red)", fontSize: 12 }}>
                {formik.errors.gudang_id as string}
              </span>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detailRow)}
        title="Warehouse Item Detail"
        onClose={() => setDetailRow(null)}
        footer={<button className="btn-cancel-modal" onClick={() => setDetailRow(null)}><IconClose /> Close</button>}
      >
        {detailRow && (
          <div className="item-detail-grid">
            <div className="item-detail-row"><span>Name</span><strong>{detailRow.nama_barang}</strong></div>
            <div className="item-detail-row"><span>Warehouse</span><strong>{detailRow.gudang_name ?? detailRow.gudang?.gudang_name ?? "-"}</strong></div>
            <div className="item-detail-row"><span>Warehouse Stock</span><strong>{detailRow.stok_gudang}</strong></div>
            <div className="item-detail-row"><span>Item Stock</span><strong>{detailRow.stok_barang}</strong></div>
            <div className="item-detail-row"><span>Minimum Stock</span><strong>{detailRow.stok_minimum}</strong></div>
            <div className="item-detail-row"><span>Used</span><strong>{detailRow.stock_used}</strong></div>
            <div className="item-detail-row"><span>Valuation</span><strong>{detailRow.valuation ? currency(Number(detailRow.valuation)) : "0"}</strong></div>
            <div className="item-detail-row"><span>Total Valuation</span><strong>{detailRow.valuation ? currency(Number(detailRow.valuation) * Number(detailRow.stok_gudang)) : "0"}</strong></div>
            <div className="item-detail-row"><span>Status</span><span>{statusBadge(detailRow.status)}</span></div>
            <div className="item-detail-row"><span>Flag 1 / Flag 2</span><strong>{detailRow.flag_1 || "—"} / {detailRow.flag_2 || "—"}</strong></div>
            <div className="item-detail-row"><span>Aisle / Rack / Level</span><strong>{detailRow.asile || "—"} / {detailRow.rack || "—"} / {detailRow.level || "—"}</strong></div>
            <div className="item-detail-row"><span>Floor / Lane</span><strong>{detailRow.lantai || "—"} / {detailRow.lorong || "—"}</strong></div>
            <div className="item-detail-row"><span>Updated At</span><strong>{detailRow.updated_at ? moment(detailRow.updated_at).format("D MMM YYYY, HH:mm") : "-"}</strong></div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Warehouse Item"
        onClose={() => !isDeleting && setDeleteTarget(null)}
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn-del-ok" disabled={isDeleting} onClick={confirmDeleteItem}>{isDeleting ? "Deleting…" : "Delete"}</button>
          </>
        )}
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteTarget?.nama_barang}&rdquo;</strong> from <strong>{deleteTarget?.gudang_name ?? deleteTarget?.gudang?.gudang_name ?? "this warehouse"}</strong>? This action cannot be undone.
        </p>
      </Modal>

      {tab === "movingorder" && (
        <div className="card">
          <div className="toolbar">
            <div className="toolbar-left">
              <p style={{ color: "var(--text-muted)", fontSize: 12.5, margin: 0 }}>
                Prepare a multi-item stock transfer between warehouses.
              </p>
            </div>
            <div className="toolbar-right">
              <button className="btn-new" onClick={openMovingOrder}><IconPlus /> Create Moving Order</button>
            </div>
          </div>
          <p style={{ background: "var(--brand-bg)", borderRadius: "var(--r-lg)", color: "var(--brand)", fontSize: 12.5, marginBottom: 16, padding: "9px 14px" }}>
            Moving orders are loaded directly from the API.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>From</th><th>To</th><th style={{ textAlign: "right" }}>Total Items</th><th>Notes</th><th>Moved By</th></tr></thead>
              <tbody>
                {isMovingOrderListLoading && movingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--text-muted)", padding: 32, textAlign: "center" }}>
                      Loading moving orders…
                    </td>
                  </tr>
                ) : isMovingOrderListError ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--red)", padding: 32, textAlign: "center" }}>
                      Unable to load moving orders.
                    </td>
                  </tr>
                ) : movingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--text-muted)", padding: 32, textAlign: "center" }}>
                      No moving orders found.
                    </td>
                  </tr>
                ) : movingOrders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
                      {formatUtcToLocalDateTime(order.created_at)}
                    </td>
                    <td className="name-cell">{order.from_warehouse_name || "-"}</td>
                    <td>{order.to_warehouse_name || "-"}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, textAlign: "right" }}>{order.total_items}</td>
                    <td style={{ color: "var(--text-muted)" }}>{order.notes || "-"}</td>
                    <td>{order.moved_by || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={movingOrderResponse?.page ?? movingOrderPage}
            total={movingOrderResponse?.total_records ?? 0}
            pageSize={PAGE_SIZE}
            onPage={setMovingOrderPage}
            label="moving orders"
          />
        </div>
      )}

      <Modal
        open={movingOrderOpen}
        title="Create Moving Order"
        onClose={() => !isCreatingMovingOrder && setMovingOrderOpen(false)}
        size="lg"
        footer={(
          <>
            <button className="btn-cancel-modal" disabled={isCreatingMovingOrder} onClick={() => setMovingOrderOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={!movingOrderValid || isCreatingMovingOrder} onClick={submitMovingOrder}>
              <IconCheck /> {isCreatingMovingOrder ? "Creating…" : `Create Order${selectedMovingRows.length > 1 ? ` (${selectedMovingRows.length} items)` : ""}`}
            </button>
          </>
        )}
      >
        <div className="form-group">
          <label>Source Warehouse <span style={{ color: "var(--red)" }}>*</span></label>
          <SearchableSelect
            value={movingSourceWarehouse}
            onChange={(value) => {
              setMovingSourceWarehouse(String(value));
              setMovingDestinationWarehouse("");
              setMovingItemQuery("");
              setDebouncedMovingItemQuery("");
              setMovingSelection({});
            }}
            placeholder="Choose warehouse…"
            searchPlaceholder="Search warehouse…"
            options={warehouseOptions}
          />
        </div>

        {movingSourceWarehouse && (
          <div className="form-group">
            <label>Items to Move <span style={{ color: "var(--red)" }}>*</span>{selectedMovingRows.length > 0 && <span style={{ color: "var(--text-muted)", letterSpacing: 0, marginLeft: 6, textTransform: "none" }}>({selectedMovingRows.length} selected)</span>}</label>
            <div className="mo-item-search">
              <IconSearch />
              <input
                placeholder="Search item…"
                value={movingItemQuery}
                onChange={(event) => setMovingItemQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setDebouncedMovingItemQuery(movingItemQuery.trim());
                  }
                }}
              />
            </div>
            <div className="mo-item-list">
              {isMovingInventoryLoading ? (
                <div className="mo-item-empty">Loading warehouse items…</div>
              ) : isMovingInventoryError ? (
                <div className="mo-item-empty" style={{ color: "var(--red)" }}>Unable to load warehouse items.</div>
              ) : !filteredMovingRows.length ? (
                <div className="mo-item-empty">No items with stock at this warehouse.</div>
              ) : filteredMovingRows.map((row) => {
                const checked = movingSelection[row.barang_gudang_id] !== undefined;
                return (
                  <div key={row.barang_gudang_id} className={`mo-item-row${checked ? " checked" : ""}`}>
                    <label className="mo-item-check">
                      <input type="checkbox" checked={checked} onChange={() => toggleMovingItem(row)} />
                      <span className="mo-item-name">{row.nama_barang}</span>
                      <span className="mo-item-stock">stock: {row.stok_gudang}</span>
                    </label>
                    {checked && (
                      <input
                        className="mo-item-qty"
                        type="number"
                        min="1"
                        max={row.stok_gudang}
                        value={movingSelection[row.barang_gudang_id]}
                        onChange={(event) => setMovingItemQuantity(row, event.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Destination Warehouse <span style={{ color: "var(--red)" }}>*</span></label>
          <SearchableSelect
            value={movingDestinationWarehouse}
            onChange={(value) => setMovingDestinationWarehouse(String(value))}
            disabled={!movingSourceWarehouse}
            placeholder="Choose warehouse…"
            searchPlaceholder="Search warehouse…"
            options={warehouseOptions.filter((warehouse) => String(warehouse.value) !== movingSourceWarehouse)}
          />
        </div>
        {movingOrderValid && (
          <div className="mo-flow" style={{ background: "var(--bg)", borderRadius: "var(--r-lg)", fontSize: 12.5, marginTop: 4, padding: "10px 12px" }}>
            <strong>{selectedMovingRows.length} item{selectedMovingRows.length === 1 ? "" : "s"}</strong>
            <span className="mo-flow-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
            <span>
              {warehouseOptions.find((warehouse) => String(warehouse.value) === movingSourceWarehouse)?.label}
              {" → "}
              {warehouseOptions.find((warehouse) => String(warehouse.value) === movingDestinationWarehouse)?.label}
            </span>
          </div>
        )}
      </Modal>

      {tab === "opnamehistory" && (
        <div className="card">
          <div className="stats-bar" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 18 }}>
            {[
              { label: "Total Sessions", value: historyResponse?.total_records ?? historyRecords.length, color: "var(--brand)", bg: "var(--brand-bg)" },
              { label: "Pending Approval", value: pendingCount, color: "var(--orange)", bg: "var(--orange-bg)" },
              { label: "Items Adjusted", value: totalItemsAdjusted, color: "var(--green)", bg: "var(--green-bg)" },
              { label: "Last Submitted", value: historyRecords[0]?.created_at ? moment(historyRecords[0].created_at).format("D MMM YYYY") : "-", color: "var(--text-2)", bg: "var(--bg)" },
            ].map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-icon" style={{ background: stat.bg }}><span className="stat-value" style={{ color: stat.color, fontSize: typeof stat.value === "string" ? 14 : undefined }}>{stat.value}</span></div>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="toolbar">
            <div className="toolbar-left">
              <SearchableSelect
                inline
                value={historyWarehouse}
                onChange={(value) => setHistoryWarehouse(String(value))}
                placeholder="All Warehouses"
                searchPlaceholder="Search warehouse…"
                options={[{ value: "", label: "All Warehouses" }, ...historyWarehouseOptions]}
              />
            </div>
            <div className="toolbar-right">
              <button
                className="btn-save-modal"
                disabled={pendingOpname}
                title={pendingOpname ? "Resolve the pending stock opname before starting a new one" : "Start a new stock opname"}
                onClick={() => navigate("/stock-opname")}
              >
                <IconPlus /> Start Stock Opname
              </button>
            </div>
          </div>
          {pendingOpname && <p style={{ background: "var(--orange-bg)", borderRadius: "var(--r-lg)", color: "var(--orange)", fontSize: 12.5, marginBottom: 16, padding: "9px 14px" }}>A stock opname is awaiting approval. Resolve it before starting a new one.</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date Submitted</th><th>Period</th><th>Warehouse</th><th>Submitted By</th><th style={{ textAlign: "right" }}>Items</th><th>Status</th><th style={{ textAlign: "center" }}>Action</th></tr></thead>
              <tbody>
                {isHistoryLoading ? (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center" }}>Loading opname history…</td></tr>
                ) : isHistoryError ? (
                  <tr><td colSpan={7} style={{ color: "var(--red)", padding: 32, textAlign: "center" }}>Unable to load opname history.</td></tr>
                ) : !filteredHistory.length ? (
                  <tr><td colSpan={7} style={{ color: "var(--text-muted)", padding: 32, textAlign: "center" }}>No opname history found.</td></tr>
                ) : filteredHistory.map((record) => {
                  const isPending = normalizedOpnameStatus(record) === "PENDING";
                  return (
                    <tr key={record.id}>
                      <td>{record.created_at ? moment(record.created_at).format("D MMM YYYY, HH:mm") : "-"}</td>
                      <td>{record.period || "-"}</td>
                      <td>{opnameWarehouse(record)}</td>
                      <td>{record.user_name ?? record.created_by ?? "-"}</td>
                      <td style={{ textAlign: "right" }}>{opnameItems(record).length}</td>
                      <td>{opnameStatusBadge(record)}</td>
                      <td style={{ textAlign: "center" }}>
                        <div className="action-btns" style={{ justifyContent: "center" }}>
                          <button className="btn-icon" title="View Detail" style={{ color: "var(--brand)" }} onClick={() => setHistoryDetail(record)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {isAdmin && isPending && (
                            <>
                              <button className="btn-icon" title="Approve" disabled={isApplyingStockOpname && approvingId === record.id} style={{ color: "var(--green)" }} onClick={() => approveOpname(record)}><IconCheck /></button>
                              <button
                                className="btn-icon delete"
                                title="Rollback"
                                disabled={isRollingBackStockOpname && rollingBackId === record.id}
                                onClick={() => rollbackOpname(record)}
                              >
                                <IconClose />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(historyDetail)}
        title={historyDetail ? `Opname Detail — ${historyDetail.period || `#${historyDetail.id}`}` : "Opname Detail"}
        onClose={() => setHistoryDetail(null)}
        footer={<button className="btn-cancel-modal" onClick={() => setHistoryDetail(null)}><IconClose /> Close</button>}
      >
        {historyDetail && (
          <>
            <p className="confirm-msg" style={{ marginBottom: 10 }}>
              <strong>{opnameItems(historyDetail).length}</strong> item{opnameItems(historyDetail).length === 1 ? "" : "s"} in <strong>{opnameWarehouse(historyDetail)}</strong>.
            </p>
            <p style={{ marginBottom: 12 }}>{opnameStatusBadge(historyDetail)}{historyDetail.remark && <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{historyDetail.remark}</span>}</p>
            {normalizedOpnameStatus(historyDetail) === "REJECTED"
              && getStockOpnameLocalResolution(historyDetail.id) && (
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 12 }}>
                Rejected locally by {getStockOpnameLocalResolution(historyDetail.id)?.resolvedBy}
                {" on "}
                {moment(getStockOpnameLocalResolution(historyDetail.id)?.resolvedAt).format("D MMM YYYY, HH:mm")}.
                This current-session override does not replace the API history record.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
              {opnameItems(historyDetail).map((item, index) => {
                const before = opnameBefore(item);
                const after = opnameAfter(item);
                const difference = after - before;
                return (
                  <div key={`${item.barang_gudang_id ?? item.id ?? index}-${index}`} style={{ borderBottom: "1px solid var(--border-2)", display: "flex", fontSize: 12.5, gap: 10, justifyContent: "space-between", padding: "6px 0" }}>
                    <span>
                      {opnameItemName(item)}
                      {item.condition && (
                        <span
                          className={`badge ${item.condition.toLowerCase() === "poor" ? "badge-red" : "badge-green"}`}
                          style={{ fontSize: 10, marginLeft: 6 }}
                        >
                          {item.condition}
                        </span>
                      )}
                      {item.note && <small style={{ color: "var(--text-muted)", display: "block" }}>{item.note}</small>}
                    </span>
                    <strong>{before} → {after} ({difference > 0 ? "+" : ""}{difference})</strong>
                  </div>
                );
              })}
            </div>
            {isAdmin && normalizedOpnameStatus(historyDetail) === "PENDING" && (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button className="btn-save-modal" disabled={isApplyingStockOpname} onClick={() => approveOpname(historyDetail)}><IconCheck /> {isApplyingStockOpname ? "Approving…" : "Approve"}</button>
                <button
                  className="btn-cancel-modal"
                  disabled={isRollingBackStockOpname}
                  onClick={() => rollbackOpname(historyDetail)}
                >
                  <IconClose /> {isRollingBackStockOpname ? "Rolling back…" : "Rollback"}
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
