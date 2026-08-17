import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventDetailData {
  id: number;
  description: string;
  name: string;
  event_start: string;
  event_end: string;
  PIC: string;
  event_code: string;
  is_complete: number;
  status: number;
  images: string;
  files: string;
  address: string;
  type: string;
  latitude: string;
  longitude: string;
  event_running: string;
  created_at: string;
  updated_at: string;
  notes: string;
  scan_type: string;
  date_event: string | null;
  date_start?: string | null;
  admins: unknown;
  valuation: number;
}

export const getEventDetail = async (
  id: number
): Promise<APIResponse<EventDetailData>> => {
  const response = await ax.get(`/v1/event/${id}`);
  return response.data;
};

const useGetEventDetail = ({
  id,
  options,
}: {
  id: number;
  options?: UseQueryOptions<APIResponse<EventDetailData>>;
}) => {
  return useQuery<APIResponse<EventDetailData>>(
    ["useGetEventDetail", id],
    () => getEventDetail(id),
    options
  );
};

export default useGetEventDetail;
