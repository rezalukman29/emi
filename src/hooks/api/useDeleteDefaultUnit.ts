import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteDefaultUnit = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/superadmin/default-units/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete default unit.");
  }
  return response.data;
};

const useDeleteDefaultUnit = () => useMutation(deleteDefaultUnit);

export default useDeleteDefaultUnit;
