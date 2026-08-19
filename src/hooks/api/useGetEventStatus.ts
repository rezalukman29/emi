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

export const getEventStatus = async (): Promise<GetEventStatusResponse> => {
  const response = await ax.get(`/v1/event-status/get-all`);
  return response.data;
};

const useGetEventStatus = ({
  options,
}: {
  options?: UseQueryOptions<GetEventStatusResponse>;
}) => {
  return useQuery<GetEventStatusResponse>(
    ["useGetEventStatus"],
    () => getEventStatus(),
    options
  );
};

export default useGetEventStatus;
