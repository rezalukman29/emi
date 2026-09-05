import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface SuperAdminUser {
  id: number;
  fullname: string;
  email: string;
  user_type: string;
  company_id: number | null;
  company_name: string;
  plan_id: number | null;
  plan_name: string;
  created_at: string;
}

export interface SuperAdminUsersData {
  users: SuperAdminUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetSuperAdminUsersParams {
  search?: string;
  company_id?: number;
  page: number;
  limit: number;
  sort_by: "fullname" | "email" | "created_at" | "user_type";
  sort_dir: "asc" | "desc";
}

export type GetSuperAdminUsersResponse = APIResponse<SuperAdminUsersData>;

export const getSuperAdminUsers = async (
  params: GetSuperAdminUsersParams,
): Promise<GetSuperAdminUsersResponse> => {
  const response = await ax.get("/v1/superadmin/users", { params });
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to get users.");
  }
  return response.data;
};

const useGetSuperAdminUsers = ({
  params,
  options,
}: {
  params: GetSuperAdminUsersParams;
  options?: UseQueryOptions<GetSuperAdminUsersResponse>;
}) =>
  useQuery<GetSuperAdminUsersResponse>(
    ["useGetSuperAdminUsers", params],
    () => getSuperAdminUsers(params),
    options,
  );

export default useGetSuperAdminUsers;
