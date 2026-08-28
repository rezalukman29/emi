import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface DefaultCategoryStats {
  active: number;
  customers_using: number;
  total: number;
}

export interface DefaultCategoryItem {
  created_at: string;
  customers_using: number;
  description: string;
  id: number;
  is_active: number;
  name: string;
  updated_at: string;
}

export interface DefaultCategoriesData {
  items: DefaultCategoryItem[];
  limit: number;
  page: number;
  stats: DefaultCategoryStats;
  total: number;
  total_pages: number;
}

export interface GetDefaultCategoriesParams {
  search?: string;
  limit: number;
  page: number;
}

export type GetDefaultCategoriesResponse = APIResponse<DefaultCategoriesData>;

export const getDefaultCategories = async (
  params: GetDefaultCategoriesParams,
): Promise<GetDefaultCategoriesResponse> => {
  const response = await ax.get("/v1/superadmin/default-categories", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
    },
  });
  return response.data;
};

const useGetDefaultCategories = ({
  params,
  options,
}: {
  params: GetDefaultCategoriesParams;
  options?: UseQueryOptions<GetDefaultCategoriesResponse>;
}) => useQuery<GetDefaultCategoriesResponse>(
  ["useGetDefaultCategories", params],
  () => getDefaultCategories(params),
  options,
);

export default useGetDefaultCategories;
