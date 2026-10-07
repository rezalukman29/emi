import type { ConvertRequest, LifecycleStore, StockMovement } from './eventLifecycle';

export interface ConversionStock { id: number; itemId: number; name: string; warehouse: string; stock: number }

export function pendingConversions(store: LifecycleStore): ConvertRequest[] {
  return Object.values(store.events).flatMap(event => (event.productionRequests ?? [])
    .filter((r): r is ConvertRequest => r.type === 'convert' && r.status === 'Pending'));
}

// Preview deductions never overwrite API/cache stock. Include reservations from all events.
export function availableConversionStock(row: ConversionStock, store: LifecycleStore, reserve = true) {
  const deducted = (store.stockMovements ?? []).filter(m => m.rowId === row.id).reduce((sum, m) => sum - m.change, 0);
  const reserved = reserve ? pendingConversions(store).filter(r => r.fromRowId === row.id).reduce((sum, r) => sum + r.fromQty, 0) : 0;
  return Math.max(0, row.stock - deducted - reserved);
}

export function planConversions(store: LifecycleStore, eventId: number, rows: ConversionStock[], stageId: number, eventName: string, stage: string, by: string, at: string) {
  const requests = store.events[eventId]?.productionRequests ?? [];
  const balances = new Map(rows.map(row => [row.id, availableConversionStock(row, store, false)]));
  const movements: StockMovement[] = [];
  const next = requests.map(request => {
    if (request.type !== 'convert' || request.status !== 'Pending') return request;
    const row = rows.find(r => r.id === request.fromRowId);
    const before = balances.get(request.fromRowId) ?? 0;
    if (!row || row.itemId !== request.fromItemId || request.fromItemId === request.toItemId ||
      !Number.isSafeInteger(request.fromQty) || request.fromQty <= 0 || request.fromQty > before ||
      !Number.isSafeInteger(request.toQty) || request.toQty <= 0) throw new Error('conversionStockUnavailable');
    const after = before - request.fromQty;
    balances.set(row.id, after);
    movements.push({ id: `${eventId}-${request.id}`, at, rowId: row.id, itemName: row.name, warehouse: row.warehouse,
      change: -request.fromQty, before, after, eventId, eventName, stage, by,
      note: `${request.fromQty} × ${request.fromName} → ${request.toQty} × ${request.toName}` });
    return { ...request, status: 'Converted' as const, stageId, convertedAt: at };
  });
  return { requests: next, movements };
}
