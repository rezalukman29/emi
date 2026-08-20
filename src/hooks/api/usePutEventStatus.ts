import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import type { EventStatusPayload } from "./usePostEventStatus";
import ax from "../../service/axios";

export interface PutEventStatusPayload extends EventStatusPayload {
  id: number;
}

export const putEventStatus = async (
  payload: PutEventStatusPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.put("/v1/event-status/update-scan", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update event status.");
  }

  return response.data;
};

const usePutEventStatus = () => useMutation(putEventStatus);

export default usePutEventStatus;
