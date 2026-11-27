import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getWarehouseItems = async (id: number): Promise<APIResponse<any[]>> => {
  // The API answers 400 (not an empty list) for a warehouse with no items (staging 2026-11-27, backend notes B-06).
  // Treat that as "no items" so the page shows its empty state instead of an error.
  try {
    const response = await ax.get(`/v1/barang-gudang/gudang/${id}`);
    return response.data;
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 400) return { success: true, message: 'empty', data: [] } as unknown as APIResponse<any[]>;
    throw error;
  }
};

const useGetWarehouseItems = ({
  id,
  options,
}: {
  id: number,
  options?: UseQueryOptions<APIResponse<any[]>>;
}) => {
  return useQuery<APIResponse<any[]>>(
    ["useGetWarehouseItems", id],
    () => getWarehouseItems(id),
    options
  );
};

export default useGetWarehouseItems;
