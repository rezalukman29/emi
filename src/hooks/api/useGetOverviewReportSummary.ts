import { useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface OverviewReportLocationBreakdown {
  event_count: number;
  location: string;
}

export interface OverviewReportSummary {
  area_count: number;
  inventory_sku: number;
  location_breakdown: OverviewReportLocationBreakdown[];
  past_count: number;
  total_events: number;
  upcoming_count: number;
  warehouse_count: number;
}

export type GetOverviewReportSummaryResponse = APIResponse<OverviewReportSummary>;

export const getOverviewReportSummary = async (): Promise<GetOverviewReportSummaryResponse> => {
  const response = await ax.get("/v1/overview-report/summary");
  return response.data;
};

const useGetOverviewReportSummary = ({
  options,
}: {
  options?: UseQueryOptions<GetOverviewReportSummaryResponse>;
} = {}) => useQuery<GetOverviewReportSummaryResponse>(
  ["useGetOverviewReportSummary"],
  getOverviewReportSummary,
  options,
);

export default useGetOverviewReportSummary;
