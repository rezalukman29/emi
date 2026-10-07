import type { EventStatusItem } from '../hooks/api/useGetEventStatus';
import type { StatusFeatures } from './eventLifecycle';

// Server false/empty values are authoritative; never fall back to local preview flags.
export function eventStatusFeatures(status: Pick<EventStatusItem, 'stock_return' | 'production_item' | 'cutting_stock'>): StatusFeatures {
  return {
    stockReturn: status.stock_return === true,
    productionItem: status.production_item === true,
    cuttingStock: status.cutting_stock === true,
  };
}

export function hasReachedProductionStatus(
  currentStatus: Pick<EventStatusItem, 'order_data'> | undefined,
  statuses: Array<Pick<EventStatusItem, 'order_data' | 'production_item'>>,
): boolean {
  if (!currentStatus) return false;
  const productionOrders = statuses
    .filter((status) => status.production_item === true)
    .map((status) => status.order_data);
  if (productionOrders.length === 0) return false;
  return currentStatus.order_data >= Math.min(...productionOrders);
}
