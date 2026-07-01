import { useMemo, useState } from 'react'
import type { DialogMessageItem } from '../types/api'
import { mediaTypeLabel } from '../utils/avatar'

interface PinnedMessagesPanelProps {
  messages: DialogMessageItem[]
  loading?: boolean
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onSelect: (messageId: number) => void
  onClose: () => void
}

function previewText(msg: DialogMessageItem): string {
  const text = msg.text?.trim()
  if (text) return text
  if (msg.has_photo || msg.content_type === 'photo') return 'Ảnh'
  if (msg.has_media) return mediaTypeLabel(msg.content_type)
  return 'Tin nhắn'
}

export function PinnedMessagesPanel({
  messages,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onSelect,
  onClose,
}: PinnedMessagesPanelProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((msg) => {
      const haystack = [
        msg.text,
        msg.sender_name,
        msg.content_type,
        String(msg.id),
        previewText(msg),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [messages, search])

  if (messages.length === 0) return null

  return (
    <div className="chat-pinned-panel">
      <div className="chat-pinned-panel-head">
        <div>
          <h3 className="chat-pinned-panel-title">Tin đã ghim</h3>
          <p className="chat-pinned-panel-meta muted">
            {messages.length} tin đã tải
            {hasMore ? ' · còn tin ghim khác' : ''}
            {' — bấm để tới tin trong chat'}
          </p>
        </div>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
          Đóng
        </button>
      </div>

      {messages.length > 3 ? (
        <input
          type="search"
          className="chat-pinned-panel-search"
          placeholder="Tìm trong tin ghim…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      ) : null}

      <ul className="chat-pinned-panel-list">
        {filtered.length === 0 ? (
          <li className="muted chat-pinned-panel-empty">Không có tin ghim khớp.</li>
        ) : (
          filtered.map((msg, index) => {
            const body = previewText(msg)
            const sender = msg.outgoing ? 'Bạn' : msg.sender_name || '—'
            return (
              <li key={msg.id}>
                <button
                  type="button"
                  className="chat-pinned-panel-item"
                  disabled={loading || loadingMore}
                  onClick={() => onSelect(msg.id)}
                >
                  <span className="chat-pinned-panel-item-index" aria-hidden>
                    {index + 1}
                  </span>
                  <span className="chat-pinned-panel-item-body">
                    <span className="chat-pinned-panel-item-top">
                      <span className="chat-pinned-panel-item-sender">{sender}</span>
                      <span className="chat-pinned-panel-item-date muted">{msg.date}</span>
                    </span>
                    <span className="chat-pinned-panel-item-text">{body}</span>
                  </span>
                  <span className="chat-pinned-panel-item-go" aria-hidden>
                    →
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>

      {hasMore && onLoadMore ? (
        <button
          type="button"
          className="btn btn--sm btn--ghost chat-pinned-panel-more"
          disabled={loadingMore || loading}
          onClick={onLoadMore}
        >
          {loadingMore ? 'Đang tải…' : 'Tải thêm tin ghim'}
        </button>
      ) : null}
    </div>
  )
}