import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SuperAdminCustomerStats {
  total: number;
  active: number;
  trial: number;
  active_mrr: number;
}

export interface SuperAdminCustomer {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  status: string;
  users: number;
  is_blocked: number;
  plan_id: number;
  plan_name: string;
  mrr: number;
  created_at: string;
  updated_at: string;
}

export interface SuperAdminCustomersData {
  stats: SuperAdminCustomerStats;
  items: SuperAdminCustomer[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetSuperAdminCustomersParams {
  search?: string;
  page: number;
  limit: number;
}

export type GetSuperAdminCustomersResponse = APIResponse<SuperAdminCustomersData>;

export const getSuperAdminCustomers = async (
  params: GetSuperAdminCustomersParams,
): Promise<GetSuperAdminCustomersResponse> => {
  const response = await ax.get("/v1/superadmin/customers", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
    },
  });
  return response.data;
};

const useGetSuperAdminCustomers = ({
  params,
  options,
}: {
  params: GetSuperAdminCustomersParams;
  options?: UseQueryOptions<GetSuperAdminCustomersResponse>;
}) => useQuery<GetSuperAdminCustomersResponse>(
  ["useGetSuperAdminCustomers", params],
  () => getSuperAdminCustomers(params),
  options,
);

export default useGetSuperAdminCustomers;
