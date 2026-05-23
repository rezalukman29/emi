import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getWarehouse = async (): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v1/gudang?page=1&limit=1000`);
  return response.data;
};

const useGetWarehouse = ({
  options,
}: {
  options?: UseQueryOptions<APIResponse<any>>;
}) => {
  return useQuery<APIResponse<any>>(
    ["useGetWarehouse"],
    () => getWarehouse(),
    options
  );
};

export default useGetWarehouse;
