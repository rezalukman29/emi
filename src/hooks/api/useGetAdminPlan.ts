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
  is_popular: number;
  base_platform_fee: number;
  event_management_price: number | null;
  inventory_management_price: number | null;
  warehouse_management_price: number | null;
  qr_scanning_price: number | null;
  reports_dashboard_price: number | null;
  item_loan_price: number | null;
  ai_analyzer_price: number | null;
  customers_using: number;
  created_at: string;
  updated_at: string;
}

export type GetAdminPlanResponse = APIResponse<AdminPlan[]>;

export const getAdminPlan = async (): Promise<GetAdminPlanResponse> => {
  const response = await ax.get("/v1/superadmin/pricing-plans");
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
