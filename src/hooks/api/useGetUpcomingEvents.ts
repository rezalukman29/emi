import { useQuery, UseQueryOptions } from "react-query";

import {
  APIResponse,
  BaseResponsePagination,
} from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import moment from "moment";

export const getUpcomingEvents = async ({
  search,
}: {
  search: string;
}): Promise<APIResponse<BaseResponsePagination<any>>> => {
  const response = await ax.get(`/v1/event-filter`, {
    params: {
      ...(search && { search }),
      page: 1,
      limit: 9999,
      sort: "DESC",
      sort_by: "date_event",
      event_start: moment().format("YYYY-MM-DD"),
    },
  });
  return response.data;
};

const useGetUpcomingEvents = ({
  options,
  search,
}: {
  options?: UseQueryOptions<APIResponse<BaseResponsePagination<any>>>;
  search: string;
}) => {
  return useQuery<APIResponse<BaseResponsePagination<any>>>(
    ["useGetUpcomingEvents"],
    () => getUpcomingEvents({ search }),
    options
  );
};

export default useGetUpcomingEvents;
