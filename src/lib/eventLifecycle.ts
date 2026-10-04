import { useMemo, useSyncExternalStore } from 'react';
import type { EventItem } from '../hooks/api/useGetEventItem';

export const OWNERSHIPS = ['IHC', 'IHP', 'Outsource'] as const;
export type Ownership = typeof OWNERSHIPS[number];
export const LIFECYCLE_STATUSES = ['upcoming', 'on-going', 'ready-to-close', 'checking-inventory', 'returned-completed', 'transferred'] as const;
export type LifecycleStatus = typeof LIFECYCLE_STATUSES[number];
export const LIFECYCLE_BADGES: Record<LifecycleStatus, string> = {
  upcoming: 'badge-gray', 'on-going': 'badge-green', 'ready-to-close': 'badge-orange',
  'checking-inventory': 'badge-blue', 'returned-completed': 'badge-green', transferred: 'badge-purple',
};
export interface TransferDestination { eventId: number; status: number; areaId: number; subAreaId: number }
export interface ItemLifecycle { ownership?: Ownership; checked?: boolean; resolution?: 'returned' | 'transferred'; transfer?: TransferDestination }
export interface StatusFeatures { cuttingStock: boolean; stockReturn: boolean; productionItem: boolean }
export interface ProductionRequest { id: number; name: string; qty: number; area: string; areaId: number; subArea: string; subAreaId?: number; neededBy: string; note: string; stageId: number; status: 'Requested' | 'In Production' | 'Done' }
export interface EventLifecycle {
  furthestStageId?: number;
  stockReturnReached?: boolean;
  productionRequests?: ProductionRequest[];
  closing?: LifecycleStatus;
  stageId?: number;
  itemCount?: number;
  items?: Record<number, ItemLifecycle>;
  incoming?: EventItem[];
}
export interface LifecycleStore {
  events: Record<number, EventLifecycle>;
  codes: Record<number, string>;
  statusFeatures?: Record<number, StatusFeatures>;
  logs: { id: number; user: string; action: string; module: string; description: string; timestamp: string }[];
}
const CHANGE = 'emi-event-lifecycle-change';
function key() {
  const auth = JSON.parse(localStorage.getItem('auth') || 'null');
  return `emi.event-lifecycle.preview.v1.${auth?.company_id ?? auth?.id ?? 'anonymous'}`;
}
function snapshot() { try { return localStorage.getItem(key()) || ''; } catch { return ''; } }
function parse(raw: string): LifecycleStore {
  try { const data = JSON.parse(raw); return { events: data.events || {}, codes: data.codes || {}, statusFeatures: data.statusFeatures || {}, logs: data.logs || [] }; }
  catch { return { events: {}, codes: {}, logs: [] }; }
}
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE, callback); window.addEventListener('storage', callback);
  return () => { window.removeEventListener(CHANGE, callback); window.removeEventListener('storage', callback); };
}
export function useEventLifecycle() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '');
  return useMemo(() => parse(raw), [raw]);
}
export function updateLifecycle(update: (data: LifecycleStore) => void, description?: string) {
  const data = parse(snapshot());
  update(data);
  if (description) {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null');
    data.logs.unshift({ id: Date.now(), user: auth?.fullname || '', action: 'Update', module: 'Event Detail', description, timestamp: new Date().toISOString() });
  }
  localStorage.setItem(key(), JSON.stringify(data));
  window.dispatchEvent(new Event(CHANGE));
}
export function updateEventLifecycle(id: number, patch: Partial<EventLifecycle>, description?: string) {
  updateLifecycle(data => { data.events[id] = { ...data.events[id], ...patch }; }, description);
}
export function resolveLifecycle(event: { id: number; status?: unknown; is_complete?: number; is_finished?: number; item_count?: number; total_items?: number; itemCount?: number; closing_status?: string }, local: EventLifecycle | undefined, lastStageId?: number): LifecycleStatus {
  if (event.is_complete === 1 && event.is_finished === 1) return 'returned-completed';
  if (event.is_complete === 1 && event.is_finished === 0) return 'checking-inventory';
  if (event.is_complete === 0 && event.is_finished === 0 && lastStageId && Number(event.status ?? local?.stageId) === lastStageId) return 'ready-to-close';
  const closing = event.closing_status ?? local?.closing;
  if (closing && LIFECYCLE_STATUSES.includes(closing as LifecycleStatus) && closing !== 'on-going' && closing !== 'upcoming') return closing as LifecycleStatus;
  if (event.is_complete === 1) return 'returned-completed';
  if (lastStageId && Number(event.status ?? local?.stageId) === lastStageId) return 'ready-to-close';
  const apiCount = event.total_items ?? event.item_count ?? event.itemCount;
  const count = apiCount === undefined
    ? Number(local?.itemCount ?? local?.incoming?.length ?? 0)
    : Number(apiCount) + (local?.incoming?.length ?? 0);
  return count > 0 ? 'on-going' : 'upcoming';
}
export function ownershipClass(value: Ownership) { return value === 'IHC' ? 'badge-blue' : value === 'IHP' ? 'badge-purple' : 'badge-orange'; }
