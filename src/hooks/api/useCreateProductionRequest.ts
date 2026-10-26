import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface CreateProductionRequestPayload {
  event_id?: number;
  request_type: "NEW_PRODUCTION" | "REPLACEMENT";
  item_name: string;
  name?: string;
  barang_id?: number;
  qty: number;
  area_id?: number;
  sub_area_id?: number;
  warehouse_id?: number;
  vendor_id?: number;
  origin?: "Internal" | "External";
  barang_event_id?: number;
  fix_list_item_id?: number;
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
