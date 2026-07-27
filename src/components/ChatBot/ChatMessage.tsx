import type { ReactNode } from 'react'
import type { ChatMessage as ChatMsg } from '../../service/ChatService'

interface Props {
  message: ChatMsg
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Render inline formatting: **bold**, *italic*, `code`
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))

    if (match[2] !== undefined) {
      parts.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      parts.push(<em key={match.index}>{match[3]}</em>)
    } else if (match[4] !== undefined) {
      parts.push(<code key={match.index} style={{ background: 'rgba(0,0,0,0.07)', borderRadius: 3, padding: '1px 4px', fontSize: '0.9em' }}>{match[4]}</code>)
    }

    last = match.index + match[0].length
  }

  if (last < text.length) parts.push(text.slice(last))
  return parts
}

type Block =
  | { type: 'paragraph'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let current: Block | null = null

  const flush = () => {
    if (current) { blocks.push(current); current = null }
  }

  for (const raw of lines) {
    const line = raw

    // Unordered list: lines starting with "- " or "* "
    const ulMatch = line.match(/^[\-\*]\s+(.+)/)
    if (ulMatch) {
      if (current?.type !== 'ul') { flush(); current = { type: 'ul', items: [] } }
      ;(current as Extract<Block, { type: 'ul' }>).items.push(ulMatch[1])
      continue
    }

    // Ordered list: lines starting with "1. " "2. " etc.
    const olMatch = line.match(/^\d+\.\s+(.+)/)
    if (olMatch) {
      if (current?.type !== 'ol') { flush(); current = { type: 'ol', items: [] } }
      ;(current as Extract<Block, { type: 'ol' }>).items.push(olMatch[1])
      continue
    }

    // Empty line: flush current block
    if (line.trim() === '') {
      flush()
      continue
    }

    // Regular paragraph line
    if (current?.type !== 'paragraph') { flush(); current = { type: 'paragraph', lines: [] } }
    ;(current as Extract<Block, { type: 'paragraph' }>).lines.push(line)
  }

  flush()
  return blocks
}

function MarkdownContent({ text }: { text: string }) {
  const blocks = parseBlocks(text)

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} style={{ paddingLeft: 18, margin: '6px 0', listStyleType: 'disc' }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: 3 }}>{renderInline(item)}</li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ol') {
          return (
            <ol key={i} style={{ paddingLeft: 18, margin: '6px 0' }}>
              {block.items.map((item, j) => (
                <li key={j} style={{ marginBottom: 3 }}>{renderInline(item)}</li>
              ))}
            </ol>
          )
        }

        // paragraph
        return (
          <p key={i} style={{ margin: i === 0 ? '0' : '6px 0 0' }}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        )
      })}
    </>
  )
}

export default function ChatMessage({ message }: Props) {
  const isBot = message.role === 'assistant'

  return (
    <div className={`chatbot-msg ${message.role}`}>
      <div className="chatbot-bubble">
        {isBot ? <MarkdownContent text={message.content} /> : message.content}
      </div>
      <span className="chatbot-msg-time">{formatTime(message.timestamp)}</span>
    </div>
  )
}
