import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import { BarangDetailI } from "../../interfaces/InventoryInterface";
import ax from "../../service/axios";

export const getBarangDetail = async (
  id: number
): Promise<APIResponse<BarangDetailI>> => {
  const response = await ax.get(`/v1/barang/${id}`);
  return response.data;
};

const useGetBarangDetail = ({
  id,
  options,
}: {
  id: number;
  options?: UseQueryOptions<APIResponse<BarangDetailI>>;
}) => {
  return useQuery<APIResponse<BarangDetailI>>(
    ["useGetBarangDetail", id],
    () => getBarangDetail(id),
    options
  );
};

export default useGetBarangDetail;
