import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface InventorySummary {
  total_items: number;
  available: number;
  low_stock: number;
  out_of_stock: number;
}

export const getInventorySummary = async (): Promise<
  APIResponse<InventorySummary>
> => {
  const response = await ax.get("/v1/inventory-summary");
  return response.data;
};

export default function useGetInventorySummary(
  options?: UseQueryOptions<APIResponse<InventorySummary>>,
) {
  return useQuery<APIResponse<InventorySummary>>(
    ["useGetInventorySummary"],
    getInventorySummary,
    options,
  );
}
