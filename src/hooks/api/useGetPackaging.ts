import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getPackaging = async ({params}:{params: any}): Promise<APIResponse<any[]>> => {
  const response = await ax.get(`/v1/package`);
  if (params?.eventId) {
    return {...response.data,
    data: response.data.data.filter((el: any) => el.note === params.eventId)};
  }else {
    return response.data;
  }

};

const useGetPackaging = ({
  options,
  params
}: {
  options?: UseQueryOptions<APIResponse<any[]>>;
  params: any
}) => {
  return useQuery<APIResponse<any[]>>(
    ["useGetPackaging"],
    () => getPackaging({params}),
    options
  );
};

export default useGetPackaging;
