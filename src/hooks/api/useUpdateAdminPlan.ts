import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { AdminPlan } from "./useGetAdminPlan";
import type { CreateAdminPlanPayload } from "./useCreateAdminPlan";

export interface UpdateAdminPlanPayload extends CreateAdminPlanPayload {
  id: number;
  is_active: number;
}

export const updateAdminPlan = async (
  payload: UpdateAdminPlanPayload,
): Promise<APIResponse<AdminPlan>> => {
  const { id, ...requestPayload } = payload;
  const response = await ax.put(`/v1/superadmin/pricing-plans/${id}`, requestPayload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update pricing plan.");
  }
  return response.data;
};

const useUpdateAdminPlan = () => useMutation(updateAdminPlan);

export default useUpdateAdminPlan;
