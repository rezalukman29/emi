import { useQuery, type UseQueryOptions } from 'react-query';
import type { APIResponse } from '../../interfaces/BaseApiResponse';
import type { EventItem } from './useGetEventItem';
import ax from '../../service/axios';

export interface EventPackage {
  id: number;
  name: string;
  note: string;
  qr_type: string;
  event_id: number;
  items: EventItem[];
}

export async function getEventPackages(eventId: number): Promise<APIResponse<EventPackage[]>> {
  const response = await ax.get('/v2/package', { params: { event_id: eventId } });
  if (response.data?.success === false) {
    throw new Error(response.data.message || 'Failed to load packages.');
  }
  return response.data;
}

export default function useGetEventPackages({
  eventId,
  options,
}: {
  eventId: number;
  options?: UseQueryOptions<APIResponse<EventPackage[]>>;
}) {
  return useQuery<APIResponse<EventPackage[]>>(
    ['useGetEventPackages', eventId],
    () => getEventPackages(eventId),
    options,
  );
}
