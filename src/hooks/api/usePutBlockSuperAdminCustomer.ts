import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const putBlockSuperAdminCustomer = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.put(`/v1/superadmin/customers/${id}/block`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update customer block status.");
  }
  return response.data;
};

const usePutBlockSuperAdminCustomer = () => useMutation(putBlockSuperAdminCustomer);

export default usePutBlockSuperAdminCustomer;
