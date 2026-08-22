import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { AdminPlan, AdminPlanBillingCycle } from "./useGetAdminPlan";

export interface CreateAdminPlanPayload {
  billing_cycle: AdminPlanBillingCycle;
  currency: string;
  description: string;
  display_order: number;
  is_default: number;
  name: string;
  price: number;
  storage_limit: number;
}

export const createAdminPlan = async (
  payload: CreateAdminPlanPayload,
): Promise<APIResponse<AdminPlan>> => {
  const response = await ax.post("/v1/admin/plan", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create pricing plan.");
  }
  return response.data;
};

const useCreateAdminPlan = () => useMutation(createAdminPlan);

export default useCreateAdminPlan;
