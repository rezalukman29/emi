import { useSyncExternalStore } from 'react';

// "Rows per page" preference, remembered per page path in this browser (localStorage `emi.pageSize.v1`).
// A page opts in with `usePageSize(default)`; the shared <Pagination> then shows the "Show 10/20/50/100" picker.
// Server-paginated pages send the chosen size as the existing `limit` parameter (no API change).

const KEY = 'emi.pageSize.v1';
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
let sizes: Record<string, number> = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const registered = new Set<string>();
const listeners = new Set<() => void>();
const path = () => window.location.pathname;

export function setPageSize(size: number, at = path()) {
  sizes = { ...sizes, [at]: size };
  try { localStorage.setItem(KEY, JSON.stringify(sizes)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}
export function isPageSizeAdjustable(at = path()) { return registered.has(at); }

export function usePageSize(defaultSize: number) {
  const at = path();
  registered.add(at);
  const stored = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => sizes[at]);
  return PAGE_SIZE_OPTIONS.includes(stored) ? stored : defaultSize;
}
