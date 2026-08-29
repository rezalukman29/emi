import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import { IconSearch } from "../components/icons";
import Pagination from "../components/Pagination";
import SortTh from "../components/SortTh";
import useGetSyncInventory, {
  type GetSyncInventoryParams,
  type SyncInventoryItem,
} from "../hooks/api/useGetSyncInventory";
import useUpdateSyncInventory from "../hooks/api/useUpdateSyncInventory";

const PAGE_SIZE = 20;

function getWarehouseStock(item: SyncInventoryItem) {
  return item.barang_gudang.reduce(
    (total, warehouse) => total + Number(warehouse.stok || 0),
    0,
  );
}

function getWarehouseNames(item: SyncInventoryItem) {
  const names = item.barang_gudang
    .map((warehouse) => warehouse.gudang.trim())
    .filter(Boolean);

  return names.length > 0 ? [...new Set(names)].join(", ") : "-";
}

function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) {
    return (
      <span className="badge badge-green" style={{ fontSize: 11 }}>
        Match
      </span>
    );
  }

  if (diff > 0) {
    return (
      <span className="badge badge-orange" style={{ fontSize: 11 }}>
        +{diff}
      </span>
    );
  }

  return (
    <span className="badge badge-red" style={{ fontSize: 11 }}>
      {diff}
    </span>
  );
}

export default function SyncInventoryPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] =
    useState<GetSyncInventoryParams["sort_by"]>("nama_barang");
  const [sort, setSort] = useState<GetSyncInventoryParams["sort"]>("ASC");
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());

  const {
    data: response,
    isLoading,
    isError,
    refetch: refetchSyncInventory,
  } = useGetSyncInventory({
    params: {
      page,
      limit: PAGE_SIZE,
      search,
      sort,
      sort_by: sortBy,
    },
    options: { keepPreviousData: true },
  });
  const { mutateAsync: updateSyncInventory } = useUpdateSyncInventory();

  const rows = response?.data?.data ?? [];
  const total = response?.data?.total_records ?? 0;
  const currentPage = response?.data?.page ?? page;
  const matchCount = useMemo(
    () => rows.filter((item) => item.stok === getWarehouseStock(item)).length,
    [rows],
  );
  const discrepancyCount = rows.length - matchCount;

  function applySearch() {
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleSort(field: GetSyncInventoryParams["sort_by"]) {
    if (sortBy === field) {
      setSort((direction) => (direction === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(field);
      setSort("ASC");
    }
    setPage(1);
  }

  function markSyncing(ids: number[], syncing: boolean) {
    setSyncingIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => {
        if (syncing) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  async function syncItems(items: SyncInventoryItem[]) {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id_barang);
    markSyncing(ids, true);

    try {
      const results = await Promise.all(
        items.map((item) =>
          updateSyncInventory({ barang_id: item.id_barang }),
        ),
      );
      toast(results[0]?.message || "Inventory synced successfully.", {
        type: "success",
      });
      await refetchSyncInventory();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to sync inventory.",
        { type: "error" },
      );
    } finally {
      markSyncing(ids, false);
    }
  }

  const isSyncingAll = rows.length > 0 && rows.every((item) => syncingIds.has(item.id_barang));

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
          Sync Inventory
        </h1>
        <button
          className="btn-new"
          disabled={rows.length === 0 || syncingIds.size > 0}
          onClick={() => syncItems(rows)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <polyline points="1 4 1 10 7 10" />
            <polyline points="23 20 23 14 17 14" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          {isSyncingAll ? "Syncing…" : "Sync All on This Page"}
        </button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { label: "Total Items", value: total, color: "var(--brand)", bg: "var(--brand-bg)" },
          { label: "Matched on This Page", value: matchCount, color: "var(--green)", bg: "var(--green-bg)" },
          { label: "Discrepancies on This Page", value: discrepancyCount, color: "var(--red)", bg: "var(--red-bg)" },
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
                placeholder="Search item name…"
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
                  label="Name"
                  id="nama_barang"
                  sortCol={sortBy}
                  sortAsc={sort === "ASC"}
                  onSort={handleSort}
                />
                <th style={{ width: 90 }}>SKU</th>
                <SortTh
                  label="Stock"
                  id="stok"
                  sortCol={sortBy}
                  sortAsc={sort === "ASC"}
                  onSort={handleSort}
                  style={{ width: 75, textAlign: "right" }}
                />
                <th style={{ width: 130, textAlign: "right" }}>
                  Warehouse Stock
                </th>
                <th style={{ minWidth: 130 }}>Warehouse</th>
                <th style={{ width: 100 }}>Detail</th>
                <th style={{ width: 95, textAlign: "center" }}>Sync</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                    Loading inventory sync data…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", color: "var(--red)", padding: 32 }}
                  >
                    Failed to load inventory sync data.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", color: "var(--text-muted)", padding: 32 }}
                  >
                    No results found.
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const warehouseStock = getWarehouseStock(item);
                  const diff = item.stok - warehouseStock;
                  const isSyncing = syncingIds.has(item.id_barang);

                  return (
                    <tr key={item.id_barang}>
                      <td className="name-cell">{item.nama_barang}</td>
                      <td className="id-cell">-</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                        }}
                      >
                        {item.stok}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {warehouseStock}
                      </td>
                      <td style={{ fontSize: 12.5 }}>{getWarehouseNames(item)}</td>
                      <td>
                        <DiffBadge diff={diff} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => syncItems([item])}
                          disabled={isSyncing || syncingIds.size > 0}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "5px 12px",
                            background: isSyncing ? "var(--green-bg)" : "var(--brand-bg)",
                            color: isSyncing ? "var(--green)" : "var(--brand)",
                            border: `1px solid ${isSyncing ? "var(--green)" : "var(--brand)"}`,
                            borderRadius: "var(--r)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isSyncing ? "default" : "pointer",
                            fontFamily: "inherit",
                            transition: "all .15s",
                            opacity: isSyncing ? 0.75 : 1,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: 12, height: 12 }}
                          >
                            {isSyncing ? (
                              <polyline points="20 6 9 17 4 12" />
                            ) : (
                              <>
                                <polyline points="1 4 1 10 7 10" />
                                <polyline points="23 20 23 14 17 14" />
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                              </>
                            )}
                          </svg>
                          {isSyncing ? "Syncing…" : "Sync"}
                        </button>
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
          label="items"
        />
      </div>
    </>
  );
}
