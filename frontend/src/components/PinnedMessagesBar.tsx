import type { DialogMessageItem } from '../types/api'
import { mediaTypeLabel } from '../utils/avatar'

interface PinnedMessagesBarProps {
  messages: DialogMessageItem[]
  activeIndex: number
  listOpen?: boolean
  navigating?: boolean
  onOpenList: () => void
  onSelect?: (messageId: number) => void
  onClose?: () => void
}

function previewText(msg: DialogMessageItem): string {
  const text = msg.text?.trim()
  if (text) return text
  if (msg.has_photo || msg.content_type === 'photo') return 'Ảnh'
  if (msg.has_media) return mediaTypeLabel(msg.content_type)
  return 'Tin nhắn'
}

function previewLine(msg: DialogMessageItem): string {
  const body = previewText(msg)
  if (msg.sender_name && !msg.outgoing) {
    return `${msg.sender_name}: ${body}`
  }
  return body
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden>
      <path
        d="M14 4v5l4 2v2.2a1 1 0 0 1-.76.97L15 15v5l-1 1-1-1v-5l-2.24-.83A1 1 0 0 1 10 13.2V11l4-2V4l-2-1-2 1z"
        fill="currentColor"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path
        d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path
        d="M6 14l6-6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
      <path
        d="M6 10l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PinnedMessagesBar({
  messages,
  activeIndex,
  listOpen = false,
  navigating = false,
  onOpenList,
  onSelect,
  onClose,
}: PinnedMessagesBarProps) {
  if (messages.length === 0) return null

  const safeIndex = Math.min(Math.max(activeIndex, 0), messages.length - 1)
  const active = messages[safeIndex]
  const hasMultiple = messages.length > 1
  const canGoOlder = safeIndex < messages.length - 1
  const canGoNewer = safeIndex > 0

  const goToPin = (messageId: number) => {
    if (navigating) return
    onSelect?.(messageId)
  }

  return (
    <div className={`chat-pinned-bar${listOpen ? ' chat-pinned-bar--open' : ''}`}>
      <button
        type="button"
        className="chat-pinned-main"
        onClick={() => goToPin(active.id)}
        disabled={navigating || !onSelect}
        title="Tới tin ghim này"
      >
        <span className="chat-pinned-accent" aria-hidden />
        <span className="chat-pinned-icon">
          <PinIcon />
        </span>
        <span className="chat-pinned-copy">
          <span className="chat-pinned-label">
            {hasMultiple ? `${messages.length} tin ghim` : 'Tin ghim'}
          </span>
          <span className="chat-pinned-text">{previewLine(active)}</span>
        </span>
      </button>

      {hasMultiple && onSelect ? (
        <div className="chat-pinned-nav">
          <button
            type="button"
            className="chat-pinned-nav-btn"
            disabled={navigating || !canGoNewer}
            onClick={() => goToPin(messages[safeIndex - 1].id)}
            title="Tin ghim mới hơn"
            aria-label="Tin ghim mới hơn"
          >
            <ChevronUpIcon />
          </button>
          <span className="chat-pinned-counter" aria-live="polite">
            {safeIndex + 1}/{messages.length}
          </span>
          <button
            type="button"
            className="chat-pinned-nav-btn"
            disabled={navigating || !canGoOlder}
            onClick={() => goToPin(messages[safeIndex + 1].id)}
            title="Tin ghim cũ hơn"
            aria-label="Tin ghim cũ hơn"
          >
            <ChevronDownIcon />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn--sm btn--ghost chat-pinned-list-btn"
        onClick={onOpenList}
        title="Danh sách tin ghim"
      >
        <ListIcon />
        <span>{listOpen ? 'Đóng' : 'Danh sách'}</span>
      </button>

      {onClose ? (
        <button
          type="button"
          className="chat-pinned-close"
          onClick={onClose}
          title="Ẩn thanh ghim"
          aria-label="Ẩn thanh ghim"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}