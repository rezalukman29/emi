import { useQueries, useQuery } from 'react-query';
import ax from '../../service/axios';
import type { APIResponse, BaseResponsePagination } from '../../interfaces/BaseApiResponse';
import { LIFECYCLE_STATUSES, type LifecycleStatus } from '../../lib/eventLifecycle';

export interface EventFilterParams {
  status?: LifecycleStatus;
  search?: string;
  event_start?: string;
  event_end?: string;
  sort_by?: string;
  sort?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// v2 retains the existing event-filter pagination envelope.
export async function getEvents(params: EventFilterParams) {
  const { data } = await ax.get<APIResponse<BaseResponsePagination<Array<Record<string, any> & { id: number }>>>>('/v2/event-filter', {
    params: { sort_by: 'date_event', sort: 'DESC', page: 1, limit: 8, ...params },
  });
  if (data.success === false) throw new Error(data.message);
  return data;
}

export default function useGetEvents(params: EventFilterParams, enabled = true) {
  return useQuery(['events-v2', 'list', params], () => getEvents(params), { enabled });
}

export function useGetEventLifecycleCounts() {
  return useQueries(LIFECYCLE_STATUSES.map(status => ({
    queryKey: ['events-v2', 'count', status],
    queryFn: () => getEvents({ status, page: 1, limit: 1 }),
  })));
}
