import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type LoanVendorType = "Internal" | "External";

export interface LoanVendorItem {
  id: number;
  name: string;
  type: LoanVendorType;
  description: string;
  phone: string;
  address: string;
  is_loan: boolean;
  is_production: boolean;
  loans: number;
  created_at: string;
  updated_at: string;
  user_emi_id: number;
}

export interface LoanVendorStats {
  total: number;
  internal: number;
  external: number;
}

export interface LoanVendorListData {
  items: LoanVendorItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  stats: LoanVendorStats;
}

export interface GetLoanVendorsParams {
  search?: string;
  type?: LoanVendorType;
  page?: number;
  limit?: number;
}

export interface LoanVendorPayload {
  name: string;
  type: LoanVendorType;
  description: string;
  phone: string;
  address: string;
  is_loan: boolean;
  is_production: boolean;
}

export type LoanVendorListResponse = APIResponse<LoanVendorListData>;

export async function getLoanVendors(params: GetLoanVendorsParams = {}) {
  const response = await ax.get<LoanVendorListResponse>("/v1/loan-vendors", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.search ? { search: params.search } : {}),
      ...(params.type ? { type: params.type } : {}),
    },
  });
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to load loan vendors.");
  }
  return response.data;
}

export async function getLoanVendor(id: number) {
  const response = await ax.get<APIResponse<LoanVendorItem>>(
    `/v1/loan-vendors/${id}`,
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to load loan vendor.");
  }
  return response.data;
}

export async function createLoanVendor(payload: LoanVendorPayload) {
  const response = await ax.post<APIResponse<LoanVendorItem>>(
    "/v1/loan-vendors",
    payload,
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create loan vendor.");
  }
  return response.data;
}

export async function updateLoanVendor({
  id,
  payload,
}: {
  id: number;
  payload: LoanVendorPayload;
}) {
  const response = await ax.put<APIResponse<LoanVendorItem>>(
    `/v1/loan-vendors/${id}`,
    payload,
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update loan vendor.");
  }
  return response.data;
}

export async function deleteLoanVendor(id: number) {
  const response = await ax.delete<APIResponse<unknown>>(
    `/v1/loan-vendors/${id}`,
  );
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete loan vendor.");
  }
  return response.data;
}

export function useGetLoanVendors({
  params,
  options,
}: {
  params?: GetLoanVendorsParams;
  options?: UseQueryOptions<LoanVendorListResponse, Error>;
} = {}) {
  return useQuery<LoanVendorListResponse, Error>(
    ["useGetLoanVendors", params],
    () => getLoanVendors(params),
    options,
  );
}

export function useGetLoanVendor(
  id: number,
  options?: UseQueryOptions<APIResponse<LoanVendorItem>, Error>,
) {
  return useQuery<APIResponse<LoanVendorItem>, Error>(
    ["useGetLoanVendor", id],
    () => getLoanVendor(id),
    { enabled: id > 0, ...options },
  );
}

export function useCreateLoanVendor() {
  return useMutation(createLoanVendor);
}

export function useUpdateLoanVendor() {
  return useMutation(updateLoanVendor);
}

export function useDeleteLoanVendor() {
  return useMutation(deleteLoanVendor);
}
