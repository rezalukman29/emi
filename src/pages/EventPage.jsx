import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
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
import { initialEvents, TODAY } from "../data/events";
import useGetUpcomingEvents from "../hooks/api/useGetUpcomingEvents";
import useGetPastEvents from "../hooks/api/useGetPastEvents";
import useGetEventStatus from "..//hooks/api/useGetEventStatus";
import { useFormik } from "formik";
import * as Yup from "yup";
import {  utils } from "react-modern-calendar-datepicker";
import { InventoryService } from "../service/InventoryService";

const PAGE_SIZE = 8;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtRange(start, finish) {
  if (!start || start === "-") return "—";
  const [sy, sm, sd] = start.split("-");
  const s = `${parseInt(sd)} ${MONTHS_SHORT[parseInt(sm) - 1]} ${sy}`;
  if (!finish || finish === start || finish === "-") return s;
  const [fy, fm, fd] = finish.split("-");
  if (sy === fy && sm === fm)
    return `${parseInt(sd)}–${parseInt(fd)} ${
      MONTHS_SHORT[parseInt(sm) - 1]
    } ${sy}`;
  return `${parseInt(sd)} ${MONTHS_SHORT[parseInt(sm) - 1]} – ${parseInt(fd)} ${
    MONTHS_SHORT[parseInt(fm) - 1]
  } ${fy}`;
}


function daysUntil(start) {
  if (!start) return null;
  return Math.ceil((new Date(start) - TODAY) / 86400000);
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

function CountdownChip({ days }) {
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [events, setEvents] = useState(initialEvents);
  
  const [isModify, setIsModify] = useState(false);
  const [event, setEvent] = useState(null);
  const [pastQuery, setPastQuery] = useState("");
  const [pastPage, setPastPage] = useState(1);
  const [upQuery, setUpQuery] = useState("");
  const [base64, setBase64] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const formik = useFormik({
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
      name: Yup.string().required("Required"),
      event_code: Yup.string().required("Required"),
      description: Yup.string().required("Required"),
      PIC: Yup.string().required("Required"),
      notes: Yup.string().required("Required"),
      scan_type: Yup.string().required("Required"),
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
      if (isModify) {
        const result = await InventoryService.editEvent({
          ...payload,
          id: event.id,
          ...(base64 ? { images: base64?.split(",")[1] } : { images: "" }),
        });
        if (result.success) {
          setTimeout(() => {
            setModalOpen(false);
          }, 200);
          // toast?.current?.show({
          //   severity: "success",
          //   summary: "Success",
          //   detail: "Modify Event",
          //   life: 3000,
          // });
        }
      } else {
        const result = await InventoryService.addEvent({
          ...payload,

          ...(base64 ? { images: base64?.split(",")[1] } : { images: "" }),
        });
        if (result.success) {
          setTimeout(() => {
            setModalOpen(false);
          }, 200);
        }
        // toast?.current?.show({
        //   severity: "success",
        //   summary: "Success",
        //   detail: "Adding event",
        //   life: 3000,
        // });
      }
      formik.resetForm();
      setBase64("");
      setIsModify(false);
      setEvent(null);
      refetchPasts();
      refetchUpcomings();
    },
  });

  const imgInputRef = useRef(null);

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

  const pastEvents = useMemo(() => {
    let data = pasts?.data?.data;
    if (pastQuery) {
      const q = pastQuery.toLowerCase();
      data = data?.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.event_code.toLowerCase().includes(q) ||
          e.address.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q)
      );
    }
    return data?.sort((a, b) =>
      (b.event_start || "").localeCompare(a.event_start || "")
    );
  }, [pasts?.data?.data, pastQuery]);

  

  const groupedPast = useMemo(() => {
    if (pastQuery) return null;
    const map = {};
    pastEvents?.forEach((e) => {
      const [y, m] = (e.event_start || "").split("-");
      const key = `${y}-${m}`;
      if (!map[key])
        map[key] = { label: `${MONTHS[parseInt(m) - 1]} ${y}`, items: [] };
      map[key].items.push(e);
    });
    return Object.values(map);
  }, [pastEvents, pastQuery]);

  const pastFlat = useMemo(
    () => pastEvents?.slice((pastPage - 1) * PAGE_SIZE, pastPage * PAGE_SIZE),
    [pastEvents, pastPage]
  );

  

  function openNew() {
    setEditingId(null);

    setModalOpen(true);
  }
  function openEdit(id) {
    const r = events.find((e) => e.id === id);
    if (!r) return;
    setEditingId(id);

    setModalOpen(true);
  }
  
  function openDelete(id) {
    setDeletingId(id);
    setDeleteOpen(true);
  }
  function confirmDelete() {
    setEvents((es) => es.filter((e) => e.id !== deletingId));
    setDeleteOpen(false);
  }

  const delTarget = events.find((e) => e.id === deletingId);
  
  

  function EventCard({ r, onDelete, navigate }) {
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
            title="Detail / Cart"
            onClick={() =>
              navigate(
                `/event-detail?id=${r.id}`
              )
            }
          >
            <IconCart />
          </button>
          <button
            className="btn-icon"
            title="Summary"
            style={{ color: "var(--purple)" }}
            onClick={() =>
              navigate(
                `/event-summary?id=${r.id}`
              )
            }
          >
            <IconBarChart />
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn-icon edit"
            title="Edit"
            onClick={() => {
              setIsModify(true);
              setEvent(r);
              setModalOpen(true);
            }}
          >
            <IconEdit />
          </button>
          <button
            className="btn-icon delete"
            title="Delete"
            onClick={() => onDelete(r.id)}
          >
            <IconDelete />
          </button>
          <button className="btn-icon history" title="History">
            <IconHistory />
          </button>
        </div>
      </div>
    );
  }

  function PastEventRow({ r, onEdit, onDelete, navigate }) {
    const day =
      r.event_start && r.event_start !== "-"
        ? parseInt(r.event_start.split("-")[2])
        : "—";
    const month =
      r.event_start && r.event_start !== "-"
        ? MONTHS_SHORT[parseInt(r.event_start.split("-")[1]) - 1]
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
            title="Detail / Cart"
            onClick={() =>
              navigate(
                `/event-detail?id=${r.id}`
              )
            }
          >
            <IconCart />
          </button>
          <button
            className="btn-icon"
            title="Summary"
            style={{ color: "var(--purple)" }}
            onClick={() =>
              navigate(
                `/event-summary?id=${r.id}`
              )
            }
          >
            <IconBarChart />
          </button>
          <button
            className="btn-icon edit"
            title="Edit"
            onClick={() => onEdit(r.id)}
          >
            <IconEdit />
          </button>
          <button
            className="btn-icon delete"
            title="Delete"
            onClick={() => onDelete(r.id)}
          >
            <IconDelete />
          </button>
          <button className="btn-icon history" title="History">
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
          Event
        </h1>
        <button className="btn-new" onClick={openNew}>
          <IconPlus /> New Event
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
            label: "Total Events",
            value: (upcomings?.data?.total_records ?? 0) + pasts?.data?.total_records ,
            color: "var(--brand)",
            bg: "var(--brand-bg)",
          },
          {
            label: "Upcoming",
            value: (upcomings?.data?.total_records ?? 0),
            color: "var(--green)",
            bg: "var(--green-bg)",
          },
          {
            label: "Past Events",
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
            label: "Upcoming",
            count: upcomings?.data?.total_records,
          },
          {
            id: "past",
            label: "Past Events",
            count: pasts?.data?.total_records,
          },
          { id: "invite", label: "Invite User", count: null },
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
                placeholder="Search events…"
                value={upQuery}
                onChange={(e) => setUpQuery(e.target.value)}
              />
            </div>
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint /> Print
            </button>
          </div>

          {upcomings?.data?.data.length === 0 ? (
            <div
              className="card"
              style={{ padding: "56px 32px", textAlign: "center" }}
            >
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {upQuery
                  ? "No events match your search."
                  : "No upcoming events."}
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
              {upcomings?.data?.data.map((r) => (
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
                placeholder="Search past events…"
                value={pastQuery}
                onChange={(e) => {
                  setPastQuery(e.target.value);
                  setPastPage(1);
                }}
              />
            </div>
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint /> Print
            </button>
          </div>

          {pastEvents.length === 0 ? (
            <div
              className="card"
              style={{ padding: "56px 32px", textAlign: "center" }}
            >
              <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                {pastQuery ? "No events match your search." : "No past events."}
              </p>
            </div>
          ) : pastQuery ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pastFlat.map((r) => (
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
                label="events"
              />
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {groupedPast.map((group) => (
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
            Invite User
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            This feature will be available soon
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingId ? "Edit Event" : "New Event"}
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
              <IconCheck /> Save Event
            </button>
          </>
        }
      >
        {/* GENERAL */}
        <div className="form-row">
          <div className="form-group">
            <label>
              Event Name <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Enter event name"
              value={formik.values.name}
              onChange={(e) => formik.setFieldValue("name", e.target.value)}
            />
          </div>
          <div className="form-group" style={{ maxWidth: 120 }}>
            <label>Code</label>
            <input
              type="text"
              placeholder="e.g. WB"
              value={formik.values.event_code}
              onChange={(e) =>
                formik.setFieldValue("event_code", e.target.value)
              }
            />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Short event description"
            value={formik.values.description}
            onChange={(e) =>
              formik.setFieldValue("description", e.target.value)
            }
            rows={2}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={formik.values.event_start}
              onChange={(val) => {
                formik.setFieldValue("event_start", val.target.value);
              }}
            />
          </div>
          <div className="form-group">
            <label>Finish Date</label>
            <input
              type="date"
              value={formik.values.event_end}
              onChange={(val) => {
                formik.setFieldValue("event_end", val.target.value);
              }}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Event Date</label>
            <input
              type="date"
              value={formik.values.date_event}
              onChange={(val) => {
                formik.setFieldValue("date_event", val.target.value);
              }}
            />
          </div>
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
            Details
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>PIC</label>
            <input
              type="text"
              placeholder="Person in charge"
              value={formik.values.PIC}
              onChange={(e) => formik.setFieldValue("PIC", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formik.values.status}
              onChange={(e) => formik.setFieldValue("status", e.target.value)}
            >
              <option value="">— Select Status —</option>
              {eventStatus?.data?.data
                ?.map?.((el) => {
                  return {
                    label: el.name,
                    value: el.id,
                  };
                })
                .map((el) => (
                  <option key={el.value} value={el.value}>
                    {el.label}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              placeholder="Event location / address"
              value={formik.values.address}
              onChange={(e) => formik.setFieldValue("address", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>QR Type</label>
            <select
              onChange={(e) =>
                formik.setFieldValue("scan_type", e.target.value)
              }
              value={formik.values.scan_type}
            >
              <option value="">Select QR Type</option>
              <option value="GROUP">GROUP</option>
              <option value="INDIVIDUAL">INDIVIDUAL</option>
            </select>
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
            Additional
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <div className="form-row" style={{ alignItems: "flex-start" }}>
          <div className="form-group">
            <label>Note</label>
            <textarea
              placeholder="Any additional notes…"
              value={formik.values.notes}
              onChange={(e) => formik.setFieldValue("notes", e.target.value)}
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Image</label>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setBase64(ev.target.result);
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

      {/* Delete confirm modal */}
      <Modal
        open={deleteOpen}
        title="Delete Event"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button
              className="btn-cancel-modal"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button className="btn-del-ok" onClick={confirmDelete}>
              Delete
            </button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete &ldquo;{delTarget?.name}&rdquo;?
        </p>
      </Modal>
    </>
  );
}
