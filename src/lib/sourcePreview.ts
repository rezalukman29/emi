import { useMemo, useSyncExternalStore } from 'react';

export interface Vendor { id: number; name: string; contact: string; type: string; origin: 'Internal' | 'External' }
export interface BrokenReport { qty: number; note: string; by: string; at: string }
export interface ProductionMetadata { warehouseId: number; warehouseName: string; vendorId: number; vendorName: string; vendorOrigin: 'Internal' | 'External'; replacesItemId?: number }
export interface SourcePreview {
  vendors: Vendor[];
  checkOwnership: Record<number, boolean>;
  reports: Record<number, Record<number, BrokenReport>>;
  production: Array<ProductionMetadata & { eventId: number; itemName: string; at: string }>;
}
const CHANGE = 'emi-source-preview-change';
function key() {
  const auth = JSON.parse(localStorage.getItem('auth') || 'null');
  // Never share unintegrated drafts across tenants or users.
  return `emi.source-preview.v1.${auth?.company_id ?? 'tenant'}.${auth?.id ?? 'anonymous'}`;
}
function snapshot() { try { return localStorage.getItem(key()) || ''; } catch { return ''; } }
function parse(raw: string): SourcePreview {
  try { const value = JSON.parse(raw); return { vendors: value.vendors || [], checkOwnership: value.checkOwnership || {}, reports: value.reports || {}, production: value.production || [] }; }
  catch { return { vendors: [], checkOwnership: {}, reports: {}, production: [] }; }
}
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE, callback); window.addEventListener('storage', callback);
  return () => { window.removeEventListener(CHANGE, callback); window.removeEventListener('storage', callback); };
}
export function useSourcePreview() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  return useMemo(() => parse(raw), [raw]);
}
export function readSourcePreview() { return parse(snapshot()); }
export function updateSourcePreview(update: (data: SourcePreview) => void) {
  const data = readSourcePreview(); update(data);
  localStorage.setItem(key(), JSON.stringify(data));
  window.dispatchEvent(new Event(CHANGE));
}
export function validBrokenQuantity(qty: number, available: number) {
  return Number.isInteger(qty) && qty >= 1 && qty <= available;
}
export function stagePromptStep(forward: boolean, checkOwnership: boolean, answered: boolean, hasBroken: boolean): 'ownership' | 'broken' | 'confirm' {
  if (!forward) return 'confirm';
  if (checkOwnership && !answered) return 'ownership';
  return hasBroken ? 'broken' : 'confirm';
}
