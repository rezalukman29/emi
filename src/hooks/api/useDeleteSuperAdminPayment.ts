import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteSuperAdminPayment = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/superadmin/payments/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete payment.");
  }
  return response.data;
};

const useDeleteSuperAdminPayment = () => useMutation(deleteSuperAdminPayment);

export default useDeleteSuperAdminPayment;
