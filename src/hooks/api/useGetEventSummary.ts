import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventTotalSummary {
  total_items: number;
  total_qty: number;
  checked: number;
  checked_percentage: number;
  scan_in: number;
  scan_in_percentage: number;
  scan_in_by: string[];
  scan_out: number;
  scan_out_percentage: number;
  scan_out_by: string[];
  missing: number;
  damaged: number;
}

export interface EventAreaSummary {
  area_name: string;
  total_items: number;
  checked: number;
  checked_percentage: number;
  scan_in: number;
  scan_in_percentage: number;
  scan_out: number;
  status_counts: Record<string, number>;
}

export interface EventSummaryItemDetail {
  fix_list_item_id: number;
  barang_id: number;
  item_name: string;
  area_name: string;
  qty: number;
  status: string;
  is_checking: boolean;
  is_scan_in: boolean;
  scan_in_by: string[];
  is_scan_out: boolean;
  scan_out_by: string[];
  input_by: string;
}

export interface EventSummaryData {
  total_summary: EventTotalSummary;
  area_summary: EventAreaSummary[];
  item_details: EventSummaryItemDetail[];
}

export const getEventSummary = async (
  id: number
): Promise<APIResponse<EventSummaryData>> => {
  const response = await ax.get(`/v1/event-summary/${id}`);
  return response.data;
};

const useGetEventSummary = ({
  id,
  options,
}: {
  id: number;
  options?: UseQueryOptions<APIResponse<EventSummaryData>>;
}) => {
  return useQuery<APIResponse<EventSummaryData>>(
    ["useGetEventSummary", id],
    () => getEventSummary(id),
    options
  );
};

export default useGetEventSummary;
