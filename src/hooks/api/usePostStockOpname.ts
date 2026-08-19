import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface StockOpnameItemPayload {
  id: number;
  stok: number;
}

export interface PostStockOpnamePayload {
  period: string;
  remark: string;
  data: StockOpnameItemPayload[];
}

export interface PostStockOpnameResponse {
  id: number;
}

export const postStockOpname = async (
  payload: PostStockOpnamePayload,
): Promise<APIResponse<PostStockOpnameResponse>> => {
  const response = await ax.post("/v1/stock-opname", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to save stock opname.");
  }

  return response.data;
};

const usePostStockOpname = () => useMutation(postStockOpname);

export default usePostStockOpname;
