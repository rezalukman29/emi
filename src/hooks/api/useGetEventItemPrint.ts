import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import { getEventItem, type EventItem, type ParamsGetEventItemInterface } from './useGetEventItem';

const useGetEventItemPrint = ({
  options,
  params,
}: {
  options?: UseQueryOptions<APIResponse<EventItem[]>>;
  params: ParamsGetEventItemInterface;
}) => {
  return useQuery<APIResponse<EventItem[]>>(
    ["useGetEventItemPrint", params],
    () => getEventItem({ params }),
    options
  );
};

export default useGetEventItemPrint;
