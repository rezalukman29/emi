import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface ParamsGetEventItemInterface {
  event_id: number;
  list_id?: number;
  status_event_id?: number;
  order: string;
}

export const getEventItem = async ({
  params,
}: {
  params: ParamsGetEventItemInterface;
}): Promise<APIResponse<any[]>> => {
  const response = await ax.get(`/v3/fix-list-item-event`, {
    params: {
      event_id: params.event_id,
      ...(params.list_id && {list_id: params.list_id}),
      ...(params.status_event_id && {status_event_id: params.status_event_id}),
      order: params.order
    }
  });
  return response.data;
};

const useGetEventItemPrint = ({
  options,
  params,
}: {
  options?: UseQueryOptions<APIResponse<any[]>>;
  params: ParamsGetEventItemInterface;
}) => {
  return useQuery<APIResponse<any[]>>(
    ["useGetEventItemPrint"],
    () => getEventItem({ params }),
    options
  );
};

export default useGetEventItemPrint;
