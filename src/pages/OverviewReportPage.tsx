import { useEffect, useState } from "react";

import Pagination from "../components/Pagination";
import { IconPrint, IconSearch } from "../components/icons";
import useGetOverviewReportEvents, {
  type OverviewReportEventType,
} from "../hooks/api/useGetOverviewReportEvents";
import useGetOverviewReportSummary from "../hooks/api/useGetOverviewReportSummary";
import SearchableSelect from "../components/SearchableSelect";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
    isSummaryLoading || isSummaryError ? "—" : (value ?? 0).toLocaleString("en-US")
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{t("wording.overviewReport")}</h1>
        <button className="btn-print" onClick={() => window.print()}><IconPrint /> {t("wording.printReport")}</button>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">{t("wording.totalEvents")}</div>
          <div className="kpi-value">{summaryValue(summary?.total_events)}</div>
          <div className="kpi-sub">{t("wording.allRecordedEvents")}</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">{t("wording.upcoming")}</div>
          <div className="kpi-value">{summaryValue(summary?.upcoming_count)}</div>
          <div className="kpi-sub">{percentage(summary?.upcoming_count ?? 0, totalEvents)}{t("wording.ofTotal")}</div>
        </div>
        <div className="kpi-card orange-accent">
          <div className="kpi-label">{t("wording.pastEvents")}</div>
          <div className="kpi-value">{summaryValue(summary?.past_count)}</div>
          <div className="kpi-sub">{percentage(summary?.past_count ?? 0, totalEvents)}{t("wording.ofTotal")}</div>
        </div>
        <div className="kpi-card red-accent">
          <div className="kpi-label">{t("wording.warehouses")}</div>
          <div className="kpi-value">{summaryValue(summary?.warehouse_count)}</div>
          <div className="kpi-sub">{t("wording.activeWarehouseLocations")}</div>
        </div>
        <div className="kpi-card brand-accent">
          <div className="kpi-label">{t("wording.areas")}</div>
          <div className="kpi-value">{summaryValue(summary?.area_count)}</div>
          <div className="kpi-sub">{t("wording.registeredSetupAreas")}</div>
        </div>
        <div className="kpi-card green-accent">
          <div className="kpi-label">{t("wording.inventorySku")}</div>
          <div className="kpi-value">{summaryValue(summary?.inventory_sku)}</div>
          <div className="kpi-sub">{t("wording.registeredInventoryItems")}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="section-title">{t("wording.eventProgress")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {[
            { label: t("wording.upcoming"), value: summary?.upcoming_count ?? 0, color: "var(--brand)" },
            { label: t("wording.past"), value: summary?.past_count ?? 0, color: "var(--green)" },
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
        <div className="section-title">{t("wording.eventsByLocation")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isSummaryLoading ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("wording.loadingLocations")}</div>
          ) : isSummaryError ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("wording.unableToLoadLocations")}</div>
          ) : !locationBreakdown.length ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("wording.noLocationDataAvailable")}</div>
          ) : locationBreakdown.map((item) => (
            <div key={item.location}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)" }}>{item.location || "-"}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text)" }}>{item.event_count} {t("wording.events")}</span>
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
              <input className="search-input" type="text" placeholder={t("wording.searchNameCodeOrLocation")} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
            </div>
            <SearchableSelect
              inline
              value={typeFilter}
              onChange={(value) => { setTypeFilter(String(value) as OverviewReportEventType | ""); setPage(1); }}
              options={[
                { value: "", label: t("wording.allTypes") },
                { value: "upcoming", label: t("wording.upcoming") },
                { value: "ongoing", label: t("wording.ongoing") },
                { value: "past", label: t("wording.past") },
              ]}
              placeholder={t("wording.allTypes")}
              searchPlaceholder={t("wording.searchEventTypes")}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("wording.eventName")}</th>
                <th style={{ width: 110 }}>{t("wording.code")}</th>
                <th style={{ width: 130 }}>{t("wording.date")}</th>
                <th>{t("wording.location")}</th>
                <th style={{ width: 110 }}>{t("wording.type")}</th>
              </tr>
            </thead>
            <tbody>
              {isEventsLoading && !events.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>{t("wording.loadingEvents")}</td></tr>
              ) : isEventsError ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--red)" }}>{t("wording.unableToLoadEvents")}</td></tr>
              ) : !events.length ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>{t("wording.noEventsFound")}</td></tr>
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
        <Pagination currentPage={safePage} total={totalRecords} pageSize={PAGE_SIZE} onPage={setPage} label={t("wording.events")} />
      </div>
    </>
  );
}
