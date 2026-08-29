import { Day } from "react-modern-calendar-datepicker";

export interface InventoryHistoryI {
  created_at: string;
  email: string;
  barang_gudang_id: number;
  gudangs_id: number;
  id: number;
  keterangan: string;
  qty: number;
  user_id: number;
  barang_gudang: WarehouseInventoryI;
}

export interface WarehouseInventoryI {
  asile: string;
  barang_id: number;
  created_t: string;
  gudang_id: number;
  id: number;
  keyname: string;
  kode: string;
  level: string;
  rack: string;
  stok: number;
  stok_minimum: number;
  barang: InventoryHistoryI;
}

export interface InventoryI {
  code: string;
  created_at: string;
  detail: string;
  id: number;
  kategori_id: number;
  nama: string;
  photo: string;
  satuan_id: number;
  stok: number;
  workspace_event_id: number;
}

export interface BarangDetailI {
  id: number;
  nama?: string;
  code?: string;
  detail?: string;
  photo?: string;
  created_at?: string;
  kategori_id?: number;
  satuan_id?: number;
  stok?: number;
  stok_barang?: number;
  updated_at?: string;
  workspace_event_id?: number;
  panjang?: string;
  lebar?: string;
  tinggi?: string;
  berat?: string;
  lantai?: string;
  lorong?: string;
  rack?: string;
  harga_rata_rata?: string;
  cara_pemakaian?: string;
  hal_perlu_diperhatikan?: string;
  kategori_barang?: {
    id?: number;
    name?: string;
    nama?: string;
  };
  satuan?: {
    id?: number;
    name?: string;
    nama?: string;
  };
  stock_summary?: {
    total_stock?: number;
    available?: number;
    reserved?: number;
    on_event?: number;
  };
}

export interface InventoryImage {
  id: number;
  detail: string;
  photo: string;
  barang_id: number;
}

export interface PayloadUploadImageI {
  id: number;
  photo: string;
  description?: string;
}

export interface ImagePreviewI {
  sourceURL: string;
  type: string;
  filename: string;
  photo: string;
}

export interface BarangGudangI {
  id: number;
  barang_gudang_id: number;
  barang_id: number;
  stok_gudang: number;
  kode_gudang: string;
  gudang_id: number;
  nama_barang: string;
  detail_barang: string;
  stok_barang: number;
  photo: string;
  kategori_id: number;
  nama_kategori: string;
  kode_kategori: string;
  satuan_id: number;
  nama_satuan: string;
  kode: string;
  level: string;
  rack: string;
  stok: number;
  stok_minimum: number;
  asile: string;
  events?: BarangGudangEventI[];
  cb_ambil: number;
  cb_selesai: number;
  date_cb_ambil: string;
  date_cb_selesai: string;
}

export interface BarangGudangEventI {
  event_id: number;
  description: string;
  start_date: string;
  end_date: string;
  qty: number;
  status: string;
}

export interface InventoryFilterPropsI {
  category?: string;
  page: number;
  limit: number;
  order?: string;
  search?: string;
  sort?: string;
  sortBy?: string;
}

export interface PayloadAddEventI {
  id?: number;
  description: string;
  name: string;
  event_start: Day | string | null;
  event_end: Day | string | null;
  PIC: string | number;
  event_code: string;
  is_complete: number;
  status: number;
  images?: string;
  files: string;
  address: string;
  type: string;
  latitude: string;
  longitude: string;
  event_running: string;
  notes: string;
  scan_type?:  string
  packaging?: string;
  date_event?: Day | string | null;
}
