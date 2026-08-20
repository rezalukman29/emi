import { useQuery, type UseQueryOptions } from "react-query";
import type {
  APIResponse,
  BaseResponsePagination,
} from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventStatusItem {
  id: number;
  name: string;
  user_emi_id: number;
  created_at: string;
  is_show_scan_result: number;
  order_data: number;
  active_event: number;
  action: string;
}

export type GetEventStatusResponse = APIResponse<
  BaseResponsePagination<EventStatusItem[]>
>;

export interface GetEventStatusParams {
  page: number;
  limit: number;
  search?: string;
  sort: "ASC" | "DESC";
  sortBy: "order_data" | "name" | "active_event" | "created_at";
}

export const getEventStatus = async (
  filter?: GetEventStatusParams,
): Promise<GetEventStatusResponse> => {
  const response = await ax.get(`/v1/event-status/get-all`, {
    params: filter
      ? {
          page: filter.page,
          limit: filter.limit,
          ...(filter.search && { search: filter.search }),
          sort: filter.sort,
          sort_by: filter.sortBy,
        }
      : undefined,
  });
  return response.data;
};

const useGetEventStatus = ({
  params,
  options,
}: {
  params?: GetEventStatusParams;
  options?: UseQueryOptions<GetEventStatusResponse>;
}) => {
  return useQuery<GetEventStatusResponse>(
    ["useGetEventStatus", params],
    () => getEventStatus(params),
    options
  );
};

export default useGetEventStatus;
