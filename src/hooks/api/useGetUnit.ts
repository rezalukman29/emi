import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getUnit = async (): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v1/satuan`);
  return response.data;
};

const useGetUnit = ({
  options,
}: {
  options?: UseQueryOptions<APIResponse<any>>;
}) => {
  return useQuery<APIResponse<any>>(
    ["useGetUnit"],
    () => getUnit(),
    options
  );
};

export default useGetUnit;
