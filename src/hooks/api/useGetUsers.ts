import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface UserListItem {
  id: number;
  username: string;
  token: string;
  email: string;
  fullname: string;
  user_type: "ADMIN" | "EMPLOYEE" | string;
  unique_code: string;
  is_admin: number;
}

export interface GetUsersData {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetUsersParams {
  page: number;
  limit: number;
  search: string;
  sort_dir: "asc" | "desc";
  sort_by: string;
  user_type?: "ADMIN" | "EMPLOYEE";
}

export const getUsers = async (
  params: GetUsersParams,
): Promise<APIResponse<GetUsersData>> => {
  const response = await ax.get("/v1/get-all-user", { params });
  return response.data;
};

const useGetUsers = ({
  params,
  options,
}: {
  params: GetUsersParams;
  options?: UseQueryOptions<APIResponse<GetUsersData>>;
}) =>
  useQuery<APIResponse<GetUsersData>>(
    ["useGetUsers", params],
    () => getUsers(params),
    options,
  );

export default useGetUsers;
