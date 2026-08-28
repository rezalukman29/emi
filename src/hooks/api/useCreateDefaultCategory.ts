import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { DefaultCategoryItem } from "./useGetDefaultCategories";

export interface DefaultCategoryPayload {
  description: string;
  is_active: number;
  name: string;
}

export const createDefaultCategory = async (
  payload: DefaultCategoryPayload,
): Promise<APIResponse<DefaultCategoryItem>> => {
  const response = await ax.post("/v1/superadmin/default-categories", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create default category.");
  }
  return response.data;
};

const useCreateDefaultCategory = () => useMutation(createDefaultCategory);

export default useCreateDefaultCategory;
