import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import type { UserPlan } from "./useGetUserPlan";
import ax from "../../service/axios";

export interface UpgradeUserPlanPayload {
  plan_id: number;
}

export const upgradeUserPlan = async (
  payload: UpgradeUserPlanPayload,
): Promise<APIResponse<UserPlan | null>> => {
  const response = await ax.put("/v1/user/upgrade-plan", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to upgrade plan.");
  }
  return response.data;
};

const useUpgradeUserPlan = () => useMutation(upgradeUserPlan);

export default useUpgradeUserPlan;
