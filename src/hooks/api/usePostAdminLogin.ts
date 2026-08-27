import { useMutation } from "react-query";

import ax from "../../service/axios";

export interface PostAdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminLoginData {
  id: number;
  email: string;
  fullname: string;
  token: string;
}

export interface PostAdminLoginResponse {
  success: boolean;
  message: string;
  data: AdminLoginData;
  code?: number;
}

export const postAdminLogin = async (
  payload: PostAdminLoginPayload,
): Promise<PostAdminLoginResponse> => {
  const response = await ax.post("/v1/superadmin/login", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to sign in.");
  }

  return response.data;
};

const usePostAdminLogin = () => useMutation(postAdminLogin);

export default usePostAdminLogin;
