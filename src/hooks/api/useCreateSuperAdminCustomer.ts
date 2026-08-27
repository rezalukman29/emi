import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SuperAdminCustomerPayload {
  contact_name: string;
  email: string;
  name: string;
  plan_id: number;
  status: string;
  users: number;
  mrr: number;
}

export const createSuperAdminCustomer = async (
  payload: SuperAdminCustomerPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.post("/v1/superadmin/customers", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create customer.");
  }
  return response.data;
};

const useCreateSuperAdminCustomer = () => useMutation(createSuperAdminCustomer);

export default useCreateSuperAdminCustomer;
