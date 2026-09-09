import { useMemo } from "react";
import { useSelector } from "react-redux";

import type { UserPlan } from "./api/useGetUserPlan";
import type { RootState } from "../store/store";

export interface UserPlanFeatureFlags {
  event_management_price: boolean;
  inventory_management_price: boolean;
  warehouse_management_price: boolean;
  qr_scanning_price: boolean;
  reports_dashboard_price: boolean;
  item_loan_price: boolean;
  ai_analyzer_price: boolean;
}

type UserPlanFeatureKey = keyof UserPlanFeatureFlags;

function isEnabled(userPlan: UserPlan | null, feature: UserPlanFeatureKey) {
  if (!userPlan || !Object.prototype.hasOwnProperty.call(userPlan, feature)) {
    return true;
  }

  return Number(userPlan[feature] ?? 0) > 0;
}

export const useUserPlanController = (): UserPlanFeatureFlags => {
  const userPlan = useSelector((state: RootState) => state.userPlan.data);

  return useMemo(
    () => ({
      event_management_price: isEnabled(userPlan, "event_management_price"),
      inventory_management_price: isEnabled(
        userPlan,
        "inventory_management_price",
      ),
      warehouse_management_price: isEnabled(
        userPlan,
        "warehouse_management_price",
      ),
      qr_scanning_price: isEnabled(userPlan, "qr_scanning_price"),
      reports_dashboard_price: isEnabled(userPlan, "reports_dashboard_price"),
      item_loan_price: isEnabled(userPlan, "item_loan_price"),
      ai_analyzer_price: isEnabled(userPlan, "ai_analyzer_price"),
    }),
    [
      userPlan?.ai_analyzer_price,
      userPlan?.event_management_price,
      userPlan?.inventory_management_price,
      userPlan?.item_loan_price,
      userPlan?.qr_scanning_price,
      userPlan?.reports_dashboard_price,
      userPlan?.warehouse_management_price,
    ],
  );
};

export default useUserPlanController;
