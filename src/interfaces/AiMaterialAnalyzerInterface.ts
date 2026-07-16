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
  weather_relevant?: boolean
  weather_tip?: string
}

export interface AiWeatherAdvisory {
  level: 'ok' | 'warning' | 'danger'
  summary: string
  backup_plan?: string
  tips: string[]
}

export interface AiAdditionalItemInventory {
  id: number
  nama: string
  stok: number
  photo: string | null
  photo_url: string | null
  kategori: string | null
  code: string | null
}

export interface AiAdditionalItemMatched {
  suggestion_nama: string
  alasan: string
  found: boolean
  barang?: AiAdditionalItemInventory
}

export interface AiAnalysisContext {
  eventId?: number
  eventName?: string
  date?: string
  location?: string
  latitude?: number
  longitude?: number
}

export interface AiWeatherSummary {
  date: string
  source: 'forecast' | 'archive' | 'seasonal-estimate'
  isEstimate: boolean
  tempMaxC?: number
  tempMinC?: number
  precipitationProbability?: number
  precipitationSumMm?: number
  windSpeedMaxKmh?: number
  weatherCode?: number
  weatherDescription?: string
}

export interface AiAnalysisContextUsed extends AiAnalysisContext {
  weather?: AiWeatherSummary
  weatherError?: string
}

export interface AiAnalysisResult {
  deskripsi: string
  material: AiMaterial[]
  matched_barang?: AiMatchedBarang[]
  context_used?: AiAnalysisContextUsed
  weather_advisory?: AiWeatherAdvisory
  additional_items?: AiAdditionalItemMatched[]
}
