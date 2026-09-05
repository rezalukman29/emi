import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SuperAdminPayment {
  amount: number;
  company_id: number;
  company_name: string;
  created_at: string;
  id: number;
  invoice_no: string;
  method: string;
  paid_at: string;
  plan_id: number;
  plan_name: string;
  status: string;
  updated_at: string;
}

export interface SuperAdminPaymentStats {
  failed: number;
  pending: number;
  total_revenue: number;
  total_transactions: number;
}

export interface SuperAdminPaymentsData {
  items: SuperAdminPayment[];
  limit: number;
  page: number;
  stats: SuperAdminPaymentStats;
  total: number;
  total_pages: number;
}

export interface GetSuperAdminPaymentsParams {
  search?: string;
  status?: string;
  page: number;
  limit: number;
  sort_by: string;
  sort: "ASC" | "DESC";
}

export type GetSuperAdminPaymentsResponse = APIResponse<SuperAdminPaymentsData>;

export const getSuperAdminPayments = async (
  params: GetSuperAdminPaymentsParams,
): Promise<GetSuperAdminPaymentsResponse> => {
  const response = await ax.get("/v1/superadmin/payments", { params });
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to get payments.");
  }
  return response.data;
};

const useGetSuperAdminPayments = ({
  params,
  options,
}: {
  params: GetSuperAdminPaymentsParams;
  options?: UseQueryOptions<GetSuperAdminPaymentsResponse>;
}) =>
  useQuery<GetSuperAdminPaymentsResponse>(
    ["useGetSuperAdminPayments", params],
    () => getSuperAdminPayments(params),
    options,
  );

export default useGetSuperAdminPayments;
