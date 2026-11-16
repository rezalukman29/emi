import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface LocationItem {
  id: number;
  name: string;
  event_count: number;
}

export interface GetLocationsParams {
  search?: string;
}

export type GetLocationsResponse = APIResponse<LocationItem[]>;

export const getLocations = async (
  params?: GetLocationsParams
): Promise<GetLocationsResponse> => {
  const response = await ax.get("/v1/location", {
    params: params?.search ? { search: params.search } : undefined,
  });

  return response.data;
};

const useGetLocations = ({
  params,
  options,
}: {
  params?: GetLocationsParams;
  options?: UseQueryOptions<GetLocationsResponse>;
} = {}) =>
  useQuery<GetLocationsResponse>(
    ["useGetLocations", params],
    () => getLocations(params),
    options
  );

export default useGetLocations;
