import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const putReturnItemLoan = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.put(`/v1/item-loan/${id}/return`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to return item loan.");
  }
  return response.data;
};

const usePutReturnItemLoan = () => useMutation(putReturnItemLoan);

export default usePutReturnItemLoan;
