import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const putRollbackStockOpname = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.put(`/v1/stock-opname/rollback/${id}`);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to rollback stock opname.");
  }

  return response.data;
};

export default function usePutRollbackStockOpname() {
  return useMutation(putRollbackStockOpname);
}
