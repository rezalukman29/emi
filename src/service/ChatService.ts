const BACKEND_URL = (import.meta.env.VITE_BACKEND_AI_URL as string) || 'http://localhost:3001'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatResponse {
  reply: string
  session_id: string
}

export const ChatService = {
  sendMessage: async (message: string, sessionId?: string): Promise<ChatResponse> => {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(err?.error ?? `Server error: ${response.status}`)
    }

    return response.json() as Promise<ChatResponse>
  },
}
