import { getEvents } from '../hooks/api/useGetEvents';
import { getEventItem, type EventItem } from '../hooks/api/useGetEventItem';
import { getProductionRequests } from '../hooks/api/useGetProductionRequests';
import { InventoryService } from '../service/InventoryService';

export async function loadStockTotals(): Promise<Map<number, number>> {
  const first = await InventoryService.getInventory({ page: 1, limit: 100, sort: 'ASC', sortBy: 'name' });
  const rows = [...first.data.data];
  for (let page = 2; page <= first.data.total_pages; page++) rows.push(...(await InventoryService.getInventory({ page, limit: 100, sort: 'ASC', sortBy: 'name' })).data.data);
  return new Map(rows.filter(row => row.stok_barang != null && Number.isFinite(Number(row.stok_barang))).map(row => [Number(row.id), Number(row.stok_barang)]));
}

export function bookingWindow(event: Record<string, unknown>) {
  const starts = [calendarDay(event.date_event), calendarDay(event.event_start)].filter(Boolean).sort();
  const dates = [...starts, calendarDay(event.event_end)].filter(Boolean).sort();
  return { from: starts[0] || '', to: dates[dates.length - 1] || '' };
}

// Exhaust pagination; never present a page subtotal as a tenant-wide report.
export async function loadEvents() {
  const first = await getEvents({ page: 1, limit: 100 });
  const rows = [...first.data.data];
  for (let page = 2; page <= first.data.total_pages; page++) {
    rows.push(...(await getEvents({ page, limit: 100 })).data.data);
  }
  return rows;
}

export async function mapLimited<T, R>(values: T[], mapper: (value: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(values.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, values.length) }, async () => {
    while (index < values.length) { const current = index++; output[current] = await mapper(values[current]); }
  }));
  return output;
}

export async function loadEventItems(eventId: number): Promise<EventItem[]> {
  const response = await getEventItem({ params: { event_id: eventId, order: 'asc' } });
  if (!response.success) throw new Error(response.message);
  return response.data;
}

export async function loadProductions() {
  const events = await loadEvents();
  return (await mapLimited(events, async event => {
    const response = await getProductionRequests(event.id);
    if (!response.success) throw new Error(response.message);
    return response.data.filter(row => row.type !== 'CONVERT').map(row => ({ ...row, eventId: event.id, eventName: String(event.name || event.description || event.id) }));
  })).flat();
}

export function calendarDay(value: unknown): string {
  const text = String(value || '');
  const iso = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return iso && iso > '0001-01-01' ? iso : '';
}
