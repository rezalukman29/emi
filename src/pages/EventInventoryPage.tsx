import { useMemo, useState } from "react";

import { IconSearch } from "../components/icons";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import useGetEventInventory, {
  type GetEventInventoryParams,
  type EventInventoryItem,
  type NullableInt64,
} from "../hooks/api/useGetEventInventory";
import useGetEventStatus from "../hooks/api/useGetEventStatus";

const PAGE_SIZE = 20;

function nullableIntValue(value: NullableInt64) {
  return value.Valid ? value.Int64 : 0;
}

function getEventStatusId(item: EventInventoryItem) {
  if (item.event_status_id.Valid) return item.event_status_id.Int64;

  const eventStatusId = Number(item.event_status);
  if (Number.isFinite(eventStatusId) && eventStatusId > 0) return eventStatusId;

  const statusId = Number(item.status);
  if (Number.isFinite(statusId) && statusId > 0) return statusId;

  return null;
}

export default function EventInventoryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<GetEventInventoryParams["sortBy"]>("event_name");
  const [sort, setSort] = useState<GetEventInventoryParams["sort"]>("ASC");

  const { data, isLoading, isError } = useGetEventInventory({
    params: {
      page,
      limit: PAGE_SIZE,
      search,
      sort,
      sortBy,
    },
    options: { keepPreviousData: true },
  });
  const { data: eventStatusResponse, isLoading: isEventStatusLoading } =
    useGetEventStatus({
      options: { staleTime: 5 * 60 * 1000 },
    });

  const rows = data?.data ?? [];
  const total = data?.total_records ?? 0;
  const currentPage = data?.page ?? page;
  const eventCount = useMemo(
    () =>
      new Set(rows.map((row) => row.event_name.trim()).filter(Boolean)).size,
    [rows],
  );
  const eventStatusNames = useMemo(
    () =>
      new Map(
        (eventStatusResponse?.data?.data ?? []).map((status) => [
          status.id,
          status.name,
        ]),
      ),
    [eventStatusResponse?.data?.data],
  );

  function getEventStatusName(item: EventInventoryItem) {
    const statusId = getEventStatusId(item);
    if (statusId !== null) {
      if (isEventStatusLoading) return "Loading…";
      return eventStatusNames.get(statusId) ?? String(statusId);
    }

    const status = String(item.event_status || "").trim();
    return status || "-";
  }

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleSort(field: GetEventInventoryParams["sortBy"]) {
    if (sortBy === field) {
      setSort((direction) => (direction === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(field);
      setSort("ASC");
    }
    setPage(1);
  }

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
          Event Inventory
        </h1>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[
          { label: "Total Records", value: total, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Events on This Page", value: eventCount, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Showing", value: rows.length, color: "var(--purple)", bg: "var(--purple-bg)" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bg }}>
              <span className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </span>
            </div>
            <span className="stat-label">{stat.label}</span>
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
                placeholder="Search event or item…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
              />
            </div>
            <button className="btn-search" onClick={applySearch}>
              Search
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh
                  label="Event"
                  id="event_name"
                  sortCol={sortBy}
                  sortAsc={sort === "ASC"}
                  onSort={handleSort}
                  style={{ minWidth: 120 }}
                />
                <SortTh
                  label="Location"
                  id="event_location"
                  sortCol={sortBy}
                  sortAsc={sort === "ASC"}
                  onSort={handleSort}
                  style={{ width: 140 }}
                />
                <SortTh
                  label="Status"
                  id="event_status"
                  sortCol={sortBy}
                  sortAsc={sort === "ASC"}
                  onSort={handleSort}
                  style={{ width: 180 }}
                />
                <SortTh
                  label="Item"
                  id="nama_barang"
                  sortCol={sortBy}
                  sortAsc={sort === "ASC"}
                  onSort={handleSort}
                />
                <th style={{ width: 110, textAlign: "right" }}>Stock Item</th>
                <th style={{ width: 120, textAlign: "right" }}>Stock in Cart</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32 }}>
                    Loading event inventory…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "var(--red)", padding: 32 }}
                  >
                    Failed to load event inventory.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}
                  >
                    No results found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const stockItem = nullableIntValue(row.stok_barang);
                  const stockInCart = nullableIntValue(row.stok_di_keranjang);

                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>{row.event_name || "-"}</td>
                      <td>{row.event_location || "-"}</td>
                      <td>
                        <span
                          className="badge badge-blue"
                          style={{
                            fontSize: 10.5,
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "inline-block",
                          }}
                        >
                          {getEventStatusName(row)}
                        </span>
                      </td>
                      <td>{row.nama_barang || "-"}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {stockItem}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: stockInCart > stockItem ? "var(--red)" : "inherit",
                        }}
                      >
                        {stockInCart}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={(nextPage: number) => setPage(nextPage)}
          label="records"
        />
      </div>
    </>
  );
}
