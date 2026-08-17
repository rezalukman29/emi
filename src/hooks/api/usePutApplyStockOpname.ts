import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const putApplyStockOpname = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.put(`/v1/stock-opname/apply/${id}`);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Gagal menerapkan stock opname.");
  }

  return response.data;
};

const usePutApplyStockOpname = () => useMutation(putApplyStockOpname);

export default usePutApplyStockOpname;
