import { useState, useMemo, useRef } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { toast } from "react-toastify";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import SearchableSelect from "../components/SearchableSelect";
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
import useGetUpcomingEvents from "../hooks/api/useGetUpcomingEvents";
import useGetPastEvents from "../hooks/api/useGetPastEvents";
import useGetEventStatus from "../hooks/api/useGetEventStatus";
import { useFormik } from "formik";
import * as Yup from "yup";
import { utils } from "react-modern-calendar-datepicker";
import { InventoryService } from "../service/InventoryService";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "../utils/function";

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

export default function EventPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isModify, setIsModify] = useState(false);
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [pastQuery, setPastQuery] = useState("");
  const [pastPage, setPastPage] = useState(1);
  const [upQuery, setUpQuery] = useState("");
  const [base64, setBase64] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      files: "",
      is_complete: 0,
      status: isModify ? event?.status : 1,
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
      event_end: Yup.string().required(t("wording.required")),
      date_event: Yup.string().required(t("wording.required")),
      PIC: Yup.string().required(t("wording.required")),
      status: Yup.number().required(t("wording.required")),
      address: Yup.string().required(t("wording.required")),
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
        is_complete: 0,
        status: values.status,
        files: values.files,
        address: values.address,
        type: "",
        latitude: "",
        longitude: "",
        event_running: "",
        notes: values.notes,
        scan_type: values.scan_type,
        date_event: values.date_event,
      };
      try {
        const images = base64
          ? base64.split(",")[1]
          : isModify
            ? String(event?.images ?? "")
            : "";

        const result = isModify
          ? await InventoryService.editEvent({
              ...payload,
              id: event!.id,
              images,
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
        await Promise.all([refetchPasts(), refetchUpcomings()]);
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

  const { data: upcomings, refetch: refetchUpcomings } = useGetUpcomingEvents({
    options: {
      enabled: true,
    },
    search: "",
  });

  const { data: pasts, refetch: refetchPasts } = useGetPastEvents({
    options: {
      enabled: true,
    },
    search: "",
  });

  const { data: eventStatus } = useGetEventStatus({
    options: {
      enabled: true,
    },
  });

  const upcomingEvents = useMemo(() => {
    const data = [...(upcomings?.data?.data ?? [])] as EventRecord[];
    const query = upQuery.trim().toLowerCase();
    if (!query) return data;
    return data.filter((candidate) =>
      [
        candidate.name,
        candidate.event_code,
        candidate.address,
        candidate.description,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [upQuery, upcomings?.data?.data]);

  const pastEvents = useMemo(() => {
    let data = [...(pasts?.data?.data ?? [])] as EventRecord[];
    if (pastQuery) {
      const q = pastQuery.toLowerCase();
      data = data.filter(
        (e: EventRecord) =>
          e.name.toLowerCase().includes(q) ||
          e.event_code.toLowerCase().includes(q) ||
          e.address.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }
    return data.sort((a: EventRecord, b: EventRecord) =>
      (b.event_start || "").localeCompare(a.event_start || ""),
    );
  }, [pasts?.data?.data, pastQuery]);

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

  const pastFlat = useMemo(
    () => pastEvents?.slice((pastPage - 1) * PAGE_SIZE, pastPage * PAGE_SIZE),
    [pastEvents, pastPage],
  );

  function openNew() {
    setEditingId(null);
    setIsModify(false);
    setEvent(null);
    formik.resetForm();
    setModalOpen(true);
  }
  function openEdit(id: number) {
    const r = [
      ...(upcomings?.data?.data ?? []),
      ...(pasts?.data?.data ?? []),
    ].find((candidate: EventRecord) => candidate.id === id);
    if (!r) return;
    setEditingId(id);
    setIsModify(true);
    setEvent(r);
    setModalOpen(true);
  }

  function openDelete(id: number) {
    setDeletingId(id);
    setDeleteOpen(true);
  }
  async function confirmDelete() {
    if (deletingId === null) return;
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
      await Promise.all([refetchPasts(), refetchUpcomings()]);
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

  const delTarget = [
    ...(upcomings?.data?.data ?? []),
    ...(pasts?.data?.data ?? []),
  ].find((candidate: EventRecord) => candidate.id === deletingId);

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
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 10,
          borderTop: `3px solid ${accent}`,
          display: "flex",
          flexDirection: "column",
          transition: "box-shadow .15s, transform .15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.08)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "none";
        }}
      >
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
            <CountdownChip days={days} />
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
            background: "#fafbfc",
            borderRadius: "0 0 10px 10px",
            gap: 2,
          }}
        >
          <button
            className="btn-icon cart"
            title={t("wording.detailCart")}
            onClick={() => navigate(`/event-detail?id=${r.id}`)}
          >
            <IconCart />
          </button>
          <button
            className="btn-icon"
            title={t("wording.summary")}
            style={{ color: "var(--purple)" }}
            onClick={() => navigate(`/event-summary?id=${r.id}`)}
          >
            <IconBarChart />
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn-icon edit"
            title={t("wording.edit")}
            onClick={() => openEdit(r.id)}
          >
            <IconEdit />
          </button>
          <button
            className="btn-icon delete"
            title={t("wording.delete")}
            onClick={() => onDelete(r.id)}
          >
            <IconDelete />
          </button>
          <button className="btn-icon history" title={t("wording.history")}>
            <IconHistory />
          </button>
        </div>
      </div>
    );
  }

  function PastEventRow({ r, onEdit, onDelete, navigate }: EventRowProps) {
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
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "box-shadow .12s",
        }}
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
            title={t("wording.detailCart")}
            onClick={() => navigate(`/event-detail?id=${r.id}`)}
          >
            <IconCart />
          </button>
          <button
            className="btn-icon"
            title={t("wording.summary")}
            style={{ color: "var(--purple)" }}
            onClick={() => navigate(`/event-summary?id=${r.id}`)}
          >
            <IconBarChart />
          </button>
          <button
            className="btn-icon edit"
            title={t("wording.edit")}
            onClick={() => onEdit(r.id)}
          >
            <IconEdit />
          </button>
          <button
            className="btn-icon delete"
            title={t("wording.delete")}
            onClick={() => onDelete(r.id)}
          >
            <IconDelete />
          </button>
          <button className="btn-icon history" title={t("wording.history")}>
            <IconHistory />
          </button>
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 22,
        }}
      >
        {[
          {
            label: t("wording.totalEvents"),
            value:
              (upcomings?.data?.total_records ?? 0) +
              (pasts?.data?.total_records ?? 0),
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: t("wording.upcoming"),
            value: upcomings?.data?.total_records ?? 0,
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: t("wording.pastEvents"),
            value: pasts?.data?.total_records,
            color: "var(--text-muted)",
            bg: "var(--bg)",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
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
          marginBottom: 20,
          gap: 0,
        }}
      >
        {[
          {
            id: "upcoming",
            label: t("wording.upcoming"),
            count: upcomings?.data?.total_records,
          },
          {
            id: "past",
            label: t("wording.pastEvents"),
            count: pasts?.data?.total_records,
          },
          { id: "invite", label: t("wording.inviteUser"), count: null },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
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
                    activeTab === t.id ? "var(--brand-bg)" : "#f1f5f9",
                  color: activeTab === t.id ? "var(--brand)" : "#64748b",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── UPCOMING ── */}
      {activeTab === "upcoming" && (
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
                onChange={(e) => setUpQuery(e.target.value)}
              />
            </div>
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint /> {t("wording.print")}
            </button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div
              className="card"
              style={{ padding: "56px 32px", textAlign: "center" }}
            >
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {upQuery
                  ? t("wording.noEventsMatchYourSearch")
                  : t("wording.noUpcomingEvents")}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px,1fr))",
                gap: 14,
              }}
            >
              {upcomingEvents.map((r: EventRecord) => (
                <EventCard
                  key={r.id}
                  r={r}
                  onEdit={openEdit}
                  onDelete={openDelete}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAST ── */}
      {activeTab === "past" && (
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
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint /> {t("wording.print")}
            </button>
          </div>

          {pastEvents.length === 0 ? (
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
              <Pagination
                currentPage={pastPage}
                total={pastEvents.length}
                pageSize={PAGE_SIZE}
                onPage={setPastPage}
                label={t("wording.events")}
              />
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
                        background: "#f1f5f9",
                        color: "#64748b",
                        fontWeight: 600,
                      }}
                    >
                      {group.items.length}
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
            label={t("wording.finishDate")}
            errorText={formik.errors.event_end ? "Required" : ("" as string)}
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
          <TextInput
            value={formik.values.PIC}
            onChange={(value) => formik.setFieldValue("PIC", value)}
            isRequired
            label={t("wording.pic")}
            placeholder={t("wording.personInCharge")}
            errorText={formik.errors.PIC as string}
          />
          <div className="form-group">
            <label>
              {t("wording.status")} <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <SearchableSelect
              value={formik.values.status}
              onChange={(value) =>
                formik.setFieldValue(
                  "status",
                  value === "" ? "" : Number(value),
                )
              }
              options={[
                { value: "", label: t("wording.selectStatusOption") },
                ...(eventStatus?.data?.data ?? []).map((status) => ({
                  value: status.id,
                  label: status.name,
                })),
              ]}
              placeholder={t("wording.selectStatusOption")}
              searchPlaceholder={t("wording.searchStatuses")}
              errorText={formik.errors.status as string}
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
              disabled={isDeleting}
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
      </Modal>
    </>
  );
}
