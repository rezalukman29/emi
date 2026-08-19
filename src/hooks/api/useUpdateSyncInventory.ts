import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface UpdateSyncInventoryPayload {
  barang_id: number;
}

export const updateSyncInventory = async (
  payload: UpdateSyncInventoryPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.put("/v1/barang/update-sync", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to sync inventory.");
  }

  return response.data;
};

const useUpdateSyncInventory = () => useMutation(updateSyncInventory);

export default useUpdateSyncInventory;
