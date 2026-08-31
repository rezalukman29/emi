import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface MovingOrderItemPayload {
  barang_gudang_id: number;
  barang_id: number;
  qty: number;
}

export interface PostMovingOrderPayload {
  from_gudang_id: number;
  items: MovingOrderItemPayload[];
  notes: string;
  to_gudang_id: number;
}

export const postMovingOrder = async (
  payload: PostMovingOrderPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.post("/v1/moving-order", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create moving order.");
  }

  return response.data;
};

export default function usePostMovingOrder() {
  return useMutation(postMovingOrder);
}
