import { useState, useCallback } from 'react'
import { ChatService, type ChatMessage } from '../../service/ChatService'
import ChatWindow from './ChatWindow'
import './chatbot.css'

const SESSION_KEY = 'emi_chatbot_session_id'

const IconChatBubble = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(
    () => localStorage.getItem(SESSION_KEY) ?? undefined,
  )

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await ChatService.sendMessage(text, sessionId)

      // Simpan session_id agar percakapan tetap konsisten
      if (res.session_id && res.session_id !== sessionId) {
        setSessionId(res.session_id)
        localStorage.setItem(SESSION_KEY, res.session_id)
      }

      const botMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan saat menghubungi server. Silakan coba lagi.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  return (
    <>
      {isOpen && (
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
          onClose={() => setIsOpen(false)}
        />
      )}

      <button
        className="chatbot-trigger"
        onClick={() => setIsOpen(v => !v)}
        title={isOpen ? 'Tutup chat' : 'Buka EMI Assistant'}
      >
        {isOpen ? <IconClose /> : <IconChatBubble />}
      </button>
    </>
  )
}
