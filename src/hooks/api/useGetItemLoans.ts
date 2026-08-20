import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse, BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type ItemLoanStatus = "Loaned" | "Overdue" | "Returned";

export interface ItemLoanItem {
  id: number;
  barang_gudang_id: number;
  item_name: string;
  warehouse_name: string;
  unit_name: string;
  qty: number;
  borrower_name: string;
  borrower_contact: string;
  purpose: string;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  status: ItemLoanStatus | string;
}

export interface GetItemLoansParams {
  page: number;
  limit: number;
  search?: string;
  status?: ItemLoanStatus;
}

export type GetItemLoansResponse = APIResponse<BaseResponsePagination<ItemLoanItem[]>>;

export const getItemLoans = async (
  params: GetItemLoansParams,
): Promise<GetItemLoansResponse> => {
  const response = await ax.get("/v1/item-loan", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
      ...(params.status && { status: params.status }),
    },
  });
  return response.data;
};

const useGetItemLoans = ({
  params,
  options,
}: {
  params: GetItemLoansParams;
  options?: UseQueryOptions<GetItemLoansResponse>;
}) => useQuery<GetItemLoansResponse>(
  ["useGetItemLoans", params],
  () => getItemLoans(params),
  options,
);

export default useGetItemLoans;
