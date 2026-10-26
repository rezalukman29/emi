import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type ProductionRequestStatus =
  | "REQUESTED"
  | "IN_PRODUCTION"
  | "DONE";

export type ProductionRequestSource = "EVENT" | "RESTOCK";

export interface ProductionRequestListParams {
  status?: ProductionRequestStatus;
  source?: ProductionRequestSource;
  vendor_id?: number;
  warehouse_id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductionRequestVendor {
  id: number;
  name: string;
  origin: string;
}

export interface ProductionRequestEvent {
  id: number;
  name: string;
  area: string;
  sub_area: string;
}

export interface ProductionRequestWarehouse {
  id: number;
  name: string;
}

export interface ProductionRequestListItem {
  id: number;
  requested_at: string;
  item_name: string;
  notes: string;
  qty: number;
  request_type: "NEW_PRODUCTION" | "REPLACEMENT" | string;
  vendor: ProductionRequestVendor | null;
  event: ProductionRequestEvent | null;
  source: ProductionRequestSource | string;
  warehouse: ProductionRequestWarehouse | null;
  status: ProductionRequestStatus | string;
  finished_at: string | null;
}

export interface ProductionRequestListSummary {
  production_records: number;
  in_progress: number;
  done: number;
  qty_produced: number;
}

export interface ProductionRequestListData {
  page: number;
  total_pages: number;
  total_records: number;
  prev: number;
  next: number;
  record_per_page: number;
  summary: ProductionRequestListSummary;
  data: ProductionRequestListItem[];
}

export async function getProductionRequestList(
  params: ProductionRequestListParams = {},
): Promise<APIResponse<ProductionRequestListData>> {
  const response = await ax.get<APIResponse<ProductionRequestListData>>(
    "/v1/production-requests",
    {
      params: {
        page: 1,
        limit: 10,
        ...params,
      },
    },
  );

  if (!response.data.success) throw new Error(response.data.message);
  return response.data;
}

interface UseGetProductionRequestListProps {
  params?: ProductionRequestListParams;
  options?: UseQueryOptions<APIResponse<ProductionRequestListData>>;
}

export default function useGetProductionRequestList({
  params = {},
  options,
}: UseGetProductionRequestListProps = {}) {
  return useQuery<APIResponse<ProductionRequestListData>>(
    ["useGetProductionRequestList", params],
    () => getProductionRequestList(params),
    options,
  );
}
