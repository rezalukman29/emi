import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteSuperAdminCustomer = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/superadmin/customers/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete customer.");
  }
  return response.data;
};

const useDeleteSuperAdminCustomer = () => useMutation(deleteSuperAdminCustomer);

export default useDeleteSuperAdminCustomer;
