import { useQuery, type UseQueryOptions } from "react-query";

import type { BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface NullableInt64 {
  Int64: number;
  Valid: boolean;
}

export interface EventInventoryItem {
  id: number;
  fix_event_list_id: number;
  barang_gudang_id: number;
  event_status_id: NullableInt64;
  qty: number;
  scan_in: number;
  scan_out: number;
  notes: string;
  created_at: string;
  updated_at: string;
  status: string | number;
  additional_code: string;
  is_checking: NullableInt64;
  is_ware_house_item: NullableInt64;
  group_detail: string;
  event_name: string;
  event_location: string;
  event_status: string | number;
  nama_barang: string;
  stok_barang: NullableInt64;
  stok_di_keranjang: NullableInt64;
}

export interface GetEventInventoryParams {
  page: number;
  limit: number;
  search: string;
  sort: "ASC" | "DESC";
  sortBy: "event_name" | "event_location" | "event_status" | "nama_barang";
}

export type GetEventInventoryResponse = BaseResponsePagination<
  EventInventoryItem[]
>;

export const getEventInventory = async (
  filter: GetEventInventoryParams,
): Promise<GetEventInventoryResponse> => {
  const response = await ax.get("/v2/fix-list-item", {
    params: {
      page: filter.page,
      limit: filter.limit,
      ...(filter.search && { search: filter.search }),
      sort: filter.sort,
      sort_by: filter.sortBy,
    },
  });

  return response.data.data;
};

const useGetEventInventory = ({
  params,
  options,
}: {
  params: GetEventInventoryParams;
  options?: UseQueryOptions<GetEventInventoryResponse>;
}) =>
  useQuery<GetEventInventoryResponse>(
    ["useGetEventInventory", params],
    () => getEventInventory(params),
    options,
  );

export default useGetEventInventory;
