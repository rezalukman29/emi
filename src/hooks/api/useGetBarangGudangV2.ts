import { useQuery, type UseQueryOptions } from "react-query";

import type { BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface BarangGudangWarehouseV2 {
  barang_gudang_id: number;
  gudang_id: number;
  gudang_name: string;
  stok_gudang: number;
  status: string;
}

export interface BarangGudangItemV2 {
  barang_id: number;
  nama_barang: string;
  stok_barang: number;
  photo: string;
  kategori_id: number;
  nama_kategori: string;
  kode_kategori: string;
  satuan_id: number;
  nama_satuan: string;
  supplier_name: string;
  code: string;
  warehouses: BarangGudangWarehouseV2[];
}

export interface ParamsGetBarangGudangV2 {
  page: number;
  limit: number;
  search?: string;
  gudang_id?: number;
  categoryId?: number;
}

export async function getBarangGudangV2({
  params,
}: {
  params: ParamsGetBarangGudangV2;
}): Promise<BaseResponsePagination<BarangGudangItemV2[]>> {
  const response = await ax.get("/v2/barang-gudang/detail", { params });
  return response.data.data;
}

export default function useGetBarangGudangV2({
  options,
  params,
}: {
  options?: UseQueryOptions<BaseResponsePagination<BarangGudangItemV2[]>>;
  params: ParamsGetBarangGudangV2;
}) {
  return useQuery<BaseResponsePagination<BarangGudangItemV2[]>>(
    ["useGetBarangGudangV2", params],
    () => getBarangGudangV2({ params }),
    options,
  );
}
