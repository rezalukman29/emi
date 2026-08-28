import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { AdminPlan, AdminPlanBillingCycle } from "./useGetAdminPlan";

export interface CreateAdminPlanPayload {
  ai_analyzer_price: number;
  base_platform_fee: number;
  billing_cycle: AdminPlanBillingCycle;
  description: string;
  display_order: number;
  event_management_price: number;
  inventory_management_price: number;
  is_default: number;
  is_popular: number;
  item_loan_price: number;
  name: string;
  qr_scanning_price: number;
  reports_dashboard_price: number;
  storage_limit: number;
  warehouse_management_price: number;
}

export const createAdminPlan = async (
  payload: CreateAdminPlanPayload,
): Promise<APIResponse<AdminPlan>> => {
  const response = await ax.post("/v1/superadmin/pricing-plans", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create pricing plan.");
  }
  return response.data;
};

const useCreateAdminPlan = () => useMutation(createAdminPlan);

export default useCreateAdminPlan;
