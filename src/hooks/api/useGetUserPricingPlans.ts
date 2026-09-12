import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { AdminPlan } from "./useGetAdminPlan";

export interface UserPricingPlan
  extends Omit<AdminPlan, "is_active" | "customers_using"> {
  is_active?: number;
  customers_using?: number;
}

export type GetUserPricingPlansResponse = APIResponse<UserPricingPlan[]>;

export const getUserPricingPlans = async (): Promise<GetUserPricingPlansResponse> => {
  const response = await ax.get("/v1/user/pricing-plans");
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to get pricing plans.");
  }
  return response.data;
};

const useGetUserPricingPlans = ({
  options,
}: {
  options?: UseQueryOptions<GetUserPricingPlansResponse>;
} = {}) =>
  useQuery<GetUserPricingPlansResponse>(
    ["useGetUserPricingPlans"],
    getUserPricingPlans,
    options,
  );

export default useGetUserPricingPlans;
