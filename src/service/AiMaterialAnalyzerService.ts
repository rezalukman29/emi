import type { AiAnalysisResult } from '../interfaces/AiMaterialAnalyzerInterface'

const BACKEND_URL = import.meta.env.VITE_BACKEND_AI_URL as string || 'http://localhost:3001'

export const AiMaterialAnalyzerService = {
  analyze: async (imageBase64: string, mimeType: string): Promise<AiAnalysisResult> => {
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(err?.error ?? `Server error: ${response.status}`)
    }

    return response.json() as Promise<AiAnalysisResult>
  },
}
