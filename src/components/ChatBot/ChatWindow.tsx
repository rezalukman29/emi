import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import type { ChatMessage } from '../../service/ChatService'
import ChatMessageBubble from './ChatMessage'
import { IconClose } from '../icons'

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (text: string) => void
  onClose: () => void
}

const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const IconBot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <line x1="12" y1="7" x2="12" y2="11" />
    <line x1="8" y1="15" x2="8" y2="17" />
    <line x1="16" y1="15" x2="16" y2="17" />
  </svg>
)

const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

export default function ChatWindow({ messages, isLoading, onSend, onClose }: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`
  }

  return (
    <div className="chatbot-window">
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-info">
          <div className="chatbot-avatar">
            <IconBot />
          </div>
          <div>
            <div className="chatbot-header-title">EMI Assistant</div>
            <div className="chatbot-header-subtitle">Ask about stock &amp; events</div>
          </div>
        </div>
        <button className="chatbot-close-btn" onClick={onClose} title="Close">
          <IconClose />
        </button>
      </div>

      {/* Messages */}
      <div className="chatbot-messages">
        {messages.length === 0 ? (
          <div className="chatbot-empty">
            <div className="chatbot-empty-icon">
              <IconChat />
            </div>
            <div className="chatbot-empty-title">Hello! I'm EMI Assistant</div>
            <div className="chatbot-empty-text">
              Ask me about item stock, event schedules, or warehouse information. Examples:
              <br /><br />
              <em>"How many round tables are in stock?"</em><br />
              <em>"What events are happening this week?"</em>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <ChatMessageBubble key={i} message={msg} />
          ))
        )}

        {isLoading && (
          <div className="chatbot-typing">
            <span /><span /><span />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chatbot-input-area">
        <textarea
          ref={textareaRef}
          className="chatbot-input"
          placeholder="Type a question... (Press Enter to send)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isLoading}
          rows={1}
        />
        <button
          className="chatbot-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          title="Send"
        >
          <IconSend />
        </button>
      </div>
    </div>
  )
}
