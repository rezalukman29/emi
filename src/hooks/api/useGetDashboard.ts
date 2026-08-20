import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface DashboardNeedsAttentionItem {
  category: string;
  id: number;
  name: string;
  status: string;
  total_stock: number;
  unit: string;
  warehouse: string;
}

export interface DashboardRecentActivity {
  description: string;
  id: number;
  module: string;
  timestamp: string;
  user_name: string;
}

export interface DashboardStockByCategory {
  category: string;
  sku_count: number;
  total_stock: number;
}

export interface DashboardStockByWarehouse {
  total_stock: number;
  warehouse: string;
}

export interface DashboardSummary {
  available: number;
  inventory_sku: number;
  loaned: number;
  low_stock: number;
  out_of_stock: number;
  overdue: number;
  past_count: number;
  total_events: number;
  total_loans: number;
  total_stock: number;
  upcoming_count: number;
  warehouse_count: number;
}

export interface DashboardUpcomingEvent {
  event_start: string;
  id: number;
  location: string;
  name: string;
}

export interface DashboardData {
  needs_attention: DashboardNeedsAttentionItem[];
  recent_activity: DashboardRecentActivity[];
  stock_by_category: DashboardStockByCategory[];
  stock_by_warehouse: DashboardStockByWarehouse[];
  summary: DashboardSummary;
  upcoming_events: DashboardUpcomingEvent[];
}

export type GetDashboardResponse = APIResponse<DashboardData>;

export const getDashboard = async (): Promise<GetDashboardResponse> => {
  const response = await ax.get("/v1/dashboard");
  return response.data;
};

const useGetDashboard = ({
  options,
}: {
  options?: UseQueryOptions<GetDashboardResponse>;
} = {}) =>
  useQuery<GetDashboardResponse>(
    ["useGetDashboard"],
    getDashboard,
    options,
  );

export default useGetDashboard;
