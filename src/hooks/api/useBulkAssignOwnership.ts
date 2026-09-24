import { useMutation } from 'react-query';
import type { APIResponse } from '../../interfaces/BaseApiResponse';
import ax from '../../service/axios';

export type BulkOwnership = 'ihp' | 'ihc' | 'outsource';

export interface BulkAssignOwnershipPayload {
  id: number[];
  ownership: BulkOwnership;
}

export async function bulkAssignOwnership(
  payload: BulkAssignOwnershipPayload,
): Promise<APIResponse<unknown>> {
  const response = await ax.patch('/v2/fix-list-item/bulk-ownership', payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Failed to update ownership.');
  }
  return response.data;
}

export default function useBulkAssignOwnership() {
  return useMutation(bulkAssignOwnership);
}
