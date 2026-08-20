import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface PostItemLoanPayload {
  barang_gudang_id: number;
  borrower_contact: string;
  borrower_name: string;
  due_date: string;
  loan_date: string;
  purpose: string;
  qty: number;
}

export const postItemLoan = async (
  payload: PostItemLoanPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.post("/v1/item-loan", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create item loan.");
  }
  return response.data;
};

const usePostItemLoan = () => useMutation(postItemLoan);

export default usePostItemLoan;
