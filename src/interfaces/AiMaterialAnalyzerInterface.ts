export interface AiMaterial {
  nama: string
  estimasi_qty: string
  satuan: string
  catatan: string
}

export interface AiMatchedBarang {
  id: number
  nama: string
  photo: string | null
  photo_url: string | null
  stok: number
  detail: string | null
  code: string | null
  kategori: string | null
  matched_material: string
}

export interface AiAnalysisResult {
  deskripsi: string
  material: AiMaterial[]
  matched_barang?: AiMatchedBarang[]
}
