import { useQuery, type UseQueryOptions } from "react-query";

import type { BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface StockOpnameHistoryItem {
  id?: number;
  barang_gudang_id?: number;
  nama_barang?: string;
  item_name?: string;
  gudang_name?: string;
  warehouse_name?: string;
  stok_awal?: number;
  stok_sebelum?: number;
  stok_sistem?: number;
  stok?: number;
  stok_aktual?: number;
  actual_stock?: number;
  stock_old?: number;
  stock_new?: number;
  comparison?: string;
  condition?: string;
  note?: string;
  notes?: string;
  barang?: {
    nama?: string;
    gudang_id?: number;
    gudang_name?: string;
    photo?: string;
  };
}

export interface StockOpnameHistoryRecord {
  id: number;
  period?: string;
  remark?: string;
  flag?: "draft" | "done" | string;
  userId?: number;
  status?: string;
  is_applied?: number | boolean;
  created_at?: string;
  updated_at?: string;
  applied_at?: string | null;
  applied_by?: string;
  created_by?: string;
  user_name?: string;
  gudang_name?: string;
  warehouse_name?: string;
  data?: StockOpnameHistoryItem[];
  items?: StockOpnameHistoryItem[];
  details?: StockOpnameHistoryItem[];
}

export interface GetStockOpnameParams {
  page: number;
  limit: number;
  search?: string;
  sort?: "ASC" | "DESC";
  sortBy?: string;
}

export async function getStockOpname(
  params: GetStockOpnameParams,
): Promise<BaseResponsePagination<StockOpnameHistoryRecord[]>> {
  const { sortBy, ...requestParams } = params;
  const response = await ax.get("/v1/stock-opname", {
    params: {
      ...requestParams,
      ...(sortBy && { sort_by: sortBy }),
    },
  });

  return response.data.data;
}

export default function useGetStockOpname({
  params,
  options,
}: {
  params: GetStockOpnameParams;
  options?: UseQueryOptions<BaseResponsePagination<StockOpnameHistoryRecord[]>>;
}) {
  return useQuery<BaseResponsePagination<StockOpnameHistoryRecord[]>>(
    ["useGetStockOpname", params],
    () => getStockOpname(params),
    options,
  );
}
