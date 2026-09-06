import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface UserPlan {
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
  storage_used: number;
  storage_used_readable: string;
  storage_remaining: number;
  storage_remaining_readable: string;
  usage_percentage: number;
  event_management_price?: number | null;
  inventory_management_price?: number | null;
  warehouse_management_price?: number | null;
  qr_scanning_price?: number | null;
  reports_dashboard_price?: number | null;
  item_loan_price?: number | null;
  ai_analyzer_price?: number | null;
}

export type GetUserPlanResponse = APIResponse<UserPlan>;

export const getUserPlan = async (): Promise<GetUserPlanResponse> => {
  const response = await ax.get("/v1/user/plan");
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to get user plan.");
  }
  return response.data;
};

const useGetUserPlan = ({
  userId,
  options,
}: {
  userId?: number;
  options?: UseQueryOptions<GetUserPlanResponse>;
} = {}) =>
  useQuery<GetUserPlanResponse>(["useGetUserPlan", userId], getUserPlan, options);

export default useGetUserPlan;
