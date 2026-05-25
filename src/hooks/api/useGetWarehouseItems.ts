import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getWarehouseItems = async (id: number): Promise<APIResponse<any[]>> => {
  const response = await ax.get(`/v1/barang-gudang/gudang/${id}`);
  return response.data;
};

const useGetWarehouseItems = ({
  id,
  options,
}: {
  id: number,
  options?: UseQueryOptions<APIResponse<any[]>>;
}) => {
  return useQuery<APIResponse<any[]>>(
    ["useGetWarehouseItems"],
    () => getWarehouseItems(id),
    options
  );
};

export default useGetWarehouseItems;
