import { useQuery, type UseQueryOptions } from "react-query";

import type { BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface MovingOrderRecord {
  id: number;
  from_gudang_id: number;
  from_warehouse_name: string;
  to_gudang_id: number;
  to_warehouse_name: string;
  user_emi_id: number;
  moved_by: string;
  notes: string;
  total_items: number;
  created_at: string;
}

export interface GetMovingOrdersParams {
  page: number;
  limit: number;
}

export async function getMovingOrders(
  params: GetMovingOrdersParams,
): Promise<BaseResponsePagination<MovingOrderRecord[]>> {
  const response = await ax.get("/v1/moving-order", { params });
  return response.data.data;
}

export default function useGetMovingOrders({
  params,
  options,
}: {
  params: GetMovingOrdersParams;
  options?: UseQueryOptions<BaseResponsePagination<MovingOrderRecord[]>>;
}) {
  return useQuery<BaseResponsePagination<MovingOrderRecord[]>>(
    ["useGetMovingOrders", params],
    () => getMovingOrders(params),
    options,
  );
}
