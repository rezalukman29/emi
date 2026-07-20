import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import {
  IconSearch,
  IconPlus,
  IconDelete,
  IconClose,
  IconCheck,
  IconCart,
  IconPrint,
  IconBarChart,
} from "../components/icons";
import useGetBarangGudang, {
  type BarangGudangItem,
} from "../hooks/api/useGetBarangGudang";
import useGetAreaList from "../hooks/api/useGetAreaList";
import useGetEventItem, { type EventItem } from "../hooks/api/useGetEventItem";
import useGetSubArea from "../hooks/api/useGetSubArea";
import { STORAGE_BOOQABLE, isValidUrl, noImage } from "../utils/function";

const STATUSES = ["Preparation", "During Event", "After Event"] as const;

const AREA_BADGE_CLASS: Record<string, string> = {
  CEREMONY: "ceremony",
  PHOTOBOOTH: "photobooth",
  RECEPTION: "reception",
  ENTRANCE: "entrance",
  "GUEST TABLE": "guest",
};

interface DisplayItem {
  id: number;
  photo: string;
  name: string;
  area: string;
  status: string;
  qty: number;
  pic: string;
  checking: boolean;
  warehouseItem: boolean;
  scanIn: string | null;
  scanOut: string | null;
  note: string;
}

interface CartItem {
  itemId: number | null;
  barangGudangId?: number;
  barangId?: number;
  photo: string;
  name: string;
  status: string;
  areaId?: number;
  area: string;
  subAreaId?: number;
  subArea?: string;
  qty: number;
  note: string;
}

interface ItemCardProps {
  item: DisplayItem;
  onScan: (id: number) => void;
  onDelete: (id: number) => void;
}

interface AreaItem {
  id: number;
  description: string;
  name: string;
  pic: string;
  total_sub_area: number;
  created_at: string;
  updated_at: string;
}

function formatApiDate(value: EventItem["scan_in_date"]): string | null {
  if (!value.Valid || value.Time.startsWith("0001-01-01")) return null;

  return new Date(value.Time).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatusName(statusId: number): string {
  if (statusId === 2) return "During Event";
  if (statusId === 3) return "After Event";
  return "Preparation";
}

function getPhotoUrl(photo: string): string {
  return isValidUrl(photo)
    ? photo?.replace("http://66.42.48.163:9000/booqable/", STORAGE_BOOQABLE)
    : photo
      ? `https://democreation.site/home/public/${photo}`
      : noImage;
}

function mapEventItem(item: EventItem): DisplayItem {
  return {
    id: item.id,
    photo: getPhotoUrl(item.photo),
    name: item.nama_barang,
    area: item.area_name || item.sub_list_name || "-",
    status: getStatusName(item.event_status_id),
    qty: item.qty,
    pic: item.input_by,
    checking: item.is_checking.Valid && item.is_checking.Int64 === 1,
    warehouseItem:
      item.is_ware_house_item.Valid && item.is_ware_house_item.Int64 === 1,
    scanIn: formatApiDate(item.scan_in_date),
    scanOut: formatApiDate(item.scan_out_date),
    note: item.notes,
  };
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2 6 5 9 10 3" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="9" y1="3" x2="3" y2="9" />
      <line x1="3" y1="3" x2="9" y2="9" />
    </svg>
  );
}

function ImagePlaceholder({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="item-img-placeholder">
      <img
        src={src}
        alt={alt}
        className="item-img"
        onError={(event) => {
          event.currentTarget.src = noImage;
        }}
      />
    </div>
  );
}

function ItemCard({ item, onScan, onDelete }: ItemCardProps) {
  return (
    <div className="item-card">
      <ImagePlaceholder src={item.photo} alt={item.name} />
      <div className="item-body">
        <span className={`area-badge ${AREA_BADGE_CLASS[item.area] || "ceremony"}`}>
          {item.area}
        </span>
        <div className="item-name-row">
          <span className="item-name">{item.name}</span>
          <span className="item-qty">Qty: {item.qty}</span>
        </div>
        <div className="item-pic">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 12, height: 12 }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {item.pic || "-"}
        </div>
        <div className="item-indicators">
          <div className="indicator-row">
            <span className={`indicator-box${item.checking ? " checked" : ""}`}>
              {item.checking && <CheckIcon />}
            </span>
            Checking
          </div>
          <div className="indicator-row">
            <span className={`indicator-box${item.warehouseItem ? " checked" : ""}`}>
              {item.warehouseItem && <CheckIcon />}
            </span>
            Warehouse Item
          </div>
        </div>
        <div className="scan-rows">
          <div className="scan-row">
            <span className={`scan-badge ${item.scanIn ? "ok" : "fail"}`}>
              {item.scanIn ? <CheckIcon /> : <XIcon />}
            </span>
            <span
              className="scan-label-text"
              style={!item.scanIn ? { color: "#9aa0b8" } : {}}
            >
              {item.scanIn ? `Scanned In at ${item.scanIn}` : "Scan In"}
            </span>
          </div>
          <div className="scan-row">
            <span className={`scan-badge ${item.scanOut ? "ok" : "fail"}`}>
              {item.scanOut ? <CheckIcon /> : <XIcon />}
            </span>
            <span
              className="scan-label-text"
              style={!item.scanOut ? { color: "#9aa0b8" } : {}}
            >
              {item.scanOut ? `Scanned Out at ${item.scanOut}` : "Scan Out"}
            </span>
          </div>
        </div>
        {item.note && <div className="item-note">{item.note}</div>}
        <div className="item-actions">
          <div className="item-actions-row">
            <button className="btn-ia-pkg" title="Packaging">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            </button>
            <button className="btn-ia-scan" onClick={() => onScan(item.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h.01M14 17h3v3M17 14h3" /></svg>
              Scan
            </button>
            <button className="btn-ia-del" title="Hapus" onClick={() => onDelete(item.id)}>
              <IconDelete />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = Number(searchParams.get("id"));
  const eventName = searchParams.get("name") || "03/06/2023 | GUNTUR + CLARISSA";

  const { data: eventItemResponse, isLoading, isError } = useGetEventItem({
    params: { event_id: eventId, order: "asc" },
    options: {
      enabled: !!eventId,
    },
  });

  const [createdItems, setCreatedItems] = useState<DisplayItem[]>([]);
  const [hiddenItemIds, setHiddenItemIds] = useState<number[]>([]);
  const [scanOverrides, setScanOverrides] = useState<Record<number, Pick<DisplayItem, "scanIn" | "scanOut">>>({});
  const [nextId, setNextId] = useState(-1);

  const [selectedArea, setSelectedArea] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [areaDropOpen, setAreaDropOpen] = useState(false);
  const [kwSearch, setKwSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [atcOpen, setAtcOpen] = useState(false);
  const [atcTargetId, setAtcTargetId] = useState<number | null>(null);
  const [atcForm, setAtcForm] = useState({ status: "Preparation", area: "ENTRANCE", qty: 1, note: "" });

  const [newItemOpen, setNewItemOpen] = useState(false);
  const [selectedBarangGudang, setSelectedBarangGudang] =
    useState<BarangGudangItem | null>(null);
  const [newItemForm, setNewItemForm] = useState({
    areaId: "",
    subAreaId: "",
    status: "Preparation",
    qty: 1,
  });

  const {
    data: areaListResponse,
    isLoading: isAreaListLoading,
    isError: isAreaListError,
  } = useGetAreaList({
    options: {
      enabled: newItemOpen,
    },
  });

  const {
    data: subAreaResponse,
    isLoading: isSubAreaLoading,
    isError: isSubAreaError,
  } = useGetSubArea({
    params: { page: 1, limit: 999 },
    options: {
      enabled: newItemOpen,
    },
  });

  const {
    data: barangGudangResponse,
    isLoading: isBarangGudangLoading,
    isError: isBarangGudangError,
  } = useGetBarangGudang({
    params: { page: 1, limit: 30 },
    options: {
      enabled: newItemOpen,
    },
  });

  const items = useMemo(() => {
    const apiItems = eventItemResponse?.data ?? [];
    const visibleApiItems = apiItems
      .map(mapEventItem)
      .filter((item) => !hiddenItemIds.includes(item.id))
      .map((item) => ({ ...item, ...scanOverrides[item.id] }));

    return [...visibleApiItems, ...createdItems];
  }, [createdItems, eventItemResponse?.data, hiddenItemIds, scanOverrides]);

  const areas = useMemo(
    () => [...new Set(items.map((item) => item.area).filter(Boolean))].sort(),
    [items]
  );

  const barangGudangItems = useMemo(
    () => barangGudangResponse?.data ?? [],
    [barangGudangResponse?.data]
  );

  const masterAreas = useMemo<AreaItem[]>(
    () => areaListResponse?.data?.data ?? [],
    [areaListResponse?.data?.data]
  );

  const filteredSubAreas = useMemo(() => {
    const selectedAreaId = Number(newItemForm.areaId);

    return (subAreaResponse?.data?.data ?? []).filter(
      (subArea) => subArea.area_id === selectedAreaId
    );
  }, [newItemForm.areaId, subAreaResponse?.data?.data]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (selectedArea && item.area !== selectedArea) return false;
        if (selectedStatus && item.status !== selectedStatus) return false;
        if (
          kwSearch &&
          !item.name.toLowerCase().includes(kwSearch.toLowerCase()) &&
          !item.area.toLowerCase().includes(kwSearch.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [items, kwSearch, selectedArea, selectedStatus]
  );

  const areaLabel = selectedArea || "All Place";
  const statusLabel = selectedStatus || "All Status";

  function getNowLabel() {
    return new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function doScan(id: number) {
    const now = getNowLabel();
    const updateScan = (item: DisplayItem) => {
      if (item.id !== id) return item;
      if (!item.scanIn) return { ...item, scanIn: now };
      if (!item.scanOut) return { ...item, scanOut: now };
      return item;
    };

    setCreatedItems((currentItems) => currentItems.map(updateScan));
    setScanOverrides((currentOverrides) => {
      const item = items.find((currentItem) => currentItem.id === id);
      if (!item || createdItems.some((currentItem) => currentItem.id === id)) return currentOverrides;

      const currentScan = currentOverrides[id] ?? {
        scanIn: item.scanIn,
        scanOut: item.scanOut,
      };

      return {
        ...currentOverrides,
        [id]: {
          scanIn: currentScan.scanIn || now,
          scanOut: currentScan.scanIn ? currentScan.scanOut || now : currentScan.scanOut,
        },
      };
    });
  }

  function deleteItem(id: number) {
    if (!window.confirm("Hapus item ini dari event?")) return;
    setCreatedItems((currentItems) => currentItems.filter((item) => item.id !== id));
    setHiddenItemIds((currentIds) => (id > 0 ? [...currentIds, id] : currentIds));
  }

  function openAtcModal(id: number) {
    const item = items.find((currentItem) => currentItem.id === id);
    if (!item) return;

    setAtcTargetId(id);
    setAtcForm({ status: item.status, area: item.area, qty: item.qty, note: "" });
    setAtcOpen(true);
  }

  function confirmAddToCart() {
    const item = items.find((currentItem) => currentItem.id === atcTargetId);
    if (!item) return;

    setCart((currentCart) => {
      const existing = currentCart.find(
        (cartItem) =>
          cartItem.itemId === atcTargetId &&
          cartItem.status === atcForm.status &&
          cartItem.area === atcForm.area
      );

      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem === existing
            ? { ...cartItem, qty: cartItem.qty + atcForm.qty }
            : cartItem
        );
      }

      return [
        ...currentCart,
        {
          itemId: atcTargetId,
          photo: item.photo,
          name: item.name,
          status: atcForm.status,
          area: atcForm.area,
          qty: atcForm.qty,
          note: atcForm.note,
        },
      ];
    });
    setAtcOpen(false);
  }

  function removeCartItem(idx: number) {
    setCart((currentCart) => currentCart.filter((_, itemIndex) => itemIndex !== idx));
  }

  function checkout() {
    setCart([]);
    setCartOpen(false);
  }

  function saveNewItem() {
    const selectedArea = masterAreas.find(
      (area) => String(area.id) === newItemForm.areaId
    );
    const selectedSubArea = filteredSubAreas.find(
      (subArea) => String(subArea.id) === newItemForm.subAreaId
    );
    if (!selectedBarangGudang || !selectedArea || !selectedSubArea) return;

    setCart((currentCart) => [
      ...currentCart,
      {
        itemId: null,
        barangGudangId: selectedBarangGudang.barang_gudang_id,
        barangId: selectedBarangGudang.barang_id,
        photo: getPhotoUrl(selectedBarangGudang.photo),
        name: selectedBarangGudang.nama_barang,
        status: newItemForm.status,
        areaId: selectedArea.id,
        area: selectedArea.name,
        subAreaId: selectedSubArea.id,
        subArea: selectedSubArea.sub_area_name,
        qty: newItemForm.qty,
        note: "",
      },
    ]);
    setSelectedBarangGudang(null);
    setNewItemForm({
      areaId: "",
      subAreaId: "",
      status: "Preparation",
      qty: 1,
    });
    setNewItemOpen(false);
  }

  const canSaveNewItem =
    !!selectedBarangGudang && !!newItemForm.areaId && !!newItemForm.subAreaId;

  return (
    <>
      <h1 className="page-title">Event Detail</h1>
      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => navigate("/event")} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "12.5px", color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6" /></svg>
            Kembali ke Event
          </button>
        </div>

        <div className="event-heading">{eventName}</div>

        <div className="filter-row">
          <div className="custom-select" style={{ flex: 1 }}>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            <span className="chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          </div>

          <div className="dropdown-wrap" style={{ flex: 1, position: "relative", minWidth: 190 }}>
            <div className={`dropdown-trigger${areaDropOpen ? " open" : ""}`} onClick={() => setAreaDropOpen((open) => !open)}>
              <span>{areaLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </div>
            {areaDropOpen && (
              <div className="dropdown-menu open">
                <div className={`dropdown-item${!selectedArea ? " selected" : ""}`} onClick={() => { setSelectedArea(""); setAreaDropOpen(false); }}>All Area</div>
                {areas.map((area) => (
                  <div key={area} className={`dropdown-item${selectedArea === area ? " selected" : ""}`} onClick={() => { setSelectedArea(area); setAreaDropOpen(false); }}>{area}</div>
                ))}
              </div>
            )}
          </div>

          <div className="filter-row-right">
            <button className="btn btn-check" onClick={() => {}}>
              <IconSearch /> Check
            </button>
            <button className="btn" style={{ background: "var(--purple)", color: "#fff" }} onClick={() => navigate(`/event-summary?name=${encodeURIComponent(eventName)}`)}>
              <IconBarChart /> Summary
            </button>
            <button className="btn btn-print" onClick={() => window.print()}><IconPrint /> Print</button>
          </div>
        </div>

        <div className="search-row">
          <div className="search-wrap">
            <IconSearch />
            <input className="search-input" type="text" placeholder="Keyword Search" value={kwSearch} onChange={(event) => setKwSearch(event.target.value)} />
          </div>
          <div className="search-row-right">
            <button className="btn btn-pkg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
              Packaging
            </button>
            <button className="btn btn-cart" onClick={() => setCartOpen(true)}>
              <IconCart /> Cart ({cart.length})
            </button>
            <button className="btn-new" onClick={() => { setSelectedBarangGudang(null); setNewItemForm({ areaId: "", subAreaId: "", status: "Preparation", qty: 1 }); setNewItemOpen(true); }}>
              <IconPlus /> New
            </button>
          </div>
        </div>

        <p className="summary-text">
          <strong>{filtered.length}</strong> pcs item untuk state <strong>&ldquo;{statusLabel}&rdquo;</strong> di Area <strong>&ldquo;{areaLabel}&rdquo;</strong>
        </p>

        {isLoading ? (
          <div className="no-data">Loading...</div>
        ) : isError ? (
          <div className="no-data">Gagal memuat data item event.</div>
        ) : filtered.length === 0 ? (
          <div className="no-data">No Data</div>
        ) : (
          <div className="items-grid">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} onScan={doScan} onDelete={deleteItem} />
            ))}
          </div>
        )}
      </div>

      <Modal open={atcOpen} title="Tambah ke Keranjang" onClose={() => setAtcOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setAtcOpen(false)}><IconClose /> Batal</button>
            <button className="btn-add-cart" onClick={confirmAddToCart}><IconCart /> Tambah ke Keranjang</button>
          </>
        }
      >
        <div className="atc-item-name">{items.find((item) => item.id === atcTargetId)?.name}</div>
        <div className="form-row">
          <div className="form-group">
            <label>Status / State</label>
            <select value={atcForm.status} onChange={(event) => setAtcForm((form) => ({ ...form, status: event.target.value }))}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Area</label>
            <select value={atcForm.area} onChange={(event) => setAtcForm((form) => ({ ...form, area: event.target.value }))}>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Qty</label>
            <input type="number" min={1} value={atcForm.qty} onChange={(event) => setAtcForm((form) => ({ ...form, qty: parseInt(event.target.value, 10) || 1 }))} />
          </div>
          <div className="form-group">
            <label>Catatan</label>
            <input type="text" placeholder="Opsional" value={atcForm.note} onChange={(event) => setAtcForm((form) => ({ ...form, note: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal open={cartOpen} title="Keranjang Event" onClose={() => setCartOpen(false)} size="wide"
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setCartOpen(false)}>Tutup</button>
            <button className="btn-checkout" onClick={checkout}><IconCheck /> Simpan ke Event</button>
          </>
        }
      >
        {cart.length === 0 ? (
          <div className="cart-empty">Keranjang masih kosong</div>
        ) : (
          <div className="cart-list">
            {cart.map((cartItem, index) => (
              <div
                key={`${cartItem.barangGudangId ?? cartItem.itemId}-${cartItem.areaId ?? cartItem.area}-${cartItem.subAreaId ?? cartItem.subArea}-${index}`}
                className="cart-item"
              >
                <img
                  src={cartItem.photo}
                  alt={cartItem.name}
                  className="cart-item-img"
                  onError={(event) => {
                    event.currentTarget.src = noImage;
                  }}
                />
                <div className="cart-item-info">
                  <div className="cart-item-name">{cartItem.name}</div>
                  <div className="cart-item-meta">
                    <span>Qty: {cartItem.qty}</span>
                    <span>Area: {cartItem.area}</span>
                    <span>Sub Area: {cartItem.subArea || "-"}</span>
                    <span>Status: {cartItem.status}</span>
                  </div>
                </div>
                <button className="cart-item-remove" onClick={() => removeCartItem(index)}>
                  <IconDelete />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={newItemOpen} title="Tambah Item Baru" onClose={() => setNewItemOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setNewItemOpen(false)}>Batal</button>
            <button className="btn-add-cart" style={{ background: "#16a34a", opacity: canSaveNewItem ? 1 : 0.6 }} onClick={saveNewItem} disabled={!canSaveNewItem}><IconCheck /> Simpan</button>
          </>
        }
      >
        <div className="form-group">
          <label>Pilih Barang</label>
          <div className="event-master-item-list">
            {isBarangGudangLoading ? (
              <div className="event-master-item-empty">Loading barang...</div>
            ) : isBarangGudangError ? (
              <div className="event-master-item-empty">Gagal memuat barang.</div>
            ) : barangGudangItems.length === 0 ? (
              <div className="event-master-item-empty">Barang tidak tersedia.</div>
            ) : (
              barangGudangItems.map((barang) => {
                const isSelected =
                  selectedBarangGudang?.barang_gudang_id === barang.barang_gudang_id;

                return (
                  <button
                    key={barang.barang_gudang_id}
                    type="button"
                    className={`event-master-item${isSelected ? " selected" : ""}`}
                    onClick={() => setSelectedBarangGudang(barang)}
                  >
                    <img
                      src={getPhotoUrl(barang.photo)}
                      alt={barang.nama_barang}
                      className="event-master-item-img"
                      onError={(event) => {
                        event.currentTarget.src = noImage;
                      }}
                    />
                    <div className="event-master-item-info">
                      <span className="event-master-item-name">{barang.nama_barang}</span>
                      <span className="event-master-item-stock">Stok: {barang.stok_barang}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Area</label>
            <select
              value={newItemForm.areaId}
              onChange={(event) =>
                setNewItemForm((form) => ({
                  ...form,
                  areaId: event.target.value,
                  subAreaId: "",
                }))
              }
            >
              <option value="">
                {isAreaListLoading
                  ? "Loading area..."
                  : isAreaListError
                    ? "Gagal memuat area"
                    : "Pilih area"}
              </option>
              {masterAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Sub Area</label>
            <select
              value={newItemForm.subAreaId}
              disabled={!newItemForm.areaId || isSubAreaLoading}
              onChange={(event) =>
                setNewItemForm((form) => ({
                  ...form,
                  subAreaId: event.target.value,
                }))
              }
            >
              <option value="">
                {!newItemForm.areaId
                  ? "Pilih area dulu"
                  : isSubAreaLoading
                    ? "Loading sub area..."
                    : isSubAreaError
                      ? "Gagal memuat sub area"
                      : filteredSubAreas.length === 0
                        ? "Sub area tidak tersedia"
                        : "Pilih sub area"}
              </option>
              {filteredSubAreas.map((subArea) => (
                <option key={subArea.id} value={subArea.id}>
                  {subArea.sub_area_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={newItemForm.status} onChange={(event) => setNewItemForm((form) => ({ ...form, status: event.target.value }))}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Qty</label>
            <input type="number" min={1} value={newItemForm.qty} onChange={(event) => setNewItemForm((form) => ({ ...form, qty: parseInt(event.target.value, 10) || 1 }))} />
          </div>
        </div>
      </Modal>
    </>
  );
}
