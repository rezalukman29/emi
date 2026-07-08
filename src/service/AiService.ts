import type { AiAnalysisContext, AiAnalysisResult } from '../interfaces/AiMaterialAnalyzerInterface'

const BACKEND_URL = import.meta.env.VITE_BACKEND_AI_URL as string || 'http://localhost:3001'

export interface TuneUpProductPayload {
  nama: string
  photo_url: string | null
  detail?: string
  kategori?: string
  language?: 'id' | 'en'
}

export interface TuneUpProductResult {
  detail: string
  harga_rata_rata: string
  cara_pemakaian: string
  hal_perlu_diperhatikan: string
}

export const AiService = {
  analyze: async (
    imageBase64: string,
    mimeType: string,
    context?: AiAnalysisContext,
  ): Promise<AiAnalysisResult> => {
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType, ...(context && { context }) }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(err?.error ?? `Server error: ${response.status}`)
    }

    return response.json() as Promise<AiAnalysisResult>
  },

  tuneUpProduct: async (payload: TuneUpProductPayload): Promise<TuneUpProductResult> => {
    const response = await fetch(`${BACKEND_URL}/api/product-tuneup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(err?.error ?? `Server error: ${response.status}`)
    }

    return response.json() as Promise<TuneUpProductResult>
  },
}
