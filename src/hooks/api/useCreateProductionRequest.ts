import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface CreateProductionRequestPayload {
  event_id: number;
  item_name: string;
  qty: number;
  area_id: number;
  sub_area_id?: number;
  notes?: string;
}

export async function createProductionRequest(
  payload: CreateProductionRequestPayload,
): Promise<APIResponse<unknown>> {
  const response = await ax.post("/v1/event-production-request", payload);
  if (response.data?.success === false) {
    throw new Error(
      response.data.message || "Failed to create production request.",
    );
  }
  return response.data;
}

export default function useCreateProductionRequest() {
  return useMutation(createProductionRequest);
}
