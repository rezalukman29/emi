import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface InventoryReportCategorySummary {
  category: string;
  category_id: number;
  sku_count: number;
  total_stock: number;
}

export interface InventoryReportWarehouseSummary {
  sku_count: number;
  total_stock: number;
  warehouse: string;
}

export interface InventoryReportSummary {
  low_stock: number;
  out_of_stock: number;
  stock_by_category: InventoryReportCategorySummary[];
  stock_by_warehouse: InventoryReportWarehouseSummary[];
  total_sku: number;
  total_stock: number;
}

export type GetInventoryReportSummaryResponse = APIResponse<InventoryReportSummary>;

export const getInventoryReportSummary = async (): Promise<GetInventoryReportSummaryResponse> => {
  const response = await ax.get("/v1/inventory-report/summary");
  return response.data;
};

const useGetInventoryReportSummary = ({
  options,
}: {
  options?: UseQueryOptions<GetInventoryReportSummaryResponse>;
} = {}) => useQuery<GetInventoryReportSummaryResponse>(
  ["useGetInventoryReportSummary"],
  getInventoryReportSummary,
  options,
);

export default useGetInventoryReportSummary;
