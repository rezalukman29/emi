import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getWarehouseDetail = async (id: number): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v1/gudang/${id}`);
  return response.data;
};

const useGetWarehouseDetail = ({
  id,
  options,
}: {
  id: number,
  options?: UseQueryOptions<APIResponse<any>>;
}) => {
  return useQuery<APIResponse<any>>(
    ["useGetWarehouseDetail"],
    () => getWarehouseDetail(id),
    options
  );
};

export default useGetWarehouseDetail;
