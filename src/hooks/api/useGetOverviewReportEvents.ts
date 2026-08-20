import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse, BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type OverviewReportEventType = "upcoming" | "past" | "ongoing";

export interface OverviewReportEvent {
  date_event: string;
  event_code: string;
  event_type: OverviewReportEventType | string;
  id: number;
  location: string;
  name: string;
}

export interface GetOverviewReportEventsParams {
  page: number;
  limit: number;
  search?: string;
  event_type?: OverviewReportEventType;
}

export type GetOverviewReportEventsResponse = APIResponse<
  BaseResponsePagination<OverviewReportEvent[]>
>;

export const getOverviewReportEvents = async (
  params: GetOverviewReportEventsParams,
): Promise<GetOverviewReportEventsResponse> => {
  const response = await ax.get("/v1/overview-report/events", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
      ...(params.event_type && { event_type: params.event_type }),
    },
  });
  return response.data;
};

const useGetOverviewReportEvents = ({
  params,
  options,
}: {
  params: GetOverviewReportEventsParams;
  options?: UseQueryOptions<GetOverviewReportEventsResponse>;
}) => useQuery<GetOverviewReportEventsResponse>(
  ["useGetOverviewReportEvents", params],
  () => getOverviewReportEvents(params),
  options,
);

export default useGetOverviewReportEvents;
