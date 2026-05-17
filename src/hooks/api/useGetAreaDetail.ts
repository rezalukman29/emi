import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getAreaDetail = async (id: number): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v1/area/${id}`);
  return response.data;
};

const useGetAreaDetail = ({
  id,
  options,
}: {
  id: number,
  options?: UseQueryOptions<APIResponse<any>>;
}) => {
  return useQuery<APIResponse<any>>(
    ["useGetAreaDetail"],
    () => getAreaDetail(id),
    options
  );
};

export default useGetAreaDetail;
