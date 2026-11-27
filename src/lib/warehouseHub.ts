import ax from '../service/axios';

// Warehouse Hub (owner 2026-11-26): a task-first home for warehouse work. Reuses existing endpoints only:
// GET /v1/gudang, GET /v1/barang-gudang/gudang/{id}, GET /v2/event-filter, GET /v3/fix-list-item-event,
// GET /v2/barang-gudang/detail, GET /v1/stock-opname, POST /v1/moving-order.
// The out / return schedule is DERIVED from event dates (load-in = date_event, return = event_end); a real
// schedule with expected return dates needs the API in docs/api-backlog.md §13.

export interface Warehouse { id: number; name: string; location: string; pic: string; virtual: boolean; totalItems: number }
export interface StockRow { bgId: number; barangId: number; name: string; stock: number; min: number; level: 'critical' | 'low' | 'ok' }
export interface Movement {
  key: string;
  type: 'out' | 'return' | 'overdue';
  date: string; // yyyy-mm-dd
  eventId: number;
  eventName: string;
  warehouseId: number;
  lines: Array<{ name: string; qty: number; area: string; scannedOut: number; scannedIn: number }>;
}

const LABEL_NAME = /^(outsource.*|rent|buy|ihp|printing|venue)$/i;
const day = (value: unknown) => String(value ?? '').slice(0, 10);
export const isoToday = () => new Date().toISOString().slice(0, 10);
export const addIsoDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data } = await ax.get('/v1/gudang', { params: { page: 1, limit: 1000 } });
  const rows = (data?.data?.data ?? data?.data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.nama ?? '').trim() || `#${row.id}`,
    location: String(row.lokasi ?? ''),
    pic: String(row.pic ?? ''),
    // Not a physical place, shown apart: outsource, and ownership/source LABELS (owner 2026-11-27: Rent, Buy, IHP,
    // Printing, Venue are labels only). Matched by name until the API has a flag — docs/api-backlog.md §13.
    virtual: Number(row.is_out_source) === 1 || LABEL_NAME.test(String(row.nama ?? '').trim()),
    totalItems: Number(row.total_items) || 0,
  }));
}

export function stockLevel(stock: number, min: number): StockRow['level'] {
  if (stock <= 0) return 'critical';
  if (min > 0 && stock <= min) return 'low';
  return 'ok';
}

export async function fetchWarehouseStock(id: number): Promise<StockRow[]> {
  const { data } = await ax.get(`/v1/barang-gudang/gudang/${id}`);
  const rows = (Array.isArray(data?.data) ? data.data : data?.data?.data ?? []) as Array<Record<string, unknown>>;
  return rows.map((row) => {
    const stock = Number(row.stok) || 0;
    const min = Number(row.stok_minimum) || 0;
    return { bgId: Number(row.id), barangId: Number(row.barang_id), name: String(row.nama_barang ?? '').trim() || `#${row.barang_id} (no name)`, stock, min, level: stockLevel(stock, min) };
  });
}

/** Other warehouses holding the same item (for "move it here"). */
export async function fetchItemWarehouses(name: string, barangId: number) {
  const { data } = await ax.get('/v2/barang-gudang/detail', { params: { page: 1, limit: 10, search: name } });
  const item = ((data?.data?.data ?? []) as Array<{ barang_id: number; warehouses?: Array<{ barang_gudang_id: number; gudang_id: number; gudang_name: string; stok_gudang: number }> }>)
    .find((row) => Number(row.barang_id) === barangId);
  return (item?.warehouses ?? []).map((w) => ({ bgId: Number(w.barang_gudang_id), warehouseId: Number(w.gudang_id), warehouse: w.gudang_name, stock: Number(w.stok_gudang) || 0 }));
}

const ACTIVE = ['upcoming', 'on-going', 'ready-to-close', 'checking-inventory'] as const;
const CLOSED_FOR_RETURN = ['checking-inventory'];

/** Out / return / overdue movements per warehouse for events around today, from event dates + event lines. */
export async function fetchSchedule(daysAhead: number): Promise<Movement[]> {
  const today = isoToday();
  const until = addIsoDays(today, daysAhead);
  const lists = await Promise.all(ACTIVE.map((status) => ax.get('/v2/event-filter', { params: { page: 1, limit: 100, status } }).then((r) => ({ status, rows: (r.data?.data?.data ?? []) as Array<Record<string, unknown>> })).catch(() => ({ status, rows: [] }))));
  const events = new Map<number, { id: number; name: string; out: string; back: string; lifecycle: string; total: number }>();
  for (const { status, rows } of lists) {
    for (const row of rows) {
      const id = Number(row.id);
      if (events.has(id)) continue;
      const start = day(row.event_start);
      const out = day(row.date_event) || start;
      const back = day(row.event_end) || start;
      events.set(id, { id, name: String(row.name ?? `#${id}`), out, back, lifecycle: String(row.lifecycle_status ?? status), total: Number(row.total_items) || 0 });
    }
  }
  const relevant = [...events.values()].filter((ev) => ev.total > 0 && (
    (ev.out >= today && ev.out <= until) ||
    (ev.back >= today && ev.back <= until) ||
    (ev.back < today && !CLOSED_FOR_RETURN.includes(ev.lifecycle) && ev.back >= addIsoDays(today, -60))
  ));
  const movements: Movement[] = [];
  await Promise.all(relevant.map(async (ev) => {
    const { data } = await ax.get('/v3/fix-list-item-event', { params: { event_id: ev.id } }).catch(() => ({ data: null }));
    const lines = (data?.data ?? []) as Array<Record<string, any>>;
    const byWarehouse = new Map<number, Movement['lines']>();
    for (const line of lines) {
      const wid = Number(line.gudang_id ?? line.gudang?.[0]?.id);
      if (!wid) continue;
      const list = byWarehouse.get(wid) ?? [];
      list.push({ name: String(line.nama_barang ?? ''), qty: Number(line.qty) || 0, area: [line.area_name, line.sub_list_name].filter(Boolean).join(' · '), scannedOut: Number(line.scan_out) || 0, scannedIn: Number(line.scan_in) || 0 });
      byWarehouse.set(wid, list);
    }
    for (const [warehouseId, list] of byWarehouse) {
      const base = { eventId: ev.id, eventName: ev.name, warehouseId, lines: list };
      if (ev.out >= today && ev.out <= until) movements.push({ ...base, key: `out-${ev.id}-${warehouseId}`, type: 'out', date: ev.out });
      if (ev.back >= today && ev.back <= until) movements.push({ ...base, key: `ret-${ev.id}-${warehouseId}`, type: 'return', date: ev.back });
      if (ev.back < today && !CLOSED_FOR_RETURN.includes(ev.lifecycle)) movements.push({ ...base, key: `late-${ev.id}-${warehouseId}`, type: 'overdue', date: ev.back });
    }
  }));
  return movements.sort((a, b) => (a.type === 'overdue' ? -1 : 0) - (b.type === 'overdue' ? -1 : 0) || a.date.localeCompare(b.date));
}

export async function fetchOpenOpname(): Promise<number> {
  const { data } = await ax.get('/v1/stock-opname', { params: { page: 1, limit: 50 } });
  const rows = (data?.data?.data ?? []) as Array<{ flag?: string }>;
  return rows.filter((row) => !['applied', 'approved', 'done', 'rollback'].includes(String(row.flag ?? '').toLowerCase())).length;
}
