import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface GlobalSearchItem {
  id: number;
  label: string;
  sub: string;
  to: string;
}

export interface GlobalSearchGroup {
  type: string;
  items: GlobalSearchItem[];
}

export type GetGlobalSearchResponse = APIResponse<GlobalSearchGroup[]>;

export const getGlobalSearch = async (
  query: string,
): Promise<GetGlobalSearchResponse> => {
  const response = await ax.get("/v1/global-search", {
    params: { q: query },
  });

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to search.");
  }

  return response.data;
};

const useGetGlobalSearch = ({
  query,
  options,
}: {
  query: string;
  options?: UseQueryOptions<GetGlobalSearchResponse>;
}) =>
  useQuery<GetGlobalSearchResponse>(
    ["useGetGlobalSearch", query],
    () => getGlobalSearch(query),
    options,
  );

export default useGetGlobalSearch;
