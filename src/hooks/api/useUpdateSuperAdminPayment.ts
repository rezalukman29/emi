import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { SuperAdminPaymentPayload } from "./useCreateSuperAdminPayment";
import type { SuperAdminPayment } from "./useGetSuperAdminPayments";

export interface UpdateSuperAdminPaymentVariables {
  id: number;
  payload: SuperAdminPaymentPayload;
}

export const updateSuperAdminPayment = async ({
  id,
  payload,
}: UpdateSuperAdminPaymentVariables): Promise<APIResponse<SuperAdminPayment>> => {
  const response = await ax.put(`/v1/superadmin/payments/${id}`, payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update payment.");
  }
  return response.data;
};

const useUpdateSuperAdminPayment = () => useMutation(updateSuperAdminPayment);

export default useUpdateSuperAdminPayment;
