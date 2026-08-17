import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const deleteUser = async (
  id: number,
): Promise<APIResponse<unknown>> => {
  const response = await ax.delete(`/v1/user/${id}`);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Gagal menghapus user.");
  }

  return response.data;
};

const useDeleteUser = () => useMutation(deleteUser);

export default useDeleteUser;
