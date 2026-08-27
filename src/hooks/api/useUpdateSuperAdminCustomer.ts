import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { SuperAdminCustomerPayload } from "./useCreateSuperAdminCustomer";

export interface UpdateSuperAdminCustomerVariables {
  id: number;
  payload: SuperAdminCustomerPayload;
}

export const updateSuperAdminCustomer = async ({
  id,
  payload,
}: UpdateSuperAdminCustomerVariables): Promise<APIResponse<unknown>> => {
  const response = await ax.put(`/v1/superadmin/customers/${id}`, payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update customer.");
  }
  return response.data;
};

const useUpdateSuperAdminCustomer = () => useMutation(updateSuperAdminCustomer);

export default useUpdateSuperAdminCustomer;
