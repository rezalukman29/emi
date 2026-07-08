import { useQuery, UseQueryOptions } from "react-query";

import {
  APIResponse,
  BaseResponsePagination,
} from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getSearchableEvents = async (): Promise<
  APIResponse<BaseResponsePagination<any>>
> => {
  const response = await ax.get(`/v1/event-filter`, {
    params: {
      page: 1,
      limit: 500,
      sort: "DESC",
      sort_by: "date_event",
    },
  });
  return response.data;
};

const useSearchEvents = (
  options?: UseQueryOptions<APIResponse<BaseResponsePagination<any>>>
) => {
  return useQuery<APIResponse<BaseResponsePagination<any>>>(
    ["useSearchEvents"],
    () => getSearchableEvents(),
    options
  );
};

export default useSearchEvents;
