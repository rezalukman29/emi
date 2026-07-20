import { useQuery, UseQueryOptions } from "react-query";

import { BaseResponsePagination } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface BarangGudangWarehouse {
  gudang_id: number;
  gudang_name: string;
}

export interface BarangGudangItem {
  barang_gudang_id: number;
  gudang_id: number;
  barang_id: number;
  stok_gudang: number;
  kode_gudang: string;
  asile: string;
  rack: string;
  level: string;
  stok_minimum: number;
  lantai: string;
  lorong: string;
  nama_barang: string;
  detail_barang: string;
  stok_barang: number;
  photo: string;
  kategori_id: number;
  nama_kategori: string;
  kode_kategori: string;
  satuan_id: number;
  nama_satuan: string;
  gudang_name: string;
  supplier_name: string;
  reason: string;
  stock_used: number;
  flag_1: string;
  flag_2: string;
  valuation: string;
  status: string;
  gudang: BarangGudangWarehouse;
}

export interface ParamsGetBarangGudangInterface {
  page: number;
  limit: number;
  search?: string;
}

export const getBarangGudang = async ({
  params,
}: {
  params: ParamsGetBarangGudangInterface;
}): Promise<BaseResponsePagination<BarangGudangItem[]>> => {
  const response = await ax.get("/v1/barang-gudang/detail", {
    params,
  });

  return response.data.data;
};

const useGetBarangGudang = ({
  options,
  params,
}: {
  options?: UseQueryOptions<BaseResponsePagination<BarangGudangItem[]>>;
  params: ParamsGetBarangGudangInterface;
}) => {
  return useQuery<BaseResponsePagination<BarangGudangItem[]>>(
    ["useGetBarangGudang", params],
    () => getBarangGudang({ params }),
    options
  );
};

export default useGetBarangGudang;
