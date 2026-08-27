import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SuperAdminRecentSignup {
  user_id: number;
  company: string;
  email: string;
  plan_name: string;
  status: string;
  joined_at: string;
}

export interface SuperAdminDashboardData {
  total_customers: number;
  active_subscriptions: number;
  trial_count: number;
  canceled_count: number;
  mrr: number;
  churn_rate: number;
  recent_signups: SuperAdminRecentSignup[];
}

export type GetSuperAdminDashboardResponse = APIResponse<SuperAdminDashboardData>;

export const getSuperAdminDashboard = async (): Promise<GetSuperAdminDashboardResponse> => {
  const response = await ax.get("/v1/superadmin/dashboard");
  return response.data;
};

const useGetSuperAdminDashboard = (
  options?: UseQueryOptions<GetSuperAdminDashboardResponse>,
) => useQuery<GetSuperAdminDashboardResponse>(
  ["useGetSuperAdminDashboard"],
  getSuperAdminDashboard,
  options,
);

export default useGetSuperAdminDashboard;
