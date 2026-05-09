import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse, BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export const getLogActivity = async ({
  module,
  page,
  limit,
  barang_id,
  gudang_id
}: {
  module: string;
  page: number;
  limit: number;
  barang_id?: number;
  gudang_id?: number;
}): Promise<APIResponse<BaseResponsePagination<any>>> => {
  const response = await ax.get(`/v1/api-log`, {
    params: {
      ...(module && { module }),
      ...(page && { page }),
      ...(limit && { limit }),
      ...(barang_id && { barang_id }),
      ...(gudang_id && { gudang_id }),
    },
  });
  return response.data;
};

const useGetLogActivity = ({
  options,
  module,
  page,
  limit,
}: {
  options?: UseQueryOptions<APIResponse<BaseResponsePagination<any>>> ;
  module: string;
  page: number;
  limit: number;
}) => {
  return useQuery<APIResponse<BaseResponsePagination<any>>> (
    ["useGetLogActivity"],
    () => getLogActivity({ module, page, limit }),
    options
  );
};

export default useGetLogActivity;
