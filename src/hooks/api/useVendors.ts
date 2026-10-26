import {
  useMutation,
  useQuery,
  type UseQueryOptions,
} from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type VendorOrigin = "Internal" | "External";

export interface VendorItem {
  id: number;
  name: string;
  origin: VendorOrigin;
  category: string;
  contact: string;
  created_at: string;
  updated_at: string;
  user_emi_id: number;
}

export interface VendorStats {
  total: number;
  internal: number;
  external: number;
}

export interface VendorListData {
  items: VendorItem[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  stats: VendorStats;
}

export interface GetVendorsParams {
  search?: string;
  origin?: VendorOrigin;
  page?: number;
  limit?: number;
}

export interface VendorPayload {
  name: string;
  origin: VendorOrigin;
  category: string;
  contact: string;
}

export type GetVendorsResponse = APIResponse<VendorListData>;

export async function getVendors(params: GetVendorsParams = {}) {
  const response = await ax.get<GetVendorsResponse>("/v1/vendor", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.search ? { search: params.search } : {}),
      ...(params.origin ? { origin: params.origin } : {}),
    },
  });

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to load vendors");
  }

  return response.data;
}

export async function getVendorById(id: number) {
  const response = await ax.get<APIResponse<VendorItem>>(`/v1/vendor/${id}`);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to load vendor");
  }

  return response.data;
}

export async function createVendor(payload: VendorPayload) {
  const response = await ax.post<APIResponse<VendorItem>>("/v1/vendor", payload);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create vendor");
  }

  return response.data;
}

export async function updateVendor({
  id,
  payload,
}: {
  id: number;
  payload: VendorPayload;
}) {
  const response = await ax.put<APIResponse<VendorItem>>(
    `/v1/vendor/${id}`,
    payload,
  );

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update vendor");
  }

  return response.data;
}

export async function deleteVendor(id: number) {
  const response = await ax.delete<APIResponse<unknown>>(`/v1/vendor/${id}`);

  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete vendor");
  }

  return response.data;
}

export function useGetVendors({
  params,
  options,
}: {
  params?: GetVendorsParams;
  options?: UseQueryOptions<GetVendorsResponse, Error>;
} = {}) {
  return useQuery<GetVendorsResponse, Error>(
    ["useGetVendors", params],
    () => getVendors(params),
    options,
  );
}

export function useGetVendor(id: number) {
  return useQuery<APIResponse<VendorItem>, Error>(
    ["useGetVendor", id],
    () => getVendorById(id),
    { enabled: id > 0 },
  );
}

export function useCreateVendor() {
  return useMutation(createVendor);
}

export function useUpdateVendor() {
  return useMutation(updateVendor);
}

export function useDeleteVendor() {
  return useMutation(deleteVendor);
}
