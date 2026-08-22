import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface AdminUserPlan {
  user_emi_id: number;
  email: string;
  plan_id: number;
  plan_name: string;
  storage_limit: number;
  storage_limit_readable: string;
  price: number;
  currency: string;
  billing_cycle: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  current_usage: number;
  current_usage_readable: string;
  usage_percentage: number;
}

export type GetAdminUserPlanResponse = APIResponse<AdminUserPlan[]>;

export const getAdminUserPlan = async (): Promise<GetAdminUserPlanResponse> => {
  const response = await ax.get("/v1/admin/user-plan");
  return response.data;
};

const useGetAdminUserPlan = ({
  options,
}: {
  options?: UseQueryOptions<GetAdminUserPlanResponse>;
} = {}) => useQuery<GetAdminUserPlanResponse>(
  ["useGetAdminUserPlan"],
  getAdminUserPlan,
  options,
);

export default useGetAdminUserPlan;
