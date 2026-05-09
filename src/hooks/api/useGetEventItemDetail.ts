import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface ParamsGetEventItemDetailInterface {
  event_id: number;
  barang_id: number;
}

export const getEventItemDetail = async ({
  params,
}: {
  params: ParamsGetEventItemDetailInterface;
}): Promise<APIResponse<any>> => {
  const response = await ax.get(`/v3/fix-detail-item-event`, {
    params
  });
  return response.data;
};

const useGetEventItemDetail = ({
  options,
  params,
}: {
  options?: UseQueryOptions<APIResponse<any[]>>;
  params: ParamsGetEventItemDetailInterface;
}) => {
  return useQuery<APIResponse<any[]>>(
    ["useGetEventItemDetail"],
    () => getEventItemDetail({ params }),
    options
  );
};

export default useGetEventItemDetail;
