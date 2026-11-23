import { fmtNum as fmtDisplayNumber } from '../lib/format';
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, type NavigateFunction } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import Drawer from "../components/Drawer";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
import useGetUsers from "../hooks/api/useGetUsers";
import TextArea from "../components/TextArea";
import TextInput from "../components/TextInput";
import moment from "moment";
import {
  IconSearch,
  IconPlus,
  IconPrint,
  IconEdit,
  IconDelete,
  IconCart,
  IconHistory,
  IconBarChart,
  IconClose,
  IconCheck,
} from "../components/icons";
import useGetEvents, { useGetEventLifecycleCounts } from "../hooks/api/useGetEvents";
import { useQueryClient } from "react-query";
import useGetEventStatus from "../hooks/api/useGetEventStatus";
import useGetLocations from "../hooks/api/useGetLocations";
import { useFormik } from "formik";
import * as Yup from "yup";
import { utils } from "react-modern-calendar-datepicker";
import { InventoryService } from "../service/InventoryService";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "../utils/function";
import { LIFECYCLE_STATUSES, LIFECYCLE_BADGES, type LifecycleStatus } from '../lib/eventLifecycle';
import "../eventUpgrade.css";

const PAGE_SIZE = 8;
const monthLabel = (month: number, style: "short" | "long" = "short") =>
  new Intl.DateTimeFormat(getDateLocale(), { month: style }).format(new Date(2020, month, 1));

type EventRecord = Record<string, any> & { id: number };

interface EventRowProps {
  r: EventRecord;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  navigate: NavigateFunction;
}

interface PastEventGroup {
  label: string;
  items: EventRecord[];
}

interface EventListFilters {
  locationIds: string[];
  statusIds: string[];
  from: string;
  to: string;
  size: "" | "none" | "small" | "medium" | "large";
}

const EMPTY_EVENT_FILTERS: EventListFilters = {
  locationIds: [],
  statusIds: [],
  from: "",
  to: "",
  size: "",
};

const EVENT_SIZE_FILTERS = [
  { value: "", label: "Any size" },
  { value: "none", label: "No items yet" },
  { value: "small", label: "Small (1–30 items)" },
  { value: "medium", label: "Medium (31–150)" },
  { value: "large", label: "Large (150+ items)" },
] as const;

function fmtRange(start?: string, finish?: string) {
  if (!start || start === "-") return "—";
  const [sy, sm, sd] = start.split("-");
  const s = `${parseInt(sd)} ${monthLabel(parseInt(sm) - 1)} ${sy}`;
  if (!finish || finish === start || finish === "-") return s;
  const [fy, fm, fd] = finish.split("-");
  if (sy === fy && sm === fm)
    return `${parseInt(sd)}–${parseInt(fd)} ${
      monthLabel(parseInt(sm) - 1)
    } ${sy}`;
  return `${parseInt(sd)} ${monthLabel(parseInt(sm) - 1)} – ${parseInt(fd)} ${
    monthLabel(parseInt(fm) - 1)
  } ${fy}`;
}

function daysUntil(start?: string): number | null {
  if (!start) return null;
  const eventDate = new Date(start.replace(" ", "T"));
  if (Number.isNaN(eventDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((eventDate.getTime() - today.getTime()) / 86400000);
}

function eventLastDate(record: EventRecord): string {
  return [record.event_end, record.event_start, record.date_event]
    .filter((value): value is string => typeof value === 'string' && Boolean(value) && value !== '-')
    .sort()
    .pop() ?? '';
}

function isEventPast(record: EventRecord): boolean {
  const lastDate = eventLastDate(record).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDate)) return false;
  const today = new Date();
  const localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  return lastDate < localToday;
}

function IconPin() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconCal() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Cover photo for an event card (ported from emi-source 2026-11-11 "card cover").
 * Reads the optional `images` field of an /v2/event-filter record (also `image` / `cover_url`).
 * Accepts a URL, a data URL, raw base64 (what the create/edit form uploads) or a Go-style
 * nullable `{ String, Valid }`. Anything else, or an image that fails to load, shows no cover,
 * so cards look exactly as before when the API sends no image.
 */
function eventCoverSrc(record: Record<string, any>): string {
  const raw = record.cover_url ?? record.image ?? record.images;
  const value = typeof raw === "string" ? raw : raw && raw.Valid !== false && raw.valid !== false ? raw.String ?? raw.string : "";
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (/^(https?:)?\/\//i.test(text) || text.startsWith("/") || text.startsWith("data:image/")) return text;
  if (text.length > 64 && /^[A-Za-z0-9+/=\s]+$/.test(text)) return `data:image/jpeg;base64,${text.replace(/\s+/g, "")}`;
  return "";
}

function EventCardCover({ record }: { record: Record<string, any> }) {
  const src = eventCoverSrc(record);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="event-card-cover">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

/**
 * Whole card / row opens the event (owner 2026-11-22). Clicks on buttons and links inside
 * keep their own action. Keyboard: Enter or Space on the focused card.
 */
function cardOpenProps(name: string, open: () => void) {
  const isInner = (target: EventTarget) => target instanceof Element && Boolean(target.closest('button, a, input, select, textarea, label'));
  return {
    role: 'link' as const,
    tabIndex: 0,
    'aria-label': name,
    className: 'event-card-link',
    onClick: (event: { target: EventTarget }) => { if (!isInner(event.target)) open(); },
    onKeyDown: (event: { key: string; target: EventTarget; currentTarget: EventTarget; preventDefault: () => void }) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); open(); }
    },
  };
}

/** Days since the event's last day (finish, else start / event date); null when it has not ended. */
function daysSinceEnd(record: EventRecord): number | null {
  if (!isEventPast(record)) return null;
  const end = daysUntil(eventLastDate(record).slice(0, 10));
  return end === null ? null : Math.max(1, -end);
}

/**
 * Countdown on the card. An event whose finish date has passed shows "Overdue" (it still sits in an
 * open tab because the server lifecycle has no overdue state; see api-impact-log 2026-11-22) and one
 * that started but has not ended shows "In progress", instead of a negative "-1128d away".
 */
function EventDateChip({ record }: { record: EventRecord }) {
  const { t, i18n } = useTranslation();
  const overdueDays = daysSinceEnd(record);
  const endDate = eventLastDate(record).slice(0, 10);
  const endLabel = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ? new Intl.DateTimeFormat(i18n.language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${endDate}T00:00:00Z`))
    : endDate;
  if (overdueDays !== null) {
    return (
      <span className="event-chip event-chip-overdue" data-tip-pos="below" data-tip={t('eventCard.overdueHint', { date: endLabel })} tabIndex={0}>
        {t('eventCard.overdue', { count: overdueDays })}
      </span>
    );
  }
  const days = daysUntil(record.event_start);
  if (days !== null && days < 0) return <span className="event-chip event-chip-running">{t('eventCard.inProgress')}</span>;
  return <CountdownChip days={days} />;
}

function CountdownChip({ days }: { days: number | null }) {
  if (days === null) return null;
  const isUrgent = days <= 7;
  const isModerate = days <= 30;
  const color = isUrgent
    ? "var(--red)"
    : isModerate
      ? "var(--orange)"
      : "var(--green)";
  const bg = isUrgent
    ? "var(--red-bg)"
    : isModerate
      ? "var(--orange-bg)"
      : "var(--green-bg)";
  const label =
    days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d away`;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: bg,
        padding: "2px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const EVENT_TAB_KEY = "emi.event.tab.v1";

export default function EventPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  // The active tab is kept in the URL (?tab=) and in this browser tab's session, so "Back to Events"
  // from Event Detail (or the browser back button) returns to the same tab (owner 2026-11-23).
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const valid = (value: string | null) => !!value && ([...LIFECYCLE_STATUSES, 'invite'] as string[]).includes(value);
    const fromUrl = searchParams.get('tab');
    if (valid(fromUrl)) return fromUrl as string;
    let saved: string | null = null;
    try { saved = window.sessionStorage.getItem(EVENT_TAB_KEY); } catch { /* storage is optional */ }
    return valid(saved) ? saved as string : 'upcoming';
  });
  useEffect(() => {
    try { window.sessionStorage.setItem(EVENT_TAB_KEY, activeTab); } catch { /* storage is optional */ }
    if (searchParams.get('tab') !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);
  const [filters, setFilters] = useState<EventListFilters>(EMPTY_EVENT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<EventListFilters>(EMPTY_EVENT_FILTERS);
  const queryClient = useQueryClient();
  const [isModify, setIsModify] = useState(false);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [pastQuery, setPastQuery] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [pastPage, setPastPage] = useState(1);
  const [upQuery, setUpQuery] = useState("");
  const [base64, setBase64] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  // PIC is picked from the tenant's users (owner 2026-11-22). Saved as the user's name in the same
  // PIC text field, so the API is unchanged; if the user list cannot load, PIC falls back to free text.
  const [picSearch, setPicSearch] = useState("");
  const picUsersQuery = useGetUsers({
    params: { page: 1, limit: 100, search: picSearch, sort_dir: "asc", sort_by: "created_at" },
    options: { enabled: modalOpen, keepPreviousData: true },
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: locationsResponse, isLoading: isLoadingLocations, isError: isLocationsError, refetch: refetchLocations } =
    useGetLocations();
  const locationOptions = useMemo(
    () =>
      (locationsResponse?.data ?? []).map((location) => ({
        value: location.id,
        label: location.name,
        meta: String(location.event_count),
      })),
    [locationsResponse?.data]
  );

  const formik = useFormik<any>({
    initialValues: {
      name: isModify ? event?.name : "",
      event_code: isModify ? event?.event_code : "",
      description: isModify ? event?.description : "",
      event_start: isModify
        ? moment(event?.event_start).format("YYYY-MM-DD")
        : utils("en").getToday(),
      event_end: isModify
        ? moment(event?.event_end).format("YYYY-MM-DD")
        : utils("en").getToday(),
      PIC: isModify ? event?.PIC : "",
      address: isModify ? event?.address : "",
      location_id: isModify
        ? event?.location_id ?? event?.location?.id ?? ""
        : "",
      files: "",
      is_complete: 0,
      is_finished: 0,
      status: isModify ? event?.status : null,
      notes: isModify ? event?.notes : "",
      type: "",
      latitude: "",
      longitude: "",
      event_running: "",
      scan_type: isModify ? event?.scan_type : "",
      date_event: isModify ? event?.date_event : null,
    },
    validationSchema: Yup.object({
      name: Yup.string().required(t("wording.required")),
      event_code: Yup.string().required(t("wording.required")),
      description: Yup.string().required(t("wording.required")),
      event_start: Yup.string().required(t("wording.required")),
      event_end: Yup.string()
        .required(t("wording.required"))
        .test('not-before-start', t('eventRules.finishBeforeStart'), function (value) {
          const start = this.parent.event_start;
          return !value || !start || value >= start;
        }),
      date_event: Yup.string().required(t("wording.required")),
      PIC: Yup.string().required(t("wording.required")),
      address: Yup.string().required(t("wording.required")),
      location_id: Yup.number()
        .typeError(t("wording.required"))
        .moreThan(0, t("wording.required"))
        .required(t("wording.required")),
      notes: Yup.string().required(t("wording.required")),
      scan_type: Yup.string().required(t("wording.required")),
    }),
    validateOnChange: false,
    enableReinitialize: true,
    onSubmit: async (values) => {
      const payload = {
        description: values.description,
        name: values.name,
        event_start: values.event_start,
        event_end: values.event_end,
        PIC: values.PIC,
        event_code: values.event_code,
        is_complete: isModify ? event?.is_complete ?? 0 : 0,
        is_finished: isModify ? event?.is_finished ?? 0 : 0,
        status: isModify ? values.status : firstEventStatus?.id,
        files: values.files,
        address: values.address,
        location_id: Number(values.location_id),
        type: "",
        latitude: "",
        longitude: "",
        event_running: "",
        notes: values.notes,
        scan_type: values.scan_type,
        date_event: values.date_event,
      };
      try {
        if (!isModify && !firstEventStatus) throw new Error(t('lifecycle.noStages'));
        const images = base64 ? base64.split(",")[1] : "";

        const result = isModify
          ? await InventoryService.editEvent({
              ...payload,
              id: event!.id,
              ...(images ? { images } : {}),
            })
          : await InventoryService.addEvent({ ...payload, images });

        if (result.success === false) {
          throw new Error(
            result.message ||
              (isModify
                ? t("wording.failedToUpdateEvent")
                : t("wording.failedToCreateEvent")),
          );
        }

        toast.success(
          result.message ||
            (isModify
              ? t("wording.eventUpdatedSuccessfully")
              : t("wording.eventCreatedSuccessfully")),
        );
        setModalOpen(false);
        formik.resetForm();
        setBase64("");
        setEditingId(null);
        setIsModify(false);
        setEvent(null);
        await queryClient.invalidateQueries(["events-v2"]);
      } catch (error) {
        const apiMessage = (
          error as { response?: { data?: { message?: string } } }
        )?.response?.data?.message;
        toast.error(
          apiMessage ||
            (error instanceof Error
              ? error.message
              : isModify
                ? t("wording.failedToUpdateEvent")
                : t("wording.failedToCreateEvent")),
        );
      }
    },
  });

  const imgInputRef = useRef<HTMLInputElement>(null);

  const search = (activeTab === 'returned-completed' ? pastQuery : upQuery).trim();
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const activeFilterCount =
    filters.locationIds.length +
    filters.statusIds.length +
    Number(Boolean(filters.from)) +
    Number(Boolean(filters.to)) +
    Number(Boolean(filters.size));
  const listFilterParams = {
    location_id: filters.locationIds.length ? filters.locationIds.join(",") : undefined,
    status_id: filters.statusIds.length ? filters.statusIds.join(",") : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    ...(filters.size === "none" ? { items_max: 0 } : {}),
    ...(filters.size === "small" ? { items_min: 1, items_max: 30 } : {}),
    ...(filters.size === "medium" ? { items_min: 31, items_max: 150 } : {}),
    ...(filters.size === "large" ? { items_min: 151 } : {}),
  };
  const { data: eventsResponse, isFetching, isError, error } = useGetEvents({
    status: activeTab === 'invite' ? undefined : activeTab as LifecycleStatus,
    search: debouncedSearch || undefined,
    ...listFilterParams,
    page: pastPage, limit: PAGE_SIZE, sort_by: 'date_event', sort: 'DESC',
  }, activeTab !== 'invite' && search === debouncedSearch);
  const countQueries = useGetEventLifecycleCounts(listFilterParams);
  const lifecycleCounts = Object.fromEntries(LIFECYCLE_STATUSES.map((flag, index) => [
    flag, countQueries[index].data?.data.total_records ?? 0,
  ]));
  const events = eventsResponse?.data.data ?? [];
  const totalRecords = eventsResponse?.data.total_records ?? 0;
  const listLoading = isFetching || search !== debouncedSearch;
  useEffect(() => {
    const pages = Math.max(1, eventsResponse?.data.total_pages ?? 1);
    if (eventsResponse && pastPage > pages) setPastPage(pages);
  }, [eventsResponse, pastPage]);

  const {
    data: eventStatus,
    isLoading: isLoadingEventStatuses,
    isError: isEventStatusesError,
    refetch: refetchEventStatuses,
  } = useGetEventStatus({
    params: { page: 1, limit: 9999, sort: 'ASC', sortBy: 'order_data' },
    options: {
      enabled: true,
    },
  });

  const orderedEventStatuses = [...(eventStatus?.data?.data ?? [])].sort((a, b) => a.order_data - b.order_data);
  const stageFilterOptions = orderedEventStatuses.map((status) => ({
    value: status.id,
    label: status.name,
  }));
  const firstEventStatus = orderedEventStatuses[0];
  function openFilters() {
    setDraftFilters({
      ...filters,
      locationIds: [...filters.locationIds],
      statusIds: [...filters.statusIds],
    });
    setFilterOpen(true);
  }
  function applyFilters() {
    setFilters({
      ...draftFilters,
      locationIds: [...draftFilters.locationIds],
      statusIds: [...draftFilters.statusIds],
    });
    setPastPage(1);
    setFilterOpen(false);
  }
  function resetDraftFilters() {
    setDraftFilters({ ...EMPTY_EVENT_FILTERS, locationIds: [], statusIds: [] });
  }
  const renderFilterButton = () => (
    <button
      type="button"
      className={`event-list-filter${activeFilterCount ? " active" : ""}`}
      onClick={openFilters}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      Filter{activeFilterCount > 0 && <span className="event-list-filter-count">{fmtDisplayNumber(activeFilterCount)}</span>}
    </button>
  );
  function lifecycleOf(record: EventRecord): LifecycleStatus {
    return LIFECYCLE_STATUSES.includes(record.lifecycle_status)
      ? record.lifecycle_status : activeTab as LifecycleStatus;
  }
  const upcomingEvents = events;
  const pastEvents = events;

  const groupedPast = useMemo(() => {
    if (pastQuery) return null;
    const map: Record<string, PastEventGroup> = {};
    pastEvents?.forEach((e: EventRecord) => {
      const [y, m] = (e.event_start || "").split("-");
      const key = `${y}-${m}`;
      if (!map[key])
        map[key] = { label: `${monthLabel(parseInt(m) - 1, "long")} ${y}`, items: [] };
      map[key].items.push(e);
    });
    return Object.values(map);
  }, [pastEvents, pastQuery, i18n.resolvedLanguage]);

  const pastFlat = pastEvents;

  function openNew() {
    setEditingId(null);
    setIsModify(false);
    setEvent(null);
    formik.resetForm();
    setModalOpen(true);
  }
  function openEdit(id: number) {
    const r = events.find((candidate: EventRecord) => candidate.id === id);
    if (!r) return;
    if (isEventPast(r)) {
      toast.info(t('eventRules.pastEditLocked'));
      return;
    }
    setEditingId(id);
    setIsModify(true);
    setEvent(r);
    setModalOpen(true);
  }

  function openDelete(id: number) {
    setDeletingId(id);
    setDeleteConfirmText("");
    setDeleteOpen(true);
  }
  async function confirmDelete() {
    if (deletingId === null || !deleteConfirmed) return;
    try {
      setIsDeleting(true);
      const result = await InventoryService.deleteEvent({
        id: String(deletingId),
      });
      if (result?.success === false) {
        throw new Error(result.message || "Failed to delete event.");
      }
      toast.success(result?.message || "Event deleted successfully.");
      setDeleteOpen(false);
      setDeletingId(null);
      await queryClient.invalidateQueries(["events-v2"]);
    } catch (error) {
      const apiMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(
        apiMessage ||
          (error instanceof Error ? error.message : t("wording.failedToDeleteEvent")),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const delTarget = events.find((candidate: EventRecord) => candidate.id === deletingId);
  // Delete safety (owner 2026-11-23): an event that has items must be confirmed by typing its name;
  // an event with no items only needs the normal confirm. Unknown item count = treated as "has items".
  const delItemCount = Number(delTarget?.total_items);
  const delNeedsTyping = !(delTarget && delTarget.total_items !== null && delTarget.total_items !== undefined && Number.isFinite(delItemCount) && delItemCount === 0);
  const delName = String(delTarget?.name ?? "").trim();
  const deleteConfirmed = !delNeedsTyping || (delName !== "" && deleteConfirmText.trim().toLowerCase() === delName.toLowerCase());

  function EventCard({ r, onDelete, navigate }: EventRowProps) {
    const days = daysUntil(r.event_start);
    const accent =
      days !== null && days <= 7
        ? "var(--red)"
        : days !== null && days <= 30
          ? "var(--orange)"
          : "var(--brand)";

    return (
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          borderTop: `3px solid ${accent}`,
          display: "flex",
          flexDirection: "column",
          // No overflow: hidden here: it clipped the action tooltips. The cover rounds its own corners.
          transition: "box-shadow .15s, transform .15s",
        }}
        {...cardOpenProps(r.name || r.event_code || `#${r.id}`, () => navigate(`/event-detail?id=${r.id}`))}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.08)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "none";
        }}
      >
        <EventCardCover record={r} />
        <div style={{ padding: "16px 18px 14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span className="badge badge-gray" style={{ fontSize: 10.5 }}>
              {r.event_code}
            </span>
            <EventDateChip record={r} />
            <span className={`badge ${LIFECYCLE_BADGES[lifecycleOf(r)]}`}>{t(`lifecycle.${lifecycleOf(r)}`)}</span>
          </div>

          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text)",
              lineHeight: 1.3,
              marginBottom: 5,
            }}
          >
            {r.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 14,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: 32,
            }}
          >
            {r.description || "—"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <IconCal />
              <span>{fmtRange(r.event_start, r.event_end)}</span>
            </div>
            {r.address && r.address !== "-" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <IconPin />
                <span>{r.address}</span>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid var(--border)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            background: "var(--dk-raise-1, #fafbfc)",
            borderRadius: "0 0 10px 10px",
            gap: 2,
          }}
        >
          <button
            className="btn-icon cart"
            data-tip={t("wording.detailCart")} data-tip-align="start" aria-label={t("wording.detailCart")}
            onClick={() => navigate(`/event-detail?id=${r.id}`)}
          >
            <IconCart />
          </button>
          {/* Item count next to the cart (ported from emi-source): `total_items` from /v2/event-filter. */}
          {Number.isFinite(Number(r.total_items)) && r.total_items !== null && r.total_items !== undefined && (
            <span className="badge badge-gray" style={{ fontSize: 10.5, padding: "2px 7px" }} data-tip={t("wording.totalItems", { defaultValue: "Total items" })} tabIndex={0}>
              {fmtDisplayNumber(Number(r.total_items))}
            </span>
          )}
          <button
            className="btn-icon"
            data-tip={t("wording.summary")} data-tip-align="start" aria-label={t("wording.summary")}
            style={{ color: "var(--purple)" }}
            onClick={() => navigate(`/event-summary?id=${r.id}`)}
          >
            <IconBarChart />
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn-icon edit"
            data-tip={isEventPast(r) ? t('eventRules.pastEditLocked') : t("wording.edit")}
            data-tip-align="end"
            aria-label={isEventPast(r) ? t('eventRules.pastEditLocked') : t("wording.edit")}
            // aria-disabled instead of disabled: a disabled button gets no hover, so its tooltip never showed.
            aria-disabled={isEventPast(r)}
            onClick={() => openEdit(r.id)}
          >
            <IconEdit />
          </button>
          <button
            className="btn-icon delete"
            data-tip={t("wording.delete")} data-tip-align="end" aria-label={t("wording.delete")}
            onClick={() => onDelete(r.id)}
          >
            <IconDelete />
          </button>
          <button className="btn-icon history" data-tip={t("wording.history")} data-tip-align="end" aria-label={t("wording.history")} onClick={() => navigate(`/event-history?id=${r.id}`)}>
            <IconHistory />
          </button>
        </div>
      </div>
    );
  }

  function PastEventRow({ r, onEdit, onDelete, navigate }: EventRowProps) {
    const readOnly = ['returned-completed', 'transferred'].includes(activeTab);
    const day =
      r.event_start && r.event_start !== "-"
        ? parseInt(r.event_start.split("-")[2])
        : "—";
    const month =
      r.event_start && r.event_start !== "-"
        ? monthLabel(parseInt(r.event_start.split("-")[1]) - 1)
        : "";

    return (
      <div
        style={{
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "box-shadow .12s",
        }}
        {...cardOpenProps(r.name || r.event_code || `#${r.id}`, () => navigate(`/event-detail?id=${r.id}`))}
        onMouseEnter={(e) =>
          (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.07)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <div
          style={{
            minWidth: 48,
            textAlign: "center",
            padding: "6px 4px",
            background: "var(--bg)",
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            {day}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "var(--text-muted)",
              marginTop: 2,
              fontWeight: 600,
            }}
          >
            {month}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 3,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 13.5,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.name}
            </span>
            <span
              className="badge badge-gray"
              style={{ fontSize: 10.5, flexShrink: 0 }}
            >
              {r.event_code}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 12,
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}
          >
            {r.description && (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 220,
                }}
              >
                {r.description}
              </span>
            )}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <IconCal />
              {fmtRange(r.event_start, r.event_end)}
            </span>
            {r.address && r.address !== "-" && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <IconPin />
                {r.address}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          <button
            className="btn-icon cart"
            data-tip={t("wording.detailCart")} data-tip-align="start" aria-label={t("wording.detailCart")}
            onClick={() => navigate(`/event-detail?id=${r.id}`)}
          >
            <IconCart />
          </button>
          <button
            className="btn-icon"
            data-tip={t("wording.summary")} data-tip-align="start" aria-label={t("wording.summary")}
            style={{ color: "var(--purple)" }}
            onClick={() => navigate(`/event-summary?id=${r.id}`)}
          >
            <IconBarChart />
          </button>
          {!readOnly && <><button
            className="btn-icon edit"
            data-tip={isEventPast(r) ? t('eventRules.pastEditLocked') : t("wording.edit")}
            data-tip-align="end"
            aria-label={isEventPast(r) ? t('eventRules.pastEditLocked') : t("wording.edit")}
            // aria-disabled instead of disabled: a disabled button gets no hover, so its tooltip never showed.
            aria-disabled={isEventPast(r)}
            onClick={() => onEdit(r.id)}
          >
            <IconEdit />
          </button>
          <button
            className="btn-icon delete"
            data-tip={t("wording.delete")} data-tip-align="end" aria-label={t("wording.delete")}
            onClick={() => onDelete(r.id)}
          >
            <IconDelete />
          </button>
          <button className="btn-icon history" data-tip={t("wording.history")} data-tip-align="end" aria-label={t("wording.history")} onClick={() => navigate(`/event-history?id=${r.id}`)}>
            <IconHistory />
          </button></>}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          {t("wording.event")}
        </h1>
        <button className="btn-new" onClick={openNew}>
          <IconPlus /> {t("wording.newEvent")}
        </button>
      </div>

      {/* Stats row */}
      <div
        className="stats-bar"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        {[
          {
            label: t("wording.totalEvents"),
            value: Object.values(lifecycleCounts).reduce((sum, count) => sum + count, 0),
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: t("wording.active"),
            value: lifecycleCounts.upcoming + lifecycleCounts['on-going'] + lifecycleCounts['ready-to-close'],
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: t("lifecycle.checking-inventory"),
            value: lifecycleCounts['checking-inventory'],
            color: "var(--text-muted)",
            bg: "var(--bg)",
          },
          { label: t('wording.completed'), value: lifecycleCounts['returned-completed'] + lifecycleCounts.transferred, color: 'var(--green)', bg: 'var(--green-bg)' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--border)",
          overflowX: 'auto',
          marginBottom: 20,
          gap: 0,
        }}
      >
        {[
          ...LIFECYCLE_STATUSES.map(id => ({ id, label: t(`lifecycle.${id}`), count: lifecycleCounts[id] })),
          { id: "invite", label: t("wording.inviteUser"), count: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setPastPage(1); setUpQuery(''); setPastQuery(''); }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "10px 20px",
              fontSize: 13.5,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: activeTab === t.id ? "var(--brand)" : "var(--text-muted)",
              borderBottom:
                activeTab === t.id
                  ? "2px solid var(--brand)"
                  : "2px solid transparent",
              marginBottom: -2,
              transition: "color .15s",
            }}
          >
            {t.label}
            {t.count !== null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 7px",
                  borderRadius: 20,
                  background:
                    activeTab === t.id ? "var(--brand-bg)" : "var(--dk-chip-bg, #f1f5f9)",
                  color: activeTab === t.id ? "var(--brand)" : "var(--dk-chip-text, #64748b)",
                }}
              >
                {fmtDisplayNumber(t.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── UPCOMING ── */}
      {activeTab !== 'invite' && (listLoading || isError) && <div className="card" role="status" style={{ padding: 20 }}>{listLoading ? t('wording.loading') : (error instanceof Error ? error.message : t('wording.failedToLoadData'))}</div>}
      {activeTab !== 'invite' && activeTab !== 'returned-completed' && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 18,
              alignItems: "center",
            }}
          >
            <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder={t("wording.searchEvents")}
                value={upQuery}
                onChange={(e) => { setUpQuery(e.target.value); setPastPage(1); }}
              />
            </div>
            {renderFilterButton()}
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint /> {t("wording.print")}
            </button>
          </div>

          {listLoading || isError ? null : upcomingEvents.length === 0 ? (
            <div
              className="card"
              style={{ padding: "56px 32px", textAlign: "center" }}
            >
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {upQuery
                  ? t("wording.noEventsMatchYourSearch")
                  : t("wording.noData")}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: ['checking-inventory', 'transferred'].includes(activeTab) ? '1fr' : "repeat(auto-fill, minmax(min(100%,270px),1fr))",
                gap: 14,
              }}
            >
              {upcomingEvents.map((r: EventRecord) => (
                ['checking-inventory', 'transferred'].includes(activeTab) ? <PastEventRow key={r.id} r={r} onEdit={openEdit} onDelete={openDelete} navigate={navigate} /> : <EventCard
                  key={r.id}
                  r={r}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
          <Pagination currentPage={pastPage} total={totalRecords} pageSize={PAGE_SIZE} onPage={setPastPage} label={t('wording.event')} />
        </div>
      )}

      {/* ── PAST ── */}
      {activeTab === "returned-completed" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 18,
              alignItems: "center",
            }}
          >
            <div className="search-wrap" style={{ flex: 1, maxWidth: 320 }}>
              <IconSearch />
              <input
                className="search-input"
                type="text"
                placeholder={t("wording.searchPastEvents")}
                value={pastQuery}
                onChange={(e) => {
                  setPastQuery(e.target.value);
                  setPastPage(1);
                }}
              />
            </div>
            {renderFilterButton()}
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint /> {t("wording.print")}
            </button>
          </div>

          {listLoading || isError ? null : pastEvents.length === 0 ? (
            <div
              className="card"
              style={{ padding: "56px 32px", textAlign: "center" }}
            >
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {pastQuery ? t("wording.noEventsMatchYourSearch") : t("wording.noPastEvents")}
              </p>
            </div>
          ) : pastQuery ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pastFlat.map((r: EventRecord) => (
                  <PastEventRow
                    key={r.id}
                    r={r}
                    onEdit={openEdit}
                    onDelete={openDelete}
                    navigate={navigate}
                  />
                ))}
              </div>

            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {(groupedPast ?? []).map((group) => (
                <div key={group.label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      {group.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "1px 7px",
                        borderRadius: 20,
                        background: "var(--dk-chip-bg, #f1f5f9)",
                        color: "var(--dk-chip-text, #64748b)",
                        fontWeight: 600,
                      }}
                    >
                      {fmtDisplayNumber(group.items.length)}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: "var(--border)",
                      }}
                    />
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {group.items.map((r) => (
                      <PastEventRow
                        key={r.id}
                        r={r}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination currentPage={pastPage} total={totalRecords} pageSize={PAGE_SIZE} onPage={setPastPage} label={t("wording.events")} />
        </div>
      )}

      {/* ── INVITE ── */}
      {activeTab === "invite" && (
        <div
          className="card"
          style={{ padding: "56px 32px", textAlign: "center" }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 6,
            }}
          >
            {t("wording.inviteUser")}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {t("wording.thisFeatureWillBeAvailableSoon")}
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingId ? t("wording.editEvent") : t("wording.newEvent")}
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
              <IconClose /> {t("wording.cancel")}
            </button>
            <button
              className="btn-save-modal"
              onClick={() => formik.handleSubmit()}
              type="button"
              disabled={Boolean(formik.values.event_start && formik.values.event_end && formik.values.event_end < formik.values.event_start)}
            >
              <IconCheck /> {t("wording.saveEvent")}
            </button>
          </>
        }
      >
        {/* GENERAL */}
        <div className="form-row">
          <TextInput
            value={formik.values.name}
            onChange={(value) => formik.setFieldValue("name", value)}
            isRequired
            label={t("wording.eventName")}
            placeholder={t("wording.enterEventName")}
            errorText={formik.errors.name as string}
          />
          <div style={{ maxWidth: 120, flex: 1 }}>
            <TextInput
              value={formik.values.event_code}
              onChange={(value) => formik.setFieldValue("event_code", value)}
              isRequired
              label={t("wording.code")}
              placeholder={t("wording.eGWb")}
              errorText={formik.errors.event_code as string}
            />
          </div>
        </div>
        <TextArea
          value={formik.values.description}
          onChange={(value) => formik.setFieldValue("description", value)}
          isRequired
          label={t("wording.description")}
          placeholder={t("wording.shortEventDescription")}
          rows={2}
          errorText={formik.errors.description as string}
        />
        <div className="form-row">
          <TextInput
            value={formik.values.event_start}
            onChange={(value) => formik.setFieldValue("event_start", value)}
            isRequired
            inputType="date"
            label={t("wording.startDate")}
            errorText={formik.errors.event_start ? "Required" : ("" as string)}
          />
          <TextInput
            value={formik.values.event_end}
            onChange={(value) => formik.setFieldValue("event_end", value)}
            isRequired
            inputType="date"
            min={formik.values.event_start || undefined}
            label={t("wording.finishDate")}
            errorText={formik.errors.event_end as string}
          />
        </div>
        <div className="form-row">
          <TextInput
            value={formik.values.date_event ?? ""}
            onChange={(value) => formik.setFieldValue("date_event", value)}
            isRequired
            inputType="date"
            label={t("wording.eventDate")}
            errorText={formik.errors.date_event as string}
          />
        </div>

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
            {t("wording.details")}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div className="form-row">
          {picUsersQuery.isError ? (
            <TextInput
              value={formik.values.PIC}
              onChange={(value) => formik.setFieldValue("PIC", value)}
              isRequired
              label={t("wording.pic")}
              placeholder={t("wording.personInCharge")}
              errorText={formik.errors.PIC as string}
            />
          ) : (
            <div className="form-group">
              <label>
                {t("wording.pic")} <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <SearchableSelect
                value={formik.values.PIC || ""}
                onChange={(value) => formik.setFieldValue("PIC", String(value))}
                onSearchChange={setPicSearch}
                options={(() => {
                  const users = picUsersQuery.data?.data?.users ?? [];
                  const options = users
                    .map((user) => ({ value: (user.fullname || user.email || "").trim(), label: (user.fullname || user.email || "").trim(), meta: user.email && user.fullname ? user.email : undefined }))
                    .filter((option, index, list) => option.value && list.findIndex((other) => other.value === option.value) === index);
                  const current = (formik.values.PIC || "").trim();
                  // Events saved before this change may have a PIC that is not a user name: keep it selectable.
                  if (current && !options.some((option) => option.value === current)) options.unshift({ value: current, label: current, meta: t("eventForm.picNotAUser") });
                  return options;
                })()}
                placeholder={picUsersQuery.isLoading ? t("wording.loading") : t("eventForm.picPlaceholder")}
                searchPlaceholder={t("eventForm.picSearch")}
                emptyText={t("eventForm.picEmpty")}
                errorText={formik.touched.PIC || formik.submitCount > 0 ? (formik.errors.PIC as string) : undefined}
              />
            </div>
          )}
          <div className="form-group">
            <label>
              {t("wording.qrType")} <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <SearchableSelect
              value={formik.values.scan_type}
              onChange={(value) =>
                formik.setFieldValue("scan_type", String(value))
              }
              options={[
                { value: "", label: t("wording.selectQrType") },
                { value: "GROUP", label: "GROUP" },
                { value: "INDIVIDUAL", label: "INDIVIDUAL" },
              ]}
              placeholder={t("wording.selectQrType")}
              errorText={formik.errors.scan_type as string}
            />
          </div>
        </div>
        <div className="form-row">
          <TextInput
            value={formik.values.address}
            onChange={(value) => formik.setFieldValue("address", value)}
            isRequired
            label={t("wording.address")}
            placeholder={t("wording.eventLocationAddress")}
            errorText={formik.errors.address as string}
          />
          <div className="form-group">
                  <label>
                    {t("wording.location")} <span className="required">*</span>
                  </label>
                  <SearchableSelect
                    value={formik.values.location_id}
                    onChange={(value) =>
                      formik.setFieldValue("location_id", Number(value))
                    }
                    options={locationOptions}
                    placeholder={t("wording.selectLocation")}
                    disabled={isLoadingLocations}
                    errorText={formik.errors.location_id as string}
                  />
          </div>
        </div>

        {/* ADDITIONAL */}
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
              background: "var(--red)",
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
            {t("wording.additional")}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div className="form-row" style={{ alignItems: "flex-start" }}>
          <TextArea
            value={formik.values.notes}
            onChange={(value) => formik.setFieldValue("notes", value)}
            isRequired
            label={t("wording.note")}
            placeholder={t("wording.anyAdditionalNotes")}
            rows={4}
            errorText={formik.errors.notes as string}
          />
          <div className="form-group">
            <label>{t("wording.image")}</label>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const result = ev.target?.result;
                  if (typeof result === "string") setBase64(result);
                };
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
                    {t("wording.clickToUploadImage")}
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
                {t("wording.removeImage")}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteOpen}
        title={t("wording.deleteEvent")}
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteOpen(false)}
            >
              {t("wording.cancel")}
            </button>
            <button
              className="btn-del-ok"
              disabled={isDeleting || !deleteConfirmed}
              onClick={confirmDelete}
            >
              {isDeleting ? t("common.actions.deleting") : t("common.actions.delete")}
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          {t("wording.areYouSureYouWantToDeletePrefix")}{delTarget?.name}&rdquo;?
        </p>
        {delNeedsTyping && <div className="del-type-confirm form-group">
          <p className="del-type-warn">
            {Number.isFinite(delItemCount) && delItemCount > 0
              ? t("eventDelete.hasItems", { count: delItemCount })
              : t("eventDelete.mayHaveItems")}
          </p>
          <label htmlFor="del-type-input">{t("eventDelete.typeName")} <strong>{delName}</strong></label>
          <input
            id="del-type-input"
            autoComplete="off"
            autoFocus
            value={deleteConfirmText}
            placeholder={delName}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && deleteConfirmed && !isDeleting) void confirmDelete(); }}
          />
        </div>}
      </Modal>
      <Drawer
        open={filterOpen}
        title="Filter events"
        subtitle="Applies to every tab"
        onClose={() => setFilterOpen(false)}
        footer={
          <>
            <button type="button" className="btn-cancel-modal" onClick={resetDraftFilters}>Reset</button>
            <button type="button" className="btn-save-modal" onClick={applyFilters}><IconCheck /> Apply</button>
          </>
        }
      >
        <div className="form-group">
          <label>Location</label>
          <SearchableSelect
            multiple
            value={draftFilters.locationIds}
            onChange={(values) => setDraftFilters((current) => ({ ...current, locationIds: values.map(String) }))}
            options={locationOptions}
            placeholder="All locations"
            searchPlaceholder="Search location..."
            disabled={isLoadingLocations}
          />
          {isLocationsError && (
            <p className="event-filter-load-error" role="alert">
              Locations could not be loaded. <button type="button" onClick={() => void refetchLocations()}>Retry</button>
            </p>
          )}
        </div>
        <div className="form-group">
          <label>Event status (stage)</label>
          <SearchableSelect
            multiple
            value={draftFilters.statusIds}
            onChange={(values) => setDraftFilters((current) => ({ ...current, statusIds: values.map(String) }))}
            options={stageFilterOptions}
            placeholder="All stages"
            searchPlaceholder="Search stage..."
            disabled={isLoadingEventStatuses}
          />
          {isEventStatusesError && (
            <p className="event-filter-load-error" role="alert">
              Event stages could not be loaded. <button type="button" onClick={() => void refetchEventStatuses()}>Retry</button>
            </p>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start date from</label>
            <input
              type="date"
              value={draftFilters.from}
              max={draftFilters.to || undefined}
              onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Start date to</label>
            <input
              type="date"
              value={draftFilters.to}
              min={draftFilters.from || undefined}
              onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Number of items</label>
          <div className="event-filter-radio-list">
            {EVENT_SIZE_FILTERS.map((option) => (
              <label key={option.value || "any"} className="pp-check">
                <input
                  type="radio"
                  name="event-size"
                  checked={option.value !== "" && draftFilters.size === option.value}
                  onChange={() => setDraftFilters((current) => ({ ...current, size: option.value }))}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </Drawer>
    </>
  );
}
