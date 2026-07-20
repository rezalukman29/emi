import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getItemcategory = async (): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v1/kategori-barang-all`, {
    params: {
      sort: "ASC",
      sort_by: "name",
      limit: 9999
    },
  });
  return response.data;
};

const useGetItemCategory = ({
  options,
}: {
  options?: UseQueryOptions<APIResponse<any>>;
}) => {
  return useQuery<APIResponse<any>>(
    ["useGetItemCategory"],
    () => getItemcategory(),
    options
  );
};

export default useGetItemCategory;
