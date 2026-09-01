import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteStockOpname = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/stock-opname/${id}`);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete stock opname.");
  }

  return response.data;
};

export default function useDeleteStockOpname() {
  return useMutation(deleteStockOpname);
}
