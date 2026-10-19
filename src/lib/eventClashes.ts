export interface BookingLine { eventId: number; eventName: string; itemId: number; itemName: string; qty: number; from: string; to: string }
export interface ItemClash { itemId: number; itemName: string; from: string; to: string; demand: number; events: Array<{ id: number; name: string; qty: number }> }

/** Group concurrent bookings by stable item IDs, never by item names. */
export function computeClashes(bookings: BookingLine[], from: string, to: string): ItemClash[] {
  const result: ItemClash[] = [];
  const previous = new Map<string, ItemClash>();
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    const yesterday = new Date(time - 86400000).toISOString().slice(0, 10);
    const items = new Map<number, Map<number, BookingLine>>();
    for (const line of bookings) {
      if (line.qty <= 0 || !line.itemId || line.from > day || line.to < day) continue;
      if (!items.has(line.itemId)) items.set(line.itemId, new Map());
      const events = items.get(line.itemId)!;
      const existing = events.get(line.eventId);
      events.set(line.eventId, { ...line, qty: line.qty + (existing?.qty ?? 0) });
    }
    for (const [id, records] of items) {
      if (records.size < 2) continue;
      const lines = [...records.values()].sort((a, b) => a.eventId - b.eventId);
      const key = `${id}:${lines.map(row => `${row.eventId}:${row.qty}`).join(',')}`;
      const last = previous.get(key);
      if (last?.to === yesterday) { last.to = day; continue; }
      const clash = { itemId: id, itemName: lines[0].itemName, from: day, to: day, demand: lines.reduce((sum, row) => sum + row.qty, 0), events: lines.map(row => ({ id: row.eventId, name: row.eventName, qty: row.qty })) };
      result.push(clash);
      previous.set(key, clash);
    }
  }
  return result;
}
