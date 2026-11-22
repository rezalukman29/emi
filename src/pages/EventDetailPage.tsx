import { fmtNum as fmtDisplayNumber } from '../lib/format';
import BrokenItemReport from '../components/BrokenItemReport';
import PrintPlanModal from '../components/PrintPlanModal.jsx';
import RentalLogTab from '../components/RentalLogTab';
import EventBorrowItemModal from '../components/EventBorrowItemModal';
import EventBorrowedItemsPanel from '../components/EventBorrowedItemsPanel';
import EventOutsourceItemModal from '../components/EventOutsourceItemModal';
import EventOutsourceItemsPanel from '../components/EventOutsourceItemsPanel';
import { stagePromptStep, type BrokenReport } from '../lib/sourcePreview';
import { useEffect, useMemo, useRef, useState, type UIEvent as ReactUIEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQRCode } from "next-qrcode";
import axios from "axios";
import { toast } from "react-toastify";
import { useInfiniteQuery, useQueryClient } from "react-query";
import Modal from "../components/Modal";
import EventLifecycleModal, { type LifecycleModalMode } from '../components/EventLifecycleModal';
import { useEventLifecycle, updateEventLifecycle, resolveLifecycle, LIFECYCLE_BADGES, ownershipClass, type Ownership } from '../lib/eventLifecycle';
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
  IconLayers,
  IconUsers,
} from "../components/icons";
import {
  getBarangGudangV2,
  type BarangGudangItemV2,
  type BarangGudangWarehouseV2,
} from "../hooks/api/useGetBarangGudangV2";
import useGetAreaList from "../hooks/api/useGetAreaList";
import useCreateFixEventList from "../hooks/api/useCreateFixEventList";
import useCreateFixListItem from "../hooks/api/useCreateFixListItem";
import usePutEventItem from '../hooks/api/usePutEventItem';
import useCreateProductionRequest from '../hooks/api/useCreateProductionRequest';
import useConvertEventItem from '../hooks/api/useConvertEventItem';
import { useDeleteBrokenItemReport } from '../hooks/api/useBrokenItemReport';
import useGetProductionRequests from '../hooks/api/useGetProductionRequests';
import {
  getLoanItem,
  loanItemToUpdatePayload,
  type LoanItem,
  useDeleteLoanItem,
  useGetEventBorrowedItems,
  useUpdateLoanItem,
} from '../hooks/api/useGetItemLoans';
import {
  outsourceItemPayload,
  type OutsourceItem,
  useDeleteOutsourceItem,
  useGetEventOutsourceItems,
  useUpdateOutsourceItem,
} from '../hooks/api/useOutsource';
import useCreatePackage from "../hooks/api/useCreatePackage";
import useGetEventPackages from "../hooks/api/useGetEventPackages";
import useGetEventItem, { type EventItem } from "../hooks/api/useGetEventItem";
import useGetSubArea from "../hooks/api/useGetSubArea";
import { getPhotoUrl, noImage } from "../utils/function";
import { useWarehouseController } from "./lib/useWarehouseController";
import { useCategoryController } from "./lib/useCategoryController";
import useGetEventDetail from "../hooks/api/useGetEventDetail";
import useGetEventStatus from "../hooks/api/useGetEventStatus";
import EventChecklistPanel from "../components/checklist/EventChecklistPanel";
import { useUiVariant } from "../lib/uiVariant";
import { todayIso } from "../data/eventChecklistMock";
import {
  ensureEventChecklist,
  seedTemplates,
  summarizeEvent,
  toChecklistStages,
  useChecklistStore,
  type ChecklistEventRef,
} from "../lib/checklistStore";
import { prepareEventFile, useDeleteEventFile, useGetEventFiles, useUploadEventFile } from "../hooks/api/useEventFiles";
import useCheckEventItems, { type EventItemCheckUpdate } from "../hooks/api/useCheckEventItems";
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

function formatJakartaDateTime(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = trimmed.includes("T")
    ? `${trimmed}${hasTimeZone ? "" : "Z"}`
    : `${trimmed.replace(" ", "T")}${hasTimeZone ? "" : "Z"}`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return trimmed;

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
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
  category?: string;
  sku?: string;
  warehouses?: string;
  brokenReport?: BrokenReport;
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
  checkedStatus?: boolean;
  checkedNote?: string;
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
  checkingMode?: boolean;
  isCheckUpdating?: boolean;
  onToggleChecked?: (item: DisplayItem) => void;
  onEditCheckNote?: (item: DisplayItem) => void;
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
    category: item.kategori ?? undefined,
    sku: item.code,
    warehouses: item.gudang?.map(w => `${w.nama} (${w.stock})`).join(", "),
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
    checkedStatus: Boolean(item.checked_status),
    checkedNote: item.checked_note ?? "",
    ownerships,
    isReturned: item.is_returned === 1,
    isTransferredToOtherEvent: item.is_transfer_to_other_event === 1,
    isTransferredFromOtherEvent: item.is_transfer_from_other_event === 1,
    isNewProductionItem: item.is_new_production_item,
    isConverted: item.is_converted,
    convertedQty: Number(item.converted_qty ?? 0),
    packageId: item.package?.id ?? null,
    brokenReport: item.broken_item
      ? {
        id: item.broken_item.id,
        qty: item.broken_item.qty,
        note: item.broken_item.notes ?? "",
        by: item.broken_item.reported_by ?? "",
        at: item.broken_item.reported_at ?? "",
      }
      : undefined,
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
  checkingMode = false,
  isCheckUpdating = false,
  onToggleChecked,
  onEditCheckNote,
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
        <StockBadge item={item} />{item.brokenReport && <span className="badge badge-red">{i18n.t("sourceUpgrade.broken", { qty: item.brokenReport.qty })}</span>}
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
          <span className="item-qty">{i18n.t("wording.qtyPrefix")} {fmtDisplayNumber(item.qty)}</span>
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
        {!checkingMode && <div className="item-indicators">
          <div className="indicator-row">
            <span className={`indicator-box${item.checking ? " checked" : ""}`}>
              {item.checking && <CheckIcon />}
            </span>
            {i18n.t("wording.checking")}
          </div>
        </div>}
        <div className="scan-rows">
          <div className="scan-row">
            <span className={`scan-badge ${item.scanIn ? "ok" : "fail"}`}>
              {item.scanIn ? <CheckIcon /> : <XIcon />}
            </span>
            <span
              className="scan-label-text"
              style={!item.scanIn ? { color: "var(--dk-faint, #9aa0b8)" } : {}}
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
              style={!item.scanOut ? { color: "var(--dk-faint, #9aa0b8)" } : {}}
            >
              {item.scanOut ? `Scanned Out at ${item.scanOut}` : "Scan Out"}
            </span>
          </div>
        </div>
        {item.note && <div className="item-note">{item.note}</div>}
        {checkingMode && item.id > 0 && (
          <div className="event-item-check" onClick={(event) => event.stopPropagation()}>
            {item.checkedNote && <div className="event-item-check-note">{item.checkedNote}</div>}
            <div className="event-item-check-actions">
              <button type="button" className={`event-item-check-toggle${item.checkedStatus ? " checked" : ""}`} disabled={isCheckUpdating} onClick={() => onToggleChecked?.(item)}>
                <CheckIcon /> {item.checkedStatus ? "Checked" : "Mark checked"}
              </button>
              <button type="button" className="event-item-note-button" disabled={isCheckUpdating} onClick={() => onEditCheckNote?.(item)}>
                {item.checkedNote ? "Edit note" : "Note"}
              </button>
            </div>
          </div>
        )}
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

function ItemTable({ items, onOpen, onModify, onDelete, onScan, showScanButton, isScanned, checkingMode = false, isCheckUpdating = false, onToggleChecked, onEditCheckNote }: {
  items: DisplayItem[]; onOpen: (item: DisplayItem) => void; onModify?: (item: DisplayItem) => void;
  onDelete?: (id: number) => void; onScan: (item: DisplayItem) => void; showScanButton: boolean; isScanned: (item: DisplayItem) => boolean;
  checkingMode?: boolean; isCheckUpdating?: boolean; onToggleChecked?: (item: DisplayItem) => void; onEditCheckNote?: (item: DisplayItem) => void;
}) {
  const { t } = useTranslation();
  return <div className="table-wrap item-table-wrap"><table className="item-table"><thead><tr>
    {['item', 'area', 'qty', 'pic', 'ownerships', 'checking', 'scanIn', 'scanOut', 'actions'].map(key => <th key={key}>{key === 'pic' ? 'PIC' : t('wording.' + key)}</th>)}
  </tr></thead><tbody>{items.map(item => <tr key={item.id} tabIndex={0} className="item-table-row" onClick={() => onOpen(item)} onKeyDown={e => { if (e.target === e.currentTarget && e.key === 'Enter') onOpen(item); }}>
    <td><strong>{item.name}</strong><div className="item-table-flags">
      {item.groupName && <span className="badge badge-purple">{item.groupName}</span>}<StockBadge item={item} />
      {item.brokenReport && <span className="badge badge-red">{t('sourceUpgrade.broken', { qty: item.brokenReport.qty })}</span>}
      {item.fromProduction && <span className="badge badge-purple">{t('eventUpgrade.previewItem')}</span>}
      {item.isNewProductionItem && <span className="badge badge-purple">{t('eventUpgrade.productionItem')}</span>}
      {item.fromConvert && <span className="badge badge-blue">{t('conversion.converted')}</span>}
      {item.isConverted && <span className="badge badge-blue">{t('conversion.convertedQty', { count: item.convertedQty })}</span>}
      {item.isReturned && <span className="badge badge-green">✓ {t('lifecycle.returned')}</span>}
      {item.isTransferredFromOtherEvent && <span className="badge badge-orange">↓ {t('lifecycle.transferred')}</span>}
      {item.isTransferredToOtherEvent && <span className="badge badge-orange">↑ {t('lifecycle.transferred')}</span>}
    </div><div className="item-table-note">{item.note}</div></td>
    <td>{item.area}<div className="item-table-sub">{item.subArea}</div></td><td>{fmtDisplayNumber(item.qty)} {item.unit}</td><td>{item.pic || '—'}</td>
    <td>{item.ownerships.map(o => <span key={o} className={'badge ' + ownershipClass(o)}>{o}</span>)}</td>
    <td>{checkingMode && item.id > 0 ? <div className="event-check-table">
      <span>{item.checkedStatus ? "Checked" : "Not checked"}</span>
      {item.checkedNote && <small>{item.checkedNote}</small>}
      <div>
        <button type="button" className={`event-check-toggle${item.checkedStatus ? " checked" : ""}`} disabled={isCheckUpdating} onClick={event => { event.stopPropagation(); onToggleChecked?.(item); }}><CheckIcon /> {item.checkedStatus ? "Checked" : "Mark checked"}</button>
        <button type="button" className="event-check-note-button" disabled={isCheckUpdating} onClick={event => { event.stopPropagation(); onEditCheckNote?.(item); }}>{item.checkedNote ? "Edit note" : "Note"}</button>
      </div>
    </div> : item.checking ? '✓' : '—'}</td><td>{item.scanIn || '—'}</td><td>{item.scanOut || '—'}</td>
    <td><div className="item-table-actions">
      {showScanButton && item.id > 0 && <button className="btn btn-check" onClick={e => { e.stopPropagation(); onScan(item); }}>{t(isScanned(item) ? 'common.actions.rescan' : 'common.actions.scan')}</button>}
      {onModify && <button className="btn-icon" title={t('eventUpgrade.modify')} onClick={e => { e.stopPropagation(); onModify(item); }}><IconEdit /></button>}
      {onDelete && <button className="btn-icon" title={t('wording.delete')} onClick={e => { e.stopPropagation(); onDelete(item.id); }}><IconDelete /></button>}
    </div></td>
  </tr>)}</tbody></table></div>;
}

export default function EventDetailPage() {
  const { t } = useTranslation();
  const { SVG: QRCodeSvg } = useQRCode();
  const { id: routeEventId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventId = Number(routeEventId ?? searchParams.get("id"));
  const lifecycleStore = useEventLifecycle();
  const [reportItem, setReportItem] = useState<DisplayItem | null>(null);
  const [productionInitial, setProductionInitial] = useState<EventItemDraft | null>(null);
  const [flowStep, setFlowStep] = useState<'ownership' | 'broken' | 'confirm'>('confirm');
  const [ownershipAnswered, setOwnershipAnswered] = useState<number[]>([]);
  const [resumeStage, setResumeStage] = useState<number | null>(null);
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
  const {
    data: checkingItemsResponse,
    isLoading: isCheckingItemsLoading,
    isError: isCheckingItemsError,
    refetch: refetchCheckingItems,
  } = useGetEventItem({
    params: { event_id: eventId, order: "asc" },
    options: {
      enabled: Boolean(eventId && eventDetail?.is_complete === 1 && eventDetail.is_finished === 0),
    },
  });
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
  const {
    data: borrowedItemsResponse,
    isLoading: isBorrowedItemsLoading,
    isError: isBorrowedItemsError,
    refetch: refetchBorrowedItems,
  } = useGetEventBorrowedItems(eventId, Boolean(eventId));
  const {
    data: outsourceItemsResponse,
    isLoading: isOutsourceItemsLoading,
    isError: isOutsourceItemsError,
    refetch: refetchOutsourceItems,
  } = useGetEventOutsourceItems(eventId, { enabled: Boolean(eventId) });
  const statusNames = useMemo(
    () => new Map(eventStatuses.map((status) => [status.id, status.name])),
    [eventStatuses],
  );
  const checkingEventItems = useMemo(
    () => (checkingItemsResponse?.data ?? []).map((item) => mapEventItem(item, statusNames)),
    [checkingItemsResponse?.data, statusNames],
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
  const { mutateAsync: deleteBrokenReport, isLoading: isDeletingBrokenReport } =
    useDeleteBrokenItemReport();
  const { mutateAsync: updateLoanItem, isLoading: isUpdatingLoanItem } = useUpdateLoanItem();
  const { mutateAsync: deleteLoanItem, isLoading: isDeletingLoanItem } = useDeleteLoanItem();
  const { mutateAsync: updateOutsourceItem, isLoading: isUpdatingOutsourceItem } = useUpdateOutsourceItem();
  const { mutateAsync: deleteOutsourceItem, isLoading: isDeletingOutsourceItem } = useDeleteOutsourceItem();

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
  const [printPlanOpen, setPrintPlanOpen] = useState(false);
  const [printChooserOpen, setPrintChooserOpen] = useState(false);
  const [drawerMenuOpen, setDrawerMenuOpen] = useState(false);
  // Layout B (A/B test, owner 2026-11-22): same state and actions, cleaner arrangement.
  const isB = useUiVariant() === 'B';
  const [requestMenuOpen, setRequestMenuOpen] = useState(false);
  const requestMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!requestMenuOpen) return;
    const close = (event: MouseEvent) => { if (!requestMenuRef.current?.contains(event.target as Node)) setRequestMenuOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setRequestMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [requestMenuOpen]);
  const [filesOpen, setFilesOpen] = useState(false);
  const [isUploadingEventFiles, setIsUploadingEventFiles] = useState(false);
  const [deletingEventFileId, setDeletingEventFileId] = useState<number | null>(null);
  const eventFileInputRef = useRef<HTMLInputElement | null>(null);
  const eventFilesQuery = useGetEventFiles(eventId);
  const { mutateAsync: uploadEventFile } = useUploadEventFile();
  const { mutateAsync: deleteEventFile } = useDeleteEventFile();
  const eventFiles = eventFilesQuery.data?.data ?? [];
  const printPlanItems = useGetEventItem({ params: { event_id: eventId, order: 'asc' }, options: { enabled: printPlanOpen && eventId > 0 } });
  const [rentalOpen, setRentalOpen] = useState(false);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [outsourceOpen, setOutsourceOpen] = useState(false);
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

  async function addEventFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    setIsUploadingEventFiles(true);
    let uploadedCount = 0;
    try {
      for (const file of selectedFiles) {
        try {
          const preparedFile = await prepareEventFile(file);
          await uploadEventFile({ eventId, file: preparedFile });
          uploadedCount += 1;
        } catch (error) {
          toast.error(getCheckoutErrorMessage(error));
        }
      }
    } finally {
      setIsUploadingEventFiles(false);
    }
    if (uploadedCount > 0) {
      await eventFilesQuery.refetch();
      toast.success(`${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded.`);
    }
  }

  async function removeEventFile(fileId: number, fileName: string) {
    if (!window.confirm(`Delete "${fileName}"?`)) return;
    setDeletingEventFileId(fileId);
    try {
      const response = await deleteEventFile(fileId);
      await eventFilesQuery.refetch();
      toast.success(response.message || "Event file deleted.");
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    } finally {
      setDeletingEventFileId(null);
    }
  }

  const [selectedArea, setSelectedArea] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | "waiting" | "added" | "unchecked" | "checked" | "grouped" | "production" | "borrowed" | "outsourced">("all");
  const [checkingModeActivated, setCheckingModeActivated] = useState(false);
  const [startCheckOpen, setStartCheckOpen] = useState(false);
  const [checkNoteItem, setCheckNoteItem] = useState<DisplayItem | null>(null);
  const [checkNoteDraft, setCheckNoteDraft] = useState("");
  const [kwSearch, setKwSearch] = useState("");
  const { mutateAsync: updateEventItemChecks, isLoading: isUpdatingEventItemChecks } = useCheckEventItems();
  useEffect(() => {
    setCheckingModeActivated(false);
    setStartCheckOpen(false);
    setCheckNoteItem(null);
  }, [eventId]);

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
  const inventoryPickerListRef = useRef<HTMLDivElement>(null);
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
    setReportItem(null); setProductionInitial(null); setOwnershipAnswered([]); setResumeStage(null); setFlowStep('confirm');
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
    // Wait for the event itself: when the status list arrives first (cached, or simply a faster
    // response), deciding now falls back to the first stage and locks it (bug found 2026-11-20).
    if (!eventStatuses.length || !eventDetail || currentStatusId !== null) return;

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

  const barangGudangFilters = useMemo(() => ({
    gudang_id: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
    categoryId: pickerCategory ? Number(pickerCategory) : undefined,
    search: debouncedBarangSearch || undefined,
  }), [debouncedBarangSearch, pickerCategory, selectedWarehouseId]);
  const {
    data: barangGudangPages,
    isLoading: isBarangGudangLoading,
    isError: isBarangGudangError,
    refetch: refetchBarangGudangPages,
    isFetchingNextPage: isFetchingNextBarangPage,
    fetchNextPage: fetchNextBarangPage,
    hasNextPage: hasNextBarangPage,
  } = useInfiniteQuery(
    ["useGetBarangGudangV2", "infinite", barangGudangFilters],
    ({ pageParam = 1 }) => getBarangGudangV2({
      params: {
        page: Number(pageParam),
        limit: 30,
        ...barangGudangFilters,
      },
    }),
    {
      enabled: newItemOpen,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    },
  );

  useEffect(() => {
    if (newItemOpen) inventoryPickerListRef.current?.scrollTo({ top: 0 });
  }, [debouncedBarangSearch, newItemOpen, pickerCategory, selectedWarehouseId]);

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
          brokenReport: item.isNewProductionItem ? undefined : item.brokenReport,
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
  const matchedCurrentStageIndex = eventStatuses.findIndex(
    (status) => status.id === (currentStatusId ?? eventDetail?.status),
  );
  const currentStageIndex = Math.max(0, matchedCurrentStageIndex);
  const currentStatus = matchedCurrentStageIndex >= 0
    ? eventStatuses[matchedCurrentStageIndex]
    : undefined;
  const eventStatus = currentStatus?.name ?? stages[currentStageIndex] ?? stages[0];
  const closingFlag = resolveLifecycle({ id: eventId, status: currentStatus?.id, is_complete: eventDetail?.is_complete, is_finished: eventDetail?.is_finished, total_items: lifecycleItems.length }, { ...lifecycle, stageId: currentStatus?.id, itemCount: lifecycleItems.length }, eventStatuses[eventStatuses.length - 1]?.id);
  const isClosing = ['checking-inventory', 'returned-completed', 'transferred'].includes(closingFlag);

  // Event Checklist inside the event (preview on mock data, owner 2026-11-20): same checklist as
  // the Event Checklist page, kept in this browser by src/lib/checklistStore.ts. ?view=checklist opens it.
  const detailView: 'items' | 'checklist' = searchParams.get('view') === 'checklist' ? 'checklist' : 'items';
  const setDetailView = (view: 'items' | 'checklist') =>
    setSearchParams((params) => {
      if (view === 'checklist') params.set('view', 'checklist'); else params.delete('view');
      return params;
    }, { replace: true });
  const checklistStore = useChecklistStore();
  const checklistStages = useMemo(() => toChecklistStages(eventStatuses), [eventStatuses]);
  const checklistEvent = useMemo<ChecklistEventRef | null>(() => {
    if (!eventId || !eventDetail) return null;
    const start = String(eventDetail.event_start || eventDetail.date_event || '').slice(0, 10);
    return {
      id: eventId,
      name: eventDetail.name?.trim() || `#${eventId}`,
      venue: eventDetail.address || '',
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : '',
      currentStageId: currentStatus?.id ?? null,
    };
  }, [eventId, eventDetail, currentStatus?.id]);
  useEffect(() => { seedTemplates(checklistStages); }, [checklistStages]);
  useEffect(() => {
    if (checklistEvent && checklistStore.templatesSeeded) ensureEventChecklist(checklistEvent, checklistStages);
  }, [checklistEvent, checklistStages, checklistStore.templatesSeeded]);
  const checklistSummary = checklistEvent
    ? summarizeEvent(checklistEvent.id, checklistEvent.currentStageId, checklistStore.items, todayIso())
    : null;
  const deleteAllowed = currentStatus?.allow_delete === true && !isClosing;
  const features = Object.fromEntries(eventStatuses.map(status => [status.id, eventStatusFeatures(status)]));
  const maxReachedIndex = Math.max(currentStageIndex, eventStatuses.findIndex(s => s.id === lifecycle?.furthestStageId));
  const returnIndex = eventStatuses.findIndex(s => features[s.id]?.stockReturn);
  useEffect(() => {
    if (!eventDetail || !eventItemResponse || !currentStatus?.id) return;
    if (lifecycle?.stageId === currentStatus.id && lifecycle?.itemCount === lifecycleItems.length && lifecycle?.furthestStageId === eventStatuses[maxReachedIndex]?.id && (returnIndex < 0 || maxReachedIndex < returnIndex || lifecycle?.stockReturnReached)) return;
    try { updateEventLifecycle(eventId, { stageId: currentStatus.id, itemCount: lifecycleItems.length, furthestStageId: eventStatuses[maxReachedIndex]?.id, stockReturnReached: lifecycle?.stockReturnReached || (returnIndex >= 0 && maxReachedIndex >= returnIndex) }); } catch { /* API data remains usable without local storage. */ }
  }, [eventId, eventDetail, eventItemResponse, currentStatus?.id, lifecycleItems.length, lifecycle?.stageId, lifecycle?.itemCount, lifecycle?.furthestStageId, lifecycle?.stockReturnReached, maxReachedIndex, returnIndex, eventStatuses]);
  const addAllowedAtStage = currentStatus?.allow_add_item === true;
  const addLocked = !addAllowedAtStage || Boolean(lifecycle?.stockReturnReached) || (returnIndex >= 0 && maxReachedIndex >= returnIndex) || ['returned-completed', 'transferred'].includes(closingFlag);
  const productionEnabled = addAllowedAtStage && currentStatus?.production_item === true;
  const productionTabVisible = hasReachedProductionStatus(
    currentStatus,
    eventStatuses,
  );
  const loanEnabled = addAllowedAtStage && currentStatus?.borrow_item === true;
  const outsourceEnabled = addAllowedAtStage && currentStatus?.outsource_item === true;
  const borrowedItems = borrowedItemsResponse?.data?.items ?? [];
  const borrowedTabVisible = loanEnabled || borrowedItems.length > 0;
  const outsourceItems = outsourceItemsResponse?.data?.items ?? [];
  const outsourceTabVisible = outsourceEnabled || outsourceItems.length > 0;
  useEffect(() => {
    if (!productionTabVisible && stageFilter === "production") {
      setStageFilter("all");
    }
    if (!borrowedTabVisible && stageFilter === "borrowed") {
      setStageFilter("all");
    }
    if (!outsourceTabVisible && stageFilter === "outsourced") {
      setStageFilter("all");
    }
  }, [borrowedTabVisible, outsourceTabVisible, productionTabVisible, stageFilter]);
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
    () => [...new Map(
      (barangGudangPages?.pages ?? [])
        .flatMap((page) => page.data)
        .map((item) => [item.barang_id, item] as const),
    ).values()],
    [barangGudangPages?.pages],
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

  function handleInventoryPickerScroll(event: ReactUIEvent<HTMLDivElement>) {
    const list = event.currentTarget;
    const distanceToBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (
      distanceToBottom <= 160 &&
      hasNextBarangPage &&
      !isFetchingNextBarangPage
    ) {
      void fetchNextBarangPage();
    }
  }

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
  const checkableEventItems = checkingEventItems.filter((item) => item.id > 0);
  const checkedCount = checkableEventItems.filter((item) => item.checkedStatus).length;
  const uncheckedCount = checkableEventItems.length - checkedCount;
  const backendCheckingEvent = eventDetail?.is_complete === 1 && eventDetail.is_finished === 0;
  useEffect(() => {
    if (backendCheckingEvent && checkedCount > 0) setCheckingModeActivated(true);
  }, [backendCheckingEvent, checkedCount]);
  const checkingMode = backendCheckingEvent && (checkingModeActivated || checkedCount > 0);
  const allEventItemsChecked = uncheckedCount === 0;
  const canStartItemChecking = backendCheckingEvent && !checkingMode && uncheckedCount > 0 && !isCheckingItemsLoading && !isCheckingItemsError;
  const canReturnEvent = backendCheckingEvent && allEventItemsChecked && !isCheckingItemsLoading && !isCheckingItemsError;
  const checkableScopedItems = checkableEventItems.filter((item) => {
    if (selectedArea && item.area !== selectedArea) return false;
    if (kwSearch && !item.name.toLowerCase().includes(kwSearch.toLowerCase()) && !item.area.toLowerCase().includes(kwSearch.toLowerCase())) return false;
    return true;
  });
  const effectiveStageFilter =
    stageFilter === "production" && !productionTabVisible
      ? "all"
      : stageFilter === "borrowed" && !borrowedTabVisible
        ? "all"
      : stageFilter === "outsourced" && !outsourceTabVisible
        ? "all"
      : stageFilter === "waiting" && !stageScanEnabled
        ? "all"
      : (stageFilter === "unchecked" || stageFilter === "checked") && !checkingMode
        ? "all"
        : stageFilter;
  const displayedItems =
    effectiveStageFilter === "waiting"
      ? waitingScanItems
      : effectiveStageFilter === "added"
        ? currentStageItems
      : effectiveStageFilter === "unchecked"
        ? checkableScopedItems.filter((item) => !item.checkedStatus)
      : effectiveStageFilter === "checked"
        ? checkableScopedItems.filter((item) => item.checkedStatus)
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
    setFlowStep(stagePromptStep(
      index > currentStageIndex,
      currentStatus?.check_ownership === true,
      currentStatus ? ownershipAnswered.includes(currentStatus.id) : false,
      items.some(item => item.brokenReport),
    ));
  }
  function afterOwnership() {
    if (currentStatus) {
      setOwnershipAnswered(ids => ids.includes(currentStatus.id) ? ids : [...ids, currentStatus.id]);
    }
    setFlowStep(items.some(item => item.brokenReport) ? 'broken' : 'confirm');
  }
  function cancelStageFlow() {
    setPendingStage(null); setResumeStage(null); setFlowStep('confirm');
  }
  async function saveBrokenReport() {
    await refetchEventItems();
  }
  async function removeReport(item: DisplayItem) {
    if (isClosing || isDeletingBrokenReport) return;
    if (!item.brokenReport?.id) {
      toast.error(t('sourceUpgrade.reportIdUnavailable'));
      return;
    }
    try {
      const response = await deleteBrokenReport(item.brokenReport.id);
      await refetchEventItems();
      toast.success(response.message || t('sourceUpgrade.reportDeleted'));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    }
  }
  async function advanceBorrowedItem(item: LoanItem) {
    if (isClosing || isUpdatingLoanItem) return;
    const nextStatus = item.status === "REQUESTED" ? "BORROWED" : "RETURNED";
    const confirmationKey = nextStatus === "BORROWED"
      ? "eventBorrow.receiveConfirm"
      : "eventBorrow.returnConfirm";
    if (!window.confirm(t(confirmationKey, { item: item.item_name }))) return;
    try {
      const detail = await getLoanItem(item.id);
      const response = await updateLoanItem({
        id: item.id,
        payload: loanItemToUpdatePayload(detail.data, nextStatus),
      });
      toast.success(response.message || t("eventBorrow.statusUpdated"));
      await Promise.all([refetchBorrowedItems(), refetchEventItems()]);
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error) || t("eventBorrow.statusError"));
    }
  }
  async function cancelBorrowedItem(item: LoanItem) {
    if (isClosing || isDeletingLoanItem) return;
    if (!window.confirm(t("eventBorrow.cancelConfirm", { item: item.item_name }))) return;
    try {
      const response = await deleteLoanItem(item.id);
      toast.success(response.message || t("eventBorrow.cancelled"));
      await Promise.all([refetchBorrowedItems(), refetchEventItems()]);
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error) || t("eventBorrow.cancelError"));
    }
  }
  async function advanceOutsourceItem(item: OutsourceItem) {
    if (isClosing || isUpdatingOutsourceItem) return;
    const nextStatus = item.status === "REQUESTED" ? "RECEIVED" : "COMPLETED";
    if (!window.confirm(`${nextStatus === "RECEIVED" ? "Mark" : "Complete"} “${item.item_name}”${nextStatus === "RECEIVED" ? " as received? It will be added to this event with Outsource ownership." : "?"}`)) return;
    try {
      const response = await updateOutsourceItem({ id: item.id, payload: outsourceItemPayload(item, nextStatus) });
      toast.success(response.message || (nextStatus === "RECEIVED" ? "Item marked received." : "Outsource order completed."));
      await Promise.all([refetchOutsourceItems(), refetchEventItems()]);
    } catch (error) { toast.error(getCheckoutErrorMessage(error) || "Outsource status could not be updated."); }
  }
  async function cancelOutsourceItem(item: OutsourceItem) {
    if (isClosing || isDeletingOutsourceItem) return;
    if (!window.confirm(`Cancel the outsource request for “${item.item_name}”?`)) return;
    try {
      const response = await deleteOutsourceItem(item.id);
      toast.success(response.message || "Outsource request cancelled.");
      await Promise.all([refetchOutsourceItems(), refetchEventItems()]);
    } catch (error) { toast.error(getCheckoutErrorMessage(error) || "Outsource request could not be cancelled."); }
  }
  function replaceBrokenItem(item: DisplayItem) {
    if (!productionEnabled || isClosing || !item.brokenReport) return;
    setProductionInitial({ ...item, name: '', qty: item.brokenReport.qty, note: t('sourceUpgrade.replacement', { qty: item.brokenReport.qty, name: item.name }) + (item.brokenReport.note ? ': ' + item.brokenReport.note : ''), productionMetadata: { warehouseId: 0, warehouseName: '', vendorId: 0, vendorName: '', vendorOrigin: 'Internal', replacesItemId: item.id } });
    setProductionOpen(true);
  }
  const crossedStages = pendingStage !== null && pendingStage > currentStageIndex ? eventStatuses.slice(currentStageIndex + 1, pendingStage + 1) : [];
  const willCut = crossedStages.some(s => features[s.id]?.cuttingStock);
  const willReturn = crossedStages.some(s => features[s.id]?.stockReturn);
  const pendingScanInStage = crossedStages.find(
    status => status.action?.trim().toUpperCase().replace(/\s+/g, "_") === "SCAN_IN",
  );
  const showScanInConfirmation = Boolean(pendingScanInStage) || currentScanAction === "SCAN_IN";
  const scanInStageName = pendingScanInStage?.name ?? currentStatus?.name ?? "";
  const pendingCutStage = crossedStages.find(status => features[status.id]?.cuttingStock);
  const cutPreviewItems = items.filter(item => !item.stockCut);
  const cutPreviewQty = cutPreviewItems.reduce((sum, item) => sum + item.qty, 0);
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
      await Promise.all([refetchEventDetail(), refetchEventItems(), refetchProductionRequests()]);
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
      setCheckingModeActivated(true);
      setStageFilter("unchecked");
      await Promise.all([
        refetchEventDetail(),
        refetchEventItems(),
        queryClient.invalidateQueries(['events-v2']),
      ]);
      toast.success(response.message || t('lifecycle.checking-inventory'));
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
    } finally {
      setIsChangingEventStatus(false);
    }
  }

  function confirmEnterCheckingMode() {
    setCheckingModeActivated(true);
    setStageFilter("unchecked");
    setStartCheckOpen(false);
  }

  async function saveEventItemCheck(updates: EventItemCheckUpdate[]) {
    if (!updates.length || isUpdatingEventItemChecks) return;
    try {
      const response = await updateEventItemChecks(updates);
      await Promise.all([refetchEventItems(), refetchCheckingItems()]);
      toast.success(response.message || "Item checking updated.");
      return true;
    } catch (error) {
      toast.error(getCheckoutErrorMessage(error));
      return false;
    }
  }

  function toggleEventItemCheck(item: DisplayItem) {
    void saveEventItemCheck([{
      id: item.id,
      checked: !item.checkedStatus,
      note: item.checkedNote ?? "",
    }]);
  }

  function openEventItemCheckNote(item: DisplayItem) {
    setCheckNoteItem(item);
    setCheckNoteDraft(item.checkedNote ?? "");
  }

  async function saveEventItemCheckNote() {
    if (!checkNoteItem) return;
    const saved = await saveEventItemCheck([{
      id: checkNoteItem.id,
      checked: Boolean(checkNoteItem.checkedStatus),
      note: checkNoteDraft.trim(),
    }]);
    if (saved) setCheckNoteItem(null);
  }

  function checkAllEventItems() {
    if (!checkableEventItems.length || !window.confirm("Mark every item as Checked?")) return;
    void saveEventItemCheck(
      checkableEventItems
        .filter((item) => !item.checkedStatus)
        .map((item) => ({ id: item.id, checked: true, note: item.checkedNote ?? "" })),
    );
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
    if (!deleteAllowed) return;
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
      const metadata = value.productionMetadata;
      const replacementItemId = metadata?.replacesItemId;
      const response = await createProductionRequest({
        event_id: eventId,
        request_type: replacementItemId ? "REPLACEMENT" : "NEW_PRODUCTION",
        item_name: value.name.trim(),
        qty: value.qty,
        area_id: value.areaId,
        ...(value.subAreaId ? { sub_area_id: value.subAreaId } : {}),
        ...(metadata?.warehouseId ? { warehouse_id: metadata.warehouseId } : {}),
        ...(metadata?.vendorId
          ? {
            vendor_id: metadata.vendorId,
            origin: metadata.vendorOrigin,
          }
          : {}),
        ...(replacementItemId
          ? {
            barang_event_id: replacementItemId,
            fix_list_item_id: replacementItemId,
          }
          : {}),
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
    const qtyEditable = Number(modifyItem.eventStatusId) === Number(currentStatus?.id);
    const nextQty = qtyEditable ? value.qty : modifyItem.qty;
    if (modifyItem.id <= 0) {
      setItemEdits(old => ({ ...old, [modifyItem.id]: { ...old[modifyItem.id], qty: nextQty, pic: modifyItem.pic, area: value.area, areaId: value.areaId, subArea: value.subArea, subAreaId: value.subAreaId, note: modifyItem.note, ownerships: modifyItem.ownerships } }));
      setModifyItem(null); toast.success(t('eventUpgrade.previewSaved')); return;
    }
    if (!value.areaId || !value.subAreaId) return;
    try {
      const response = await putEventItem({
        id: modifyItem.id,
        list_id: value.areaId,
        sub_list_id: value.subAreaId,
        qty: nextQty,
        pic: modifyItem.pic.trim(),
        notes: modifyItem.note.trim(),
        ownerships: {
          ihc: modifyItem.ownerships.includes('IHC'),
          ihp: modifyItem.ownerships.includes('IHP'),
          outsource: modifyItem.ownerships.includes('Outsource'),
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

  const scanQrValue = scanningItem
    ? `event_item/${scanningItem.id}/${getNextScanType(scanningItem)}`
    : "";

  return (
    <>
      <h1 className={`page-title${isB ? ' ed-b-page-title' : ''}`}>{t("wording.eventDetail")}</h1>
      <div className={`card${isB ? ' ed-b' : ''}`}>
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
            {!isB && <>
            {outsourceEnabled && <button type="button" className="btn btn-ghost btn-request-production" onClick={() => setOutsourceOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>{t('sourceUpgrade.outsourceItem')}</button>}
            {loanEnabled && <button className="btn btn-ghost btn-request-production" onClick={() => setBorrowOpen(true)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>{t('sourceUpgrade.borrowItem')}</button>}
            {productionEnabled && <button className="btn btn-ghost btn-request-production" onClick={() => { setProductionInitial(null); setProductionOpen(true); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>{t("eventUpgrade.requestProduction")}</button>}
            <button type="button" className="btn btn-ghost btn-request-production event-files-trigger" onClick={() => setFilesOpen(true)} title="Files attached to this event">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              Files <span className="stage-tab-count">{eventFiles.length}</span>
            </button>
            </>}
            {isB && (outsourceEnabled || loanEnabled || productionEnabled) && (
              <div className="more-menu-wrap" ref={requestMenuRef}>
                <button type="button" className="btn btn-ghost ed-b-request" aria-haspopup="menu" aria-expanded={requestMenuOpen} onClick={() => setRequestMenuOpen((open) => !open)}>
                  {t('edB.request')}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {requestMenuOpen && <div className="more-menu-dropdown" role="menu">
                  {outsourceEnabled && <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setRequestMenuOpen(false); setOutsourceOpen(true); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>{t('sourceUpgrade.outsourceItem')}</button>}
                  {loanEnabled && <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setRequestMenuOpen(false); setBorrowOpen(true); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>{t('sourceUpgrade.borrowItem')}</button>}
                  {productionEnabled && <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setRequestMenuOpen(false); setProductionInitial(null); setProductionOpen(true); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>{t("eventUpgrade.requestProduction")}</button>}
                </div>}
              </div>
            )}
            {isB && <button type="button" className="btn btn-ghost ed-b-icon-btn" onClick={() => setFilesOpen(true)} aria-label={`Files (${eventFiles.length})`} data-tip={`Files · ${eventFiles.length}`} data-tip-align="end">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              {eventFiles.length > 0 && <span className="ed-b-dot">{fmtDisplayNumber(eventFiles.length)}</span>}
            </button>}
            <button className="btn-new" disabled={addLocked} onClick={openCart}>
              <IconPlus /> {t("wording.addItem")}
              {cart.length > 0 && <span className="add-item-cart-count"><IconCart /> {fmtDisplayNumber(cart.length)}</span>}
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
                <div className="more-menu-dropdown" role="menu">
                  {/* Grouped, every entry with an icon, one line each (owner 2026-11-22). */}
                  <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setSummaryOpen(true); setMoreMenuOpen(false); }}>
                    <IconBarChart /> {t("wording.summary")}
                  </button>
                  <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setRentalOpen(true); setMoreMenuOpen(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>
                    {t('october.rentals')}
                  </button>
                  {(!isClosing || closingFlag === 'checking-inventory') && <div className="more-menu-sep" role="separator" />}
                  {!isClosing && <button type="button" role="menuitem" className="more-menu-item" onClick={() => { openPackagingModal(); setMoreMenuOpen(false); }}><IconLayers /> {t('lifecycle.groupItems')}</button>}
                  {!isClosing && <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setLifecycleMode('ownership'); setMoreMenuOpen(false); }}><IconUsers /> {t('lifecycle.bulkOwnership')}</button>}
                  {closingFlag === 'checking-inventory' && <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setLifecycleMode('check'); setMoreMenuOpen(false); }}><IconCheck /> {t('lifecycle.crossCheck')}</button>}
                  <div className="more-menu-sep" role="separator" />
                  <button type="button" role="menuitem" className="more-menu-item" onClick={() => { setPrintChooserOpen(true); setMoreMenuOpen(false); }}>
                    <IconPrint /> {t('eventDetailMenu.print')}
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
          {canStartItemChecking && <button className="btn-next-stage" onClick={() => setStartCheckOpen(true)}>Start Checking</button>}
          {backendCheckingEvent && <button className={`btn-next-stage${canReturnEvent ? " ready" : ""}`} disabled={!canReturnEvent} title={canReturnEvent ? "Put the stock back" : `Check every item first (${checkedCount}/${checkableEventItems.length})`} onClick={() => setLifecycleMode('return')}>
            {isCheckingItemsLoading || canReturnEvent ? "For Return" : `For Return · ${checkedCount}/${checkableEventItems.length} checked`}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>}
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

        {checkingMode && (
          <div className="event-check-progress">
            <div className="event-check-progress-head">
              <strong>Ready for Checking</strong>
              <span>{checkedCount} of {checkableEventItems.length} items checked</span>
              {uncheckedCount > 0 && <button type="button" className="event-check-all-link" disabled={isUpdatingEventItemChecks} onClick={checkAllEventItems}>{isUpdatingEventItemChecks ? t("wording.saving") : "Check all"}</button>}
            </div>
            <div className="event-check-progress-bar" role="progressbar" aria-valuenow={checkedCount} aria-valuemin={0} aria-valuemax={checkableEventItems.length}>
              <span style={{ width: `${checkableEventItems.length ? (checkedCount / checkableEventItems.length) * 100 : 100}%` }} />
            </div>
            <p>{uncheckedCount === 0
              ? 'Every item is checked. Click "For Return" to put the stock back.'
              : "Mark each item Checked and add a note for anything damaged, missing or still at the venue. Nothing can be added to this event any more."}</p>
          </div>
        )}
        {backendCheckingEvent && isCheckingItemsError && (
          <div className="stepper-error-banner">{t("wording.failedToLoadEventItems")}</div>
        )}

        {stepperError && (
          <div className="stepper-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {stepperError}
            <button type="button" className="stepper-error-dismiss" onClick={() => setStepperError("")}>×</button>
          </div>
        )}

        <div className="ed-view-switch" role="tablist" aria-label={t("eventChecklist.viewLabel")}>
          <button type="button" role="tab" aria-selected={detailView === 'items'} className={detailView === 'items' ? 'active' : ''} onClick={() => setDetailView('items')}>
            {t("eventChecklist.viewItems")} <span className="stage-tab-count">{fmtDisplayNumber(items.length)}</span>
          </button>
          <button type="button" role="tab" aria-selected={detailView === 'checklist'} className={detailView === 'checklist' ? 'active' : ''} onClick={() => setDetailView('checklist')}>
            {t("navigation.items.eventChecklist")}
            {checklistSummary && checklistSummary.total > 0 && <span className="stage-tab-count">{fmtDisplayNumber(checklistSummary.resolved)}/{fmtDisplayNumber(checklistSummary.total)}</span>}
            {checklistSummary && checklistSummary.blocking > 0 && <span className="badge badge-orange ed-view-blocking">{t('eventChecklist.blockingCount', { count: checklistSummary.blocking })}</span>}
          </button>
        </div>

        {detailView === 'checklist' ? (
          <div className="ed-checklist">
            <p className="ed-checklist-preview"><span className="ck-preview-badge">{t('eventChecklist.preview')}</span> {t('eventChecklist.previewHint')}</p>
            {checklistEvent
              ? <EventChecklistPanel key={checklistEvent.id} event={checklistEvent} stages={checklistStages} showTitle={false}
                  headerActions={<Link className="btn btn-ghost" to={`/event-checklist?event=${checklistEvent.id}`}>{t('eventChecklist.allChecklists')}</Link>} />
              : <p className="no-data">{t('wording.loading')}</p>}
          </div>
        ) : (<>
        {!checkingMode && (isClosing || addLocked) && <p className="ed-lock-note">{t(isClosing ? 'eventUpgrade.itemsLocked' : !addAllowedAtStage ? 'eventUpgrade.stageAddLocked' : 'eventUpgrade.addLocked')}</p>}
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
            <SearchableSelect value={ownershipFilter} onChange={value => { setOwnershipFilter(String(value)); if (isB) setAppliedOwnershipFilter(String(value)); }} options={[{ value: '', label: t('lifecycle.allOwnership') }, ...OWNERSHIP_OPTIONS.map(value => ({ value, label: `${value} (${items.filter(item => item.ownerships.includes(value)).length})` }))]} />
            {isB ? <button type="button" className="btn btn-ghost ed-b-icon-btn" aria-label={t('edB.refresh')} data-tip={t('edB.refresh')} data-tip-align="end" onClick={() => void refetchEventItems()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button> : <button
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
            </button>}
          </div>
        </div>

        <div className="stage-tabs-row"><div className="stage-tabs">
          {(['all', 'added', ...(stageScanEnabled ? ['waiting'] : []), ...(checkingMode ? ['unchecked', 'checked'] : []), 'grouped', ...(productionTabVisible ? ['production'] : []), ...(borrowedTabVisible ? ['borrowed'] : []), ...(outsourceTabVisible ? ['outsourced'] : [])] as const).map(tab => {
            const labels: Record<string, string> = { all: 'wording.all', added: 'wording.addedNew', waiting: 'wording.waitingScan', unchecked: 'Not checked', checked: 'Checked', grouped: 'wording.grouped', production: 'eventUpgrade.production', borrowed: 'eventBorrow.borrowed', outsourced: 'sourceUpgrade.outsourced' };
            const counts: Record<string, number> = { all: scopedItems.length, added: currentStageItems.length, waiting: waitingScanItems.length, unchecked: uncheckedCount, checked: checkedCount, grouped: packages.length, production: productionRequestsResponse ? apiProductionRequests.length : (productionItemResponse ? backendProductionItems.length : items.filter(item => item.isNewProductionItem).length) + requests.length, borrowed: borrowedItems.length, outsourced: outsourceItems.length };
            if (isB && tab !== 'all' && effectiveStageFilter !== tab && !counts[tab]) return null;
            return <button key={tab} className={'stage-tab' + (effectiveStageFilter === tab ? ' active' : '')} onClick={() => setStageFilter(tab as typeof stageFilter)}>{t(labels[tab])} <span className="stage-tab-count">{counts[tab]}</span></button>;
          })}
        </div><div className="view-toggle">{(['cards', 'list'] as const).map(mode => <button key={mode} title={t('eventUpgrade.' + mode)} aria-label={t('eventUpgrade.' + mode)} aria-pressed={viewMode === mode} className={viewMode === mode ? 'active' : ''} onClick={() => { setViewMode(mode); try { localStorage.setItem('emi_event_detail_view', mode); } catch { /* Preference is optional. */ } }}>{mode === 'cards' ? '▦' : '☰'}</button>)}</div></div>
        {effectiveStageFilter === "outsourced" ? <EventOutsourceItemsPanel
          items={outsourceItems}
          isLoading={isOutsourceItemsLoading}
          isError={isOutsourceItemsError}
          locked={isClosing || addLocked}
          isActing={isUpdatingOutsourceItem || isDeletingOutsourceItem}
          onAdvance={(item) => void advanceOutsourceItem(item)}
          onCancel={(item) => void cancelOutsourceItem(item)}
        /> : effectiveStageFilter === "borrowed" ? <EventBorrowedItemsPanel
          items={borrowedItems}
          isLoading={isBorrowedItemsLoading}
          isError={isBorrowedItemsError}
          locked={isClosing || addLocked}
          isActing={isUpdatingLoanItem || isDeletingLoanItem}
          onAdvance={(item) => void advanceBorrowedItem(item)}
          onCancel={(item) => void cancelBorrowedItem(item)}
        /> : effectiveStageFilter === "production" ? <div className="production-list">
          {isProductionRequestsLoading ? (
            <p className="no-data">{t("wording.loading")}</p>
          ) : !isProductionRequestsError ? (
            apiProductionRequests.length > 0 ? apiProductionRequests.map((request) => {
              const isConvertRequest = (request.type || "").toUpperCase() === "CONVERT";
              const isReplacementRequest = (request.type || "").toUpperCase() === "REPLACEMENT";
              const requestQty = request.qty ?? request.new_item?.qty ?? request.replacement_for?.broken_qty;
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
                      <span className={`badge ${isConvertRequest ? "badge-blue" : isReplacementRequest ? "badge-orange" : "badge-purple"}`}>
                        {t(isConvertRequest ? "conversion.convert" : isReplacementRequest ? "sourceUpgrade.replacementRequest" : "conversion.newProduction")}
                      </span>
                      <strong className="production-request-title">{isConvertRequest
                        ? `${request.old_item?.qty ?? 0} × ${request.old_item?.nama || "—"} → ${request.new_item?.qty ?? 0} × ${request.new_item?.nama || "—"}`
                        : `${requestQty ?? "—"} × ${request.item_name || "—"}`}</strong>
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
                    {request.created_at && <span>{formatJakartaDateTime(request.created_at)}</span>}
                    {request.applied_at && <span>{t("conversion.appliedAt")}: {formatJakartaDateTime(request.applied_at)}</span>}
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
                onDelete={deleteAllowed ? deleteItem : undefined}
                onScan={openScanPopup}
                showScanButton={stageScanEnabled}
                isScanned={isItemScannedForCurrentStatus}
                checkingMode={checkingMode}
                isCheckUpdating={isUpdatingEventItemChecks}
                onToggleChecked={toggleEventItemCheck}
                onEditCheckNote={openEventItemCheckNote}
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
                    onDelete={deleteAllowed ? deleteItem : undefined}
                    onOpen={(selectedItem) => setDetailId(selectedItem.id)}
                    onModify={isClosing ? undefined : setModifyItem}
                    checkingMode={checkingMode}
                    isCheckUpdating={isUpdatingEventItemChecks}
                    onToggleChecked={toggleEventItemCheck}
                    onEditCheckNote={openEventItemCheckNote}
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
                <p className="summary-text"><strong>{fmtDisplayNumber(packages.length)}</strong> {t("wording.box")}{packages.length === 1 ? "" : t("wording.es")} {t("wording.packagedEachBoxScansAsOneQrCode")}</p>
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
                            <div><div className="package-name">{group.name}</div><div className="package-meta">{fmtDisplayNumber(members.length)} {t("wording.itemInline")}{members.length === 1 ? "" : t("wording.s")} {t("wording.inThisBox")}</div></div>
                          </div>
                          {stageScanEnabled && members.length > 0 && (
                            <button className={`btn-ia-scan${allScanned ? " scanned" : ""}`} onClick={() => openScanPopup(members[0])}>{allScanned ? t("wording.reScanBox") : t("wording.scanBox")}</button>
                          )}
                        </div>
                        {viewMode === 'list' ? <ItemTable items={members} onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem} onDelete={deleteAllowed ? deleteItem : undefined} onScan={openScanPopup} showScanButton={false} isScanned={isItemScannedForCurrentStatus} checkingMode={checkingMode} isCheckUpdating={isUpdatingEventItemChecks} onToggleChecked={toggleEventItemCheck} onEditCheckNote={openEventItemCheckNote} /> : <div className="items-grid package-items-grid">
                          {members.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              group={group}
                              showScanButton={false}
                              isScanned={isItemScannedForCurrentStatus(item)}
                              onScan={openScanPopup}
                              onDelete={deleteAllowed ? deleteItem : undefined}
                              onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem}
                              checkingMode={checkingMode}
                              isCheckUpdating={isUpdatingEventItemChecks}
                              onToggleChecked={toggleEventItemCheck}
                              onEditCheckNote={openEventItemCheckNote}
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
              {checkingMode ? (
                <><strong>{fmtDisplayNumber(displayedItems.length)}</strong> {displayedItems.length === 1 ? "item" : "items"} · {areaLabel}</>
              ) : effectiveStageFilter === "waiting" ? (
                <><strong>{fmtDisplayNumber(displayedItems.length)}</strong> {t("wording.itemInline")}{displayedItems.length === 1 ? "" : t("wording.s")} {t("wording.stillNeed")}{displayedItems.length === 1 ? t("wording.s") : ""} {t("wording.scanningAtEventStatus")} <strong>&ldquo;{eventStatus}&rdquo;</strong> {t("wording.inArea")} <strong>&ldquo;{areaLabel}&rdquo;</strong></>
              ) : (
                <><strong>{fmtDisplayNumber(displayedItems.length)}</strong> {t("wording.itemSWithStatus")} <strong>&ldquo;{eventStatus}&rdquo;</strong> {t("wording.inArea")} <strong>&ldquo;{areaLabel}&rdquo;</strong></>
              )}
            </p>
            {viewMode === 'list' ? <ItemTable items={displayedItems} onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem} onDelete={deleteAllowed ? deleteItem : undefined} onScan={openScanPopup} showScanButton={stageScanEnabled} isScanned={isItemScannedForCurrentStatus} checkingMode={checkingMode} isCheckUpdating={isUpdatingEventItemChecks} onToggleChecked={toggleEventItemCheck} onEditCheckNote={openEventItemCheckNote} /> : <div className="items-grid">
            {displayedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                group={item.groupId ? packages.find((group) => group.id === item.groupId) : undefined}
                showScanButton={stageScanEnabled && item.id > 0}
                isScanned={isItemScannedForCurrentStatus(item)}
                onScan={openScanPopup}
                onDelete={deleteAllowed ? deleteItem : undefined}
                              onOpen={item => setDetailId(item.id)} onModify={isClosing ? undefined : setModifyItem}
                checkingMode={checkingMode}
                isCheckUpdating={isUpdatingEventItemChecks}
                onToggleChecked={toggleEventItemCheck}
                onEditCheckNote={openEventItemCheckNote}
              />
            ))}
            </div>}
          </>
        )}
        </>)}
      </div>

      <Modal open={pendingStage !== null && flowStep === 'ownership'} title={t('sourceUpgrade.checkOwnership')} onClose={cancelStageFlow} footer={<>
        <button className="btn-cancel-modal" onClick={cancelStageFlow}><IconClose /> {t('wording.cancel')}</button>
        <button className="btn btn-ghost" onClick={afterOwnership}>{t('sourceUpgrade.no')}</button>
        <button className="btn-save-modal" onClick={() => { setResumeStage(pendingStage); setPendingStage(null); setLifecycleMode('ownership'); }}>{t('sourceUpgrade.yes')}</button>
      </>}>
        <div className="stage-confirm-route">
          <span>{eventStatus}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <strong>{pendingStage !== null ? stages[pendingStage] : ''}</strong>
        </div>
        <p className="confirm-msg">
          {t('sourceUpgrade.beforeMovingFrom')} <strong>&ldquo;{eventStatus}&rdquo;</strong>: {t('sourceUpgrade.ownershipQuestion')}
        </p>
        <p className="confirm-msg ownership-check-help">
          {t('sourceUpgrade.ownershipHelp')}
        </p>
      </Modal>
      <Modal open={pendingStage !== null && flowStep === 'broken'} title={t('sourceUpgrade.report')} onClose={cancelStageFlow} footer={<>
        <button className="btn-cancel-modal" onClick={cancelStageFlow}>{t('wording.cancel')}</button>
        <button className="btn-save-modal" onClick={() => setFlowStep('confirm')}>{t('eventUpgrade.confirm')}</button>
      </>}><p className="prod-notice prod-notice-warn">{t('sourceUpgrade.brokenWarning')}</p><div className="table-wrap"><table className="broken-table"><tbody>{items.filter(item => item.brokenReport).map(item => <tr key={item.id}><td>{item.name}</td><td>{fmtDisplayNumber(item.brokenReport?.qty)} / {fmtDisplayNumber(item.qty)}</td></tr>)}</tbody></table></div></Modal>
      <Modal
        open={pendingStage !== null && flowStep === 'confirm'}
        title={pendingStage !== null && pendingStage > currentStageIndex && showScanInConfirmation ? 'Move to next stage?' : t('eventUpgrade.confirmStage')}
        onClose={() => { if (!isChangingEventStatus) setPendingStage(null); }}
        footer={<>
          <button className="btn-cancel-modal" disabled={isChangingEventStatus} onClick={() => setPendingStage(null)}><IconClose /> {t('wording.cancel')}</button>
          <button className="btn-save-modal" disabled={isChangingEventStatus || pendingStage === null} onClick={() => { if (pendingStage !== null) void changeEventStatus(stages[pendingStage], pendingStage); }}>
            <IconCheck /> {isChangingEventStatus
              ? t('wording.saving')
              : showScanInConfirmation && willCut
                ? 'Confirm & Cut Stock'
                : t(willReturn ? 'eventUpgrade.confirmReturn' : willCut ? 'eventUpgrade.confirmCut' : 'eventUpgrade.confirm')}
          </button>
        </>}
      >
        <div className="stage-confirm-route">{eventStatus} → <strong>{pendingStage !== null ? stages[pendingStage] : ''}</strong></div>
        {showScanInConfirmation && <p className="confirm-msg">Items must be scanned at this stage before the event can move on.</p>}
        {(willCut || willReturn) && !showScanInConfirmation && <p className="ed-lock-note">{t('eventUpgrade.preview')}</p>}
        {willCut && showScanInConfirmation && (
          <div className="stage-stock-move">
            <div className="stage-stock-move-art" aria-hidden="true">
              <div className="stage-stock-move-node">
                <span className="stage-stock-move-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"><path d="M6 20 24 9l18 11v19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V20Z" /><rect x="15" y="27" width="18" height="14" rx="1.5" /><path d="M15 32h18M15 37h18" /></svg></span>
                <small>Warehouse</small>
              </div>
              <div className="stage-stock-move-flow">
                <span className="stage-stock-move-qty">−{fmtDisplayNumber(cutPreviewQty)} pcs</span>
                <span className="stage-stock-move-dots"><i /><i /><i /></span>
              </div>
              <div className="stage-stock-move-node">
                <span className="stage-stock-move-icon"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="7" y="11" width="34" height="30" rx="4" /><path d="M7 19h34M16 7v8M32 7v8" /><path d="m19 30 4 4 8-8" strokeWidth="2.6" strokeLinejoin="round" /></svg></span>
                <small>This event</small>
              </div>
            </div>
            <div className="stage-stock-move-title">Stock will be cut and reserved for this event</div>
            <p>{pendingCutStage?.name ?? scanInStageName} has <strong>Cutting Stock</strong> on. When confirmed, <strong>{fmtDisplayNumber(cutPreviewItems.length)} items ({fmtDisplayNumber(cutPreviewQty)} pcs)</strong> are marked as stock cut in the preview.</p>
            <p className="stage-stock-move-foot">{t('eventUpgrade.preview')}</p>
          </div>
        )}
        {willCut && !showScanInConfirmation && <p className="stage-confirm-cut">{t('eventUpgrade.cutWarning', { count: cutPreviewItems.length, qty: cutPreviewQty })}</p>}
        {willReturn && <p className="stage-confirm-cut stage-confirm-return">{t('eventUpgrade.returnWarning')}</p>}
        {pendingStage !== null && pendingStage > currentStageIndex && pendingConverts.length > 0 && <div className="prod-notice prod-notice-warn"><div><p>{t('conversion.warning')}</p><ul>{pendingConverts.map(r => <li key={r.id}>{r.fromQty} × {r.fromName} → {r.toQty} × {r.toName} ({r.fromWarehouse})</li>)}</ul></div></div>}
      </Modal>
      <Drawer open={Boolean(detailItem)} title={t('eventUpgrade.detail')} onClose={() => { setDetailId(null); setDrawerMenuOpen(false); }} footer={detailItem && <div className="idr-footer">
        {/* Footer = Remove + Go to item detail (owner 2026-11-22). The other actions stay available under "⋯"
            because the drawer is the only place to modify an item or report it broken. */}
        {isClosing
          ? <span className="drawer-lock-note">{t('eventUpgrade.readOnly')}</span>
          : deleteAllowed && <button type="button" className="btn-cancel-modal" onClick={() => void deleteItem(detailItem.id)}>{t('itemDrawer.remove')}</button>}
        <span className="idr-footer-spacer" />
        {(() => {
          const actions: Array<{ key: string; label: string; onClick: () => void; disabled?: boolean }> = [];
          if (!isClosing) {
            actions.push({ key: 'modify', label: t('eventUpgrade.modify'), onClick: () => setModifyItem(detailItem) });
            if (!detailItem.isNewProductionItem && detailItem.id > 0 && detailItem.qty > 0) actions.push({ key: 'report', label: t(detailItem.brokenReport ? 'sourceUpgrade.editReport' : 'sourceUpgrade.report'), onClick: () => setReportItem(detailItem) });
            if (detailItem.brokenReport) actions.push({ key: 'production', label: t('sourceUpgrade.createProduction'), onClick: () => replaceBrokenItem(detailItem), disabled: !productionEnabled });
          }
          if (stageScanEnabled && detailItem.id > 0) actions.push({ key: 'scan', label: t('wording.scan'), onClick: () => openScanPopup(detailItem) });
          if (!actions.length) return null;
          return <div className="idr-more">
            <button type="button" className="btn btn-ghost idr-more-btn" aria-haspopup="menu" aria-expanded={drawerMenuOpen} aria-label={t('itemDrawer.moreActions')} data-tip={t('itemDrawer.moreActions')} data-tip-align="end" onClick={() => setDrawerMenuOpen((open) => !open)}><IconMoreVertical /></button>
            {drawerMenuOpen && <div className="more-menu-dropdown idr-more-menu" role="menu">
              {actions.map((action) => <button key={action.key} type="button" role="menuitem" className="more-menu-item" disabled={action.disabled} onClick={() => { setDrawerMenuOpen(false); action.onClick(); }}>{action.label}</button>)}
            </div>}
          </div>;
        })()}
        {detailItem.barangId ? <button type="button" className="btn-save-modal" onClick={() => navigate(`/inventory-detail?id=${detailItem.barangId}`)}>{t('itemDrawer.goToItem')}</button> : null}
      </div>}>
        {detailItem && <div className="idr">
          <div className="idr-head">
            <div className="idr-thumb"><ImagePlaceholder src={detailItem.photo} alt={detailItem.name} /></div>
            <div className="idr-title">
              <h3>{detailItem.name}</h3>
              <div className="idr-sub">{[detailItem.sku, detailItem.category].filter(Boolean).join(' · ') || '—'}</div>
              <div className="idr-badges">
                <StockBadge item={detailItem} />
                {detailItem.isNewProductionItem && <span className="badge badge-purple">{t('eventUpgrade.productionItem')}</span>}
                {detailItem.fromConvert && <span className="badge badge-blue">{t('conversion.converted')}</span>}
                {detailItem.isConverted && <span className="badge badge-blue">{t('conversion.convertedQty', { count: detailItem.convertedQty })}</span>}
                {detailItem.isReturned && <span className="item-flow-chip returned">✓ {t('lifecycle.returned')}</span>}
                {detailItem.isTransferredFromOtherEvent && <span className="item-flow-chip transferred">↓ {t('lifecycle.transferred')}</span>}
                {detailItem.isTransferredToOtherEvent && <span className="item-flow-chip transferred">↑ {t('lifecycle.transferred')}</span>}
              </div>
            </div>
          </div>

          <div className="idr-stats">
            <div><span>{t('wording.qty')}</span><strong>{fmtDisplayNumber(detailItem.qty)} <small>{detailItem.unit ?? ''}</small></strong></div>
            <div><span>{t('wording.status')}</span><strong className="idr-stage">{detailItem.stage || '—'}</strong></div>
            <div><span>{t('wording.ownerships')}</span><strong className="idr-chips">{detailItem.ownerships.length ? detailItem.ownerships.map((value) => <span key={value} className={`badge ${ownershipClass(value)}`}>{value}</span>) : '—'}</strong></div>
          </div>

          {detailItem.brokenReport && <div className="drawer-broken">
            <div className="drawer-broken-head"><strong>{t('sourceUpgrade.broken', { qty: detailItem.brokenReport.qty })}</strong>{!isClosing && <button className="drawer-link-btn" disabled={isDeletingBrokenReport} onClick={() => void removeReport(detailItem)}>{t('sourceUpgrade.removeReport')}</button>}</div>
            {detailItem.brokenReport.note && <p>{detailItem.brokenReport.note}</p>}
            {(detailItem.brokenReport.by || detailItem.brokenReport.at) && <div className="drawer-broken-meta">{t('sourceUpgrade.reportBy', { name: detailItem.brokenReport.by || '—', date: detailItem.brokenReport.at ? formatJakartaDateTime(detailItem.brokenReport.at) : '—' })}</div>}
          </div>}

          <section className="idr-section">
            <h4>{t('itemDrawer.location')}</h4>
            <dl className="drawer-dl">{[
              [t('wording.area'), detailItem.area], [t('wording.subArea'), detailItem.subArea], [t('wording.warehouse'), detailItem.warehouses], ['PIC', detailItem.pic],
            ].map(([key, value]) => <div className="drawer-dl-row" key={key}><dt>{key}</dt><dd className={value && value !== '-' ? '' : 'idr-empty'}>{value && value !== '-' ? value : '—'}</dd></div>)}</dl>
          </section>

          <section className="idr-section">
            <h4>{t('itemDrawer.progress')}</h4>
            <div className="idr-progress">
              <span className={`idr-step${detailItem.checking ? ' done' : ''}`}>{detailItem.checking ? '✓' : '○'} {t('wording.checking')}</span>
              <span className={`idr-step${detailItem.scanIn ? ' done' : ''}`} data-tip={detailItem.scanIn || t('itemDrawer.notYet')}>{detailItem.scanIn ? '✓' : '○'} {t('wording.scanIn')}</span>
              <span className={`idr-step${detailItem.scanOut ? ' done' : ''}`} data-tip={detailItem.scanOut || t('itemDrawer.notYet')} data-tip-align="end">{detailItem.scanOut ? '✓' : '○'} {t('wording.scanOut')}</span>
            </div>
          </section>

          {detailItem.note && detailItem.note.trim() && detailItem.note.trim() !== '-' && <section className="idr-section">
            <h4>{t('itemDrawer.note')}</h4>
            <p className="idr-note">{detailItem.note}</p>
          </section>}
        </div>}
      </Drawer>
      <Drawer
        open={filesOpen}
        title="Event Files"
        subtitle={`${eventFiles.length} file${eventFiles.length === 1 ? "" : "s"} · floor plans, rundowns, contracts, venue photos`}
        onClose={() => setFilesOpen(false)}
        footer={<>
          <input
            ref={eventFileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              void addEventFiles(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            className="btn-save-modal event-files-upload"
            disabled={isUploadingEventFiles || eventId <= 0}
            onClick={() => eventFileInputRef.current?.click()}
          >
            <IconPlus /> {isUploadingEventFiles ? "Uploading..." : "Upload files"}
          </button>
        </>}
      >
        <div
          className="event-files-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addEventFiles(event.dataTransfer.files);
          }}
        >
          <strong>Drop files here or click to upload</strong>
          <span>Photos are resized automatically. Other files are limited to 2 MB each (PDF, Excel, Word...).</span>
          <button type="button" onClick={() => eventFileInputRef.current?.click()} disabled={isUploadingEventFiles}>
            Choose files
          </button>
        </div>
        {eventFilesQuery.isLoading ? (
          <p className="drawer-empty">{t("wording.loading")}</p>
        ) : eventFilesQuery.isError ? (
          <div className="event-files-error">
            <p>{getCheckoutErrorMessage(eventFilesQuery.error)}</p>
            <button type="button" className="drawer-link-btn" onClick={() => void eventFilesQuery.refetch()}>Retry</button>
          </div>
        ) : eventFiles.length === 0 ? (
          <p className="drawer-empty">No files yet.</p>
        ) : (
          <ul className="event-file-list">
            {eventFiles.map((file) => (
              <li key={file.id}>
                {file.mime_type?.startsWith("image/") ? (
                  <a href={file.file_url} target="_blank" rel="noreferrer" className="event-file-thumb">
                    <img src={file.file_url} alt={file.file_name} />
                  </a>
                ) : (
                  <span className="event-file-thumb doc">
                    {(file.file_name.split(".").pop() || "file").slice(0, 4).toUpperCase()}
                  </span>
                )}
                <div className="event-file-meta">
                  <a href={file.file_url} target="_blank" rel="noreferrer" className="event-file-name">{file.file_name}</a>
                  <span>{[file.file_size_readable, file.uploaded_by_name, formatJakartaDateTime(file.created_at)].filter(Boolean).join(" · ")}</span>
                </div>
                <button
                  type="button"
                  className="event-file-delete"
                  aria-label={`Delete ${file.file_name}`}
                  title="Delete file"
                  disabled={deletingEventFileId === file.id}
                  onClick={() => void removeEventFile(file.id, file.file_name)}
                >
                  <IconDelete />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      {reportItem && !isClosing && <BrokenItemReport key={reportItem.id} item={reportItem} report={reportItem.brokenReport} onSaved={saveBrokenReport} onClose={() => setReportItem(null)} />}
<Modal open={printChooserOpen} title={t('eventDetailMenu.printTitle')} onClose={() => setPrintChooserOpen(false)}>
        <div className="print-chooser">
          <button type="button" className="print-choice" onClick={() => { setPrintChooserOpen(false); setPrintPlanOpen(true); }}>
            <IconPrint />
            <span><strong>{t('october.printPlan')}</strong><small>{t('eventDetailMenu.printPlanHint')}</small></span>
          </button>
          <button type="button" className="print-choice" onClick={() => { setPrintChooserOpen(false); window.setTimeout(() => window.print(), 150); }}>
            <IconNotes />
            <span><strong>{t('eventDetailMenu.printPage')}</strong><small>{t('eventDetailMenu.printPageHint')}</small></span>
          </button>
        </div>
      </Modal>
      {printPlanOpen && (printPlanItems.isLoading || printPlanItems.isError ? <Modal open title={t('october.printPlan')} onClose={() => setPrintPlanOpen(false)}><p>{t(printPlanItems.isError ? 'october.loadError' : 'wording.loading')}</p></Modal> : <PrintPlanModal eventName={eventName} currentStage={eventStatus} stages={stages} items={(printPlanItems.data?.data || []).map(item => mapEventItem(item, statusNames))} printedBy={getLoggedInFullname() || "—"} onClose={() => setPrintPlanOpen(false)} />)}
      <Modal open={rentalOpen} size="3xl" title={t('october.rentals')} onClose={() => setRentalOpen(false)}><RentalLogTab eventId={eventId} canCreate={loanEnabled} /></Modal>
      {borrowOpen && <EventBorrowItemModal
        eventId={eventId}
        onClose={() => setBorrowOpen(false)}
        onCreated={async () => {
          await Promise.all([refetchBorrowedItems(), refetchEventItems()]);
          setStageFilter("borrowed");
        }}
      />}
      {outsourceOpen && <EventOutsourceItemModal
        eventId={eventId}
        onClose={() => setOutsourceOpen(false)}
        onCreated={async () => {
          await Promise.all([refetchOutsourceItems(), refetchEventItems()]);
          setStageFilter("outsourced");
        }}
      />}
      {modifyItem && <EventItemEditor
        key={modifyItem.id}
        initial={modifyItem}
        production={false}
        qtyEditable={Number(modifyItem.eventStatusId) === Number(currentStatus?.id)}
        metadataReadOnly
        onSave={saveItemPreview}
        onClose={() => setModifyItem(null)}
      />}
      {productionOpen && <EventItemEditor
        initial={productionInitial ?? { name: '', qty: 1, area: '', pic: '', note: '', ownerships: ['IHP'] }}
        production
        onSave={submitProduction}
        onConvert={productionInitial?.productionMetadata?.replacesItemId ? undefined : submitConversion}
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
      <EventLifecycleModal key={`${eventId}-${lifecycleMode}`} eventId={eventId} eventName={eventName} items={lifecycleItems} stages={eventStatuses} mode={lifecycleMode} onFinalized={refreshAfterFinalize} onOwnershipSaved={() => { setLifecycleMode(null); if (resumeStage !== null) { setPendingStage(resumeStage); setResumeStage(null); afterOwnership(); } }} onClose={() => { setLifecycleMode(null); setResumeStage(null); }} />
      <Modal
        open={startCheckOpen}
        title="Start Checking"
        onClose={() => setStartCheckOpen(false)}
        footer={
          <>
            <button type="button" className="btn-cancel-m" onClick={() => setStartCheckOpen(false)}>
              <IconClose /> {t("wording.cancel")}
            </button>
            <button type="button" className="btn-save-modal" onClick={confirmEnterCheckingMode}>
              <IconCheck /> Start Checking
            </button>
          </>
        }
      >
        <div className="event-check-confirm">
          <div className="event-check-confirm-steps">
            <span className="active">Ready for Checking</span>
            <span>For Return</span>
            <span>Returned &amp; Completed</span>
          </div>
          <p>Start checking the items returned from this event. Mark each item as checked and add a note if needed.</p>
          <p className="event-check-warning">Items cannot be added or modified while checking is in progress.</p>
        </div>
      </Modal>
      <Modal
        open={Boolean(checkNoteItem)}
        title={checkNoteItem?.checkedNote ? "Edit checking note" : "Add checking note"}
        onClose={() => setCheckNoteItem(null)}
        footer={
          <>
            <button type="button" className="btn-cancel-m" onClick={() => setCheckNoteItem(null)}>
              <IconClose /> {t("wording.cancel")}
            </button>
            <button type="button" className="btn-save-modal" disabled={isUpdatingEventItemChecks} onClick={() => void saveEventItemCheckNote()}>
              <IconCheck /> {isUpdatingEventItemChecks ? t("wording.saving") : t("common.actions.save")}
            </button>
          </>
        }
      >
        <div className="event-check-note-modal">
          <strong>{checkNoteItem?.name}</strong>
          <textarea value={checkNoteDraft} onChange={(event) => setCheckNoteDraft(event.target.value)} rows={4} maxLength={1000} placeholder="Add a note about this item" />
        </div>
      </Modal>
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
                    <span>{t("wording.qtyPrefix")} {fmtDisplayNumber(cartItem.qty)}</span>
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
                        {t("wording.stockPrefix")} {fmtDisplayNumber(barang.stok_barang)}
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

            <div
              ref={inventoryPickerListRef}
              className="inv-pick-list"
              onScroll={handleInventoryPickerScroll}
            >
              {isBarangGudangLoading ? (
                <div className="inv-pick-loading">{t("wording.loadingInventory")}</div>
              ) : isBarangGudangError && barangGudangItems.length === 0 ? (
                <div className="inv-pick-loading inv-pick-load-error">
                  <span>{t("wording.unableToLoadInventory")}</span>
                  <button className="btn btn-ghost" onClick={() => void refetchBarangGudangPages()}>
                    {t("conversion.retry")}
                  </button>
                </div>
              ) : pickerFiltered.length === 0 ? (
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
                              placeholder={t("wording.selectWarehouseText")}
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
              {isFetchingNextBarangPage && (
                <div className="inv-pick-loading" role="status">
                  {t("wording.loadingInventory")}
                </div>
              )}
              {isBarangGudangError && barangGudangItems.length > 0 && !isFetchingNextBarangPage && (
                <div className="inv-pick-loading inv-pick-load-error">
                  <span>{t("wording.unableToLoadInventory")}</span>
                  <button className="btn btn-ghost" onClick={() => void fetchNextBarangPage()}>
                    {t("conversion.retry")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — cart / keranjang, always visible alongside the list */}
          <div className="inv-pick-right">
            <div className="inv-cart-header">
              <IconCart /> {t("wording.cart")}{" "}
              <span className="inv-cart-count">{fmtDisplayNumber(cart.length)}</span>
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
                    {t("wording.selectAll")}{fmtDisplayNumber(selectedCartIds.length)}/{fmtDisplayNumber(cart.length)})
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
                    {t("wording.assignLocations")}{fmtDisplayNumber(selectedCartIds.length)})
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
                      <IconCheck /> {t("wording.applyTo")} {fmtDisplayNumber(selectedCartIds.length)} {t("wording.itemsInline")}
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
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{fmtDisplayNumber(summaryStats.total)}</div><div className="summary-popup-kpi-label">{t("wording.totalItems")}</div></div>
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.checked}</div><div className="summary-popup-kpi-label">{t("wording.checked")}</div></div>
          <div className="summary-popup-kpi"><div className="summary-popup-kpi-value">{summaryStats.scanIn}</div><div className="summary-popup-kpi-label">{t("wording.scannedIn")}</div></div>
        </div>
        <p className="summary-text">
          {t("wording.totalQuantity")} <strong>{summaryStats.totalQty}</strong> {t("wording.scannedOut")}{" "}
          <strong>{summaryStats.scanOut}</strong> {t("wording.of")} {fmtDisplayNumber(summaryStats.total)}
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
                <div className="scan-target-box scan-qr" role="img" aria-label={scanQrValue}>
                  <QRCodeSvg
                    text={scanQrValue}
                    options={{
                      errorCorrectionLevel: "M",
                      margin: 1,
                      width: 120,
                      color: { dark: "#111827", light: "#FFFFFF" },
                    }}
                  />
                </div>
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
              <span><span className="package-pick-row-name">{item.name}</span><span className="package-pick-row-meta">{item.area} {t("wording.qtyPrefixOnEventDetailPage")} {fmtDisplayNumber(item.qty)}</span></span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
}
