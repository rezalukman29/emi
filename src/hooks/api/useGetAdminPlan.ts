import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type AdminPlanBillingCycle = "monthly" | "yearly" | "custom";

export interface AdminPlan {
  id: number;
  name: string;
  storage_limit: number;
  storage_limit_readable: string;
  price: number;
  currency: string;
  billing_cycle: AdminPlanBillingCycle | string;
  display_order: number;
  description: string;
  is_default: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type GetAdminPlanResponse = APIResponse<AdminPlan[]>;

export const getAdminPlan = async (): Promise<GetAdminPlanResponse> => {
  const response = await ax.get("/v1/admin/plan");
  return response.data;
};

const useGetAdminPlan = ({
  options,
}: {
  options?: UseQueryOptions<GetAdminPlanResponse>;
} = {}) => useQuery<GetAdminPlanResponse>(
  ["useGetAdminPlan"],
  getAdminPlan,
  options,
);

export default useGetAdminPlan;
