import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface ProductionRequestItemDetail {
  barang_id: number;
  nama: string;
  qty: number;
  sku: string;
  warehouse_id: number;
  warehouse_name: string;
}

export interface ProductionRequestItem {
  affects_stock: boolean;
  applied_at: string;
  area_name: string;
  created_at: string;
  id: number;
  item_name: string;
  new_item: ProductionRequestItemDetail | null;
  notes: string;
  old_item: ProductionRequestItemDetail | null;
  requested_by: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | string;
  sub_area_name: string;
  type: "CONVERT" | "NEW_PRODUCTION" | string;
}

export async function getProductionRequests(
  eventId: number,
): Promise<APIResponse<ProductionRequestItem[]>> {
  const response = await ax.get("/v3/production-requests", {
    params: { event_id: eventId },
  });
  return response.data;
}

export default function useGetProductionRequests({
  eventId,
  options,
}: {
  eventId: number;
  options?: UseQueryOptions<APIResponse<ProductionRequestItem[]>>;
}) {
  return useQuery<APIResponse<ProductionRequestItem[]>>(
    ["useGetProductionRequests", eventId],
    () => getProductionRequests(eventId),
    options,
  );
}
