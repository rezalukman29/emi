import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteDefaultCategory = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/superadmin/default-categories/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete default category.");
  }
  return response.data;
};

const useDeleteDefaultCategory = () => useMutation(deleteDefaultCategory);

export default useDeleteDefaultCategory;
