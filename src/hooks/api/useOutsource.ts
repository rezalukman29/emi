import { useMutation, useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

type SimpleQueryOptions<T> = Pick<UseQueryOptions<T, Error>, "enabled" | "keepPreviousData" | "staleTime">;

export type OutsourceVendorType = "Internal" | "External";
export type OutsourceStatus = "REQUESTED" | "RECEIVED" | "COMPLETED";

export interface OutsourceVendor {
  id: number;
  name: string;
  type: OutsourceVendorType;
  description: string;
  phone: string;
  address: string;
  orders: number;
  active_orders: number;
  created_at?: string;
  updated_at?: string;
}

export interface OutsourceVendorPayload {
  name: string;
  type: OutsourceVendorType;
  description: string;
  phone: string;
  address: string;
}

export interface OutsourceVendorListData {
  items: OutsourceVendor[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  stats: { total: number; orders: number; active_orders: number };
}

export interface OutsourceItem {
  id: number;
  event_id: number;
  barang_id: number;
  item_name: string;
  qty: number;
  unit: string;
  satuan_id: number;
  area_id: number;
  area_name: string;
  sub_area_id?: number | null;
  sub_area_name?: string | null;
  outsource_vendor_id: number;
  vendor?: { id: number; name: string } | null;
  event?: { id: number; name: string; area?: string; sub_area?: string } | null;
  from_date: string;
  to_date: string;
  cost: number;
  total_cost: number;
  note: string;
  status: OutsourceStatus;
  requested_at?: string;
  requested_by?: string;
  received_at?: string | null;
  completed_at?: string | null;
}

export interface OutsourceItemPayload {
  event_id?: number;
  barang_id: number;
  qty: number;
  satuan_id: number;
  area_id: number;
  sub_area_id?: number;
  outsource_vendor_id: number;
  from_date: string;
  to_date: string;
  cost: number;
  note: string;
  status?: OutsourceStatus;
}

export interface OutsourceItemListData {
  data: OutsourceItem[];
  page: number;
  record_per_page: number;
  total_records: number;
  total_pages: number;
  summary: {
    outsource_records: number;
    waiting_to_arrive: number;
    received_now: number;
    overdue: number;
    completed: number;
    total_cost: number;
  };
}

export async function getOutsourceVendors(params: { search?: string; type?: OutsourceVendorType; page?: number; limit?: number } = {}) {
  const response = await ax.get<APIResponse<OutsourceVendorListData>>("/v1/outsource-vendors", { params: { page: params.page ?? 1, limit: params.limit ?? 10, ...(params.search ? { search: params.search } : {}), ...(params.type ? { type: params.type } : {}) } });
  if (response.data.success === false) throw new Error(response.data.message || "Failed to load outsource vendors.");
  return response.data;
}

export async function getOutsourceVendor(id: number) {
  const response = await ax.get<APIResponse<OutsourceVendor>>(`/v1/outsource-vendors/${id}`);
  if (response.data.success === false) throw new Error(response.data.message || "Failed to load outsource vendor.");
  return response.data;
}

export async function createOutsourceVendor(payload: OutsourceVendorPayload) {
  const response = await ax.post<APIResponse<OutsourceVendor>>("/v1/outsource-vendors", payload);
  if (response.data.success === false) throw new Error(response.data.message || "Failed to create outsource vendor.");
  return response.data;
}

export async function updateOutsourceVendor({ id, payload }: { id: number; payload: OutsourceVendorPayload }) {
  const response = await ax.put<APIResponse<OutsourceVendor>>(`/v1/outsource-vendors/${id}`, payload);
  if (response.data.success === false) throw new Error(response.data.message || "Failed to update outsource vendor.");
  return response.data;
}

export async function deleteOutsourceVendor(id: number) {
  const response = await ax.delete<APIResponse<unknown>>(`/v1/outsource-vendors/${id}`);
  if (response.data.success === false) throw new Error(response.data.message || "Failed to delete outsource vendor.");
  return response.data;
}

export async function getOutsourceItems(params: { search?: string; status?: OutsourceStatus; event_id?: number; outsource_vendor_id?: number; page?: number; limit?: number } = {}) {
  const response = await ax.get<APIResponse<OutsourceItemListData>>("/v1/outsource-items", { params: { page: params.page ?? 1, limit: params.limit ?? 10, ...params } });
  if (response.data.success === false) throw new Error(response.data.message || "Failed to load outsource items.");
  return response.data;
}

export async function getEventOutsourceItems(eventId: number, status?: OutsourceStatus) {
  const response = await ax.get<APIResponse<{ event_id: number; items: OutsourceItem[]; total: number; total_cost: number }>>(`/v1/events/${eventId}/outsource-items`, { params: status ? { status } : undefined });
  if (response.data.success === false) throw new Error(response.data.message || "Failed to load event outsource items.");
  return response.data;
}

export async function createEventOutsourceItem({ eventId, payload }: { eventId: number; payload: OutsourceItemPayload }) {
  const response = await ax.post<APIResponse<OutsourceItem>>(`/v1/events/${eventId}/outsource-item`, { ...payload, event_id: eventId });
  if (response.data.success === false) throw new Error(response.data.message || "Failed to create outsource item.");
  return response.data;
}

export async function updateOutsourceItem({ id, payload }: { id: number; payload: OutsourceItemPayload }) {
  const response = await ax.put<APIResponse<OutsourceItem>>(`/v1/outsource-items/${id}`, payload);
  if (response.data.success === false) throw new Error(response.data.message || "Failed to update outsource item.");
  return response.data;
}

export async function deleteOutsourceItem(id: number) {
  const response = await ax.delete<APIResponse<unknown>>(`/v1/outsource-items/${id}`);
  if (response.data.success === false) throw new Error(response.data.message || "Failed to delete outsource item.");
  return response.data;
}

export function outsourceItemPayload(item: OutsourceItem, status?: OutsourceStatus): OutsourceItemPayload {
  return {
    barang_id: item.barang_id,
    qty: item.qty,
    satuan_id: item.satuan_id,
    area_id: item.area_id,
    ...(item.sub_area_id ? { sub_area_id: item.sub_area_id } : {}),
    outsource_vendor_id: item.outsource_vendor_id || item.vendor?.id || 0,
    from_date: item.from_date,
    to_date: item.to_date,
    cost: item.cost,
    note: item.note || "",
    ...(status ? { status } : {}),
  };
}

export function useGetOutsourceVendors(params: Parameters<typeof getOutsourceVendors>[0] = {}, options?: SimpleQueryOptions<Awaited<ReturnType<typeof getOutsourceVendors>>>) {
  return useQuery(["useGetOutsourceVendors", params], () => getOutsourceVendors(params), options);
}
export function useGetOutsourceVendor(id: number) { return useQuery(["useGetOutsourceVendor", id], () => getOutsourceVendor(id), { enabled: id > 0 }); }
export function useCreateOutsourceVendor() { return useMutation(createOutsourceVendor); }
export function useUpdateOutsourceVendor() { return useMutation(updateOutsourceVendor); }
export function useDeleteOutsourceVendor() { return useMutation(deleteOutsourceVendor); }
export function useGetOutsourceItems(params: Parameters<typeof getOutsourceItems>[0] = {}, options?: SimpleQueryOptions<Awaited<ReturnType<typeof getOutsourceItems>>>) { return useQuery(["useGetOutsourceItems", params], () => getOutsourceItems(params), options); }
export function useGetEventOutsourceItems(eventId: number, options?: SimpleQueryOptions<Awaited<ReturnType<typeof getEventOutsourceItems>>>) { return useQuery(["useGetEventOutsourceItems", eventId], () => getEventOutsourceItems(eventId), { enabled: eventId > 0, ...options }); }
export function useCreateEventOutsourceItem() { return useMutation(createEventOutsourceItem); }
export function useUpdateOutsourceItem() { return useMutation(updateOutsourceItem); }
export function useDeleteOutsourceItem() { return useMutation(deleteOutsourceItem); }
