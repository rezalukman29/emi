import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";
import type { DefaultUnitItem } from "./useGetDefaultUnit";

export interface DefaultUnitPayload {
  abbreviation: string;
  is_active: number;
  name: string;
  type: string;
}

export const createDefaultUnit = async (
  payload: DefaultUnitPayload,
): Promise<APIResponse<DefaultUnitItem>> => {
  const response = await ax.post("/v1/superadmin/default-units", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create default unit.");
  }
  return response.data;
};

const useCreateDefaultUnit = () => useMutation(createDefaultUnit);

export default useCreateDefaultUnit;
