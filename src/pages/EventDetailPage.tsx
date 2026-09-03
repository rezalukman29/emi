import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import Stepper from "../components/Stepper";
import SearchableSelect from "../components/SearchableSelect";
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
import useGetBarangGudangV2, {
  type BarangGudangItemV2,
  type BarangGudangWarehouseV2,
} from "../hooks/api/useGetBarangGudangV2";
import useGetAreaList from "../hooks/api/useGetAreaList";
import useCreateFixEventList from "../hooks/api/useCreateFixEventList";
import useCreateFixListItem from "../hooks/api/useCreateFixListItem";
import useGetEventItem, { type EventItem } from "../hooks/api/useGetEventItem";
import useGetSubArea from "../hooks/api/useGetSubArea";
import { STORAGE_BOOQABLE, isValidUrl, noImage } from "../utils/function";
import { useWarehouseController } from "./lib/useWarehouseController";
import { useCategoryController } from "./lib/useCategoryController";
import useGetEventDetail from "../hooks/api/useGetEventDetail";
import useGetEventStatus from "../hooks/api/useGetEventStatus";
import { InventoryService } from "../service/InventoryService";

const FALLBACK_STATUSES = ["Preparation", "During Event", "After Event"] as const;
type DateEventStatus = (typeof FALLBACK_STATUSES)[number];

function formatEventDate(value?: string | null): string {
  const backendDate = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (backendDate) {
    const [, year, month, day] = backendDate;
    return `${day}/${month}/${year}`;
  }

  const displayDate = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return displayDate?.[0] ?? "";
}

function parseBackendDate(value?: string): number | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

function resolveEventStatus(
  eventStart?: string,
  eventEnd?: string,
  now = new Date(),
): DateEventStatus {
  const start = parseBackendDate(eventStart);
  const end = parseBackendDate(eventEnd);
  if (start === null || end === null) return "Preparation";

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  if (today < start) return "Preparation";
  if (today > end) return "After Event";
  return "During Event";
}

const AREA_BADGE_CLASS: Record<string, string> = {
  CEREMONY: "ceremony",
  PHOTOBOOTH: "photobooth",
  RECEPTION: "reception",
  ENTRANCE: "entrance",
  "GUEST TABLE": "guest",
};

function getCheckoutErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      "Failed to save items to the event."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to save items to the event.";
}

interface DisplayItem {
  id: number;
  photo: string;
  name: string;
  area: string;
  status: string;
  stage: string;
  qty: number;
  pic: string;
  checking: boolean;
  warehouseItem: boolean;
  scanInValue: number;
  scanIn: string | null;
  scanOut: string | null;
  note: string;
  areaId?: number;
  subAreaId?: number;
  barangGudangId?: number;
  eventStatusId: number;
  scanned: boolean;
  groupId: string | null;
  groupName: string | null;
}

interface PackageGroup {
  id: string;
  name: string;
  itemIds: number[];
}

interface CartItem {
  cartId: string;
  itemId: number | null;
  barangGudangId?: number;
  barangId?: number;
  warehouseId: number | null;
  warehouseName: string | null;
  photo: string;
  name: string;
  status: string;
  areaId: number | null;
  area: string;
  subAreaId: number | null;
  subArea?: string;
  qty: number;
  note: string;
  memo?: string;
  additionalCode: string | null;
  checked: boolean;
  warehouseItem: boolean;
  input_by: string | null;
  image: string | null;
}

interface ItemCardProps {
  item: DisplayItem;
  group?: PackageGroup;
  showScanButton: boolean;
  isScanned: boolean;
  onScan: (item: DisplayItem) => void;
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

function getPhotoUrl(photo: string): string {
  return isValidUrl(photo)
    ? photo?.replace("http://66.42.48.163:9000/booqable/", STORAGE_BOOQABLE)
    : photo
      ? `https://democreation.site/home/public/${photo}`
      : noImage;
}

function mapEventItem(
  item: EventItem,
  statusNames: Map<number, string>,
): DisplayItem {
  const stage = statusNames.get(item.event_status_id) ?? `Status ${item.event_status_id}`;
  const scanIn = formatApiDate(item.scan_in_date);
  const scanOut = formatApiDate(item.scan_out_date);
  const groupName = item.group_detail?.trim() || null;
  return {
    id: item.id,
    photo: getPhotoUrl(item.photo),
    name: item.nama_barang,
    area: item.area_name || item.sub_list_name || "-",
    status: stage,
    stage,
    qty: item.qty,
    pic: item.input_by,
    checking: item.is_checking.Valid && item.is_checking.Int64 === 1,
    warehouseItem:
      item.is_ware_house_item.Valid && item.is_ware_house_item.Int64 === 1,
    scanInValue: Number(item.scan_in ?? 0),
    scanIn,
    scanOut,
    note: item.notes,
    areaId: item.list_id,
    subAreaId: item.sub_list_id.Valid ? item.sub_list_id.Int64 : undefined,
    barangGudangId: item.barang_gudang_id,
    eventStatusId: item.event_status_id,
    scanned: Boolean(scanIn || scanOut),
    groupId: groupName ? `api:${groupName}` : null,
    groupName,
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

function ItemCard({
  item,
  group,
  showScanButton,
  isScanned,
  onScan,
  onDelete,
}: ItemCardProps) {
  return (
    <div className="item-card">
      <ImagePlaceholder src={item.photo} alt={item.name} />
      <div className="item-body">
        <span
          className={`area-badge ${AREA_BADGE_CLASS[item.area] || "ceremony"}`}
        >
          {item.area}
        </span>
        <div className="item-name-row">
          <span className="item-name">
            {item.name}
            {group && (
              <span className="item-group-badge" title={`${group.itemIds.length} items scan together`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                {group.name}
              </span>
            )}
            {isScanned && <span className="item-scanned-badge"><CheckIcon /> Scanned</span>}
          </span>
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
            <span
              className={`indicator-box${item.warehouseItem ? " checked" : ""}`}
            >
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
            <button className="btn-ia-pkg" title={group ? `Package: ${group.name}` : "Not packaged"} disabled>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </button>
            {showScanButton && <button className={`btn-ia-scan${isScanned ? " scanned" : ""}`} onClick={() => onScan(item)}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M14 14h.01M14 17h3v3M17 14h3" />
              </svg>
              {isScanned ? "Re-scan" : "Scan"}
            </button>}
            <button
              className="btn-ia-del"
              title="Delete"
              onClick={() => onDelete(item.id)}
            >
              <IconDelete />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id: routeEventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = Number(routeEventId ?? searchParams.get("id"));
  const fallbackEventName =
    searchParams.get("name") || "03/06/2023 | GUNTUR + CLARISSA";

  const {
    data: eventItemResponse,
    isLoading,
    isError,
    refetch: refetchEventItems,
  } = useGetEventItem({
    params: { event_id: eventId, order: "asc" },
    options: {
      enabled: !!eventId,
    },
  });

  const { data: eventDetailResponse, refetch: refetchEventDetail } = useGetEventDetail({
    id: eventId,
    options: { enabled: Boolean(eventId) },
  });
  const eventDetail = eventDetailResponse?.data;
  const { data: eventStatusResponse } = useGetEventStatus({
    params: {
      page: 1,
      limit: 999,
      sort: "ASC",
      sortBy: "order_data",
    },
  });
  const eventStatuses = useMemo(
    () =>
      [...(eventStatusResponse?.data?.data ?? [])].sort(
        (left, right) => left.order_data - right.order_data,
      ),
    [eventStatusResponse?.data?.data],
  );
  const statusNames = useMemo(
    () => new Map(eventStatuses.map((status) => [status.id, status.name])),
    [eventStatuses],
  );
  const eventDate = formatEventDate(
    eventDetail?.date_event ?? eventDetail?.date_start,
  );
  const eventName =
    eventDetail?.name && eventDate
      ? `${eventDate} | ${eventDetail.name}`
      : fallbackEventName;

  const { warehouseOptions } = useWarehouseController();
  const { categoryOptions } = useCategoryController();
  const { mutateAsync: createFixEventList, isLoading: isCreatingFixEventList } =
    useCreateFixEventList();
  const { mutateAsync: createFixListItem, isLoading: isCreatingFixListItem } =
    useCreateFixListItem();

  const [createdItems, setCreatedItems] = useState<DisplayItem[]>([]);
  const [hiddenItemIds, setHiddenItemIds] = useState<number[]>([]);
  const [scanOverrides, setScanOverrides] = useState<
    Record<
      number,
      Pick<DisplayItem, "scanInValue" | "scanIn" | "scanOut" | "scanned">
    >
  >({});
  const [nextId, setNextId] = useState(-1);
  const [currentStatusId, setCurrentStatusId] = useState<number | null>(null);
  const [isChangingEventStatus, setIsChangingEventStatus] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [stepperError, setStepperError] = useState("");
  const [scanningItem, setScanningItem] = useState<DisplayItem | null>(null);
  const [scanPhase, setScanPhase] = useState<"ready" | "scanning" | "done">("ready");
  const [localPackages, setLocalPackages] = useState<PackageGroup[]>([]);
  const [packageAssignments, setPackageAssignments] = useState<Record<number, string>>({});
  const [packagingOpen, setPackagingOpen] = useState(false);
  const [packagingSelection, setPackagingSelection] = useState<number[]>([]);
  const [packagingName, setPackagingName] = useState("");

  const [selectedArea, setSelectedArea] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "previous" | "current" | "grouped">("all");
  const [kwSearch, setKwSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [atcOpen, setAtcOpen] = useState(false);
  const [atcTargetId, setAtcTargetId] = useState<number | null>(null);
  const [atcForm, setAtcForm] = useState({
    status: "Preparation",
    area: "ENTRANCE",
    qty: 1,
    note: "",
  });

  const [newItemOpen, setNewItemOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [barangSearch, setBarangSearch] = useState("");
  const [debouncedBarangSearch, setDebouncedBarangSearch] = useState("");
  const [selectedBarangGudang, setSelectedBarangGudang] =
    useState<BarangGudangItemV2 | null>(null);

  // Inventory picker
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState("");
  const [pickerQty, setPickerQty] = useState<Record<number, number>>({});
  const [pickerWarehouseIds, setPickerWarehouseIds] = useState<Record<number, number>>({});
  const [selectedCartIds, setSelectedCartIds] = useState<string[]>([]);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkAreaId, setBulkAreaId] = useState("");
  const [bulkSubAreaId, setBulkSubAreaId] = useState("");

  const [newItemForm, setNewItemForm] = useState({
    areaId: "",
    subAreaId: "",
    status: "Preparation",
    qty: 1,
    additionalCode: "",
    memo: "",
    checked: false,
    warehouseItem: false,
    inputBy: "",
    image: null as string | null,
  });

  useEffect(() => {
    setCurrentStatusId(null);
    setStepperError("");
    setLocalPackages([]);
    setPackageAssignments({});
  }, [eventId]);

  useEffect(() => {
    if (!eventStatuses.length || currentStatusId !== null) return;

    const eventRunningId = Number(eventDetail?.event_running);
    const directId = [eventDetail?.status, eventRunningId].find(
      (candidate) =>
        Number.isFinite(candidate) &&
        eventStatuses.some((status) => status.id === Number(candidate)),
    );
    if (directId !== undefined) {
      setCurrentStatusId(Number(directId));
      return;
    }

    const runningName = eventDetail?.event_running?.trim().toLowerCase();
    const statusByName = runningName
      ? eventStatuses.find((status) => status.name.toLowerCase() === runningName)
      : undefined;
    if (statusByName) {
      setCurrentStatusId(statusByName.id);
      return;
    }

    const dateStatus = resolveEventStatus(
      eventDetail?.event_start,
      eventDetail?.event_end,
    );
    const exactDateStatus = eventStatuses.find(
      (status) => status.name.toLowerCase() === dateStatus.toLowerCase(),
    );
    if (exactDateStatus) {
      setCurrentStatusId(exactDateStatus.id);
      return;
    }

    if (dateStatus === "During Event") {
      const runningStatus = eventStatuses.find(
        (status) =>
          status.active_event === 1 ||
          /event running|during event/i.test(status.name),
      );
      setCurrentStatusId(
        runningStatus?.id ?? eventStatuses[Math.floor(eventStatuses.length / 2)].id,
      );
      return;
    }

    if (dateStatus === "After Event") {
      const finishedStatus = eventStatuses.find((status) =>
        /finished|after event/i.test(status.name),
      );
      setCurrentStatusId(
        finishedStatus?.id ?? eventStatuses[eventStatuses.length - 1].id,
      );
      return;
    }

    setCurrentStatusId(eventStatuses[0].id);
  }, [currentStatusId, eventDetail, eventStatuses]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedBarangSearch(
        barangSearch.trim().length > 2 ? barangSearch.trim() : "",
      );
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [barangSearch]);

  useEffect(() => {
    if (!newItemOpen) return;
    const timeoutId = window.setTimeout(() => {
      setDebouncedBarangSearch(
        pickerQuery.trim().length > 2 ? pickerQuery.trim() : "",
      );
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [newItemOpen, pickerQuery]);

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
  } = useGetBarangGudangV2({
    params: {
      page: 1,
      limit: 30,
      gudang_id: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
      categoryId: pickerCategory ? Number(pickerCategory) : undefined,
      search: debouncedBarangSearch || undefined,
    },
    options: {
      enabled: newItemOpen,
    },
  });

  const items = useMemo(() => {
    const apiItems = eventItemResponse?.data ?? [];
    const visibleApiItems = apiItems
      .map((item) => mapEventItem(item, statusNames))
      .filter((item) => !hiddenItemIds.includes(item.id))
      .map((item) => {
        const assignedGroupId = packageAssignments[item.id] ?? item.groupId;
        const localGroup = localPackages.find((group) => group.id === assignedGroupId);
        return {
          ...item,
          ...scanOverrides[item.id],
          groupId: assignedGroupId,
          groupName: localGroup?.name ?? item.groupName,
        };
      });

    return [...visibleApiItems, ...createdItems];
  }, [
    createdItems,
    eventItemResponse?.data,
    hiddenItemIds,
    localPackages,
    packageAssignments,
    scanOverrides,
    statusNames,
  ]);

  const areas = useMemo(
    () => [...new Set(items.map((item) => item.area).filter(Boolean))].sort(),
    [items],
  );

  const areaCounts = useMemo(() => items.reduce<Record<string, number>>((counts, item) => {
    if (item.area) counts[item.area] = (counts[item.area] || 0) + 1;
    return counts;
  }, {}), [items]);
  const stages = useMemo(
    () =>
      eventStatuses.length
        ? eventStatuses.map((status) => status.name)
        : [...FALLBACK_STATUSES],
    [eventStatuses],
  );
  const currentStageIndex = Math.max(
    0,
    eventStatuses.findIndex((status) => status.id === currentStatusId),
  );
  const currentStatus = eventStatuses[currentStageIndex];
  const eventStatus = currentStatus?.name ?? stages[currentStageIndex] ?? stages[0];
  const stageScanEnabled = currentStatus?.is_show_scan_result === 1;
  const currentScanAction = currentStatus?.action
    ?.trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const isItemScannedForCurrentStatus = (item: DisplayItem) => {
    if (currentScanAction === "SCAN_IN") return Boolean(item.scanIn);
    if (currentScanAction === "SCAN_OUT") return Boolean(item.scanOut);
    return item.scanned;
  };

  const statusIndexById = useMemo(
    () => new Map(eventStatuses.map((status, index) => [status.id, index])),
    [eventStatuses],
  );
  const getItemStageIndex = (item: DisplayItem) =>
    statusIndexById.get(item.eventStatusId) ?? stages.indexOf(item.stage);
  const previousStageCount = items.filter(
    (item) => getItemStageIndex(item) < currentStageIndex,
  ).length;
  const currentStageCount = items.filter(
    (item) => getItemStageIndex(item) === currentStageIndex,
  ).length;
  const apiPackages = useMemo<PackageGroup[]>(() => {
    const byName = new Map<string, number[]>();
    items.forEach((item) => {
      if (!item.groupId?.startsWith("api:") || !item.groupName) return;
      byName.set(item.groupName, [...(byName.get(item.groupName) ?? []), item.id]);
    });
    return [...byName.entries()].map(([name, itemIds]) => ({
      id: `api:${name}`,
      name,
      itemIds,
    }));
  }, [items]);
  const packages = useMemo(
    () => [...apiPackages, ...localPackages],
    [apiPackages, localPackages],
  );
console.log(currentStatus)
  const barangGudangItems = useMemo(
    () => barangGudangResponse?.data ?? [],
    [barangGudangResponse?.data],
  );

  const masterAreas = useMemo<AreaItem[]>(
    () => areaListResponse?.data?.data ?? [],
    [areaListResponse?.data?.data],
  );

  const filteredSubAreas = useMemo(() => {
    const selectedAreaId = Number(newItemForm.areaId);

    return (subAreaResponse?.data?.data ?? []).filter(
      (subArea) => subArea.area_id === selectedAreaId,
    );
  }, [newItemForm.areaId, subAreaResponse?.data?.data]);

  const pickerFiltered = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    return barangGudangItems.filter((item) => {
      if (query.length < 3) return true;
      return `${item.nama_barang} ${item.code} ${item.barang_id}`
        .toLowerCase()
        .includes(query);
    });
  }, [barangGudangItems, pickerQuery]);

  const bulkSubAreas = useMemo(() => {
    const areaId = Number(bulkAreaId);
    return (subAreaResponse?.data?.data ?? []).filter(
      (item) => item.area_id === areaId,
    );
  }, [bulkAreaId, subAreaResponse?.data?.data]);

  const hasMissingArea = cart.some((item) => item.areaId === null);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (selectedArea && item.area !== selectedArea) return false;
        const itemStageIndex = getItemStageIndex(item);
        if (stageFilter === "previous" && itemStageIndex >= currentStageIndex) return false;
        if (stageFilter === "current" && itemStageIndex !== currentStageIndex) return false;
        if (
          kwSearch &&
          !item.name.toLowerCase().includes(kwSearch.toLowerCase()) &&
          !item.area.toLowerCase().includes(kwSearch.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [currentStageIndex, items, kwSearch, selectedArea, stageFilter, statusIndexById, stages],
  );

  const areaLabel = selectedArea || "All Place";
  const unscannedCount = items.filter(
    (item) => !isItemScannedForCurrentStatus(item),
  ).length;
  const hasNextStage = currentStageIndex < stages.length - 1;
  const isFirstStage = currentStageIndex === 0;
  const packableItems = items.filter(
    (item) => getItemStageIndex(item) === 0 && !item.groupId,
  );
  const summaryStats = useMemo(
    () => ({
      total: items.length,
      totalQty: items.reduce((sum, item) => sum + item.qty, 0),
      checked: items.filter((item) => item.checking).length,
      scanIn: items.filter((item) => item.scanIn).length,
      scanOut: items.filter((item) => item.scanOut).length,
    }),
    [items],
  );

  async function changeEventStatus(_step: string, targetIndex: number) {
    if (isChangingEventStatus) return;
    if (
      stageScanEnabled &&
      targetIndex > currentStageIndex &&
      unscannedCount > 0
    ) {
      setStepperError(
        `${unscannedCount} item${unscannedCount === 1 ? "" : "s"} still need to be scanned before moving forward.`,
      );
      return;
    }

    const targetStatus = eventStatuses[targetIndex];
    if (!targetStatus || !eventDetail) return;

    try {
      setIsChangingEventStatus(true);
      const response = await InventoryService.editEvent({
        id: eventDetail.id,
        description: eventDetail.description ?? "",
        name: eventDetail.name ?? "",
        event_start: eventDetail.event_start,
        event_end: eventDetail.event_end,
        PIC: eventDetail.PIC ?? "",
        event_code: eventDetail.event_code ?? "",
        is_complete: eventDetail.is_complete ?? 0,
        status: targetStatus.id,
        // images: eventDetail.images ?? "",
        files: eventDetail.files ?? "",
        address: eventDetail.address ?? "",
        type: eventDetail.type ?? "",
        latitude: eventDetail.latitude ?? "",
        longitude: eventDetail.longitude ?? "",
        event_running: eventDetail.event_running ?? "",
        notes: eventDetail.notes ?? "",
        scan_type: eventDetail.scan_type ?? "",
        date_event: eventDetail.date_event,
      });
      if (response.success === false) {
        throw new Error(response.message || "Failed to update event status.");
      }
      setCurrentStatusId(targetStatus.id);
      setStageFilter("all");
      setStepperError("");
      await refetchEventDetail();
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    } finally {
      setIsChangingEventStatus(false);
    }
  }

  function goToNextStage() {
    if (!hasNextStage || unscannedCount > 0 || isChangingEventStatus) return;
    void changeEventStatus(
      stages[currentStageIndex + 1],
      currentStageIndex + 1,
    );
  }

  function openPackagingModal() {
    setPackagingSelection([]);
    setPackagingName("");
    setPackagingOpen(true);
  }

  function togglePackagingSelection(id: number) {
    setPackagingSelection((selected) =>
      selected.includes(id)
        ? selected.filter((itemId) => itemId !== id)
        : [...selected, id],
    );
  }

  function createPackage() {
    const name = packagingName.trim();
    if (!name || packagingSelection.length === 0) return;
    const id = `local:${crypto.randomUUID()}`;
    setLocalPackages((current) => [
      ...current,
      { id, name, itemIds: [...packagingSelection] },
    ]);
    setPackageAssignments((current) => ({
      ...current,
      ...Object.fromEntries(packagingSelection.map((itemId) => [itemId, id])),
    }));
    setPackagingOpen(false);
  }

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

  function getNextScanType(item: DisplayItem): "IN" | "OUT" {
    return Number(item.scanInValue ?? 0) === 0 ? "IN" : "OUT";
  }

  function doLocalScan(id: number, type: "IN" | "OUT") {
    const now = getNowLabel();
    const applyScanPhase = <
      T extends Pick<
        DisplayItem,
        "scanInValue" | "scanIn" | "scanOut" | "scanned"
      >,
    >(
      scan: T,
    ): T => {
      if (type === "OUT") {
        return { ...scan, scanOut: now, scanned: true };
      }
      return { ...scan, scanInValue: 1, scanIn: now, scanned: true };
    };
    const updateScan = (item: DisplayItem) => {
      if (item.id !== id) return item;
      return applyScanPhase(item);
    };

    setCreatedItems((currentItems) => currentItems.map(updateScan));
    setScanOverrides((currentOverrides) => {
      const item = items.find((currentItem) => currentItem.id === id);
      if (!item || createdItems.some((currentItem) => currentItem.id === id))
        return currentOverrides;

      const currentScan = currentOverrides[id] ?? {
        scanInValue: item.scanInValue,
        scanIn: item.scanIn,
        scanOut: item.scanOut,
        scanned: item.scanned,
      };

      return { ...currentOverrides, [id]: applyScanPhase(currentScan) };
    });
  }

  function openScanPopup(item: DisplayItem) {
    setScanningItem(item);
    setScanPhase("ready");
  }

  function closeScanPopup() {
    if (scanPhase === "scanning") return;
    setScanningItem(null);
    setScanPhase("ready");
  }

  async function startScan() {
    if (!scanningItem) return;

    const group = scanningItem.groupId
      ? packages.find((item) => item.id === scanningItem.groupId)
      : undefined;
    const targetIds = group?.itemIds ?? [scanningItem.id];
    const resolvedTargets = targetIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is DisplayItem => Boolean(item));
    const targets = resolvedTargets.length > 0
      ? resolvedTargets
      : [scanningItem];

    if (
      targets.some((item) => getNextScanType(item) === "OUT") &&
      currentScanAction !== "SCAN_OUT"
    ) {
      toast.error(
        "Scan out is only available when the current status action is SCAN_OUT.",
      );
      return;
    }

    setScanPhase("scanning");
    try {
      const apiTargets = targets.filter((item) => item.id > 0);
      const responses = await Promise.all(
        apiTargets.map((item) =>
          InventoryService.putScan({
            id: item.id,
            type: getNextScanType(item),
          }),
        ),
      );
      const failedResponse = responses.find(
        (response) => response.success === false,
      );
      if (failedResponse) {
        throw new Error(failedResponse.message || "Failed to scan event item.");
      }

      targets
        .filter((item) => item.id <= 0)
        .forEach((item) => doLocalScan(item.id, getNextScanType(item)));

      if (apiTargets.length > 0) {
        setScanOverrides((currentOverrides) => {
          const nextOverrides = { ...currentOverrides };
          apiTargets.forEach((item) => delete nextOverrides[item.id]);
          return nextOverrides;
        });
        await refetchEventItems();
      }

      toast.success(responses[0]?.message || "Item scanned successfully.");
      setScanPhase("done");
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
      setScanPhase("ready");
    }
  }

  function finishScan() {
    closeScanPopup();
  }

  async function deleteItem(id: number) {
    if (!window.confirm("Delete this item from the event?")) return;
    if (id <= 0) {
      setCreatedItems((currentItems) =>
        currentItems.filter((item) => item.id !== id),
      );
      return;
    }

    try {
      const response = await InventoryService.deleteFixItem(id);
      if (response.success === false) {
        throw new Error(response.message || "Failed to delete event item.");
      }
      setHiddenItemIds((currentIds) => [...currentIds, id]);
      await refetchEventItems();
      toast.success(response.message || "Event item deleted.");
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }

  function openAtcModal(id: number) {
    const item = items.find((currentItem) => currentItem.id === id);
    if (!item) return;

    setAtcTargetId(id);
    setAtcForm({
      status: item.status,
      area: item.area,
      qty: item.qty,
      note: "",
    });
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
          cartItem.area === atcForm.area,
      );

      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem === existing
            ? { ...cartItem, qty: cartItem.qty + atcForm.qty }
            : cartItem,
        );
      }

      return [
        ...currentCart,
        {
          cartId: crypto.randomUUID(),
          itemId: atcTargetId,
          warehouseId: null,
          warehouseName: null,
          photo: item.photo,
          name: item.name,
          status: atcForm.status,
          areaId: item.areaId ?? null,
          area: atcForm.area,
          subAreaId: item.subAreaId ?? null,
          barangGudangId: item.barangGudangId,
          qty: atcForm.qty,
          note: atcForm.note,
          memo: atcForm.note,
          additionalCode: null,
          checked: false,
          warehouseItem: false,
          input_by: null,
          image: null,
        },
      ];
    });
    setAtcOpen(false);
  }

  function removeCartItem(idx: number) {
    setCart((currentCart) =>
      currentCart.filter((_, itemIndex) => itemIndex !== idx),
    );
  }

  async function checkout() {
    if (!eventId || cart.length === 0) return;

    try {
      for (const item of cart) {
        if (!item.areaId || !item.subAreaId || !item.barangGudangId) {
          throw new Error(`Incomplete event data for "${item.name}".`);
        }

        const eventListResponse = await createFixEventList({
          list_id: item.areaId,
          event_id: eventId,
          sub_list_id: item.subAreaId,
        });
        const { data } = eventListResponse;

        if (!data.id) {
          throw new Error(`Event list ID was not returned for "${item.name}".`);
        }

        await createFixListItem({
          fix_event_list_id: data.id,
          barang_gudang_id: Number(item.barangGudangId),
          qty: item.qty,
          scan_in: 0,
          scan_out: 0,
          notes: item.memo ?? item.note,
          input_by: item.input_by,
          image: item.image,
          event_status_id:
            eventStatuses.find((status) => status.name === item.status)?.id ??
            currentStatus?.id ??
            eventStatuses[0]?.id ??
            1,
          additional_code: item.additionalCode ?? "",
          is_checking: item.checked ? 1 : 0,
          is_ware_house_item: item.warehouseItem ? 1 : 0,
        });

        setCart((currentCart) =>
          currentCart.filter((cartItem) => cartItem !== item),
        );
      }

      setCartOpen(false);
      setNewItemOpen(false);
      await refetchEventItems();
      toast.success("Items saved to the event.");
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }

  const isSavingCart = isCreatingFixEventList || isCreatingFixListItem;

  function getSelectedItemWarehouse(
    item: BarangGudangItemV2,
  ): BarangGudangWarehouseV2 | undefined {
    const selectedId = pickerWarehouseIds[item.barang_id];
    return (
      item.warehouses.find(
        (warehouse) => warehouse.barang_gudang_id === selectedId,
      ) ?? item.warehouses[0]
    );
  }

  function saveNewItem() {
    const selectedArea = masterAreas.find(
      (area) => String(area.id) === newItemForm.areaId,
    );
    const selectedSubArea = filteredSubAreas.find(
      (subArea) => String(subArea.id) === newItemForm.subAreaId,
    );
    if (!selectedBarangGudang || !selectedArea || !selectedSubArea) return;
    const selectedWarehouse =
      selectedBarangGudang.warehouses.find(
        (warehouse) => warehouse.gudang_id === Number(selectedWarehouseId),
      ) ?? selectedBarangGudang.warehouses[0];
    if (!selectedWarehouse) return;

    setCart((currentCart) => [
      ...currentCart,
      {
        cartId: crypto.randomUUID(),
        itemId: null,
        warehouseId: selectedWarehouse.gudang_id,
        warehouseName: selectedWarehouse.gudang_name,
        barangGudangId: selectedWarehouse.barang_gudang_id,
        barangId: selectedBarangGudang.barang_id,
        photo: getPhotoUrl(selectedBarangGudang.photo),
        name: selectedBarangGudang.nama_barang,
        status: newItemForm.status,
        areaId: selectedArea.id,
        area: selectedArea.name,
        subAreaId: selectedSubArea.id,
        subArea: selectedSubArea.sub_area_name,
        qty: newItemForm.qty,
        note: newItemForm.memo,
        memo: newItemForm.memo,
        additionalCode: newItemForm.additionalCode,
        checked: newItemForm.checked,
        warehouseItem: newItemForm.warehouseItem,
        input_by: newItemForm.checked ? newItemForm.inputBy : null,
        image: newItemForm.checked ? newItemForm.image : null,
      },
    ]);
    setSelectedBarangGudang(null);
    setNewItemForm({
      areaId: "",
      subAreaId: "",
      status: eventStatus,
      qty: 1,
      additionalCode: "",
      memo: "",
      checked: false,
      warehouseItem: false,
      inputBy: "",
      image: null,
    });
    setNewItemOpen(false);
  }

  function addInventoryItem(item: BarangGudangItemV2) {
    const selectedWarehouse = getSelectedItemWarehouse(item);
    if (!selectedWarehouse) return;
    const qty = pickerQty[item.barang_id] ?? 1;
    setCart((currentCart) => {
      const existing = currentCart.find(
        (cartItem) =>
          cartItem.barangGudangId === selectedWarehouse.barang_gudang_id &&
          cartItem.areaId === null,
      );
      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem.cartId === existing.cartId
            ? { ...cartItem, qty: cartItem.qty + qty }
            : cartItem,
        );
      }
      return [
        ...currentCart,
        {
          cartId: crypto.randomUUID(),
          itemId: null,
          barangGudangId: selectedWarehouse.barang_gudang_id,
          barangId: item.barang_id,
          warehouseId: selectedWarehouse.gudang_id,
          warehouseName: selectedWarehouse.gudang_name,
          photo: getPhotoUrl(item.photo),
          name: item.nama_barang,
          status: eventStatus,
          areaId: null,
          area: "",
          subAreaId: null,
          subArea: "",
          qty,
          note: "",
          memo: "",
          additionalCode: null,
          checked: false,
          warehouseItem: false,
          input_by: null,
          image: null,
        },
      ];
    });
  }

  function updateInventoryCartQty(cartId: string, qty: number) {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.cartId === cartId ? { ...item, qty: Math.max(1, qty) } : item,
      ),
    );
  }

  function removeInventoryCartItem(cartId: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.cartId !== cartId),
    );
    setSelectedCartIds((ids) => ids.filter((id) => id !== cartId));
  }

  function toggleCartSelect(cartId: string) {
    setSelectedCartIds((ids) =>
      ids.includes(cartId)
        ? ids.filter((id) => id !== cartId)
        : [...ids, cartId],
    );
  }

  function toggleSelectAllCart() {
    setSelectedCartIds((ids) =>
      ids.length === cart.length ? [] : cart.map((item) => item.cartId),
    );
  }

  function applyBulkAssign() {
    const area = masterAreas.find((item) => String(item.id) === bulkAreaId);
    const subArea = bulkSubAreas.find(
      (item) => String(item.id) === bulkSubAreaId,
    );
    if (!area || !subArea) return;
    setCart((currentCart) =>
      currentCart.map((item) =>
        selectedCartIds.includes(item.cartId)
          ? {
              ...item,
              areaId: area.id,
              area: area.name,
              subAreaId: subArea.id,
              subArea: subArea.sub_area_name,
            }
          : item,
      ),
    );
    setBulkPanelOpen(false);
    setBulkAreaId("");
    setBulkSubAreaId("");
  }

  function handlePickerCheckout() {
    if (hasMissingArea) {
      setSelectedCartIds(
        cart.filter((item) => item.areaId === null).map((item) => item.cartId),
      );
      setBulkPanelOpen(true);
      return;
    }
    void checkout();
  }
  const canSaveNewItem =
    !!selectedBarangGudang && !!newItemForm.areaId && !!newItemForm.subAreaId;

  const openCart = () => {
    setSelectedWarehouseId("");
    setBarangSearch("");
    setDebouncedBarangSearch("");
    setSelectedBarangGudang(null);
    setPickerQuery("");
    setPickerCategory("");
    setPickerQty({});
    setPickerWarehouseIds({});
    setSelectedCartIds([]);
    setBulkPanelOpen(false);
    setBulkAreaId("");
    setBulkSubAreaId("");
    setNewItemForm({
      areaId: "",
      subAreaId: "",
      status: eventStatus,
      qty: 1,
      additionalCode: "",
      memo: "",
      checked: false,
      warehouseItem: false,
      inputBy: "",
      image: null,
    });
    setNewItemOpen(true);
  };

  return (
    <>
      <h1 className="page-title">Event Detail</h1>
      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => navigate("/event")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "12.5px",
              color: "var(--brand)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 14, height: 14 }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Events
          </button>
        </div>
        <div className="event-header-row">
          <div className="event-heading">{eventName}</div>

          <div className="event-actions-bar">
            <button
              className="action-icon-btn btn-pkg"
              title={
                isFirstStage
                  ? "Packaging — group items to scan together"
                  : `Packaging is only available at the \"${stages[0]}\" stage`
              }
              disabled={!isFirstStage}
              onClick={openPackagingModal}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </button>
            <button className="action-icon-btn btn-cart" onClick={openCart}>
              <IconCart />
            </button>
            <button className="btn-new" onClick={openCart}>
              <IconPlus /> Add Item
            </button>
          </div>
        </div>

        <div className="event-status-section">
          <div className="event-status-section-label">Event Status</div>
          <div className="event-status-stepper-wrap">
            <Stepper
              steps={stages}
              currentIndex={currentStageIndex}
              onStepClick={eventStatuses.length ? changeEventStatus : undefined}
            />
          </div>
          {stageScanEnabled && hasNextStage && (
            <button
              type="button"
              className="btn-next-stage"
              disabled={unscannedCount > 0 || isChangingEventStatus}
              title={
                unscannedCount > 0
                  ? `${unscannedCount} item(s) still need to be scanned`
                  : `Move to \"${stages[currentStageIndex + 1]}\"`
              }
              onClick={goToNextStage}
            >
              {isChangingEventStatus ? "Saving…" : "Next"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
        </div>

        {stepperError && (
          <div className="stepper-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {stepperError}
            <button type="button" className="stepper-error-dismiss" onClick={() => setStepperError("")}>×</button>
          </div>
        )}

        <div className="filter-row">
          <div style={{ flex: 1, minWidth: 190 }}>
            <SearchableSelect
              value={selectedArea}
              onChange={(value) => setSelectedArea(String(value))}
              placeholder="All Place"
              searchPlaceholder="Search area…"
              emptyText="No area found"
              options={[
                { value: "", label: "All Place", meta: String(items.length) },
                ...areas.map((area) => ({
                  value: area,
                  label: area,
                  meta: String(areaCounts[area] || 0),
                })),
              ]}
            />
          </div>

          <div className="filter-row-right">
            <button className="btn btn-check" onClick={() => {}}>
              <IconSearch /> Check
            </button>
            <button
              className="btn"
              style={{ background: "var(--purple)", color: "#fff" }}
              title="Summary"
              aria-label="Summary"
              onClick={() => setSummaryOpen(true)}
            >
              <IconBarChart />
            </button>
            <button className="btn btn-print" onClick={() => window.print()}>
              <IconPrint />
            </button>
          </div>
        </div>

        <div className="search-row">
          <div className="search-wrap">
            <IconSearch />
            <input
              className="search-input"
              type="text"
              placeholder="Keyword Search"
              value={kwSearch}
              onChange={(event) => setKwSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="stage-tabs">
          <button className={`stage-tab${stageFilter === "all" ? " active" : ""}`} onClick={() => setStageFilter("all")}>All <span className="stage-tab-count">{items.length}</span></button>
          <button className={`stage-tab${stageFilter === "previous" ? " active" : ""}`} onClick={() => setStageFilter("previous")}>From Previous Stage <span className="stage-tab-count">{previousStageCount}</span></button>
          <button className={`stage-tab${stageFilter === "current" ? " active" : ""}`} onClick={() => setStageFilter("current")}>New in &ldquo;{eventStatus}&rdquo; <span className="stage-tab-count">{currentStageCount}</span></button>
          <button className={`stage-tab${stageFilter === "grouped" ? " active" : ""}`} onClick={() => setStageFilter("grouped")}>Grouped <span className="stage-tab-count">{packages.length}</span></button>
        </div>

        {stageFilter === "grouped" ? (
          <>
            <p className="summary-text"><strong>{packages.length}</strong> box{packages.length === 1 ? "" : "es"} packaged — each box scans as one QR code.</p>
            {packages.length === 0 ? (
              <div className="no-data">No boxes yet. Use the box icon at the first stage to group items.</div>
            ) : (
              <div className="package-list">
                {packages.map((group) => {
                  const members = items.filter((item) => group.itemIds.includes(item.id));
                  const allScanned =
                    members.length > 0 &&
                    members.every(isItemScannedForCurrentStatus);
                  return (
                    <div key={group.id} className="package-card">
                      <div className="package-header">
                        <div className="package-header-info">
                          <span className="package-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg></span>
                          <div><div className="package-name">{group.name}</div><div className="package-meta">{members.length} item{members.length === 1 ? "" : "s"} in this box</div></div>
                        </div>
                        {stageScanEnabled && members.length > 0 && (
                          <button className={`btn-ia-scan${allScanned ? " scanned" : ""}`} onClick={() => openScanPopup(members[0])}>{allScanned ? "Re-scan Box" : "Scan Box"}</button>
                        )}
                      </div>
                      <div className="items-grid package-items-grid">
                        {members.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            group={group}
                            showScanButton={false}
                            isScanned={isItemScannedForCurrentStatus(item)}
                            onScan={openScanPopup}
                            onDelete={deleteItem}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : isLoading ? (
          <div className="no-data">Loading...</div>
        ) : isError ? (
          <div className="no-data">Failed to load event items.</div>
        ) : filtered.length === 0 ? (
          <div className="no-data">No Data</div>
        ) : (
          <>
            <p className="summary-text"><strong>{filtered.length}</strong> item(s) with status <strong>&ldquo;{eventStatus}&rdquo;</strong> in area <strong>&ldquo;{areaLabel}&rdquo;</strong></p>
            <div className="items-grid">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                group={item.groupId ? packages.find((group) => group.id === item.groupId) : undefined}
                showScanButton={stageScanEnabled}
                isScanned={isItemScannedForCurrentStatus(item)}
                onScan={openScanPopup}
                onDelete={deleteItem}
              />
            ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={atcOpen}
        title="Add to Cart"
        onClose={() => setAtcOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setAtcOpen(false)}>
              <IconClose /> Cancel
            </button>
            <button className="btn-add-cart" onClick={confirmAddToCart}>
              <IconCart /> Add to Cart
            </button>
          </>
        }
      >
        <div className="atc-item-name">
          {items.find((item) => item.id === atcTargetId)?.name}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status / State</label>
            <SearchableSelect
              value={atcForm.status}
              onChange={(value) =>
                setAtcForm((form) => ({ ...form, status: String(value) }))
              }
              options={stages.map((status) => ({ value: status, label: status }))}
            />
          </div>
          <div className="form-group">
            <label>Area</label>
            <SearchableSelect
              value={atcForm.area}
              onChange={(value) =>
                setAtcForm((form) => ({ ...form, area: String(value) }))
              }
              options={areas.map((area) => ({ value: area, label: area }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Qty</label>
            <input
              type="number"
              min={1}
              value={atcForm.qty}
              onChange={(event) =>
                setAtcForm((form) => ({
                  ...form,
                  qty: parseInt(event.target.value, 10) || 1,
                }))
              }
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Optional"
              value={atcForm.note}
              onChange={(event) =>
                setAtcForm((form) => ({ ...form, note: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={cartOpen}
        title="Event Cart"
        onClose={() => setCartOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-m"
              onClick={() => setCartOpen(false)}
              disabled={isSavingCart}
            >
              Close
            </button>
            <button
              className="btn-checkout"
              onClick={checkout}
              disabled={isSavingCart || cart.length === 0}
            >
              <IconCheck /> {isSavingCart ? "Saving..." : "Save to Event"}
            </button>
          </>
        }
      >
        {cart.length === 0 ? (
          <div className="cart-empty">The cart is empty.</div>
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
                <button
                  className="cart-item-remove"
                  onClick={() => removeCartItem(index)}
                >
                  <IconDelete />
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={false}
        title="Add New Item"
        onClose={() => setNewItemOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-m"
              onClick={() => setNewItemOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn-add-cart"
              style={{
                background: "#16a34a",
                opacity: canSaveNewItem ? 1 : 0.6,
              }}
              onClick={saveNewItem}
              disabled={!canSaveNewItem}
            >
              <IconCheck /> Save
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Select Warehouse</label>
          <SearchableSelect
            value={selectedWarehouseId}
            onChange={(value) => {
              setSelectedWarehouseId(String(value));
              setBarangSearch("");
              setDebouncedBarangSearch("");
              setSelectedBarangGudang(null);
            }}
            placeholder="Select a warehouse"
            options={warehouseOptions}
          />
        </div>

        <div className="form-group">
          <label>Search Items</label>
          <input
            type="search"
            value={barangSearch}
            disabled={!selectedWarehouseId}
            placeholder="Enter at least 3 characters"
            onChange={(event) => setBarangSearch(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Select Item</label>
          <div className="event-master-item-list">
            {!selectedWarehouseId ? (
              <div className="event-master-item-empty">
                Select a warehouse first.
              </div>
            ) : isBarangGudangLoading ? (
              <div className="event-master-item-empty">Loading items...</div>
            ) : isBarangGudangError ? (
              <div className="event-master-item-empty">
                Failed to load items.
              </div>
            ) : barangGudangItems.length === 0 ? (
              <div className="event-master-item-empty">No items available.</div>
            ) : (
              barangGudangItems.map((barang) => {
                const isSelected =
                  selectedBarangGudang?.barang_id === barang.barang_id;

                return (
                  <button
                    key={barang.barang_id}
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
                      <span className="event-master-item-name">
                        {barang.nama_barang}
                      </span>
                      <span className="event-master-item-stock">
                        Stock: {barang.stok_barang}
                      </span>
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
            <SearchableSelect
              value={newItemForm.areaId}
              onChange={(value) =>
                setNewItemForm((form) => ({
                  ...form,
                  areaId: String(value),
                  subAreaId: "",
                }))
              }
              disabled={isAreaListLoading || isAreaListError}
              placeholder={isAreaListLoading ? "Loading areas..." : isAreaListError ? "Failed to load areas" : "Select an area"}
              options={masterAreas.map((area) => ({ value: area.id, label: area.name }))}
            />
          </div>
          <div className="form-group">
            <label>Sub Area</label>
            <SearchableSelect
              value={newItemForm.subAreaId}
              disabled={!newItemForm.areaId || isSubAreaLoading}
              onChange={(value) =>
                setNewItemForm((form) => ({
                  ...form,
                  subAreaId: String(value),
                }))
              }
              placeholder={!newItemForm.areaId ? "Select an area first" : isSubAreaLoading ? "Loading sub-areas..." : isSubAreaError ? "Failed to load sub-areas" : "Select a sub-area"}
              emptyText="No sub-areas available"
              options={filteredSubAreas.map((subArea) => ({ value: subArea.id, label: subArea.sub_area_name }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <SearchableSelect
              value={newItemForm.status}
              onChange={(value) =>
                setNewItemForm((form) => ({
                  ...form,
                  status: String(value),
                }))
              }
              options={stages.map((status) => ({ value: status, label: status }))}
            />
          </div>
          <div className="form-group">
            <label>Qty</label>
            <input
              type="number"
              min={1}
              value={newItemForm.qty}
              onChange={(event) =>
                setNewItemForm((form) => ({
                  ...form,
                  qty: parseInt(event.target.value, 10) || 1,
                }))
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Additional Code</label>
            <SearchableSelect
              value={newItemForm.additionalCode}
              onChange={(value) =>
                setNewItemForm((form) => ({
                  ...form,
                  additionalCode: String(value),
                }))
              }
              placeholder="Select additional code"
              options={["IHC", "IHO", "O", "S", "B", "F", "Venue"].map((code) => ({ value: code, label: code }))}
            />
          </div>
          <div className="form-group">
            <label>Memo</label>
            <input
              type="text"
              value={newItemForm.memo}
              onChange={(event) =>
                setNewItemForm((form) => ({
                  ...form,
                  memo: event.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group form-checkbox-group">
            <label className="form-checkbox-label">
              <input
                className="form-checkbox-input"
                type="checkbox"
                checked={newItemForm.checked}
                onChange={(event) =>
                  setNewItemForm((form) => ({
                    ...form,
                    checked: event.target.checked,
                    inputBy: event.target.checked ? form.inputBy : "",
                    image: event.target.checked ? form.image : null,
                  }))
                }
              />
              <span>Checked</span>
            </label>
          </div>
          <div className="form-group form-checkbox-group">
            <label className="form-checkbox-label">
              <input
                className="form-checkbox-input"
                type="checkbox"
                checked={newItemForm.warehouseItem}
                onChange={(event) =>
                  setNewItemForm((form) => ({
                    ...form,
                    warehouseItem: event.target.checked,
                  }))
                }
              />
              <span>Warehouse Item</span>
            </label>
          </div>
        </div>
        {newItemForm.checked ? (
          <div className="form-row">
            <div className="form-group">
              <label>Input By</label>
              <input
                type="text"
                value={newItemForm.inputBy}
                onChange={(event) =>
                  setNewItemForm((form) => ({
                    ...form,
                    inputBy: event.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group">
              <label>Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    setNewItemForm((form) => ({ ...form, image: null }));
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    setNewItemForm((form) => ({
                      ...form,
                      image:
                        form.checked && typeof reader.result === "string"
                          ? reader.result
                          : null,
                    }));
                  };
                  reader.onerror = () => {
                    setNewItemForm((form) => ({ ...form, image: null }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </div>
        ) : (
          <></>
        )}
        {newItemForm.checked && newItemForm.image ? (
          <div className="form-group event-item-image-preview">
            <label>Image Preview</label>
            <img src={newItemForm.image} alt="Uploaded item preview" />
          </div>
        ) : (
          <></>
        )}
      </Modal>

      {/* Inventory Picker + Cart Modal — two panels, no popping in/out */}
      <Modal
        open={newItemOpen}
        title="Add Items from Inventory"
        onClose={() => setNewItemOpen(false)}
        size="4xl"
        className="inv-pick-modal"
        bodyClassName="inv-pick-modal-body"
        footer={
          <>
            <button
              className="btn-cancel-m"
              onClick={() => setNewItemOpen(false)}
            >
              <IconClose /> Close
            </button>
            <button
              className="btn-checkout"
              onClick={handlePickerCheckout}
              disabled={cart.length === 0 || isSavingCart}
            >
              <IconCheck />{" "}
              {hasMissingArea ? "Complete Locations" : "Save to Event"}
            </button>
          </>
        }
      >
        <div className="inv-pick-split">
          {/* Left panel — browse & add from inventory */}
          <div className="inv-pick-left">
            <div className="search-row" style={{ marginBottom: 4 }}>
              <div className="search-wrap">
                <IconSearch />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search name or SKU…"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                />
              </div>
              <div className="wi-select-wrap">
                <SearchableSelect
                  inline
                  value={pickerCategory}
                  onChange={(value) => setPickerCategory(String(value))}
                  options={[
                    { value: "", label: "All Categories" },
                    ...categoryOptions,
                  ]}
                />
              </div>
            </div>

            <div className="inv-pick-list">
              {pickerFiltered.length === 0 ? (
                <div className="no-data">No items found.</div>
              ) : (
                pickerFiltered.map((inv) => {
                  const selectedWarehouse = getSelectedItemWarehouse(inv);
                  const qty = pickerQty[inv.barang_id] ?? 1;
                  const warehouseStock = selectedWarehouse?.stok_gudang ?? 0;
                  const outOfStock = warehouseStock <= 0;
                  return (
                    <div className="inv-pick-row" key={inv.barang_id}>
                      <ImagePlaceholder
                        src={getPhotoUrl(inv.photo)}
                        alt={inv.nama_barang}
                      />
                      <div className="inv-pick-info">
                        <div className="inv-pick-name-row">
                          <span className="inv-pick-name">
                            {inv.nama_barang}
                          </span>
                          <span
                            className={`inv-stock-badge ${outOfStock ? "out" : warehouseStock < 10 ? "low" : "available"}`}
                          >
                            {outOfStock
                              ? "Out of Stock"
                              : warehouseStock < 10
                                ? "Low Stock"
                                : "Available"}
                          </span>
                        </div>
                        <div className="inv-pick-meta">
                          <span style={{ fontFamily: "monospace" }}>
                            {inv.code || `#${inv.barang_id}`}
                          </span>{" "}
                          · {inv.nama_kategori} · {inv.nama_satuan}
                        </div>
                        <div className="inv-pick-stock">
                          Available stock:{" "}
                          <strong>
                            {warehouseStock} {inv.nama_satuan}
                          </strong>
                        </div>
                        <div className="inv-pick-warehouse-row">
                          <label>Take from warehouse</label>
                          <div className="wi-select-wrap">
                            <SearchableSelect
                              inline
                              value={selectedWarehouse?.barang_gudang_id ?? ""}
                              onChange={(value) => {
                                const barangGudangId = Number(value);
                                setPickerWarehouseIds((current) => ({
                                  ...current,
                                  [inv.barang_id]: barangGudangId,
                                }));
                                setPickerQty((current) => ({
                                  ...current,
                                  [inv.barang_id]: 1,
                                }));
                              }}
                              options={inv.warehouses.map((warehouse) => ({
                                value: warehouse.barang_gudang_id,
                                label: warehouse.gudang_name,
                                meta: `${warehouse.stok_gudang} in stock`,
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="inv-pick-actions">
                        <input
                          className="inv-pick-qty"
                          type="number"
                          min={1}
                          max={warehouseStock}
                          value={qty}
                          disabled={outOfStock}
                          onChange={(e) =>
                            setPickerQty((q) => ({
                              ...q,
                              [inv.barang_id]: Math.max(
                                1,
                                Math.min(
                                  warehouseStock,
                                  parseInt(e.target.value) || 1,
                                ),
                              ),
                            }))
                          }
                        />
                        <button
                          className="btn-add-cart"
                          disabled={outOfStock}
                          onClick={() => addInventoryItem(inv)}
                        >
                          <IconCart /> {outOfStock ? "Out of Stock" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel — cart / keranjang, always visible alongside the list */}
          <div className="inv-pick-right">
            <div className="inv-cart-header">
              <IconCart /> Cart{" "}
              <span className="inv-cart-count">{cart.length}</span>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">The cart is empty</div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 10,
                    flexShrink: 0,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--text-2)",
                      cursor: "pointer",
                      marginTop: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        cart.length > 0 &&
                        selectedCartIds.length === cart.length
                      }
                      onChange={toggleSelectAllCart}
                    />
                    Select All ({selectedCartIds.length}/{cart.length})
                  </label>
                  <button
                    className="btn btn-ghost"
                    disabled={selectedCartIds.length === 0}
                    onClick={() => setBulkPanelOpen((o) => !o)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      alignSelf: "flex-start",
                    }}
                  >
                    Assign Locations ({selectedCartIds.length})
                  </button>
                </div>

                {bulkPanelOpen && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      padding: "10px 12px",
                      marginBottom: 12,
                      background: "var(--brand-bg)",
                      borderRadius: "var(--r-lg)",
                      flexWrap: "wrap",
                      flexShrink: 0,
                    }}
                  >
                    <div className="wi-select-wrap">
                      <SearchableSelect
                        inline
                        value={bulkAreaId}
                        onChange={(value) => {
                          setBulkAreaId(String(value));
                          setBulkSubAreaId("");
                        }}
                        placeholder="Select Area"
                        options={masterAreas.map((area) => ({ value: area.id, label: area.name }))}
                      />
                    </div>
                    <div className="wi-select-wrap">
                      <SearchableSelect
                        inline
                        value={bulkSubAreaId}
                        onChange={(value) => setBulkSubAreaId(String(value))}
                        disabled={!bulkAreaId}
                        placeholder={bulkSubAreas.length ? "Select Sub Area" : "(No Sub Areas)"}
                        options={bulkSubAreas.map((subArea) => ({ value: subArea.id, label: subArea.sub_area_name }))}
                      />
                    </div>
                    <button
                      className="btn-save-modal"
                      disabled={!bulkAreaId || !bulkSubAreaId}
                      onClick={applyBulkAssign}
                    >
                      <IconCheck /> Apply to {selectedCartIds.length} items
                    </button>
                    <button
                      className="btn-cancel-m"
                      onClick={() => setBulkPanelOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="cart-list">
                  {cart.map((c) => (
                    <div key={c.cartId} className="cart-item">
                      <input
                        type="checkbox"
                        checked={selectedCartIds.includes(c.cartId)}
                        onChange={() => toggleCartSelect(c.cartId)}
                      />
                      <div className="cart-item-img">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#b0b5cc"
                          strokeWidth="1.5"
                          style={{ width: 28, height: 28 }}
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{c.name}</div>
                        <div className="cart-item-meta">
                          {c.status}
                          {c.warehouseName ? ` · ${c.warehouseName}` : ""}
                        </div>
                        {c.area && (
                          <div className="cart-item-location">
                            {c.area}
                            {c.subArea ? ` · ${c.subArea}` : ""}
                          </div>
                        )}
                      </div>
                      <input
                        className="inv-pick-qty"
                        type="number"
                        min={1}
                        value={c.qty}
                        onChange={(e) =>
                          updateInventoryCartQty(
                            c.cartId,
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                      {c.areaId === null && (
                        <button
                          className="cart-item-remove"
                          title="Assign location"
                          aria-label={`Assign location for ${c.name}`}
                          onClick={() => {
                            setSelectedCartIds([c.cartId]);
                            setBulkPanelOpen(true);
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                            <circle cx="12" cy="10" r="2.5" />
                          </svg>
                        </button>
                      )}
                      <button
                        className="cart-item-remove"
                        onClick={() => removeInventoryCartItem(c.cartId)}
                      >
                        <IconDelete />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={summaryOpen}
        title="Event Summary"
        onClose={() => setSummaryOpen(false)}
        size="lg"
      >
        <div className="summary-popup-title">{eventName}</div>
        <div className="summary-popup-status">Status: {eventStatus}</div>
        <div className="summary-popup-kpis">
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.total}</div><div className="summary-popup-kpi-label">Total Items</div></div>
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.checked}</div><div className="summary-popup-kpi-label">Checked</div></div>
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.scanIn}</div><div className="summary-popup-kpi-label">Scanned In</div></div>
        </div>
        <p className="summary-text">
          Total quantity: <strong>{summaryStats.totalQty}</strong> · Scanned out:{" "}
          <strong>{summaryStats.scanOut}</strong> of {summaryStats.total}
        </p>
        <button
          type="button"
          className="summary-popup-view-detail"
          onClick={() => {
            setSummaryOpen(false);
            navigate(`/event-summary?id=${eventId}`);
          }}
        >
          <IconBarChart /> View Full Detail
        </button>
      </Modal>

      <Modal open={Boolean(scanningItem)} title="Scan Item" onClose={closeScanPopup}>
        {scanningItem && (
          <div className="scan-popup-content">
            {scanningItem.groupId ? (
              <>
                <div className="scan-popup-title">Package: {packages.find((group) => group.id === scanningItem.groupId)?.name}</div>
                <div className="scan-popup-subtitle">All items in this box will be scanned together.</div>
              </>
            ) : (
              <>
                <div className="scan-popup-title">{scanningItem.name}</div>
                <div className="scan-popup-subtitle">{scanningItem.area}</div>
              </>
            )}
            {scanPhase === "ready" && (
              <>
                <div className="scan-target-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h7M14 21h7M14 17.5h3.5" /></svg></div>
                <button type="button" className="btn-save-modal" onClick={startScan}>Start Scan</button>
              </>
            )}
            {scanPhase === "scanning" && (
              <><div className="scan-target-box scanning"><div className="scan-spinner" /></div><p className="scan-popup-subtitle">Scanning…</p></>
            )}
            {scanPhase === "done" && (
              <><div className="scan-target-box success"><CheckIcon /></div><p className="scan-popup-success">Scan completed</p><button type="button" className="btn-save-modal" onClick={finishScan}><IconCheck /> Done</button></>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={packagingOpen}
        title="Group Items for Packaging"
        onClose={() => setPackagingOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setPackagingOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={!packagingName.trim() || packagingSelection.length === 0} onClick={createPackage}><IconCheck /> Create Group ({packagingSelection.length})</button>
          </>
        }
      >
        <div className="form-group">
          <label>Group Name <span className="required">*</span></label>
          <input type="text" placeholder="e.g. Ceremony Decor Bundle" value={packagingName} onChange={(event) => setPackagingName(event.target.value)} />
        </div>
        <p className="package-pick-help">Only ungrouped items from &ldquo;{stages[0]}&rdquo; can be added.</p>
        <div className="package-pick-list">
          {packableItems.length === 0 ? (
            <div className="no-data">No eligible ungrouped items.</div>
          ) : packableItems.map((item) => (
            <label key={item.id} className={`package-pick-row${packagingSelection.includes(item.id) ? " selected" : ""}`}>
              <input type="checkbox" checked={packagingSelection.includes(item.id)} onChange={() => togglePackagingSelection(item.id)} />
              <span><span className="package-pick-row-name">{item.name}</span><span className="package-pick-row-meta">{item.area} · Qty: {item.qty}</span></span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
