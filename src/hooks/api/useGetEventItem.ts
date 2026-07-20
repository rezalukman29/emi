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
  kategori: string;
  area_name: string;
  barang_qty: number;
  gudang: EventItemWarehouse[];
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
}

export interface ParamsGetEventItemInterface {
  event_id: number;
  list_id?: number;
  status_event_id?: number;
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
      ...(params.list_id && {list_id: params.list_id}),
      ...(params.status_event_id && {status_event_id: params.status_event_id}),
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
