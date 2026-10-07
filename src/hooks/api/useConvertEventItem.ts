import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface ConvertEventItemPayload {
  id_fix_list_item_event: number;
  old_qty: number;
  barang_id: number;
  new_qty: number;
}

export async function convertEventItem(
  payload: ConvertEventItemPayload,
): Promise<APIResponse<unknown>> {
  const response = await ax.post("/v3/fix-list-item/convert", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to convert event item.");
  }
  return response.data;
}

export default function useConvertEventItem() {
  return useMutation(convertEventItem);
}
