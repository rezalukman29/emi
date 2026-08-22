import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { AdminPlan, AdminPlanBillingCycle } from "./useGetAdminPlan";

export interface UpdateAdminPlanPayload {
  billing_cycle: AdminPlanBillingCycle;
  currency: string;
  description: string;
  display_order: number;
  id: number;
  is_active: number;
  is_default: number;
  name: string;
  price: number;
  storage_limit: number;
}

export const updateAdminPlan = async (
  payload: UpdateAdminPlanPayload,
): Promise<APIResponse<AdminPlan>> => {
  const response = await ax.put(`/v1/admin/plan/${payload.id}`, payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update pricing plan.");
  }
  return response.data;
};

const useUpdateAdminPlan = () => useMutation(updateAdminPlan);

export default useUpdateAdminPlan;
