import { useQuery, UseQueryOptions } from "react-query";

import {
  APIResponse,
  BaseResponsePagination,
} from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import moment from "moment";

export const getUpcomingEvents = async ({
  search,
  allDates = false,
}: {
  search: string;
  allDates?: boolean;
}): Promise<APIResponse<BaseResponsePagination<any>>> => {
  const response = await ax.get(`/v1/event-filter`, {
    params: {
      ...(search && { search }),
      page: 1,
      limit: 9999,
      sort: "DESC",
      sort_by: "date_event",
      ...(!allDates && { event_start: moment().format("YYYY-MM-DD") }),
    },
  });
  return response.data;
};

const useGetUpcomingEvents = ({
  options,
  search,
  allDates = false,
}: {
  options?: UseQueryOptions<APIResponse<BaseResponsePagination<any>>>;
  search: string;
  allDates?: boolean;
}) => {
  return useQuery<APIResponse<BaseResponsePagination<any>>>(
    ["useGetUpcomingEvents", search, allDates],
    () => getUpcomingEvents({ search, allDates }),
    options
  );
};

export default useGetUpcomingEvents;
