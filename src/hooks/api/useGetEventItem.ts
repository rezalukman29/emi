import { useQuery, UseQueryOptions } from "react-query";

import { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface NullableInt64 {
  Int64: number;
  Valid: boolean;
}

export interface NullableTime {
  Time: string;
  Valid: boolean;
}

export interface EventItemWarehouse {
  id: number;
  nama: string;
  lokasi: string;
  pic: string;
  stock: number;
  barang_id: number;
  gudang_barang_id: number;
  created_at: string;
  updated_at: string;
}

export interface EventItemOwnerships {
  ihc: boolean;
  ihp: boolean;
  outsource: boolean;
}

export interface EventItemPackage {
  id: number;
  event_id: number;
  note: string;
  qr_type: string;
}

export interface EventItem {
  id: number;
  scan_out: number;
  scan_in: number;
  qty: number;
  notes: string;
  list_id: number;
  event_id: number;
  barang_gudang_id: number;
  barang_id: number;
  gudang_id: number;
  nama_barang: string;
  code: string;
  photo: string;
  satuan: string;
  kategori: string | null;
  area_name: string;
  barang_qty: number;
  gudang: EventItemWarehouse[] | null;
  event_list_id: number;
  group_detail: string;
  cb_ambil: number;
  cb_selesai: number;
  date_cb_ambil: string;
  is_ware_house_item: NullableInt64;
  date_cb_selesai: string;
  event_status_id: number;
  AdditionalCode: string;
  is_checking: NullableInt64;
  sub_list_id: NullableInt64;
  sub_list_name: string;
  scan_in_date: NullableTime;
  scan_out_date: NullableTime;
  scan_in_counter: number;
  scan_out_counter: number;
  input_by: string;
  pic?: string;
  ownerships?: EventItemOwnerships;
  package: EventItemPackage | null;
  is_returned?: number;
  is_transfer_to_other_event?: number;
  is_transfer_from_other_event?: number;
  is_new_production_item: boolean;
  is_converted: boolean;
  converted_qty: number;
}

export interface ParamsGetEventItemInterface {
  event_id: number;
  list_id?: number;
  status_event_id?: number;
  search?: string;
  ownership?: string;
  is_new_production_item?: 0 | 1;
  isConverted?: 0 | 1;
  order: string;
}

export const getEventItem = async ({
  params,
}: {
  params: ParamsGetEventItemInterface;
}): Promise<APIResponse<EventItem[]>> => {
  const response = await ax.get(`/v3/fix-list-item-event`, {
    params: {
      event_id: params.event_id,
      ...(params.list_id !== undefined && { list_id: params.list_id }),
      ...(params.status_event_id !== undefined && { status_event_id: params.status_event_id }),
      ...(params.search && { search: params.search }),
      ...(params.ownership && { ownership: params.ownership }),
      ...(params.is_new_production_item !== undefined && { is_new_production_item: params.is_new_production_item }),
      ...(params.isConverted !== undefined && { isConverted: params.isConverted }),
      order: params.order
    }
  });
  return response.data;
};

const useGetEventItem = ({
  options,
  params,
}: {
  options?: UseQueryOptions<APIResponse<EventItem[]>>;
  params: ParamsGetEventItemInterface;
}) => {
  return useQuery<APIResponse<EventItem[]>>(
    ["useGetEventItem", params],
    () => getEventItem({ params }),
    options
  );
};

export default useGetEventItem;
