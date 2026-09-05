import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { SuperAdminPayment } from "./useGetSuperAdminPayments";

export interface SuperAdminPaymentPayload {
  amount: number;
  company_id: number;
  method: string;
  paid_at: string;
  plan_id: number;
  status: string;
}

export const createSuperAdminPayment = async (
  payload: SuperAdminPaymentPayload,
): Promise<APIResponse<SuperAdminPayment>> => {
  const response = await ax.post("/v1/superadmin/payments", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create payment.");
  }
  return response.data;
};

const useCreateSuperAdminPayment = () => useMutation(createSuperAdminPayment);

export default useCreateSuperAdminPayment;
