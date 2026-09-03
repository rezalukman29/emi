import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import useGetGlobalSearch, {
  type GlobalSearchItem,
} from "../hooks/api/useGetGlobalSearch";
import { IconClose, IconSearch } from "./icons";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!canSearch) {
      setDebouncedQuery("");
      return;
    }

    const timeout = window.setTimeout(
      () => setDebouncedQuery(normalizedQuery),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [canSearch, normalizedQuery]);

  const {
    data: searchResponse,
    isLoading,
    isFetching,
    isError,
  } = useGetGlobalSearch({
    query: debouncedQuery,
    options: {
      enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
      keepPreviousData: false,
    },
  });

  const groups = searchResponse?.data ?? [];
  const totalCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function goTo(item: GlobalSearchItem, groupType: string) {
    const destination =
      groupType.trim().toLowerCase() === "warehouse"
        ? `/warehouse-detail?id=${item.id}`
        : item.to;

    navigate(destination);
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  }

  function clearSearch() {
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
  }

  return (
    <div className="global-search" ref={wrapRef}>
      <div className="global-search-input-wrap">
        <IconSearch />
        <input
          type="text"
          placeholder="Search events, items, warehouses…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (canSearch) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        {query && (
          <button
            type="button"
            className="global-search-clear"
            aria-label="Clear search"
            onClick={clearSearch}
          >
            <IconClose />
          </button>
        )}
      </div>

      {open && canSearch && (
        <div className="global-search-dropdown">
          {isLoading || isFetching || debouncedQuery !== normalizedQuery ? (
            <div className="global-search-empty">Searching…</div>
          ) : isError ? (
            <div className="global-search-empty">Unable to load search results.</div>
          ) : totalCount === 0 ? (
            <div className="global-search-empty">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="global-search-group">
                <div className="global-search-group-label">{group.type}</div>
                {group.items.map((item) => (
                  <button
                    type="button"
                    key={`${group.type}-${item.id}`}
                    className="global-search-item"
                    onClick={() => goTo(item, group.type)}
                  >
                    <span className="global-search-item-label">{item.label}</span>
                    {item.sub && <span className="global-search-item-sub">{item.sub}</span>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
