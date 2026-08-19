import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface PostRegisterPayload {
  fullname: string;
  password: string;
  email: string;
  user_type: "ADMIN" | "EMPLOYEE";
}

export const postRegister = async (
  payload: PostRegisterPayload,
): Promise<APIResponse<unknown>> => {
  const response = await ax.post("/v1/register", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to add user.");
  }

  return response.data;
};

const usePostRegister = () => useMutation(postRegister);

export default usePostRegister;
