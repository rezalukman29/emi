import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { DefaultUnitPayload } from "./useCreateDefaultUnit";
import type { DefaultUnitItem } from "./useGetDefaultUnit";

export interface UpdateDefaultUnitVariables {
  id: number;
  payload: DefaultUnitPayload;
}

export const updateDefaultUnit = async ({
  id,
  payload,
}: UpdateDefaultUnitVariables): Promise<APIResponse<DefaultUnitItem>> => {
  const response = await ax.put(`/v1/superadmin/default-units/${id}`, payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update default unit.");
  }
  return response.data;
};

const useUpdateDefaultUnit = () => useMutation(updateDefaultUnit);

export default useUpdateDefaultUnit;
