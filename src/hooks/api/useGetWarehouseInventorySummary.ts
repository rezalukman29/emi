import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface WarehouseInventorySummary {
  total_items: number;
  safe: number;
  warning: number;
  critical: number;
}

export const getWarehouseInventorySummary = async (): Promise<
  APIResponse<WarehouseInventorySummary>
> => {
  const response = await ax.get("/v1/warehouse-inventory-summary");
  return response.data;
};

export default function useGetWarehouseInventorySummary(
  options?: UseQueryOptions<APIResponse<WarehouseInventorySummary>>,
) {
  return useQuery<APIResponse<WarehouseInventorySummary>>(
    ["useGetWarehouseInventorySummary"],
    getWarehouseInventorySummary,
    options,
  );
}
