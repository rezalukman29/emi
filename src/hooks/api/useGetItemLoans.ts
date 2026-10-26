import { useMutation, useQuery, type UseQueryOptions } from "react-query";

import type { APIResponse, BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export type LoanItemStatus = "REQUESTED" | "BORROWED" | "OVERDUE" | "RETURNED";

export interface LoanItemParty {
  id: number;
  name: string;
}

export interface LoanItemEvent extends LoanItemParty {
  area: string;
  sub_area: string;
}

export interface LoanItem {
  id: number;
  item_name: string;
  qty: number;
  unit: string;
  vendor_id: number;
  vendor: LoanItemParty | null;
  warehouse_id: number;
  warehouse: LoanItemParty | null;
  event_id: number;
  event: LoanItemEvent | null;
  area_id: number;
  sub_area_id: number;
  borrow_from: string;
  return_by: string;
  purpose: string;
  notes: string;
  rental_cost_per_unit: number;
  rental_cost: number;
  status: LoanItemStatus | string;
  requested_at: string;
  requested_by: string;
  received_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanItemSummary {
  total_records: number;
  borrowed: number;
  overdue: number;
  returned: number;
  waiting_to_arrive: number;
  total_rental_cost: number;
}

export interface LoanItemListData extends BaseResponsePagination<LoanItem[]> {
  summary: LoanItemSummary;
}

export interface EventBorrowedItemsData {
  event_id: number;
  items: LoanItem[];
  total: number;
}

export interface GetLoanItemsParams {
  page: number;
  limit: number;
  search?: string;
  status?: LoanItemStatus;
  vendor_id?: number;
  warehouse_id?: number;
}

export interface LoanItemPayload {
  item_name: string;
  qty: number;
  unit: string;
  vendor_id: number;
  warehouse_id?: number;
  event_id?: number;
  area_id?: number;
  sub_area_id?: number;
  borrow_from: string;
  return_by: string;
  rental_cost_per_unit: number;
  purpose: string;
  notes: string;
}

export type UpdateLoanItemPayload = Partial<LoanItemPayload> & { status?: Exclude<LoanItemStatus, "OVERDUE"> };
export type LoanItemListResponse = APIResponse<LoanItemListData>;
export type EventBorrowedItemsResponse = APIResponse<EventBorrowedItemsData>;

export function loanItemToUpdatePayload(
  item: LoanItem,
  status?: Exclude<LoanItemStatus, "OVERDUE">,
): UpdateLoanItemPayload {
  const vendorId = Number(item.vendor_id || item.vendor?.id || 0);
  const warehouseId = Number(item.warehouse_id || item.warehouse?.id || 0);
  const eventId = Number(item.event_id || item.event?.id || 0);
  return {
    item_name: item.item_name,
    qty: Number(item.qty),
    unit: item.unit,
    vendor_id: vendorId,
    ...(warehouseId > 0 ? { warehouse_id: warehouseId } : {}),
    ...(eventId > 0 ? { event_id: eventId } : {}),
    ...(Number(item.area_id) > 0 ? { area_id: Number(item.area_id) } : {}),
    ...(Number(item.sub_area_id) > 0 ? { sub_area_id: Number(item.sub_area_id) } : {}),
    borrow_from: item.borrow_from,
    return_by: item.return_by,
    rental_cost_per_unit: Number(item.rental_cost_per_unit || 0),
    purpose: item.purpose || "",
    notes: item.notes || "",
    ...(status ? { status } : {}),
  };
}

function ensureSuccess<T extends APIResponse<unknown>>(response: T, fallback: string): T {
  if (response.success === false) throw new Error(response.message || fallback);
  return response;
}

export async function getLoanItems(params: GetLoanItemsParams): Promise<LoanItemListResponse> {
  const response = await ax.get<LoanItemListResponse>("/v1/loan-items", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search ? { search: params.search } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.vendor_id ? { vendor_id: params.vendor_id } : {}),
      ...(params.warehouse_id ? { warehouse_id: params.warehouse_id } : {}),
    },
  });
  return ensureSuccess(response.data, "Failed to load borrowed items.");
}

export async function getLoanItem(id: number) {
  const response = await ax.get<APIResponse<LoanItem>>(`/v1/loan-items/${id}`);
  return ensureSuccess(response.data, "Failed to load borrowed item.");
}

export async function getEventBorrowedItems(eventId: number, status?: LoanItemStatus) {
  const response = await ax.get<EventBorrowedItemsResponse>(`/v1/events/${eventId}/borrowed-items`, {
    params: status ? { status } : undefined,
  });
  return ensureSuccess(response.data, "Failed to load event borrowed items.");
}

export async function createLoanItem(payload: LoanItemPayload) {
  const response = await ax.post<APIResponse<LoanItem>>("/v1/loan-items", payload);
  return ensureSuccess(response.data, "Failed to create rental.");
}

export async function borrowItemToEvent({ eventId, payload }: { eventId: number; payload: LoanItemPayload }) {
  const response = await ax.post<APIResponse<LoanItem>>(`/v1/events/${eventId}/borrow-item`, {
    ...payload,
    event_id: eventId,
  });
  return ensureSuccess(response.data, "Failed to create event borrow request.");
}

export async function updateLoanItem({ id, payload }: { id: number; payload: UpdateLoanItemPayload }) {
  const response = await ax.put<APIResponse<LoanItem>>(`/v1/loan-items/${id}`, payload);
  return ensureSuccess(response.data, "Failed to update rental.");
}

export async function deleteLoanItem(id: number) {
  const response = await ax.delete<APIResponse<unknown>>(`/v1/loan-items/${id}`);
  return ensureSuccess(response.data, "Failed to delete rental.");
}

export function useGetLoanItems({ params, options }: {
  params: GetLoanItemsParams;
  options?: UseQueryOptions<LoanItemListResponse, Error>;
}) {
  return useQuery<LoanItemListResponse, Error>(["useGetLoanItems", params], () => getLoanItems(params), options);
}

export function useGetLoanItem(id: number, enabled = true) {
  return useQuery<APIResponse<LoanItem>, Error>(["useGetLoanItem", id], () => getLoanItem(id), { enabled: enabled && id > 0 });
}

export function useGetEventBorrowedItems(eventId: number, enabled = true) {
  return useQuery<EventBorrowedItemsResponse, Error>(
    ["useGetEventBorrowedItems", eventId],
    () => getEventBorrowedItems(eventId),
    { enabled: enabled && eventId > 0 },
  );
}

export function useCreateLoanItem() {
  return useMutation(createLoanItem);
}

export function useBorrowItemToEvent() {
  return useMutation(borrowItemToEvent);
}

export function useUpdateLoanItem() {
  return useMutation(updateLoanItem);
}

export function useDeleteLoanItem() {
  return useMutation(deleteLoanItem);
}

export default useGetLoanItems;
