import { useQuery, type UseQueryOptions } from "react-query";

import type {
  APIResponse,
  BaseResponsePagination,
} from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SyncInventoryWarehouse {
  gudang: string;
  stok: number;
}

export interface SyncInventoryItem {
  id_barang: number;
  nama_barang: string;
  stok: number;
  barang_gudang: SyncInventoryWarehouse[];
}

export interface GetSyncInventoryParams {
  page: number;
  limit: number;
  search: string;
  sort: "ASC" | "DESC";
  sort_by: "nama_barang" | "stok";
}

export type GetSyncInventoryResponse = APIResponse<
  BaseResponsePagination<SyncInventoryItem[]>
>;

export const getSyncInventory = async (
  params: GetSyncInventoryParams,
): Promise<GetSyncInventoryResponse> => {
  const response = await ax.get("/v1/barang/get-sync", { params });
  return response.data;
};

const useGetSyncInventory = ({
  params,
  options,
}: {
  params: GetSyncInventoryParams;
  options?: UseQueryOptions<GetSyncInventoryResponse>;
}) =>
  useQuery<GetSyncInventoryResponse>(
    ["useGetSyncInventory", params],
    () => getSyncInventory(params),
    options,
  );

export default useGetSyncInventory;
