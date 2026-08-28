import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface DefaultUnitStats {
  total: number;
  active: number;
  customers_using: number;
}

export interface DefaultUnitItem {
  id: number;
  name: string;
  abbreviation: string;
  type: string;
  is_active: number;
  customers_using: number;
  created_at: string;
  updated_at: string;
}

export interface DefaultUnitsData {
  stats: DefaultUnitStats;
  items: DefaultUnitItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetDefaultUnitParams {
  search?: string;
  limit: number;
  page: number;
}

export type GetDefaultUnitResponse = APIResponse<DefaultUnitsData>;

export const getDefaultUnit = async (
  params: GetDefaultUnitParams,
): Promise<GetDefaultUnitResponse> => {
  const response = await ax.get("/v1/superadmin/default-units", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
    },
  });
  return response.data;
};

const useGetDefaultUnit = ({
  params,
  options,
}: {
  params: GetDefaultUnitParams;
  options?: UseQueryOptions<GetDefaultUnitResponse>;
}) => useQuery<GetDefaultUnitResponse>(
  ["useGetDefaultUnit", params],
  () => getDefaultUnit(params),
  options,
);

export default useGetDefaultUnit;
