import { useMutation } from "react-query";
import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventItemCheckUpdate {
  id: number;
  checked: boolean;
  note: string;
}

export async function checkEventItems(payload: EventItemCheckUpdate[]) {
  const response = await ax.put<APIResponse<unknown>>("/v3/fix-list-item/check", payload);
  if (response.data.success === false) {
    throw new Error(response.data.message || "Failed to update item checking.");
  }
  return response.data;
}

export default function useCheckEventItems() {
  return useMutation(checkEventItems);
}
