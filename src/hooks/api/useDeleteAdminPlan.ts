import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteAdminPlan = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/superadmin/pricing-plans/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete pricing plan.");
  }
  return response.data;
};

const useDeleteAdminPlan = () => useMutation(deleteAdminPlan);

export default useDeleteAdminPlan;
