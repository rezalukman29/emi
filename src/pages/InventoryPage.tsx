import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconDelete,
  IconClose,
  IconCheck,
  IconMagic,
} from "../components/icons";
import { SortType } from "../interfaces/interfaces";
import { InventoryService } from "../service/InventoryService";
import { AiService } from "../service/AiService";
import { useCategoryController } from "./lib/useCategoryController";
import moment from "moment";
import { STORAGE_BOOQABLE, isValidUrl, noImage } from "../utils/function";
import { useFormik } from "formik";
import * as Yup from "yup";
import { APIResponse } from "../interfaces/BaseApiResponse";
import Modal from "../components/Modal";
import { toast } from "react-toastify";
import TextInput from "../components/TextInput";
import TextArea from "../components/TextArea";
import { useUnitController } from "./lib/useUnitController";

export interface ISelect {
  label: string;
  value: string;
}

function ImgCell({ src, name, onClick }: any) {
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
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "var(--r)",
          }}
        />
      ) : (
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
      )}
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

const PAGE_SIZE = 10;

const inventoryData = [
  {
    id: 1,
    name: "Artificial Flower Chrysant Giant White",
    sku: "AFG-001",
    category: "Floral",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 342,
    stockStatus: "Available",
    updatedAt: "12 Mar 2025",
  },
  {
    id: 2,
    name: "Artificial Flower Lunaria White",
    sku: "AFL-002",
    category: "Floral",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 327,
    stockStatus: "Available",
    updatedAt: "10 Mar 2025",
  },
  {
    id: 3,
    name: "Artificial Rose Pink",
    sku: "ARP-003",
    category: "Floral",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 182,
    stockStatus: "Available",
    updatedAt: "08 Mar 2025",
  },
  {
    id: 4,
    name: "Backdrop Stand 2m",
    sku: "BSD-004",
    category: "Equipment",
    unit: "unit",
    warehouse: "Gudang C9",
    totalStock: 8,
    stockStatus: "Low Stock",
    updatedAt: "07 Mar 2025",
  },
  {
    id: 5,
    name: "Balon Latex Putih",
    sku: "BLP-005",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Surabaya",
    totalStock: 500,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 6,
    name: "Candle Holder Bulat Besar",
    sku: "CHB-006",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 70",
    totalStock: 60,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 7,
    name: "Crystal Bentuk Tabung",
    sku: "CBT-007",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 100,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 8,
    name: "Fabric Putih Polos 3m",
    sku: "FPP-008",
    category: "Fabric",
    unit: "meter",
    warehouse: "Gudang Cililitan",
    totalStock: 20,
    stockStatus: "Low Stock",
    updatedAt: "05 Mar 2025",
  },
  {
    id: 9,
    name: "Flower Arch Besi 60cm",
    sku: "FAB-009",
    category: "Decoration",
    unit: "unit",
    warehouse: "Gudang Bali 70",
    totalStock: 12,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 10,
    name: "Gebyok Jati Ukiran",
    sku: "GJU-010",
    category: "Furniture",
    unit: "unit",
    warehouse: "Gudang Cililitan",
    totalStock: 2,
    stockStatus: "Low Stock",
    updatedAt: "01 Mar 2025",
  },
  {
    id: 11,
    name: "Janur Kuning",
    sku: "JKN-011",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 50,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 12,
    name: "Kain Batik Wahyu Tumurun",
    sku: "KBW-012",
    category: "Fabric",
    unit: "meter",
    warehouse: "Gudang Cililitan",
    totalStock: 80,
    stockStatus: "Available",
    updatedAt: "28 Feb 2025",
  },
  {
    id: 13,
    name: "Kursi Tiffany Putih",
    sku: "KTP-013",
    category: "Furniture",
    unit: "unit",
    warehouse: "Gudang Bali 66",
    totalStock: 80,
    stockStatus: "Available",
    updatedAt: "20 Feb 2025",
  },
  {
    id: 14,
    name: "Lilin Merah Besar",
    sku: "LMB-014",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 50,
    stockStatus: "Available",
    updatedAt: "15 Feb 2025",
  },
  {
    id: 15,
    name: "Meja Buffet Putih",
    sku: "MBP-015",
    category: "Furniture",
    unit: "unit",
    warehouse: "Gudang Surabaya",
    totalStock: 8,
    stockStatus: "Low Stock",
    updatedAt: "-",
  },
  {
    id: 16,
    name: "Pita Emas Roll",
    sku: "PER-016",
    category: "Decoration",
    unit: "roll",
    warehouse: "Gudang Bali 66",
    totalStock: 100,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 17,
    name: "Taplak Meja Putih 2x1m",
    sku: "TMP-017",
    category: "Fabric",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 30,
    stockStatus: "Available",
    updatedAt: "10 Feb 2025",
  },
  {
    id: 18,
    name: "Tealight Holder Lama Tinggi 15cm",
    sku: "THL-018",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 70",
    totalStock: 27,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 19,
    name: "Tripod Kamera Mini",
    sku: "TKM-019",
    category: "Equipment",
    unit: "unit",
    warehouse: "Gudang Cililitan",
    totalStock: 5,
    stockStatus: "Low Stock",
    updatedAt: "-",
  },
  {
    id: 20,
    name: "Vase Keramik Putih Tinggi",
    sku: "VKP-020",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 66",
    totalStock: 15,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 21,
    name: "Acrylic Ball Silver 20cm",
    sku: "ABS-021",
    category: "Decoration",
    unit: "pcs",
    warehouse: "Gudang Bali 70",
    totalStock: 189,
    stockStatus: "Available",
    updatedAt: "-",
  },
  {
    id: 22,
    name: "Kain Putih Polos 6m",
    sku: "KPP-022",
    category: "Fabric",
    unit: "meter",
    warehouse: "Gudang Bali 70",
    totalStock: 1,
    stockStatus: "Out of Stock",
    updatedAt: "-",
  },
];

// const categories    = ['Floral','Furniture','Lighting','Fabric','Decoration','Equipment'];
const stockStatuses = ["Available", "Low Stock", "Out of Stock"];

function stockBadge(s: any) {
  if (s === "Available") return <span className="badge badge-green">{s}</span>;
  if (s === "Low Stock") return <span className="badge badge-orange">{s}</span>;
  if (s === "Out of Stock") return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const { categoryOptions } = useCategoryController();
  const { unitOptions } = useUnitController();
  const imgInputRef = useRef<any>(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
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

  const emptyAiEdited = {
    detail: "",
    harga_rata_rata: "",
    cara_pemakaian: "",
    hal_perlu_diperhatikan: "",
  };
  const [aiTuneup, setAiTuneup] = useState<{
    open: boolean;
    loading: boolean;
    saving: boolean;
    barang: any | null;
    edited: typeof emptyAiEdited;
  }>({
    open: false,
    loading: false,
    saving: false,
    barang: null,
    edited: emptyAiEdited,
  });

  const sortKeys = [
    "name",
    "sku",
    "category",
    "unit",
    "warehouse",
    "totalStock",
    "stockStatus",
    "updatedAt",
  ];

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = sortKeys[sortCol] || "name";
    return inventoryData
      .filter((r) => {
        const mQ =
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q);
        const mC = !catFilter || r.category === catFilter;
        const mS = !stockFilter || r.stockStatus === stockFilter;
        return mQ && mC && mS;
      })
      .sort((a: any, b: any) => {
        const va = String(a[key] ?? ""),
          vb = String(b[key] ?? "");
        return sortAsc
          ? va.localeCompare(vb, undefined, { numeric: true })
          : vb.localeCompare(va, undefined, { numeric: true });
      });
  }, [query, catFilter, stockFilter, sortCol, sortAsc]);

  function handleSort(col: any) {
    setSortBy(col);
    setSort(sort === "ASC" ? "DESC" : "ASC");
    setPage(1);
  }

  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const availableCount = inventoryData.filter(
    (r) => r.stockStatus === "Available",
  ).length;
  const lowStockCount = inventoryData.filter(
    (r) => r.stockStatus === "Low Stock",
  ).length;
  const outOfStockCount = inventoryData.filter(
    (r) => r.stockStatus === "Out of Stock",
  ).length;

  const getInventoryList = async (size?: number) => {
    try {
      setIsLoading(true);
      const response = await InventoryService.getInventory({
        order: "asc",
        page,
        limit: size ?? 10,
        search: query,
        sort,
        sortBy,
      });
      setListBarang(response.data.data);
      setTotal(response.data.total_records);
      setTotalPages(response.data.total_pages);
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

  const formik = useFormik<any>({
    initialValues: {
      nama: isModify ? barang.nama : "",
      detail: isModify ? barang.detail : "",
      code: isModify ? barang.code : "",
      kategori_id: isModify ? barang.kategori_id.toString() : "",
      satuan_id: isModify ? barang.satuan_id.toString() : "",
      stok: isModify ? barang.stok_barang.toString() : "",
      panjang: isModify ? barang.panjang : "",
      lebar: isModify ? barang.lebar : "",
      tinggi: isModify ? barang.tinggi : "",
      berat: isModify ? barang.berat : "",
      lantai: isModify ? barang.lantai : "",
      lorong: isModify ? barang.lorong : "",
      rack: isModify ? barang.rack : "",
    },
    validationSchema: Yup.object({
      nama: Yup.string().required("Required"),
      code: Yup.string().required("Required"),
      kategori_id: Yup.string().required("Required"),
      satuan_id: Yup.string().required("Required"),
      stok: Yup.string().required("Required"),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setIsLoading(true);
      const payload = {
        ...values,
        satuan_id: Number(values.satuan_id),
        kategori_id: Number(values.kategori_id),
        stok: Number(values.stok),
      };
      if (isModify) {
        try {
          const result: APIResponse<any> = await InventoryService.editBarang({
            ...payload,
            id: barang.id,
            ...(base64 && { photo: base64?.split(",")[1] as string }),
          });
          if (result.success) {
            setTimeout(() => {
              setModalOpen(false);
            }, 200);
            toast("Success modify inventory", { type: "success" });
            setIsModify(false);
            setBase64("");
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
          const result: APIResponse<any> = await InventoryService.addBarang({
            ...payload,
            photo: base64?.split(",")[1] as string,
          });
          if (result.success) {
            setTimeout(() => {
              setModalOpen(false);
            }, 200);
            toast("Success adding inventory", { type: "success" });
            setIsModify(false);
            setBase64("");
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
      }
    },
  });

  const handleAITuneUp = async (r: any) => {
    if (!r.nama) {
      toast("Nama produk harus diisi sebelum menggunakan AI tune-up.", {
        type: "warning",
      });
      return;
    }
    if (!r.photo) {
      toast("Foto produk harus diupload sebelum menggunakan AI tune-up.", {
        type: "warning",
      });
      return;
    }

    const photoUrl = isValidUrl(r.photo)
      ? r.photo?.replace("http://66.42.48.163:9000/booqable/", STORAGE_BOOQABLE)
      : `https://democreation.site/home/public/${r.photo}`;

    setAiTuneup({
      open: true,
      loading: true,
      saving: false,
      barang: r,
      edited: {
        detail: r.detail || "",
        harga_rata_rata: r.harga_rata_rata || "",
        cara_pemakaian: r.cara_pemakaian || "",
        hal_perlu_diperhatikan: r.hal_perlu_diperhatikan || "",
      },
    });

    try {
      const result = await AiService.tuneUpProduct({
        nama: r.nama,
        photo_url: photoUrl,
        detail: r.detail || "",
        kategori: r?.kategori_barang?.name || "",
      });
      setAiTuneup((prev) => ({
        ...prev,
        loading: false,
        edited: {
          detail: result.detail ?? "",
          harga_rata_rata: result.harga_rata_rata ?? "",
          cara_pemakaian: result.cara_pemakaian ?? "",
          hal_perlu_diperhatikan: result.hal_perlu_diperhatikan ?? "",
        },
      }));
    } catch (err) {
      setAiTuneup((prev) => ({ ...prev, loading: false }));
      toast(err instanceof Error ? err.message : "Gagal menghubungi AI.", {
        type: "error",
      });
    }
  };

  const handleSaveAITuneUp = async () => {
    if (!aiTuneup.barang) return;
    setAiTuneup((prev) => ({ ...prev, saving: true }));
    try {
      await InventoryService.editBarangAITuneUp({
        id: aiTuneup.barang.id,
        ...aiTuneup.edited,
      });
      setAiTuneup({
        open: false,
        loading: false,
        saving: false,
        barang: null,
        edited: emptyAiEdited,
      });
      toast("AI tune-up berhasil disimpan!", { type: "success" });
      getInventoryList();
    } catch {
      setAiTuneup((prev) => ({ ...prev, saving: false }));
      toast("Gagal menyimpan data.", { type: "error" });
    }
  };

  useEffect(() => {
    getInventoryList();
  }, [page, sort, sortBy]);

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
          Inventory
        </h1>
        <button
          className="btn-new"
          onClick={() => {
            setModalOpen(true);
            formik.resetForm();
          }}
        >
          <IconPlus /> New Item
        </button>
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
            label: "Available",
            value: total,
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: "Low Stock",
            value: 0,
            color: "var(--orange)",
            bg: "var(--orange-bg)",
          },
          {
            label: "Out of Stock",
            value: 0,
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

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder="Search name or SKU…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="wi-select-wrap">
              <select
                value={catFilter}
                onChange={(e) => {
                  setCatFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categoryOptions.map((c: any) => (
                  <option key={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="wi-select-wrap">
              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Status</option>
                {stockStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <button
              className="btn-search"
              onClick={() => {
                setPage(1);
                getInventoryList();
              }}
            >
              Search
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className="btn-new"
              onClick={() => {
                setModalOpen(true);
                formik.resetForm();
              }}
            >
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
                  id="nama"
                />
                <SortTh
                  label="SKU"
                  colIndex={1}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 90 }}
                  id="code"
                />
                <SortTh
                  label="Category"
                  colIndex={2}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 105 }}
                  id="category"
                />
                <SortTh
                  label="Unit"
                  colIndex={3}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 70 }}
                  id="satuan"
                />
                <SortTh
                  label="Warehouse"
                  colIndex={4}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ minWidth: 120 }}
                  id="warehouse"
                />
                <SortTh
                  label="Total Stock"
                  colIndex={5}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 90, textAlign: "right" }}
                  id="stok_all"
                />
                <SortTh
                  label="Status"
                  colIndex={6}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 110 }}
                />
                <SortTh
                  label="Updated At"
                  colIndex={7}
                  sortCol={sortCol}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                  style={{ width: 100 }}
                  id="updated_at"
                />
                <th style={{ width: 60, textAlign: "center" }}>Image</th>
                <th style={{ width: 80, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {listBarang.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                    <td className="name-cell">{r.nama}</td>
                    <td className="id-cell">{r.code}</td>
                    <td>
                      <span
                        className="badge badge-gray"
                        style={{ fontSize: "10.5px" }}
                      >
                        {r?.kategori_barang?.name ??
                          categoryOptions?.find(
                            (el: any) => Number(el.value) === r?.kategori_id,
                          )?.label ??
                          ""}
                      </span>
                    </td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12.5px" }}
                    >
                      {r?.satuan?.name}
                    </td>
                    <td>
                      {" "}
                      {r?.barang_gudang?.length
                        ? r?.barang_gudang[0]?.gudang?.nama
                        : "-"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {r.stok_barang}
                    </td>
                    <td>{stockBadge("Available")}</td>
                    <td
                      style={{ color: "var(--text-muted)", fontSize: "12.5px" }}
                    >
                      {r.updated_at
                        ? moment(r.updated_at as any).format(
                            "D MMM YYYY, HH:MM",
                          )
                        : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <ImgCell
                        src={
                          isValidUrl(r.photo)
                            ? r.photo?.replace(
                                "http://66.42.48.163:9000/booqable/",
                                STORAGE_BOOQABLE,
                              )
                            : r.photo
                              ? `https://democreation.site/home/public/${r.photo}`
                              : noImage
                        }
                        name={r.nama}
                        onClick={() =>
                          setImgPopup({
                            open: true,
                            name: r.nama,
                            src: isValidUrl(r.photo)
                              ? r.photo?.replace(
                                  "http://66.42.48.163:9000/booqable/",
                                  STORAGE_BOOQABLE,
                                )
                              : r.photo
                                ? `https://democreation.site/home/public/${r.photo}`
                                : noImage,
                          })
                        }
                      />
                    </td>
                    <td>
                      <div
                        className="action-btns"
                        style={{ justifyContent: "center" }}
                      >
                        <button
                          className="btn-icon"
                          title="AI Tune-Up"
                          style={{ color: "#7c3aed" }}
                          onClick={() => handleAITuneUp(r)}
                        >
                          <IconMagic />
                        </button>
                        <button
                          className="btn-icon"
                          title="View Detail"
                          style={{ color: "var(--brand)" }}
                          onClick={() =>
                            navigate(`/inventory-detail?id=${r.id}`)
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: 14, height: 14 }}
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon edit"
                          title="Edit"
                          onClick={() => {
                            setBarang(r);
                            setIsModify(true);
                            setModalOpen(true);
                          }}
                        >
                          <IconEdit />
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
          currentPage={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={(p: any) => setPage(p)}
          label="items"
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={isModify ? "Edit Inventory" : "New Inventory"}
        onClose={() => setModalOpen(false)}
        size="xl"
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => {
                setModalOpen(false);
                formik.resetForm();
              }}
            >
              <IconClose /> Cancel
            </button>
            <button
              className="btn-save-modal"
              onClick={() => formik.handleSubmit()}
              type="button"
            >
              <IconCheck /> Save Inventory
            </button>
          </>
        }
      >
        {/* GENERAL */}
        <TextInput
          value={formik.values.nama}
          onChange={(e) => formik.setFieldValue("nama", e)}
          isRequired
          label="Name"
          placeholder="e.g. Table"
          errorText={formik.errors.nama as string}
        />
        <TextArea
          value={formik.values.description}
          onChange={(e) => formik.setFieldValue("description", e)}
          label="Description"
          placeholder="Short description (optional)"
        />

        {/* DETAILS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "20px 0 16px",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--green)",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: ".07em",
              textTransform: "uppercase",
            }}
          >
            Details
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div className="form-row">
          <TextInput
            value={formik.values.code}
            onChange={(e) => formik.setFieldValue("code", e)}
            isRequired
            label="Item Code"
            placeholder="Code"
            errorText={formik.errors.code as string}
          />
          <TextInput
            value={formik.values.stok}
            onChange={(e) => formik.setFieldValue("stok", e)}
            isRequired
            label="Stock"
            placeholder="Item stock"
            errorText={formik.errors.stok as string}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>
              Unit <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              onChange={(e) =>
                formik.setFieldValue("satuan_id", e.target.value)
              }
              value={formik.values.satuan_id}
              style={{
                ...(formik.errors.satuan_id && {
                  borderWidth: 1,
                  borderColor: "var(--red)",
                }),
              }}
            >
              <option value="">— Select Unit —</option>
              {unitOptions.map((n: ISelect) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
            {(formik.errors.satuan_id as string)?.trim() && (
              <span style={{ color: "var(--red)", fontSize: 12 }}>
                {formik.errors.satuan_id as string}
              </span>
            )}
          </div>
          <div className="form-group">
            <label>
              Unit <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <select
              onChange={(e) =>
                formik.setFieldValue("kategori_id", e.target.value)
              }
              value={formik.values.kategori_id}
              style={{
                ...(formik.errors.kategori_id && {
                  borderWidth: 1,
                  borderColor: "var(--red)",
                }),
              }}
            >
              <option value="">— Select Kategori —</option>
              {categoryOptions.map((n: ISelect) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
            {(formik.errors.kategori_id as string)?.trim() && (
              <span style={{ color: "var(--red)", fontSize: 12 }}>
                {formik.errors.kategori_id as string}
              </span>
            )}
          </div>
        </div>
        <div className="form-row" style={{ alignItems: "flex-start" }}>
          <div className="form-group">
            <label>Image</label>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              style={{ display: "none" }}
              onChange={(e: any) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setBase64(ev?.target?.result as any);
                reader.readAsDataURL(file);
              }}
            />
            <div
              onClick={() => imgInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border)",
                borderRadius: 10,
                padding: "20px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "var(--bg)",
                gap: 8,
                minHeight: 130,
                transition: "border-color .15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--brand)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              {base64 ? (
                <img
                  src={base64}
                  alt="preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 120,
                    borderRadius: 6,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: "var(--brand-bg)",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--brand)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 22, height: 22 }}
                    >
                      <polyline points="16 16 12 12 8 16" />
                      <line x1="12" y1="12" x2="12" y2="21" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    Click to upload image
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    PNG, JPG, GIF up to 10MB
                  </span>
                </>
              )}
            </div>
            {base64 && (
              <button
                onClick={() => setBase64("")}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "var(--red)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Remove image
              </button>
            )}
          </div>
        </div>
      </Modal>

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup((p) => ({ ...p, open: false }))}
      />

      {/* AI Tune-Up Modal */}
      {aiTuneup.open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !aiTuneup.saving)
              setAiTuneup((prev) => ({ ...prev, open: false }));
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
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
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#f3f0ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconMagic fill="var(--brand)" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text)",
                  }}
                >
                  AI Tune-Up Produk
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 1,
                  }}
                >
                  {aiTuneup.barang?.nama}
                </div>
              </div>
              {!aiTuneup.saving && (
                <button
                  className="modal-close"
                  onClick={() =>
                    setAiTuneup((prev) => ({ ...prev, open: false }))
                  }
                >
                  <IconClose />
                </button>
              )}
            </div>

            {/* Body */}
            <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
              {aiTuneup.loading ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      textAlign: "center",
                      padding: "8px 0",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="2"
                      style={{
                        width: 20,
                        height: 20,
                        animation: "spin 1s linear infinite",
                        display: "inline-block",
                        verticalAlign: "middle",
                        marginRight: 6,
                      }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    AI sedang menganalisa produk...
                  </div>
                  {[80, 100, 60, 90, 70, 85].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        height: i % 2 === 0 ? 36 : 60,
                        width: `${w}%`,
                        background: "var(--bg)",
                        borderRadius: 6,
                        animation: "pulse 1.4s ease-in-out infinite",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* Deskripsi */}
                  <div className="form-group">
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      Deskripsi Produk
                      <span
                        className="badge badge-purple"
                        style={{ fontSize: 10 }}
                      >
                        AI
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={aiTuneup.edited.detail}
                      onChange={(e) =>
                        setAiTuneup((prev) => ({
                          ...prev,
                          edited: { ...prev.edited, detail: e.target.value },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        background: "var(--bg)",
                      }}
                    />
                  </div>

                  {/* Harga Rata-rata */}
                  <div className="form-group">
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      Harga Rata-Rata Pasar
                      <span
                        className="badge badge-purple"
                        style={{ fontSize: 10 }}
                      >
                        AI
                      </span>
                    </label>
                    <input
                      type="text"
                      value={aiTuneup.edited.harga_rata_rata}
                      onChange={(e) =>
                        setAiTuneup((prev) => ({
                          ...prev,
                          edited: {
                            ...prev.edited,
                            harga_rata_rata: e.target.value,
                          },
                        }))
                      }
                      placeholder="contoh: Rp 150.000 - Rp 250.000 / pcs"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        background: "var(--bg)",
                      }}
                    />
                  </div>

                  {/* Cara Pemakaian */}
                  <div className="form-group">
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      Cara Pemakaian
                      <span
                        className="badge badge-purple"
                        style={{ fontSize: 10 }}
                      >
                        AI
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={aiTuneup.edited.cara_pemakaian}
                      onChange={(e) =>
                        setAiTuneup((prev) => ({
                          ...prev,
                          edited: {
                            ...prev.edited,
                            cara_pemakaian: e.target.value,
                          },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        background: "var(--bg)",
                      }}
                    />
                  </div>

                  {/* Hal Perlu Diperhatikan */}
                  <div className="form-group">
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      Hal yang Perlu Diperhatikan
                      <span
                        className="badge badge-purple"
                        style={{ fontSize: 10 }}
                      >
                        AI
                      </span>
                    </label>
                    <textarea
                      rows={4}
                      value={aiTuneup.edited.hal_perlu_diperhatikan}
                      onChange={(e) =>
                        setAiTuneup((prev) => ({
                          ...prev,
                          edited: {
                            ...prev.edited,
                            hal_perlu_diperhatikan: e.target.value,
                          },
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "inherit",
                        resize: "vertical",
                        background: "var(--bg)",
                      }}
                    />
                  </div>

                  <p
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    Kamu bisa edit hasil AI sebelum disimpan.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {!aiTuneup.loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  padding: "14px 20px",
                  borderTop: "1px solid var(--border)",
                  flexShrink: 0,
                }}
              >
                <button
                  className="btn-cancel-modal"
                  onClick={() =>
                    setAiTuneup((prev) => ({ ...prev, open: false }))
                  }
                  disabled={aiTuneup.saving}
                >
                  <IconClose /> Batal
                </button>
                <button
                  className="btn-save-modal"
                  onClick={handleSaveAITuneUp}
                  disabled={aiTuneup.saving}
                  style={{
                    background: "#7c3aed",
                    opacity: aiTuneup.saving ? 0.65 : 1,
                  }}
                >
                  {aiTuneup.saving ? (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          width: 13,
                          height: 13,
                          animation: "spin 1s linear infinite",
                        }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <IconCheck /> Simpan ke Inventori
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  );
}
