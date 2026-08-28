import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { DefaultCategoryPayload } from "./useCreateDefaultCategory";
import type { DefaultCategoryItem } from "./useGetDefaultCategories";

export interface UpdateDefaultCategoryVariables {
  id: number;
  payload: DefaultCategoryPayload;
}

export const updateDefaultCategory = async ({
  id,
  payload,
}: UpdateDefaultCategoryVariables): Promise<APIResponse<DefaultCategoryItem>> => {
  const response = await ax.put(`/v1/superadmin/default-categories/${id}`, payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update default category.");
  }
  return response.data;
};

const useUpdateDefaultCategory = () => useMutation(updateDefaultCategory);

export default useUpdateDefaultCategory;
