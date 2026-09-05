import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { SuperAdminUser } from "./useGetSuperAdminUsers";

export interface CreateSuperAdminUserPayload {
  company_id: number;
  email: string;
  full_name: string;
  password: string;
  user_type: string;
}

export const createSuperAdminUser = async (
  payload: CreateSuperAdminUserPayload,
): Promise<APIResponse<SuperAdminUser>> => {
  const response = await ax.post("/superadmin/users", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create user.");
  }
  return response.data;
};

const useCreateSuperAdminUser = () => useMutation(createSuperAdminUser);

export default useCreateSuperAdminUser;
