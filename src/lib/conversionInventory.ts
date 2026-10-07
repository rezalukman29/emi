import { InventoryService } from '../service/InventoryService';
import type { ConversionStock } from './conversionPreview';

export async function loadConversionStock(): Promise<ConversionStock[]> {
  const rows: ConversionStock[] = [];
  let page = 1;
  let pages = 1;
  do {
    const response = await InventoryService.getBarangGudang('All', page, '', 100, 'ASC', 'id');
    if (!Array.isArray(response.data)) throw new Error('Invalid warehouse inventory response');
    rows.push(...response.data.map(row => ({ id: Number(row.barang_gudang_id ?? row.id), itemId: Number(row.barang_id),
      name: row.nama_barang, warehouse: row.kode_gudang || String(row.gudang_id), stock: Number(row.stok_gudang) || 0 })));
    pages = Number(response.total_pages) || 1;
    page++;
  } while (page <= pages);
  return rows;
}

export interface ConversionItem { id: number; name: string; sku: string; photo: string; unit: string }
export async function loadConversionCatalog(search = ''): Promise<ConversionItem[]> {
  const response = await InventoryService.getInventory({
    page: 1,
    limit: 100,
    sort: 'ASC',
    sortBy: 'name',
    ...(search.trim() && { search: search.trim() }),
  });
  const result = response.data;
  if (!Array.isArray(result.data)) throw new Error('Invalid inventory response');
  return result.data.map((row: { id: number; nama: string; code?: string; photo?: string; satuan?: string }) =>
    ({ id: Number(row.id), name: row.nama, sku: row.code ?? '', photo: row.photo ?? '', unit: row.satuan ?? '' }));
}
