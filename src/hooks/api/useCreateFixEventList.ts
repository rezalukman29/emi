import { useMutation } from "react-query";

import ax from "../../service/axios";
import { APIResponse } from "../../interfaces/BaseApiResponse";

export interface CreateFixEventListPayload {
  list_id: number;
  event_id: number;
  sub_list_id: number;
}

export interface CreateFixEventListResponse {
  id: number;
}

export const createFixEventList = async (
  payload: CreateFixEventListPayload
): Promise<APIResponse<CreateFixEventListResponse>> => {
  const response = await ax.post("/v1/fix-event-list", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create event list.");
  }

  return response.data;
};

const useCreateFixEventList = () => {
  return useMutation(createFixEventList);
};

export default useCreateFixEventList;
