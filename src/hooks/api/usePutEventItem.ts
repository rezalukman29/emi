import { useMutation } from 'react-query';
import type { APIResponse } from '../../interfaces/BaseApiResponse';
import type { EventItemOwnerships } from './useGetEventItem';
import ax from '../../service/axios';

export interface PutEventItemPayload {
  id: number;
  list_id: number;
  sub_list_id: number;
  qty: number;
  pic: string;
  notes: string;
  ownerships: EventItemOwnerships;
}

export async function putEventItem(payload: PutEventItemPayload): Promise<APIResponse<unknown>> {
  const response = await ax.put('/v3/fix-list-item', payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Failed to update event item.');
  }
  return response.data;
}

export default function usePutEventItem() {
  return useMutation(putEventItem);
}
