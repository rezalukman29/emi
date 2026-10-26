import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type ProductionRequestNextStatus = "IN_PRODUCTION" | "DONE";

export async function cancelProductionRequest(
  id: number,
): Promise<APIResponse<unknown>> {
  const response = await ax.put<APIResponse<unknown>>(
    `/v3/production-requests/${id}/cancel`,
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to cancel production request.");
  }
  return response.data;
}

export async function updateProductionRequestStatus({
  id,
  status,
}: {
  id: number;
  status: ProductionRequestNextStatus;
}): Promise<APIResponse<unknown>> {
  const response = await ax.put<APIResponse<unknown>>(
    `/v1/production-requests/${id}/status`,
    { status },
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update production request.");
  }
  return response.data;
}

export function useCancelProductionRequest() {
  return useMutation(cancelProductionRequest);
}

export function useUpdateProductionRequestStatus() {
  return useMutation(updateProductionRequestStatus);
}
