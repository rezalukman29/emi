import { useMutation } from 'react-query';
import type { APIResponse } from '../../interfaces/BaseApiResponse';
import ax from '../../service/axios';

export interface CreatePackagePayload {
  eventId: number;
  items: number[];
  name: string;
  note: string;
  qr_type: string;
}

export async function createPackage(payload: CreatePackagePayload): Promise<APIResponse<unknown>> {
  const response = await ax.post('/v2/package', payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Failed to create group.');
  }
  return response.data;
}

export default function useCreatePackage() {
  return useMutation(createPackage);
}
