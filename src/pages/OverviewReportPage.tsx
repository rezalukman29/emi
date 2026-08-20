import { useEffect, useState } from "react";

import Pagination from "../components/Pagination";
import { IconPrint, IconSearch } from "../components/icons";
import useGetOverviewReportEvents, {
  type OverviewReportEventType,
} from "../hooks/api/useGetOverviewReportEvents";
import useGetOverviewReportSummary from "../hooks/api/useGetOverviewReportSummary";

const PAGE_SIZE = 10;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(value: string | null | undefined) {
  if (!value || value === "-") return "—";
  const [year, month, day] = value.split("-");
  const monthIndex = Number(month) - 1;
  const date = Number.parseInt(day, 10);
  if (!year || !MONTHS_SHORT[monthIndex] || Number.isNaN(date)) return value;
  return `${date} ${MONTHS_SHORT[monthIndex]} ${year}`;
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function eventTypeBadge(type: string) {
  const normalizedType = type.toLowerCase();
  if (normalizedType === "upcoming") return "badge-blue";
  if (normalizedType === "ongoing") return "badge-orange";
  return "badge-gray";
}

function eventTypeLabel(type: string) {
  if (!type) return "-";
  return `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}`;
}

export default function OverviewReportPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<OverviewReportEventType | "">("");
  const [page, setPage] = useState(1);

  const {
    data: summaryResponse,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useGetOverviewReportSummary();
  const {
    data: eventsResponse,
    isLoading: isEventsLoading,
    isError: isEventsError,
  } = useGetOverviewReportEvents({
    params: {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      event_type: typeFilter || undefined,
    },
    options: { keepPreviousData: true },
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const summary = summaryResponse?.data;
  const events = eventsResponse?.data.data ?? [];
  const totalRecords = eventsResponse?.data.total_records ?? 0;
  const totalPages = Math.max(1, eventsResponse?.data.total_pages ?? 1);
  const safePage = Math.min(page, totalPages);
  const locationBreakdown = summary?.location_breakdown ?? [];
  const maxLocationCount = Math.max(...locationBreakdown.map((item) => item.event_count), 1);
  const totalEvents = summary?.total_events ?? 0;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const summaryValue = (value?: number) => (
    isSummaryLoading || isSummaryError ? "—" : (value ?? 0).toLocaleString("id-ID")
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Overview Report</h1>
        <button className="btn-print" onClick={() => window.print()}><IconPrint /> Print Report</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Total Events</div>
          <div className="kpi-value">{summaryValue(summary?.total_events)}</div>
          <div className="kpi-sub">all recorded events</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Upcoming</div>
          <div className="kpi-value">{summaryValue(summary?.upcoming_count)}</div>
          <div className="kpi-sub">{percentage(summary?.upcoming_count ?? 0, totalEvents)}% of total</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">Past Events</div>
          <div className="kpi-value">{summaryValue(summary?.past_count)}</div>
          <div className="kpi-sub">{percentage(summary?.past_count ?? 0, totalEvents)}% of total</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">Warehouses</div>
          <div className="kpi-value">{summaryValue(summary?.warehouse_count)}</div>
          <div className="kpi-sub">active warehouse locations</div>
        </div>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">Areas</div>
          <div className="kpi-value">{summaryValue(summary?.area_count)}</div>
          <div className="kpi-sub">registered setup areas</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">Inventory SKU</div>
          <div className="kpi-value">{summaryValue(summary?.inventory_sku)}</div>
          <div className="kpi-sub">registered inventory items</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">Event Progress</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {[
            { label: "Upcoming", value: summary?.upcoming_count ?? 0, color: "var(--brand)" },
            { label: "Past", value: summary?.past_count ?? 0, color: "var(--green)" },
          ].map((item) => {
            const progress = percentage(item.value, totalEvents);
            return (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>{item.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>
                    {isSummaryLoading || isSummaryError ? "—" : item.value} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({progress}%)</span>
                  </span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, background: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">Events by Location</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isSummaryLoading ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading locations…</div>
          ) : isSummaryError ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Unable to load locations.</div>
          ) : !locationBreakdown.length ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No location data available.</div>
          ) : locationBreakdown.map((item) => (
            <div key={item.location}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>{item.location || "-"}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{item.event_count} event</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${(item.event_count / maxLocationCount) * 100}%`, background: "var(--purple)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input className="search-input" type="text" placeholder="Search name, code, or location…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
            <div className="wi-select-wrap">
              <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as OverviewReportEventType | ""); setPage(1); }}>
                <option value="">All Types</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event Name</th>
                <th style={{ width: 110 }}>Code</th>
                <th style={{ width: 130 }}>Date</th>
                <th>Location</th>
                <th style={{ width: 110 }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {isEventsLoading && !events.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading events…</td></tr>
              ) : isEventsError ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--red)" }}>Unable to load events.</td></tr>
              ) : !events.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No events found.</td></tr>
              ) : events.map((event) => (
                <tr key={event.id}>
                  <td className="name-cell">{event.name || "-"}</td>
                  <td className="id-cell" style={{ fontFamily: "monospace" }}>{event.event_code || "-"}</td>
                  <td style={{ color: "var(--text-muted)" }}>{fmtDate(event.date_event)}</td>
                  <td>{event.location || "-"}</td>
                  <td><span className={`badge ${eventTypeBadge(event.event_type)}`}>{eventTypeLabel(event.event_type)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={totalRecords} pageSize={PAGE_SIZE} onPage={setPage} label="events" />
      </div>
    </>
  );
}
