import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { useQueryClient } from "react-query";
import Modal from "../components/Modal";
import EventLifecycleModal, { type LifecycleModalMode } from '../components/EventLifecycleModal';
import { useEventLifecycle, updateEventLifecycle, resolveLifecycle, LIFECYCLE_BADGES, OWNERSHIPS, ownershipClass, type Ownership } from '../lib/eventLifecycle';
import Stepper from "../components/Stepper";
import SearchableSelect from "../components/SearchableSelect";
import TextInput from "../components/TextInput";
import {
  IconSearch,
  IconPlus,
  IconDelete,
  IconClose,
  IconCheck,
  IconCart,
  IconPrint,
  IconBarChart,
  IconMoreVertical,
  IconNotes,
  IconUser,
  IconTag,
} from "../components/icons";
import useGetBarangGudangV2, {
  type BarangGudangItemV2,
  type BarangGudangWarehouseV2,
} from "../hooks/api/useGetBarangGudangV2";
import useGetAreaList from "../hooks/api/useGetAreaList";
import useCreateFixEventList from "../hooks/api/useCreateFixEventList";
import useCreateFixListItem from "../hooks/api/useCreateFixListItem";
import usePutEventItem from '../hooks/api/usePutEventItem';
import useCreateProductionRequest from '../hooks/api/useCreateProductionRequest';
import useConvertEventItem from '../hooks/api/useConvertEventItem';
import useGetProductionRequests from '../hooks/api/useGetProductionRequests';
import useCreatePackage from "../hooks/api/useCreatePackage";
import useGetEventPackages from "../hooks/api/useGetEventPackages";
import useGetEventItem, { type EventItem } from "../hooks/api/useGetEventItem";
import useGetSubArea from "../hooks/api/useGetSubArea";
import { STORAGE_BOOQABLE, isValidUrl, noImage } from "../utils/function";
import { useWarehouseController } from "./lib/useWarehouseController";
import { useCategoryController } from "./lib/useCategoryController";
import useGetEventDetail from "../hooks/api/useGetEventDetail";
import useGetEventStatus from "../hooks/api/useGetEventStatus";
import { InventoryService } from "../service/InventoryService";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import "../eventUpgrade.css";
import Drawer from "../components/Drawer";
import EventItemEditor, { type EventItemDraft } from "../components/EventItemEditor";
import { IconEdit } from "../components/icons";
import { type ProductionRequest, type ConvertRequest, updateLifecycle } from "../lib/eventLifecycle";
import type { ConversionDraft } from '../components/ConversionForm';
import { loadConversionStock } from '../lib/conversionInventory';
import { planConversions } from '../lib/conversionPreview';
import { eventStatusFeatures, hasReachedProductionStatus } from '../lib/eventStatusFeatures';
import { canChangeStage } from "../lib/eventStageRules";


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

function getLoggedInFullname(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const auth = JSON.parse(window.localStorage.getItem("auth") || "null") as {
      fullname?: string;
    } | null;
    return auth?.fullname?.trim() || null;
  } catch {
    return null;
  }
}

interface DisplayItem {
  ownerships: Ownership[];
  resolution?: 'returned' | 'transferred';
  stockCut?: boolean;
  stockReturned?: boolean;
  fromProduction?: boolean;
  isNewProductionItem?: boolean;
  fromConvert?: boolean;
  isConverted?: boolean;
  convertedQty?: number;
  packageId?: number | null;
  subArea?: string;
  unit?: string;
  isReturned?: boolean;
  isTransferredToOtherEvent?: boolean;
  isTransferredFromOtherEvent?: boolean;
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
  barangId?: number;
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
  items?: DisplayItem[];
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
  ownerships: OwnershipPayload;
  checked: boolean;
  warehouseItem: boolean;
  pic: string;
  image: string | null;
}

interface OwnershipPayload {
  ihc: boolean;
  ihp: boolean;
  outsource: boolean;
}

const EMPTY_OWNERSHIPS: OwnershipPayload = {
  ihc: false,
  ihp: false,
  outsource: false,
};

const OWNERSHIP_OPTIONS = ["IHP", "IHC", "Outsource"] as const;

function ownershipKey(value: (typeof OWNERSHIP_OPTIONS)[number]): keyof OwnershipPayload {
  return value.toLowerCase() as keyof OwnershipPayload;
}

interface ItemCardProps {
  item: DisplayItem;
  group?: PackageGroup;
  showScanButton: boolean;
  isScanned: boolean;
  onScan: (item: DisplayItem) => void;
  onDelete?: (id: number) => void;
  onOpen?: (item: DisplayItem) => void;
  onModify?: (item: DisplayItem) => void;
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

  const utcTime = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value.Time)
    ? value.Time.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, "Z")
    : `${value.Time}Z`;

  return new Date(utcTime).toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
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
  const ownerships: Ownership[] = [];
  if (item.ownerships?.ihp) ownerships.push("IHP");
  if (item.ownerships?.ihc) ownerships.push("IHC");
  if (item.ownerships?.outsource) ownerships.push("Outsource");
  return {
    id: item.id,
    photo: getPhotoUrl(item.photo),
    name: item.nama_barang,
    area: item.area_name || item.sub_list_name || "-",
    status: stage,
    stage,
    qty: item.qty,
    pic: item.pic?.trim() || "",
    unit: item.satuan,
    subArea: item.sub_list_name,
    checking: item.is_checking.Valid && item.is_checking.Int64 === 1,
    warehouseItem:
      item.is_ware_house_item.Valid && item.is_ware_house_item.Int64 === 1,
    scanInValue: Number(item.scan_in ?? 0),
    scanIn,
    scanOut,
    note: item.notes,
    areaId: item.list_id,
    subAreaId: item.sub_list_id.Valid ? item.sub_list_id.Int64 : undefined,
    barangId: item.barang_id,
    barangGudangId: item.barang_gudang_id,
    eventStatusId: item.event_status_id,
    scanned: Boolean(scanIn || scanOut),
    groupId: groupName ? `api:${groupName}` : null,
    groupName,
    ownerships,
    isReturned: item.is_returned === 1,
    isTransferredToOtherEvent: item.is_transfer_to_other_event === 1,
    isTransferredFromOtherEvent: item.is_transfer_from_other_event === 1,
    isNewProductionItem: item.is_new_production_item,
    isConverted: item.is_converted,
    convertedQty: Number(item.converted_qty ?? 0),
    packageId: item.package?.id ?? null,
  };
}

function isPackableEventItem(item: DisplayItem): boolean {
  return item.id > 0 && item.packageId === null;
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

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10V2" />
      <path d="m2.5 5.5 3.5-3.5 3.5 3.5" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v8" />
      <path d="m2.5 6.5 3.5 3.5 3.5-3.5" />
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
  onOpen,
  onModify,
}: ItemCardProps) {
  return (
    <div className="item-card clickable" role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen?.(item); } }}>
      <div className="item-card-actions">
      {onModify && <button className="item-card-action modify" title={i18n.t('eventUpgrade.modify')} onClick={e => { e.stopPropagation(); onModify(item); }}><IconEdit /></button>}
      {onDelete && <button
        type="button"
        className="item-card-action delete"
        title={i18n.t("wording.delete")}
        aria-label={i18n.t("dynamic.deleteItem", { name: item.name })}
        onClick={e => { e.stopPropagation(); onDelete(item.id); }}
      >
        <IconDelete />
      </button>}
      </div>
      <ImagePlaceholder src={item.photo} alt={item.name} />
      <div className="item-body">
        <div className="item-badge-row"><span
          className={`area-badge ${AREA_BADGE_CLASS[item.area] || "ceremony"}`}
        >
          {item.area}
        </span>
        {item.ownerships.map((ownership) => (
          <span key={ownership} className={`badge ownership-badge-btn ${ownershipClass(ownership)}`}>
            {ownership}
          </span>
        ))}
        <StockBadge item={item} />
        {item.fromProduction && <span className="badge badge-purple">{i18n.t('eventUpgrade.previewItem')}</span>}
        {item.isNewProductionItem && <span className="badge badge-purple">{i18n.t('eventUpgrade.productionItem')}</span>}
        {item.fromConvert && <span className="badge badge-blue">{i18n.t('conversion.converted')}</span>}
        {item.isConverted && <span className="badge badge-blue">{i18n.t('conversion.convertedQty', { count: item.convertedQty })}</span>}
        {item.resolution === 'returned' && <span className="badge badge-green">{i18n.t('lifecycle.returned')}</span>}
        </div>
        <div className="item-name-row">
          <span className="item-name">
            {item.name}
            {group && (
              <span className="item-group-badge" title={i18n.t("dynamic.itemsScanTogether", { count: group.itemIds.length })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                {group.name}
              </span>
            )}
            {isScanned && <span className="item-scanned-badge"><CheckIcon /> {i18n.t("wording.scanned")}</span>}
          </span>
          <span className="item-qty">{i18n.t("wording.qtyPrefix")} {item.qty}</span>
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
            {i18n.t("wording.checking")}
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
        {showScanButton && (
          <div className="item-actions">
            <button className={`btn-ia-scan${isScanned ? " scanned" : ""}`} onClick={e => { e.stopPropagation(); onScan(item); }}>
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
              {isScanned ? i18n.t("common.actions.rescan") : i18n.t("common.actions.scan")}
            </button>
          </div>
        )}
        {(item.isReturned || item.isTransferredFromOtherEvent || item.isTransferredToOtherEvent) && (
          <div className="item-flow-flags">
            {item.isReturned && <span className="item-flow-chip returned"><CheckIcon /> {i18n.t('lifecycle.returned')}</span>}
            {item.isTransferredFromOtherEvent && <span className="item-flow-chip transferred"><ArrowDownIcon /> {i18n.t('lifecycle.transferred')}</span>}
            {item.isTransferredToOtherEvent && <span className="item-flow-chip transferred"><ArrowUpIcon /> {i18n.t('lifecycle.transferred')}</span>}
          </div>
        )}
      </div>
    </div>
  );
}


function StockBadge({ item }: { item: DisplayItem }) {
  return item.stockReturned ? <span className="badge badge-green">{i18n.t('eventUpgrade.stockReturned')}</span>
    : item.stockCut ? <span className="badge badge-orange">{i18n.t('eventUpgrade.stockCut')}</span> : null;
}

function ItemTable({ items, onOpen, onModify, onDelete, onScan, showScanButton, isScanned }: {
  items: DisplayItem[]; onOpen: (item: DisplayItem) => void; onModify?: (item: DisplayItem) => void;
  onDelete?: (id: number) => void; onScan: (item: DisplayItem) => void; showScanButton: boolean; isScanned: (item: DisplayItem) => boolean;
}) {
  const { t } = useTranslation();
  return <div className="table-wrap item-table-wrap"><table className="item-table"><thead><tr>
    {['item', 'area', 'qty', 'pic', 'ownerships', 'checking', 'scanIn', 'scanOut', 'actions'].map(key => <th key={key}>{key === 'pic' ? 'PIC' : t('wording.' + key)}</th>)}
  </tr></thead><tbody>{items.map(item => <tr key={item.id} tabIndex={0} className="item-table-row" onClick={() => onOpen(item)} onKeyDown={e => { if (e.target === e.currentTarget && e.key === 'Enter') onOpen(item); }}>
    <td><strong>{item.name}</strong><div className="item-table-flags">
      {item.groupName && <span className="badge badge-purple">{item.groupName}</span>}<StockBadge item={item} />
      {item.fromProduction && <span className="badge badge-purple">{t('eventUpgrade.previewItem')}</span>}
      {item.isNewProductionItem && <span className="badge badge-purple">{t('eventUpgrade.productionItem')}</span>}
      {item.fromConvert && <span className="badge badge-blue">{t('conversion.converted')}</span>}
      {item.isConverted && <span className="badge badge-blue">{t('conversion.convertedQty', { count: item.convertedQty })}</span>}
      {item.isReturned && <span className="badge badge-green">✓ {t('lifecycle.returned')}</span>}
      {item.isTransferredFromOtherEvent && <span className="badge badge-orange">↓ {t('lifecycle.transferred')}</span>}
      {item.isTransferredToOtherEvent && <span className="badge badge-orange">↑ {t('lifecycle.transferred')}</span>}
    </div><div className="item-table-note">{item.note}</div></td>
    <td>{item.area}<div className="item-table-sub">{item.subArea}</div></td><td>{item.qty} {item.unit}</td><td>{item.pic || '—'}</td>
    <td>{item.ownerships.map(o => <span key={o} className={'badge ' + ownershipClass(o)}>{o}</span>)}</td>
    <td>{item.checking ? '✓' : '—'}</td><td>{item.scanIn || '—'}</td><td>{item.scanOut || '—'}</td>
    <td><div className="item-table-actions">
      {showScanButton && item.id > 0 && <button className="btn btn-check" onClick={e => { e.stopPropagation(); onScan(item); }}>{t(isScanned(item) ? 'common.actions.rescan' : 'common.actions.scan')}</button>}
      {onModify && <button className="btn-icon" title={t('eventUpgrade.modify')} onClick={e => { e.stopPropagation(); onModify(item); }}><IconEdit /></button>}
      {onDelete && <button className="btn-icon" title={t('wording.delete')} onClick={e => { e.stopPropagation(); onDelete(item.id); }}><IconDelete /></button>}
    </div></td>
  </tr>)}</tbody></table></div>;
}

export default function EventDetailPage() {
  const { t } = useTranslation();
  const { id: routeEventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = Number(routeEventId ?? searchParams.get("id"));
  const lifecycleStore = useEventLifecycle();
  const lifecycle = lifecycleStore.events[eventId];
  const [lifecycleMode, setLifecycleMode] = useState<LifecycleModalMode>(null);
  const [ownershipFilter, setOwnershipFilter] = useState('');
  const [appliedOwnershipFilter, setAppliedOwnershipFilter] = useState('');

  const {
    data: eventItemResponse,
    isLoading,
    isError,
    refetch: refetchEventItems,
  } = useGetEventItem({
    params: {
      event_id: eventId,
      order: "asc",
      ...(appliedOwnershipFilter && {
        ownership: appliedOwnershipFilter.toLowerCase(),
      }),
    },
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
  const {
    data: eventPackagesResponse,
    isLoading: isEventPackagesLoading,
    isError: isEventPackagesError,
    refetch: refetchEventPackages,
  } = useGetEventPackages({
    eventId,
    options: { enabled: Boolean(eventId) },
  });
  const {
    data: productionRequestsResponse,
    isLoading: isProductionRequestsLoading,
    isError: isProductionRequestsError,
    refetch: refetchProductionRequests,
  } = useGetProductionRequests({
    eventId,
    options: { enabled: Boolean(eventId) },
  });
  const statusNames = useMemo(
    () => new Map(eventStatuses.map((status) => [status.id, status.name])),
    [eventStatuses],
  );
  const eventDate = formatEventDate(
    eventDetail?.date_event?.trim() || eventDetail?.event_start,
  );
  const eventName = [eventDate, eventDetail?.name?.trim()]
    .filter(Boolean)
    .join(" | ") || t("wording.loading");

  const { warehouseOptions } = useWarehouseController();
  const { categoryOptions } = useCategoryController();
  const { mutateAsync: createFixEventList, isLoading: isCreatingFixEventList } =
    useCreateFixEventList();
  const { mutateAsync: createFixListItem, isLoading: isCreatingFixListItem } =
    useCreateFixListItem();
  const { mutateAsync: putEventItem } = usePutEventItem();
  const { mutateAsync: createProductionRequest } = useCreateProductionRequest();
  const { mutateAsync: convertEventItem } = useConvertEventItem();

  const [detailId, setDetailId] = useState<number | null>(null);
  const [modifyItem, setModifyItem] = useState<DisplayItem | null>(null);
  const [productionOpen, setProductionOpen] = useState(false);
  const [itemEdits, setItemEdits] = useState<Record<number, Partial<DisplayItem>>>({});
  const [pendingStage, setPendingStage] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(() => {
    try { return localStorage.getItem('emi_event_detail_view') === 'list' ? 'list' : 'cards'; } catch { return 'cards'; }
  });
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [stepperError, setStepperError] = useState("");
  const [scanningItem, setScanningItem] = useState<DisplayItem | null>(null);
  const [scanPhase, setScanPhase] = useState<"ready" | "scanning" | "done">("ready");
  const [localPackages, setLocalPackages] = useState<PackageGroup[]>([]);
  const [packageAssignments, setPackageAssignments] = useState<Record<number, string>>({});
  const [packagingOpen, setPackagingOpen] = useState(false);
  const [packagingSelection, setPackagingSelection] = useState<number[]>([]);
  const [packagingName, setPackagingName] = useState("");
  const { mutateAsync: createPackageRequest, isLoading: isCreatingPackage } = useCreatePackage();

  const [selectedArea, setSelectedArea] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "waiting" | "added" | "grouped" | "production">("all");
  const [kwSearch, setKwSearch] = useState("");

  const {
    data: productionItemResponse,
    isLoading: isProductionItemsLoading,
    isError: isProductionItemsError,
    refetch: refetchProductionItems,
  } = useGetEventItem({
    params: {
      event_id: eventId,
      order: "asc",
      is_new_production_item: 1,
    },
    options: {
      enabled: Boolean(eventId) && stageFilter === "production",
    },
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartMetadataEditor, setCartMetadataEditor] = useState<{
    cartId: string;
    field: "notes" | "pic" | "ownerships";
  } | null>(null);
  const [cartMetadataDraft, setCartMetadataDraft] = useState("");
  const [ownershipsDraft, setOwnershipsDraft] = useState<OwnershipPayload>({ ...EMPTY_OWNERSHIPS });
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
    ownerships: [] as Array<(typeof OWNERSHIP_OPTIONS)[number]>,
    memo: "",
    checked: false,
    warehouseItem: false,
    inputBy: "",
    image: null as string | null,
  });

  useEffect(() => {
    setCurrentStatusId(null);
    setItemEdits({}); setDetailId(null); setModifyItem(null); setPendingStage(null); setCreatedItems([]);
    setStepperError("");
    setLocalPackages([]);
    setPackageAssignments({});
  }, [eventId]);

  useEffect(() => {
    if (!moreMenuOpen) return;

    function closeMoreMenu(event: MouseEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMoreMenu);
    return () => document.removeEventListener("mousedown", closeMoreMenu);
  }, [moreMenuOpen]);

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

  const lifecycleItems = useMemo(() => [...(eventItemResponse?.data ?? []), ...(lifecycle?.incoming ?? [])].filter(item => !hiddenItemIds.includes(item.id)), [eventItemResponse?.data, lifecycle?.incoming, hiddenItemIds]);
  const items = useMemo(() => {
    const apiItems = lifecycleItems;
    const visibleApiItems = apiItems
      .map((item) => mapEventItem(item, statusNames))
      .filter((item) => !hiddenItemIds.includes(item.id))
      .map((item) => {
        const assignedGroupId = packageAssignments[item.id] ?? item.groupId;
        const localGroup = localPackages.find((group) => group.id === assignedGroupId);
        return {
          ...item,
          ...itemEdits[item.id],
          resolution: lifecycle?.items?.[item.id]?.resolution,
          ...scanOverrides[item.id],
          groupId: assignedGroupId,
          groupName: localGroup?.name ?? item.groupName,
        };
      }).filter(item => item.resolution !== 'transferred');

    const productionItems: DisplayItem[] = (lifecycle?.productionRequests ?? []).filter((r): r is ProductionRequest => r.type !== 'convert' && r.status === 'Done').map<DisplayItem>(r => ({
      id: -r.id, name: r.name, qty: r.qty, area: r.area, subArea: r.subArea, areaId: r.areaId, subAreaId: r.subAreaId,
      photo: noImage, ownerships: ['IHP'], pic: '', note: r.note, unit: 'pcs', status: statusNames.get(r.stageId) ?? '', stage: statusNames.get(r.stageId) ?? '',
      eventStatusId: r.stageId, checking: false, warehouseItem: false, scanInValue: 0, scanIn: null, scanOut: null, scanned: false, groupId: null, groupName: null, fromProduction: true,
      ...itemEdits[-r.id],
    })).filter(item => !hiddenItemIds.includes(item.id));
    const convertedItems = (lifecycle?.productionRequests ?? []).filter((r): r is ConvertRequest => r.type === 'convert' && r.status === 'Converted').map<DisplayItem>(r => ({
      id: -r.id, name: r.toName, qty: r.toQty, area: 'UNASSIGNED', subArea: '',
      photo: r.toPhoto || noImage, ownerships: ['IHC'], pic: '', note: `${r.fromQty} × ${r.fromName} → ${r.toQty} × ${r.toName}`, unit: r.toUnit,
      status: statusNames.get(r.stageId) ?? '', stage: statusNames.get(r.stageId) ?? '', eventStatusId: r.stageId,
      checking: false, warehouseItem: true, scanInValue: 0, scanIn: null, scanOut: null, scanned: false,
      groupId: null, groupName: null, fromConvert: true, ...itemEdits[-r.id],
    })).filter(item => !hiddenItemIds.includes(item.id));
    return [...visibleApiItems, ...createdItems, ...productionItems, ...convertedItems];
  }, [
    createdItems,
    itemEdits,
    eventItemResponse?.data,
    hiddenItemIds,
    localPackages,
    packageAssignments,
    scanOverrides,
    statusNames,
    lifecycleItems,
    lifecycle?.items,
    lifecycle?.productionRequests,
  ]);

  const backendProductionItems = useMemo(
    () =>
      (productionItemResponse?.data ?? [])
        .map((item) => ({
          ...mapEventItem(item, statusNames),
          ...itemEdits[item.id],
          ...scanOverrides[item.id],
          resolution: lifecycle?.items?.[item.id]?.resolution,
        }))
        .filter(
          (item) =>
            !hiddenItemIds.includes(item.id) &&
            item.resolution !== "transferred",
        ),
    [
      hiddenItemIds,
      itemEdits,
      lifecycle?.items,
      productionItemResponse?.data,
      scanOverrides,
      statusNames,
    ],
  );

  const visibleProductionItems = useMemo(
    () =>
      backendProductionItems.filter((item) => {
        if (selectedArea && item.area !== selectedArea) return false;
        if (
          kwSearch &&
          !item.name.toLowerCase().includes(kwSearch.toLowerCase()) &&
          !item.area.toLowerCase().includes(kwSearch.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [backendProductionItems, kwSearch, selectedArea],
  );

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
    eventStatuses.findIndex((status) => status.id === (currentStatusId ?? eventDetail?.status)),
  );
  const currentStatus = eventStatuses[currentStageIndex];
  const eventStatus = currentStatus?.name ?? stages[currentStageIndex] ?? stages[0];
  const closingFlag = resolveLifecycle({ id: eventId, status: currentStatus?.id, is_complete: eventDetail?.is_complete, is_finished: eventDetail?.is_finished, total_items: lifecycleItems.length }, { ...lifecycle, stageId: currentStatus?.id, itemCount: lifecycleItems.length }, eventStatuses[eventStatuses.length - 1]?.id);
  const isClosing = ['checking-inventory', 'returned-completed', 'transferred'].includes(closingFlag);
  const features = Object.fromEntries(eventStatuses.map(status => [status.id, eventStatusFeatures(status)]));
  const maxReachedIndex = Math.max(currentStageIndex, eventStatuses.findIndex(s => s.id === lifecycle?.furthestStageId));
  const returnIndex = eventStatuses.findIndex(s => features[s.id]?.stockReturn);
  useEffect(() => {
    if (!eventDetail || !eventItemResponse || !currentStatus?.id) return;
    if (lifecycle?.stageId === currentStatus.id && lifecycle?.itemCount === lifecycleItems.length && lifecycle?.furthestStageId === eventStatuses[maxReachedIndex]?.id && (returnIndex < 0 || maxReachedIndex < returnIndex || lifecycle?.stockReturnReached)) return;
    try { updateEventLifecycle(eventId, { stageId: currentStatus.id, itemCount: lifecycleItems.length, furthestStageId: eventStatuses[maxReachedIndex]?.id, stockReturnReached: lifecycle?.stockReturnReached || (returnIndex >= 0 && maxReachedIndex >= returnIndex) }); } catch { /* API data remains usable without local storage. */ }
  }, [eventId, eventDetail, eventItemResponse, currentStatus?.id, lifecycleItems.length, lifecycle?.stageId, lifecycle?.itemCount, lifecycle?.furthestStageId, lifecycle?.stockReturnReached, maxReachedIndex, returnIndex, eventStatuses]);
  const addLocked = Boolean(lifecycle?.stockReturnReached) || (returnIndex >= 0 && maxReachedIndex >= returnIndex) || ['returned-completed', 'transferred'].includes(closingFlag);
  const productionEnabled = currentStatus?.production_item === true;
  const productionTabVisible = hasReachedProductionStatus(
    currentStatus,
    eventStatuses,
  );
  useEffect(() => {
    if (!productionTabVisible && stageFilter === "production") {
      setStageFilter("all");
    }
  }, [productionTabVisible, stageFilter]);
  const requests = lifecycle?.productionRequests ?? [];
  const apiProductionRequests = productionRequestsResponse?.data ?? [];
  const pendingConverts = requests.filter((r): r is ConvertRequest => r.type === 'convert' && r.status === 'Pending');
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
  const apiPackages = useMemo<PackageGroup[]>(() =>
    (eventPackagesResponse?.data ?? []).map((eventPackage) => {
      const groupId = `api:${eventPackage.id}`;
      return {
        id: groupId,
        name: eventPackage.name,
        itemIds: eventPackage.items.map((item) => item.id),
        items: eventPackage.items.map((item) => ({
          ...mapEventItem(item, statusNames),
          ...itemEdits[item.id],
          ...scanOverrides[item.id],
          groupId,
          groupName: eventPackage.name,
          resolution: lifecycle?.items?.[item.id]?.resolution,
        })).filter((item) => item.resolution !== 'transferred'),
      };
    }), [eventPackagesResponse?.data, lifecycle?.items, scanOverrides, statusNames, itemEdits]);
  const packages = useMemo(
    () => [...apiPackages, ...localPackages],
    [apiPackages, localPackages],
  );
  const detailItem = items.find(item => item.id === detailId)
    ?? backendProductionItems.find(item => item.id === detailId)
    ?? packages.flatMap(p => p.items ?? []).find(item => item.id === detailId);
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

  const baseFiltered = useMemo(
    () =>
      items.filter((item) => {
        if (selectedArea && item.area !== selectedArea) return false;
        if (
          kwSearch &&
          !item.name.toLowerCase().includes(kwSearch.toLowerCase()) &&
          !item.area.toLowerCase().includes(kwSearch.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [items, kwSearch, selectedArea],
  );
  const scopedItems = useMemo(
    () =>
      baseFiltered.filter(
        (item) => getItemStageIndex(item) <= currentStageIndex,
      ),
    [baseFiltered, currentStageIndex, statusIndexById, stages],
  );
  const currentStageItems = useMemo(
    () =>
      baseFiltered.filter(
        (item) => getItemStageIndex(item) === currentStageIndex,
      ),
    [baseFiltered, currentStageIndex, statusIndexById, stages],
  );
  const waitingScanItems = useMemo(
    () =>
      scopedItems.filter((item) => !isItemScannedForCurrentStatus(item)),
    [currentScanAction, scopedItems],
  );
  const effectiveStageFilter =
    stageFilter === "production" && !productionTabVisible
      ? "all"
      : stageFilter === "waiting" && !stageScanEnabled
        ? "all"
        : stageFilter;
  const displayedItems =
    effectiveStageFilter === "waiting"
      ? waitingScanItems
      : effectiveStageFilter === "added"
        ? currentStageItems
        : scopedItems;

  const areaLabel = selectedArea || "All Place";
  const unscannedCount = items.filter(
    (item) => item.id > 0 && !isItemScannedForCurrentStatus(item),
  ).length;
  const hasNextStage = currentStageIndex < stages.length - 1;
  const packagedItemIds = useMemo(
    () => new Set(packages.flatMap((group) => group.itemIds)),
    [packages],
  );
  const packableItems = items.filter(
    (item) => isPackableEventItem(item) && !item.groupId && !packagedItemIds.has(item.id),
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

  function requestStageChange(_step: string, index: number, viaNext = false) {
    if (!eventDetail || !canChangeStage({ current: currentStageIndex, target: index, furthest: maxReachedIndex, stageCount: eventStatuses.length, viaNext, scanRequired: stageScanEnabled, unscanned: unscannedCount, locked: isClosing || isChangingEventStatus })) return;
    setPendingStage(index);
  }
  const crossedStages = pendingStage !== null && pendingStage > currentStageIndex ? eventStatuses.slice(currentStageIndex + 1, pendingStage + 1) : [];
  const willCut = crossedStages.some(s => features[s.id]?.cuttingStock);
  const willReturn = crossedStages.some(s => features[s.id]?.stockReturn);
  async function changeEventStatus(_step: string, targetIndex: number) {
    if (isChangingEventStatus || isClosing) return;
    if (
      stageScanEnabled &&
      targetIndex > currentStageIndex &&
      unscannedCount > 0
    ) {
      setStepperError(
        `${unscannedCount} item${unscannedCount === 1 ? "" : t("wording.s")} still need to be scanned before moving forward.`,
      );
      return;
    }

    const targetStatus = eventStatuses[targetIndex];
    if (!targetStatus || !eventDetail) return;

    try {
      setIsChangingEventStatus(true);
      // Read fresh stock before the real stage update. No stock mutation is sent to BE.
      const conversionPlan = targetIndex > currentStageIndex && pendingConverts.length
        ? planConversions(lifecycleStore, eventId, await loadConversionStock(), targetStatus.id, eventName, targetStatus.name, getLoggedInFullname() ?? '', new Date().toISOString())
        : null;
      const response = await InventoryService.editEvent({
        id: eventDetail.id,
        description: eventDetail.description ?? "",
        name: eventDetail.name ?? "",
        event_start: eventDetail.event_start,
        event_end: eventDetail.event_end,
        PIC: eventDetail.PIC ?? "",
        event_code: eventDetail.event_code ?? "",
        is_complete: eventDetail.is_complete ?? 0,
        is_finished: eventDetail.is_finished ?? 0,
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
      if (conversionPlan) {
        try { updateLifecycle(data => {
          const applied = new Set((data.stockMovements ?? []).map(m => m.id));
          data.stockMovements = [...conversionPlan.movements.filter(m => !applied.has(m.id)), ...(data.stockMovements ?? [])];
          data.events[eventId] = { ...data.events[eventId], productionRequests: conversionPlan.requests };
        }, `${eventName}: Convert preview at ${targetStatus.name}`); }
        catch { toast.error(t('lifecycle.saveFailed')); }
      }
      try { updateEventLifecycle(eventId, { furthestStageId: eventStatuses[Math.max(maxReachedIndex, targetIndex)]?.id, stockReturnReached: lifecycle?.stockReturnReached || willReturn }, `${eventName}: Stage → ${targetStatus.name}${willCut ? '; stock cut preview' : ''}${willReturn ? '; stock return preview' : ''}`); } catch { toast.error(t('lifecycle.saveFailed')); }
      if (willCut || willReturn) setItemEdits(old => {
        const next = { ...old };
        items.forEach(item => { next[item.id] = { ...next[item.id], stockCut: item.stockCut || willCut, stockReturned: item.stockReturned || (willReturn && Boolean(item.stockCut || willCut)) }; });
        return next;
      });
      setPendingStage(null);
      setStageFilter("all");
      setStepperError("");
      await refetchEventDetail();
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'conversionStockUnavailable' ? t('conversion.insufficient') : getCheckoutErrorMessage(error));
    } finally {
      setIsChangingEventStatus(false);
    }
  }

  function goToNextStage() {
    if (!hasNextStage || (stageScanEnabled && unscannedCount > 0) || isChangingEventStatus) return;
    requestStageChange(stages[currentStageIndex + 1], currentStageIndex + 1, true);
  }

  async function startCheckingInventory() {
    if (!eventDetail || isChangingEventStatus) return;
    if (!window.confirm(t('lifecycle.confirmClose'))) return;

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
        is_complete: 1,
        is_finished: 0,
        status: currentStatus?.id ?? eventDetail.status,
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
        throw new Error(response.message || "Failed to start inventory checking.");
      }
      try {
        updateEventLifecycle(
          eventId,
          { closing: 'checking-inventory' },
          `${eventName}: Checking inventory`,
        );
      } catch {
        toast.error(t('lifecycle.saveFailed'));
      }
      await Promise.all([
        refetchEventDetail(),
        queryClient.invalidateQueries(['events-v2']),
      ]);
      toast.success(response.message || t('lifecycle.checking-inventory'));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    } finally {
      setIsChangingEventStatus(false);
    }
  }

  async function refreshAfterFinalize(): Promise<void> {
    await Promise.all([
      refetchEventDetail(),
      refetchEventItems(),
      refetchEventPackages(),
      queryClient.invalidateQueries(['events-v2']),
    ]);
  }

  function openPackagingModal() {
    if (isClosing) return;
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

  async function createPackage() {
    const name = packagingName.trim();
    if (!name || packagingSelection.length === 0) return;
    try {
      const response = await createPackageRequest({
        eventId,
        items: packagingSelection,
        name,
        note: "",
        qr_type: "",
      });
      await Promise.all([refetchEventItems(), refetchEventPackages()]);
      setPackagingSelection([]);
      setPackagingName("");
      setPackagingOpen(false);
      toast.success(response.message || t("wording.groupCreatedSuccessfully"));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }

  function getNowLabel() {
    return new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getNextScanType(item: DisplayItem): "IN" | "OUT" {
    if (currentScanAction === "SCAN_IN") return "IN";
    if (currentScanAction === "SCAN_OUT") return "OUT";
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
      .map(
        (id) =>
          items.find((item) => item.id === id) ??
          group?.items?.find((item) => item.id === id),
      )
      .filter((item): item is DisplayItem => Boolean(item));
    const targets = resolvedTargets.length > 0
      ? resolvedTargets
      : [scanningItem];

    if (
      targets.some((item) => getNextScanType(item) === "OUT") &&
      currentScanAction !== "SCAN_OUT"
    ) {
      toast.error(
        t("wording.scanOutIsOnlyAvailableWhenTheCurrent"),
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
        await Promise.all([refetchEventItems(), refetchEventPackages()]);
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
    if (isClosing) return;
    if (!window.confirm("Delete this item from the event?")) return;
    if (id <= 0) {
      setHiddenItemIds(ids => [...ids, id]);
      if (lifecycle?.incoming?.some(item => item.id === id)) {
        try { updateEventLifecycle(eventId, { incoming: lifecycle.incoming.filter(item => item.id !== id) }); }
        catch { toast.error(t('lifecycle.saveFailed')); }
      }
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
      await Promise.all([refetchEventItems(), refetchEventPackages()]);
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
          ownerships: { ...EMPTY_OWNERSHIPS },
          checked: false,
          warehouseItem: false,
          pic: item.pic || "",
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
    if (addLocked) return;
    if (!eventId || cart.length === 0) return;
    const inputBy = getLoggedInFullname();

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
          notes: item.note || item.memo || "",
          pic: item.pic,
          input_by: inputBy,
          image: item.image,
          event_status_id:
            eventStatuses.find((status) => status.name === item.status)?.id ??
            currentStatus?.id ??
            eventStatuses[0]?.id ??
            1,
          additional_code: "",
          ownerships: item.ownerships,
          is_checking: item.checked ? 1 : 0,
          is_ware_house_item: item.warehouseItem ? 1 : 0,
        });

        setCart((currentCart) =>
          currentCart.filter((cartItem) => cartItem !== item),
        );
      }

      setCartOpen(false);
      setNewItemOpen(false);
      setCartMetadataEditor(null);
      setCartMetadataDraft("");
      setOwnershipsDraft({ ...EMPTY_OWNERSHIPS });
      await refetchEventItems();
      toast.success(t("wording.itemsSavedToTheEvent"));
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
        ownerships: {
          ihc: newItemForm.ownerships.includes("IHC"),
          ihp: newItemForm.ownerships.includes("IHP"),
          outsource: newItemForm.ownerships.includes("Outsource"),
        },
        checked: newItemForm.checked,
        warehouseItem: newItemForm.warehouseItem,
        pic: newItemForm.checked ? newItemForm.inputBy : "",
        image: newItemForm.checked ? newItemForm.image : null,
      },
    ]);
    setSelectedBarangGudang(null);
    setNewItemForm({
      areaId: "",
      subAreaId: "",
      status: eventStatus,
      qty: 1,
      ownerships: [],
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
          ownerships: { ...EMPTY_OWNERSHIPS },
          checked: false,
          warehouseItem: false,
          pic: "",
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
    if (cartMetadataEditor?.cartId === cartId) {
      setCartMetadataEditor(null);
      setCartMetadataDraft("");
      setOwnershipsDraft({ ...EMPTY_OWNERSHIPS });
    }
  }

  function toggleCartMetadataEditor(
    item: CartItem,
    field: "notes" | "pic" | "ownerships",
  ) {
    if (
      cartMetadataEditor?.cartId === item.cartId &&
      cartMetadataEditor.field === field
    ) {
      setCartMetadataEditor(null);
      setCartMetadataDraft("");
      setOwnershipsDraft({ ...EMPTY_OWNERSHIPS });
      return;
    }

    setCartMetadataEditor({ cartId: item.cartId, field });
    setCartMetadataDraft(
      field === "notes" ? item.note || item.memo || "" : item.pic,
    );
    setOwnershipsDraft(
      field === "ownerships" ? { ...item.ownerships } : { ...EMPTY_OWNERSHIPS },
    );
  }

  function toggleOwnership(value: (typeof OWNERSHIP_OPTIONS)[number]) {
    const key = ownershipKey(value);
    setOwnershipsDraft((current) => ({ ...current, [key]: !current[key] }));
  }

  function saveCartItemMetadata(cartId: string) {
    if (!cartMetadataEditor || cartMetadataEditor.cartId !== cartId) return;

    const value = cartMetadataDraft.trim();

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.cartId === cartId
          ? cartMetadataEditor.field === "notes"
            ? { ...item, note: value, memo: value }
            : cartMetadataEditor.field === "pic"
              ? { ...item, pic: value }
              : { ...item, ownerships: { ...ownershipsDraft } }
          : item,
      ),
    );
    setCartMetadataEditor(null);
    setCartMetadataDraft("");
    setOwnershipsDraft({ ...EMPTY_OWNERSHIPS });
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


  async function submitProduction(value: EventItemDraft) {
    if (!productionEnabled || !value.areaId) return;
    try {
      const response = await createProductionRequest({
        event_id: eventId,
        item_name: value.name.trim(),
        qty: value.qty,
        area_id: value.areaId,
        ...(value.subAreaId ? { sub_area_id: value.subAreaId } : {}),
        notes: value.note.trim(),
      });
      setStageFilter("production");
      await Promise.all([
        refetchEventItems(),
        refetchProductionItems(),
        refetchProductionRequests(),
      ]);
      setProductionOpen(false);
      toast.success(response.message || t("eventUpgrade.productionCreated"));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }
  async function submitConversion(value: ConversionDraft) {
    if (!productionEnabled) return;
    try {
      const response = await convertEventItem({
        id_fix_list_item_event: value.fromEventItemId,
        old_qty: value.fromQty,
        barang_id: value.toItemId,
        new_qty: value.toQty,
      });
      await Promise.all([refetchEventItems(), refetchProductionRequests()]);
      setProductionOpen(false);
      setStageFilter("all");
      toast.success(response.message || t("conversion.created"));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }
  async function saveItemPreview(value: EventItemDraft) {
    if (!modifyItem || isClosing) return;
    if (modifyItem.id <= 0) {
      setItemEdits(old => ({ ...old, [modifyItem.id]: { ...old[modifyItem.id], qty: value.qty, pic: value.pic, area: value.area, areaId: value.areaId, subArea: value.subArea, subAreaId: value.subAreaId, note: value.note, ownerships: value.ownerships } }));
      setModifyItem(null); toast.success(t('eventUpgrade.previewSaved')); return;
    }
    if (!value.areaId || !value.subAreaId) return;
    try {
      const response = await putEventItem({
        id: modifyItem.id,
        list_id: value.areaId,
        sub_list_id: value.subAreaId,
        qty: value.qty,
        pic: value.pic.trim(),
        notes: value.note.trim(),
        ownerships: {
          ihc: value.ownerships.includes('IHC'),
          ihp: value.ownerships.includes('IHP'),
          outsource: value.ownerships.includes('Outsource'),
        },
      });
      setItemEdits(old => { const next = { ...old }; delete next[modifyItem.id]; return next; });
      await refetchEventItems();
      setModifyItem(null);
      toast.success(response.message || t('eventUpgrade.itemUpdated'));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }

  const openCart = () => {
    if (addLocked) return;
    setSelectedWarehouseId("");
    setBarangSearch("");
    setDebouncedBarangSearch("");
    setSelectedBarangGudang(null);
    setPickerQuery("");
    setPickerCategory("");
    setPickerQty({});
    setPickerWarehouseIds({});
    setSelectedCartIds([]);
    setCartMetadataEditor(null);
    setCartMetadataDraft("");
    setOwnershipsDraft({ ...EMPTY_OWNERSHIPS });
    setBulkPanelOpen(false);
    setBulkAreaId("");
    setBulkSubAreaId("");
    setNewItemForm({
      areaId: "",
      subAreaId: "",
      status: eventStatus,
      qty: 1,
      ownerships: [],
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
      <h1 className="page-title">{t("wording.eventDetail")}</h1>
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
            {t("wording.backToEvents")}
          </button>
        </div>
        <div className="event-header-row">
          <div className="event-title-wrap"><div className="event-heading">{eventName}</div><span className={`badge ${LIFECYCLE_BADGES[closingFlag]}`}>{t(`lifecycle.${closingFlag}`)}</span></div>

          <div className="event-actions-bar">
            {productionEnabled && <button className="btn btn-ghost" onClick={() => setProductionOpen(true)}>{t("eventUpgrade.requestProduction")}</button>}
            <button className="action-icon-btn btn-cart-outline" disabled={addLocked} onClick={openCart}>
              <IconCart />
            </button>
            <button className="btn-new" disabled={addLocked} onClick={openCart}>
              <IconPlus /> {t("wording.addItem")}
            </button>
            <div className="more-menu-wrap" ref={moreMenuRef}>
              <button
                type="button"
                className="action-icon-btn more-btn"
                title={t("wording.moreMenu")}
                aria-expanded={moreMenuOpen}
                onClick={() => setMoreMenuOpen((open) => !open)}
              >
                <IconMoreVertical />
              </button>
              {moreMenuOpen && (
                <div className="more-menu-dropdown">
                  {!isClosing && <button className="more-menu-item" onClick={() => { openPackagingModal(); setMoreMenuOpen(false); }}>{t('lifecycle.groupItems')}</button>}
                  {!isClosing && <button className="more-menu-item" onClick={() => { setLifecycleMode('ownership'); setMoreMenuOpen(false); }}>{t('lifecycle.bulkOwnership')}</button>}
                  {closingFlag === 'checking-inventory' && <button className="more-menu-item" onClick={() => { setLifecycleMode('check'); setMoreMenuOpen(false); }}>{t('lifecycle.crossCheck')}</button>}
                  <button
                    type="button"
                    className="more-menu-item"
                    onClick={() => {
                      setSummaryOpen(true);
                      setMoreMenuOpen(false);
                    }}
                  >
                    <IconBarChart /> {t("wording.summary")}
                  </button>
                  <button
                    type="button"
                    className="more-menu-item"
                    onClick={() => {
                      window.print();
                      setMoreMenuOpen(false);
                    }}
                  >
                    <IconPrint /> {t("wording.print")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="event-status-section">
          <div className="event-status-section-label">{t("wording.eventStatus")}</div>
          <div className="event-status-stepper-wrap">
            <Stepper
              steps={stages}
              currentIndex={currentStageIndex}
              maxIndex={maxReachedIndex}
              onStepClick={eventStatuses.length && !isClosing ? requestStageChange : undefined}
            />
          </div>
          {closingFlag === 'ready-to-close' && <button className="btn-next-stage" disabled={isLoading || isError || isChangingEventStatus} onClick={() => void startCheckingInventory()}>{isChangingEventStatus ? t("wording.saving") : t('lifecycle.closeStart')}</button>}
          {closingFlag === 'checking-inventory' && <button className="btn-next-stage" onClick={() => setLifecycleMode('return')}>{t('lifecycle.readyReturn')}</button>}
          {!isClosing && hasNextStage && (
            <button
              type="button"
              className="btn-next-stage"
              disabled={(stageScanEnabled && unscannedCount > 0) || isChangingEventStatus}
              title={
                stageScanEnabled && unscannedCount > 0
                  ? `${unscannedCount} item(s) still need to be scanned`
                  : `Move to \"${stages[currentStageIndex + 1]}\"`
              }
              onClick={goToNextStage}
            >
              {isChangingEventStatus ? t("wording.saving") : `${t("wording.next")}: ${stages[currentStageIndex + 1]}`}
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

        {(isClosing || addLocked) && <p className="ed-lock-note">{t(isClosing ? 'eventUpgrade.itemsLocked' : 'eventUpgrade.addLocked')}</p>}
        <div className="ed-toolbar">
          <div className="search-wrap"><IconSearch /><input className="search-input" placeholder={t('wording.keywordSearch')} value={kwSearch} onChange={e => setKwSearch(e.target.value)} /></div>
          <div style={{ flex: 1, minWidth: 190 }}>
            <SearchableSelect
              value={selectedArea}
              onChange={(value) => setSelectedArea(String(value))}
              placeholder={t("wording.allPlace")}
              searchPlaceholder={t("wording.searchArea")}
              emptyText={t("wording.noAreaFound")}
              options={[
                { value: "", label: t("wording.allPlace"), meta: String(items.length) },
                ...areas.map((area) => ({
                  value: area,
                  label: area,
                  meta: String(areaCounts[area] || 0),
                })),
              ]}
            />
          </div>

          <div className="filter-row-right">
            <SearchableSelect value={ownershipFilter} onChange={value => setOwnershipFilter(String(value))} options={[{ value: '', label: t('lifecycle.allOwnership') }, ...OWNERSHIP_OPTIONS.map(value => ({ value, label: `${value} (${items.filter(item => item.ownerships.includes(value)).length})` }))]} />
            <button
              className="btn btn-check"
              onClick={() => {
                if (ownershipFilter === appliedOwnershipFilter) {
                  void refetchEventItems();
                  return;
                }
                setAppliedOwnershipFilter(ownershipFilter);
              }}
            >
              <IconSearch /> {t("wording.check")}
            </button>
          </div>
        </div>

        <div className="stage-tabs-row"><div className="stage-tabs">
          {(['all', 'added', ...(stageScanEnabled ? ['waiting'] : []), 'grouped', ...(productionTabVisible ? ['production'] : [])] as const).map(tab => {
            const labels: Record<string, string> = { all: 'wording.all', added: 'wording.addedNew', waiting: 'wording.waitingScan', grouped: 'wording.grouped', production: 'eventUpgrade.production' };
            const counts: Record<string, number> = { all: scopedItems.length, added: currentStageItems.length, waiting: waitingScanItems.length, grouped: packages.length, production: productionRequestsResponse ? apiProductionRequests.length : (productionItemResponse ? backendProductionItems.length : items.filter(item => item.isNewProductionItem).length) + requests.length };
            return <button key={tab} className={'stage-tab' + (effectiveStageFilter === tab ? ' active' : '')} onClick={() => setStageFilter(tab as typeof stageFilter)}>{t(labels[tab])} <span className="stage-tab-count">{counts[tab]}</span></button>;
          })}
        </div><div className="view-toggle">{(['cards', 'list'] as const).map(mode => <button key={mode} title={t('eventUpgrade.' + mode)} aria-label={t('eventUpgrade.' + mode)} aria-pressed={viewMode === mode} className={viewMode === mode ? 'active' : ''} onClick={() => { setViewMode(mode); try { localStorage.setItem('emi_event_detail_view', mode); } catch { /* Preference is optional. */ } }}>{mode === 'cards' ? '▦' : '☰'}</button>)}</div></div>
        {effectiveStageFilter === "production" ? <div className="production-list">
          {isProductionRequestsLoading ? (
            <p className="no-data">{t("wording.loading")}</p>
          ) : !isProductionRequestsError ? (
            apiProductionRequests.length > 0 ? apiProductionRequests.map((request) => {
              const isConvertRequest = (request.type || "").toUpperCase() === "CONVERT";
              const normalizedStatus = (request.status || "").toUpperCase();
              const statusClass = normalizedStatus === "COMPLETED"
                ? "badge-green"
                : normalizedStatus === "CANCELLED"
                  ? "badge-red"
                  : "badge-orange";
              return <div className="production-card production-request-card" key={request.id}>
                <div className="production-card-main">
                  <div className="production-request-header">
                    <div className="production-request-heading">
                      <span className={`badge ${isConvertRequest ? "badge-blue" : "badge-purple"}`}>
                        {t(isConvertRequest ? "conversion.convert" : "conversion.newProduction")}
                      </span>
                      <strong className="production-request-title">{isConvertRequest
                        ? `${request.old_item?.qty ?? 0} × ${request.old_item?.nama || "—"} → ${request.new_item?.qty ?? 0} × ${request.new_item?.nama || "—"}`
                        : request.item_name}</strong>
                    </div>
                    <span className={`badge production-request-status ${statusClass}`}>{normalizedStatus || "—"}</span>
                  </div>
                  <div className="production-request-details">
                    {isConvertRequest ? <>
                      <div className="production-request-route">
                        <span>{request.old_item?.warehouse_name || "—"}</span>
                        <span className="production-request-route-arrow">→</span>
                        <span>{request.new_item?.warehouse_name || "—"}</span>
                        <span className="production-request-sku">{request.new_item?.sku || "—"}</span>
                      </div>
                      {request.affects_stock && <p className="production-request-warning">{t("conversion.affectsStock")}</p>}
                    </> : <>
                      <div className="production-request-route">
                        <span>{request.area_name || "—"}</span>
                        {request.sub_area_name && <><span className="production-request-route-arrow">/</span><span>{request.sub_area_name}</span></>}
                      </div>
                      {request.notes && <p className="production-request-note">{request.notes}</p>}
                    </>}
                  </div>
                  <div className="production-request-footer">
                    <span>{t("conversion.requestedBy", { name: request.requested_by || "—" })}</span>
                    {request.created_at && <span>{request.created_at}</span>}
                    {request.applied_at && <span>{t("conversion.appliedAt")}: {request.applied_at}</span>}
                  </div>
                </div>
              </div>;
            }) : <p className="no-data">{t('eventUpgrade.noRequests')}</p>
          ) : isProductionItemsLoading ? (
            <p className="no-data">{t("wording.loading")}</p>
          ) : isProductionItemsError ? (
            <p className="no-data">{t("wording.failedToLoadEventItems")}</p>
          ) : visibleProductionItems.length > 0 ? (
            viewMode === "list" ? (
              <ItemTable
                items={visibleProductionItems}
                onOpen={(item) => setDetailId(item.id)}
                onModify={isClosing ? undefined : setModifyItem}
                onDelete={isClosing ? undefined : deleteItem}
                onScan={openScanPopup}
                showScanButton={stageScanEnabled}
                isScanned={isItemScannedForCurrentStatus}
              />
            ) : (
              <div className="items-grid">
                {visibleProductionItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    group={item.groupId ? packages.find((group) => group.id === item.groupId) : undefined}
                    showScanButton={stageScanEnabled && item.id > 0}
                    isScanned={isItemScannedForCurrentStatus(item)}
                    onScan={openScanPopup}
                    onDelete={isClosing ? undefined : deleteItem}
                    onOpen={(selectedItem) => setDetailId(selectedItem.id)}
                    onModify={isClosing ? undefined : setModifyItem}
                  />
                ))}
              </div>
            )
          ) : <p className="no-data">{t('eventUpgrade.noRequests')}</p>}
        </div> : effectiveStageFilter === "grouped" ? (
          <>
            {isEventPackagesLoading ? (
              <div className="no-data">{t("wording.loading")}</div>
            ) : isEventPackagesError ? (
              <div className="no-data">{t("wording.failedToLoadData")}</div>
            ) : packages.length === 0 ? (
              <div className="no-data">{t("wording.noBoxesYetUseTheBoxIconAbove")}</div>
            ) : (
              <>
                <p className="summary-text"><strong>{packages.length}</strong> {t("wording.box")}{packages.length === 1 ? "" : t("wording.es")} {t("wording.packagedEachBoxScansAsOneQrCode")}</p>
                <div className="package-list">
                  {packages.map((group) => {
                    const members = group.items ?? items.filter((item) => group.itemIds.includes(item.id));
                    const allScanned =
                      members.length > 0 &&
                      members.every(isItemScannedForCurrentStatus);
                    return (
                      <div key={group.id} className="package-card">
                        <div className="package-header">
                          <div className="package-header-info">
                            <span className="package-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg></span>
                            <div><div className="package-name">{group.name}</div><div className="package-meta">{members.length} {t("wording.itemInline")}{members.length === 1 ? "" : t("wording.s")} {t("wording.inThisBox")}</div></div>
                          </div>
                          {stageScanEnabled && members.length > 0 && (
                            <button className={`btn-ia-scan${allScanned ? " scanned" : ""}`} onClick={() => openScanPopup(members[0])}>{allScanned ? t("wording.reScanBox") : t("wording.scanBox")}</button>
                          )}
                        </div>
                        {viewMode === 'list' ? <ItemTable items={members} onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem} onDelete={isClosing ? undefined : deleteItem} onScan={openScanPopup} showScanButton={false} isScanned={isItemScannedForCurrentStatus} /> : <div className="items-grid package-items-grid">
                          {members.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              group={group}
                              showScanButton={false}
                              isScanned={isItemScannedForCurrentStatus(item)}
                              onScan={openScanPopup}
                              onDelete={isClosing ? undefined : deleteItem}
                              onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem}
                            />
                          ))}
                        </div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : isLoading ? (
          <div className="no-data">{t("wording.loading")}</div>
        ) : isError ? (
          <div className="no-data">{t("wording.failedToLoadEventItems")}</div>
        ) : displayedItems.length === 0 ? (
          <div className="no-data">{t("wording.noData")}</div>
        ) : (
          <>
            <p className="summary-text">
              {effectiveStageFilter === "waiting" ? (
                <><strong>{displayedItems.length}</strong> {t("wording.itemInline")}{displayedItems.length === 1 ? "" : t("wording.s")} {t("wording.stillNeed")}{displayedItems.length === 1 ? t("wording.s") : ""} {t("wording.scanningAtEventStatus")} <strong>&ldquo;{eventStatus}&rdquo;</strong> {t("wording.inArea")} <strong>&ldquo;{areaLabel}&rdquo;</strong></>
              ) : (
                <><strong>{displayedItems.length}</strong> {t("wording.itemSWithStatus")} <strong>&ldquo;{eventStatus}&rdquo;</strong> {t("wording.inArea")} <strong>&ldquo;{areaLabel}&rdquo;</strong></>
              )}
            </p>
            {viewMode === 'list' ? <ItemTable items={displayedItems} onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem} onDelete={isClosing ? undefined : deleteItem} onScan={openScanPopup} showScanButton={stageScanEnabled} isScanned={isItemScannedForCurrentStatus} /> : <div className="items-grid">
            {displayedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                group={item.groupId ? packages.find((group) => group.id === item.groupId) : undefined}
                showScanButton={stageScanEnabled && item.id > 0}
                isScanned={isItemScannedForCurrentStatus(item)}
                onScan={openScanPopup}
                onDelete={isClosing ? undefined : deleteItem}
                              onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem}
              />
            ))}
            </div>}
          </>
        )}
      </div>

      <Modal open={pendingStage !== null} title={t('eventUpgrade.confirmStage')} onClose={() => { if (!isChangingEventStatus) setPendingStage(null); }} footer={<>
        <button className="btn-cancel-modal" disabled={isChangingEventStatus} onClick={() => setPendingStage(null)}>{t('wording.cancel')}</button>
        <button className="btn-save-modal" disabled={isChangingEventStatus || pendingStage === null} onClick={() => { if (pendingStage !== null) void changeEventStatus(stages[pendingStage], pendingStage); }}>{t(isChangingEventStatus ? 'wording.saving' : willReturn ? 'eventUpgrade.confirmReturn' : willCut ? 'eventUpgrade.confirmCut' : 'eventUpgrade.confirm')}</button>
      </>}>
        <div className="stage-confirm-route">{eventStatus} → <strong>{pendingStage !== null ? stages[pendingStage] : ''}</strong></div>
        {(willCut || willReturn) && <p className="ed-lock-note">{t('eventUpgrade.preview')}</p>}
        {willCut && <p className="stage-confirm-cut">{t('eventUpgrade.cutWarning', { count: items.filter(i => !i.stockCut).length, qty: items.filter(i => !i.stockCut).reduce((sum, i) => sum + i.qty, 0) })}</p>}
        {willReturn && <p className="stage-confirm-cut stage-confirm-return">{t('eventUpgrade.returnWarning')}</p>}
        {pendingStage !== null && pendingStage > currentStageIndex && pendingConverts.length > 0 && <div className="prod-notice prod-notice-warn"><div><p>{t('conversion.warning')}</p><ul>{pendingConverts.map(r => <li key={r.id}>{r.fromQty} × {r.fromName} → {r.toQty} × {r.toName} ({r.fromWarehouse})</li>)}</ul></div></div>}
      </Modal>
      <Drawer open={Boolean(detailItem)} title={t('eventUpgrade.detail')} onClose={() => setDetailId(null)} footer={detailItem && <>
        {isClosing ? <span className="drawer-lock-note">{t('eventUpgrade.readOnly')}</span> : <>
          <button className="btn-cancel-modal" onClick={() => void deleteItem(detailItem.id)}>{t('wording.delete')}</button>
          <button className="btn-save-modal" onClick={() => setModifyItem(detailItem)}>{t('eventUpgrade.modify')}</button>
        </>}
        {stageScanEnabled && detailItem.id > 0 && <button className="btn btn-check" onClick={() => openScanPopup(detailItem)}>{t('wording.scan')}</button>}
      </>}>
        {detailItem && <>
          <div className="drawer-img"><ImagePlaceholder src={detailItem.photo} alt={detailItem.name} /></div>
          <h3>{detailItem.name}</h3><StockBadge item={detailItem} />
          {detailItem.isNewProductionItem && <span className="badge badge-purple">{t('eventUpgrade.productionItem')}</span>}
          {detailItem.fromConvert && <span className="badge badge-blue">{t('conversion.converted')}</span>}
          {detailItem.isConverted && <span className="badge badge-blue">{t('conversion.convertedQty', { count: detailItem.convertedQty })}</span>}
          <dl className="drawer-dl">{[
            [t('wording.qty'), `${detailItem.qty} ${detailItem.unit ?? ''}`], [t('wording.area'), detailItem.area], [t('wording.subArea'), detailItem.subArea],
            ['PIC', detailItem.pic], [t('wording.ownerships'), detailItem.ownerships.join(', ')], [t('wording.status'), detailItem.stage],
            [t('wording.checking'), detailItem.checking ? '✓' : '—'], [t('wording.scanIn'), detailItem.scanIn], [t('wording.scanOut'), detailItem.scanOut],
          ].map(([key, value]) => <div className="drawer-dl-row" key={key}><dt>{key}</dt><dd>{value || '—'}</dd></div>)}</dl>
          <p className="item-note">{detailItem.note || '—'}</p>
          <div className="item-flow-flags">
            {detailItem.isReturned && <span className="item-flow-chip returned">✓ {t('lifecycle.returned')}</span>}
            {detailItem.isTransferredFromOtherEvent && <span className="item-flow-chip transferred">↓ {t('lifecycle.transferred')}</span>}
            {detailItem.isTransferredToOtherEvent && <span className="item-flow-chip transferred">↑ {t('lifecycle.transferred')}</span>}
          </div>
        </>}
      </Drawer>
      {modifyItem && <EventItemEditor key={modifyItem.id} initial={modifyItem} production={false} onSave={saveItemPreview} onClose={() => setModifyItem(null)} />}
      {productionOpen && <EventItemEditor
        initial={{ name: '', qty: 1, area: '', pic: '', note: '', ownerships: ['IHP'] }}
        production
        onSave={submitProduction}
        onConvert={submitConversion}
        conversionItems={items
          .filter((item) => item.id > 0 && item.qty > 0 && Boolean(item.barangId))
          .map((item) => ({
            id: item.id,
            itemId: item.barangId as number,
            stockRowId: item.barangGudangId || item.id,
            name: item.name,
            location: item.area,
            qty: Math.max(0, item.qty - (item.convertedQty ?? 0)),
          }))}
        onClose={() => setProductionOpen(false)}
      />}
      <EventLifecycleModal key={`${eventId}-${lifecycleMode}`} eventId={eventId} eventName={eventName} items={lifecycleItems} stages={eventStatuses} mode={lifecycleMode} onFinalized={refreshAfterFinalize} onClose={() => setLifecycleMode(null)} />
      <Modal
        open={atcOpen}
        title={t("wording.addToCart")}
        onClose={() => setAtcOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setAtcOpen(false)}>
              <IconClose /> {t("wording.cancel")}
            </button>
            <button className="btn-add-cart" onClick={confirmAddToCart}>
              <IconCart /> {t("wording.addToCart")}
            </button>
          </>
        }
      >
        <div className="atc-item-name">
          {items.find((item) => item.id === atcTargetId)?.name}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t("wording.statusState")}</label>
            <SearchableSelect
              value={atcForm.status}
              onChange={(value) =>
                setAtcForm((form) => ({ ...form, status: String(value) }))
              }
              options={stages.map((status) => ({ value: status, label: status }))}
            />
          </div>
          <div className="form-group">
            <label>{t("wording.area")}</label>
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
            <label>{t("wording.qty")}</label>
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
            <label>{t("wording.notes")}</label>
            <input
              type="text"
              placeholder={t("wording.optional")}
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
        title={t("wording.eventCart")}
        onClose={() => setCartOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-m"
              onClick={() => setCartOpen(false)}
              disabled={isSavingCart}
            >
              {t("wording.close")}
            </button>
            <button
              className="btn-checkout"
              onClick={checkout}
              disabled={isSavingCart || cart.length === 0}
            >
              <IconCheck /> {isSavingCart ? t("common.actions.saving") : t("common.actions.saveToEvent")}
            </button>
          </>
        }
      >
        {cart.length === 0 ? (
          <div className="cart-empty">{t("wording.theCartIsEmptyMessage")}</div>
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
                    <span>{t("wording.qtyPrefix")} {cartItem.qty}</span>
                    <span>{t("wording.areaPrefix")} {cartItem.area}</span>
                    <span>{t("wording.subAreaPrefix")} {cartItem.subArea || "-"}</span>
                    <span>{t("wording.statusPrefix")} {cartItem.status}</span>
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
        title={t("wording.addNewItem")}
        onClose={() => setNewItemOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-m"
              onClick={() => setNewItemOpen(false)}
            >
              {t("wording.cancel")}
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
              <IconCheck /> {t("wording.save")}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>{t("wording.selectWarehouse")}</label>
          <SearchableSelect
            value={selectedWarehouseId}
            onChange={(value) => {
              setSelectedWarehouseId(String(value));
              setBarangSearch("");
              setDebouncedBarangSearch("");
              setSelectedBarangGudang(null);
            }}
            placeholder={t("wording.selectAWarehouse")}
            options={warehouseOptions}
          />
        </div>

        <div className="form-group">
          <label>{t("wording.searchItems")}</label>
          <input
            type="search"
            value={barangSearch}
            disabled={!selectedWarehouseId}
            placeholder={t("wording.enterAtLeast3Characters")}
            onChange={(event) => setBarangSearch(event.target.value)}
          />
        </div>

        <div className="form-group">
          <label>{t("wording.selectItem")}</label>
          <div className="event-master-item-list">
            {!selectedWarehouseId ? (
              <div className="event-master-item-empty">
                {t("wording.selectAWarehouseFirst")}
              </div>
            ) : isBarangGudangLoading ? (
              <div className="event-master-item-empty">{t("wording.loadingItemsPlaceholder")}</div>
            ) : isBarangGudangError ? (
              <div className="event-master-item-empty">
                {t("wording.failedToLoadItems")}
              </div>
            ) : barangGudangItems.length === 0 ? (
              <div className="event-master-item-empty">{t("wording.noItemsAvailable")}</div>
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
                        {t("wording.stockPrefix")} {barang.stok_barang}
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
            <label>{t("wording.area")}</label>
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
              placeholder={isAreaListLoading ? t("wording.loadingAreas") : isAreaListError ? t("wording.failedToLoadAreas") : t("wording.selectAnArea")}
              options={masterAreas.map((area) => ({ value: area.id, label: area.name }))}
            />
          </div>
          <div className="form-group">
            <label>{t("wording.subArea")}</label>
            <SearchableSelect
              value={newItemForm.subAreaId}
              disabled={!newItemForm.areaId || isSubAreaLoading}
              onChange={(value) =>
                setNewItemForm((form) => ({
                  ...form,
                  subAreaId: String(value),
                }))
              }
              placeholder={!newItemForm.areaId ? t("wording.selectAnAreaFirst") : isSubAreaLoading ? t("wording.loadingSubAreas") : isSubAreaError ? t("wording.failedToLoadSubAreas") : t("wording.selectASubArea")}
              emptyText={t("wording.noSubAreasAvailable")}
              options={filteredSubAreas.map((subArea) => ({ value: subArea.id, label: subArea.sub_area_name }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t("wording.status")}</label>
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
            <label>{t("wording.qty")}</label>
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
            <label>{t("wording.ownerships")}</label>
            <div className="cart-item-code-options">
              {OWNERSHIP_OPTIONS.map((ownership) => (
                <label key={ownership} className="cart-item-code-option">
                  <input
                    type="checkbox"
                    checked={newItemForm.ownerships.includes(ownership)}
                    onChange={() => setNewItemForm((form) => ({
                      ...form,
                      ownerships: form.ownerships.includes(ownership)
                        ? form.ownerships.filter((value) => value !== ownership)
                        : [...form.ownerships, ownership],
                    }))}
                  />
                  <span>{ownership}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>{t("wording.memo")}</label>
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
              <span>{t("wording.checked")}</span>
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
              <span>{t("wording.warehouseItem")}</span>
            </label>
          </div>
        </div>
        {newItemForm.checked ? (
          <div className="form-row">
            <div className="form-group">
              <label>{t("wording.inputBy")}</label>
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
              <label>{t("wording.image")}</label>
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
            <label>{t("wording.imagePreview")}</label>
            <img src={newItemForm.image} alt="Uploaded item preview" />
          </div>
        ) : (
          <></>
        )}
      </Modal>

      {/* Inventory Picker + Cart Modal — two panels, no popping in/out */}
      <Modal
        open={newItemOpen}
        title={t("wording.addItemsFromInventory")}
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
              <IconClose /> {t("wording.close")}
            </button>
            <button
              className="btn-checkout"
              onClick={handlePickerCheckout}
              disabled={cart.length === 0 || isSavingCart}
            >
              <IconCheck />{" "}
              {hasMissingArea ? t("common.actions.completeLocations") : t("common.actions.saveToEvent")}
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
                  placeholder={t("wording.searchNameOrSku")}
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
                    { value: "", label: t("wording.allCategories") },
                    ...categoryOptions,
                  ]}
                />
              </div>
            </div>

            <div className="inv-pick-list">
              {pickerFiltered.length === 0 ? (
                <div className="no-data">{t("wording.noItemsFound")}</div>
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
                              ? t("wording.outOfStock")
                              : warehouseStock < 10
                                ? t("wording.lowStock")
                                : t("wording.available")}
                          </span>
                        </div>
                        <div className="inv-pick-meta">
                          <span style={{ fontFamily: "monospace" }}>
                            {inv.code || `#${inv.barang_id}`}
                          </span>{" "}
                          · {inv.nama_kategori} · {inv.nama_satuan}
                        </div>
                        <div className="inv-pick-stock">
                          {t("wording.availableStock")}{" "}
                          <strong>
                            {warehouseStock} {inv.nama_satuan}
                          </strong>
                        </div>
                        <div className="inv-pick-warehouse-row">
                          <label>{t("wording.takeFromWarehouse")}</label>
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
                                meta: t("dynamic.inStock", { count: warehouse.stok_gudang }),
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
                          <IconCart /> {outOfStock ? t("wording.outOfStock") : t("wording.add")}
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
              <IconCart /> {t("wording.cart")}{" "}
              <span className="inv-cart-count">{cart.length}</span>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">{t("wording.theCartIsEmpty")}</div>
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
                    {t("wording.selectAll")}{selectedCartIds.length}/{cart.length})
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
                    {t("wording.assignLocations")}{selectedCartIds.length})
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
                        placeholder={t("wording.selectArea")}
                        options={masterAreas.map((area) => ({ value: area.id, label: area.name }))}
                      />
                    </div>
                    <div className="wi-select-wrap">
                      <SearchableSelect
                        inline
                        value={bulkSubAreaId}
                        onChange={(value) => setBulkSubAreaId(String(value))}
                        disabled={!bulkAreaId}
                        placeholder={bulkSubAreas.length ? t("wording.selectSubArea") : t("wording.noSubAreas")}
                        options={bulkSubAreas.map((subArea) => ({ value: subArea.id, label: subArea.sub_area_name }))}
                      />
                    </div>
                    <button
                      className="btn-save-modal"
                      disabled={!bulkAreaId || !bulkSubAreaId}
                      onClick={applyBulkAssign}
                    >
                      <IconCheck /> {t("wording.applyTo")} {selectedCartIds.length} {t("wording.itemsInline")}
                    </button>
                    <button
                      className="btn-cancel-m"
                      onClick={() => setBulkPanelOpen(false)}
                    >
                      {t("wording.cancel")}
                    </button>
                  </div>
                )}

                <div className="cart-list">
                  {cart.map((c) => {
                    const hasNotes = Boolean((c.note || c.memo || "").trim());
                    const hasPic = Boolean(c.pic.trim());
                    const hasOwnerships = Object.values(c.ownerships).some(Boolean);
                    const activeEditor =
                      cartMetadataEditor?.cartId === c.cartId
                        ? cartMetadataEditor.field
                        : null;

                    return (
                    <div key={c.cartId} className="inventory-cart-item-shell">
                      <div className="cart-item">
                      <input
                        type="checkbox"
                        checked={selectedCartIds.includes(c.cartId)}
                        onChange={() => toggleCartSelect(c.cartId)}
                      />
                      <img
                        className="cart-item-img"
                        src={c.photo}
                        alt={c.name}
                        onError={(event) => {
                          event.currentTarget.src = noImage;
                        }}
                      />
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
                          title={t("wording.assignLocation")}
                          aria-label={t("dynamic.assignLocation", { name: c.name })}
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
                        type="button"
                        className={`cart-item-metadata-button${hasNotes ? " has-value" : ""}`}
                        title={hasNotes ? t("wording.editNotes") : t("wording.addNotes")}
                        aria-label={hasNotes ? t("wording.editNotes") : t("wording.addNotes")}
                        aria-expanded={activeEditor === "notes"}
                        onClick={() => toggleCartMetadataEditor(c, "notes")}
                      >
                        <IconNotes />
                        {hasNotes && <span className="cart-item-metadata-dot" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        className={`cart-item-metadata-button${hasPic ? " has-value" : ""}`}
                        title={hasPic ? t("wording.editPic") : t("wording.addPic")}
                        aria-label={hasPic ? t("wording.editPic") : t("wording.addPic")}
                        aria-expanded={activeEditor === "pic"}
                        onClick={() => toggleCartMetadataEditor(c, "pic")}
                      >
                        <IconUser />
                        {hasPic && <span className="cart-item-metadata-dot" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        className={`cart-item-metadata-button${hasOwnerships ? " has-value" : ""}`}
                        title={hasOwnerships ? t("wording.editOwnerships") : t("wording.addOwnerships")}
                        aria-label={hasOwnerships ? t("wording.editOwnerships") : t("wording.addOwnerships")}
                        aria-expanded={activeEditor === "ownerships"}
                        onClick={() => toggleCartMetadataEditor(c, "ownerships")}
                      >
                        <IconTag />
                        {hasOwnerships && <span className="cart-item-metadata-dot" aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        className="cart-item-remove"
                        onClick={() => removeInventoryCartItem(c.cartId)}
                        aria-label={t("wording.remove")}
                      >
                        <IconDelete />
                      </button>
                      </div>
                      {activeEditor && (
                        <div className="cart-item-note-editor">
                          {activeEditor === "ownerships" ? (
                            <div className="cart-item-code-fieldset">
                              <div className="cart-item-editor-label">
                                {t("wording.ownerships")}
                              </div>
                              <div className="cart-item-code-options">
                                {OWNERSHIP_OPTIONS.map((ownership) => (
                                  <label key={ownership} className="cart-item-code-option">
                                    <input
                                      type="checkbox"
                                      checked={ownershipsDraft[ownershipKey(ownership)]}
                                      onChange={() => toggleOwnership(ownership)}
                                    />
                                    <span>{ownership}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <TextInput
                              label={activeEditor === "pic" ? t("wording.pic") : t("wording.notes")}
                              value={cartMetadataDraft}
                              placeholder={activeEditor === "pic" ? t("wording.picPlaceholder") : t("wording.notesPlaceholder")}
                              onChange={setCartMetadataDraft}
                              containerStyle={{ marginBottom: 0 }}
                            />
                          )}
                          <button
                            type="button"
                            className="btn-save-modal cart-item-note-submit"
                            onClick={() => saveCartItemMetadata(c.cartId)}
                          >
                            <IconCheck /> {t("common.actions.save")}
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={summaryOpen}
        title={t("wording.eventSummary")}
        onClose={() => setSummaryOpen(false)}
        size="lg"
      >
        <div className="summary-popup-title">{eventName}</div>
        <div className="summary-popup-status">{t("wording.statusPrefix")} {eventStatus}</div>
        <div className="summary-popup-kpis">
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.total}</div><div className="summary-popup-kpi-label">{t("wording.totalItems")}</div></div>
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.checked}</div><div className="summary-popup-kpi-label">{t("wording.checked")}</div></div>
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.scanIn}</div><div className="summary-popup-kpi-label">{t("wording.scannedIn")}</div></div>
        </div>
        <p className="summary-text">
          {t("wording.totalQuantity")} <strong>{summaryStats.totalQty}</strong> {t("wording.scannedOut")}{" "}
          <strong>{summaryStats.scanOut}</strong> {t("wording.of")} {summaryStats.total}
        </p>
        <button
          type="button"
          className="summary-popup-view-detail"
          onClick={() => {
            setSummaryOpen(false);
            navigate(`/event-summary?id=${eventId}`);
          }}
        >
          <IconBarChart /> {t("wording.viewFullDetail")}
        </button>
      </Modal>

      <Modal open={Boolean(scanningItem)} title={t("wording.scanItem")} onClose={closeScanPopup}>
        {scanningItem && (
          <div className="scan-popup-content">
            {scanningItem.groupId ? (
              <>
                <div className="scan-popup-title">{t("wording.package")} {packages.find((group) => group.id === scanningItem.groupId)?.name}</div>
                <div className="scan-popup-subtitle">{t("wording.allItemsInThisBoxWillBeScanned")}</div>
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
                <button type="button" className="btn-save-modal" onClick={startScan}>{t("wording.startScan")}</button>
              </>
            )}
            {scanPhase === "scanning" && (
              <><div className="scan-target-box scanning"><div className="scan-spinner" /></div><p className="scan-popup-subtitle">{t("wording.scanning")}</p></>
            )}
            {scanPhase === "done" && (
              <><div className="scan-target-box success"><CheckIcon /></div><p className="scan-popup-success">{t("wording.scanCompleted")}</p><button type="button" className="btn-save-modal" onClick={finishScan}><IconCheck /> {t("wording.done")}</button></>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={packagingOpen}
        title={t("wording.groupItemsForPackaging")}
        onClose={() => setPackagingOpen(false)}
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setPackagingOpen(false)}><IconClose /> {t("wording.cancel")}</button>
            <button className="btn-save-modal" disabled={!packagingName.trim() || packagingSelection.length === 0 || isCreatingPackage} onClick={() => void createPackage()}><IconCheck /> {isCreatingPackage ? t("wording.saving") : `${t("wording.createGroup")} (${packagingSelection.length})`}</button>
          </>
        }
      >
        <div className="form-group">
          <label>{t("wording.groupName")} <span className="required">*</span></label>
          <input type="text" placeholder={t("wording.eGCeremonyDecorBundle")} value={packagingName} onChange={(event) => setPackagingName(event.target.value)} />
        </div>
        <p className="package-pick-help">{t("wording.anyItemNotAlreadyInABoxCan")}</p>
        <div className="package-pick-list">
          {packableItems.length === 0 ? (
            <div className="no-data">{t("wording.noEligibleUngroupedItems")}</div>
          ) : packableItems.map((item) => (
            <label key={item.id} className={`package-pick-row${packagingSelection.includes(item.id) ? " selected" : ""}`}>
              <input type="checkbox" checked={packagingSelection.includes(item.id)} onChange={() => togglePackagingSelection(item.id)} />
              <span><span className="package-pick-row-name">{item.name}</span><span className="package-pick-row-meta">{item.area} {t("wording.qtyPrefixOnEventDetailPage")} {item.qty}</span></span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
