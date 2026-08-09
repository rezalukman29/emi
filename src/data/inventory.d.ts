export type StockStatus = "Available" | "Low Stock" | "Out of Stock";

export interface InventoryData {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  warehouse: string;
  totalStock: number;
  stockStatus: StockStatus;
  updatedAt: string;
}

export const inventoryData: InventoryData[];
export const categories: string[];
export const stockStatuses: StockStatus[];
