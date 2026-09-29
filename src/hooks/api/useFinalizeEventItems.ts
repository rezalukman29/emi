import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface FinalizeReturnItem {
  id: number;
  action: "RETURN";
}

export interface FinalizeTransferItem {
  id: number;
  action: "TRANSFER";
  eventId: number;
  status: number;
  areaId: number;
  subAreaId: number;
}

export interface FinalizeEventItemsPayload {
  event_id: number;
  items: Array<FinalizeReturnItem | FinalizeTransferItem>;
}

export async function finalizeEventItems(
  payload: FinalizeEventItemsPayload,
): Promise<APIResponse<unknown>> {
  const response = await ax.post("/v3/fix-list-item/finalize", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to finalize event items.");
  }
  return response.data;
}

export default function useFinalizeEventItems() {
  return useMutation(finalizeEventItems);
}
