import { useMutation } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface BrokenItemReportRecord {
  id?: number;
  report_id?: number;
  barang_event_id?: number;
  fix_list_item_id?: number;
  qty?: number;
  notes?: string;
  reported_by?: string;
  created_by?: string;
  input_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBrokenItemReportPayload {
  barang_event_id: number;
  fix_list_item_id: number;
  qty: number;
  notes: string;
}

export interface UpdateBrokenItemReportPayload {
  qty: number;
  notes: string;
}

export type BrokenItemReportResponse = APIResponse<BrokenItemReportRecord | null>;

export async function createBrokenItemReport(
  payload: CreateBrokenItemReportPayload,
): Promise<BrokenItemReportResponse> {
  const response = await ax.post("/v3/fix-list-item/report", payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to create broken item report.");
  }
  return response.data;
}

export async function updateBrokenItemReport({
  id,
  payload,
}: {
  id: number;
  payload: UpdateBrokenItemReportPayload;
}): Promise<BrokenItemReportResponse> {
  const response = await ax.put(`/v3/fix-list-item/report/${id}`, payload);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to update broken item report.");
  }
  return response.data;
}

export async function deleteBrokenItemReport(
  id: number,
): Promise<APIResponse<unknown>> {
  const response = await ax.delete(`/v3/fix-list-item/report/${id}`);
  if (response.data?.success === false) {
    throw new Error(response.data.message || "Failed to delete broken item report.");
  }
  return response.data;
}

export function useCreateBrokenItemReport() {
  return useMutation(createBrokenItemReport);
}

export function useUpdateBrokenItemReport() {
  return useMutation(updateBrokenItemReport);
}

export function useDeleteBrokenItemReport() {
  return useMutation(deleteBrokenItemReport);
}
