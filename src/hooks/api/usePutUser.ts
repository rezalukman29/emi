import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import type { PostRegisterPayload } from "./usePostRegister";
import ax from "../../service/axios";

export interface PutUserVariables {
  id: number;
  payload: PostRegisterPayload;
}

export const putUser = async ({
  id,
  payload,
}: PutUserVariables): Promise<APIResponse<unknown>> => {
  const response = await ax.put(`/v1/user/${id}`, payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update user.");
  }

  return response.data;
};

const usePutUser = () => useMutation(putUser);

export default usePutUser;
