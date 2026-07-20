import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse, BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SubAreaItem {
  id: number;
  area_id: number;
  sub_area_name: string;
  created_at: string;
  updated_at: string;
  area_name: string;
}

export interface ParamsGetSubAreaInterface {
  sort?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export const getSubArea = async ({
  params,
}: {
  params: ParamsGetSubAreaInterface;
}): Promise<APIResponse<BaseResponsePagination<SubAreaItem[]>>> => {
  const response = await ax.get("/v1/sub-area", {
    params: {
      sort: params.sort ?? "ASC",
      sort_by: params.sortBy ?? "sub_area_name",
      page: params.page ?? 1,
      limit: params.limit ?? 999,
    },
  });

  return response.data;
};

const useGetSubArea = ({
  options,
  params,
}: {
  options?: UseQueryOptions<APIResponse<BaseResponsePagination<SubAreaItem[]>>>;
  params?: ParamsGetSubAreaInterface;
}) => {
  return useQuery<APIResponse<BaseResponsePagination<SubAreaItem[]>>>(
    ["useGetSubArea", params],
    () => getSubArea({ params: params ?? {} }),
    options
  );
};

export default useGetSubArea;
