import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getAreaList = async (): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v1/area`);
  return response.data;
};

const useGetAreaList = ({
  options,
}: {
  options?: UseQueryOptions<APIResponse<any>>;
}) => {
  return useQuery<APIResponse<any>>(
    ["useGetAreaList"],
    () => getAreaList(),
    options
  );
};

export default useGetAreaList;
