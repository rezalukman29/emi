import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventStatusPayload {
  name: string;
  is_show_scan_result: number;
  order_data: number;
  action: string;
}

export const postEventStatus = async (
  payload: EventStatusPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.post("/v1/event-status/create", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create event status.");
  }

  return response.data;
};

const usePostEventStatus = () => useMutation(postEventStatus);

export default usePostEventStatus;
