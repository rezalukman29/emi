import { useMutation } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface CreateFixListItemPayload {
  fix_event_list_id: number;
  barang_gudang_id: number;
  qty: number;
  scan_in: number;
  scan_out: number;
  notes: string;
  input_by: string | null;
  image: string | null;
  event_status_id: number;
  additional_code: string;
  is_checking: number;
  is_ware_house_item: number;
}

export const createFixListItem = async (
  payload: CreateFixListItemPayload
): Promise<APIResponse<unknown>> => {
  const response = await ax.post("/v2/fix-list-item", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create event item.");
  }

  return response.data;
};

const useCreateFixListItem = () => {
  return useMutation(createFixListItem);
};

export default useCreateFixListItem;
