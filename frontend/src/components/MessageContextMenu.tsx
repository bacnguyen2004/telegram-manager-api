import { useEffect, useLayoutEffect, useRef } from 'react'
import type { DialogMessageItem } from '../types/api'

export type MessageContextMenuState = {
  x: number
  y: number
  msg: DialogMessageItem
}

interface MessageContextMenuProps {
  menu: MessageContextMenuState
  canPin: boolean
  forwarding: boolean
  pinningId: number | null
  deletingId: number | null
  sending: boolean
  onCopy: (msg: DialogMessageItem) => void
  onReply: (msg: DialogMessageItem) => void
  onEdit?: (msg: DialogMessageItem) => void
  onForward: (msg: DialogMessageItem) => void
  onSelect?: (msg: DialogMessageItem) => void
  onPin: (msg: DialogMessageItem) => void
  onDelete: (msg: DialogMessageItem) => void
  onClose: () => void
}

export function MessageContextMenu({
  menu,
  canPin,
  forwarding,
  pinningId,
  deletingId,
  sending,
  onCopy,
  onReply,
  onEdit,
  onForward,
  onSelect,
  onPin,
  onDelete,
  onClose,
}: MessageContextMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    const margin = 8
    let left = menu.x
    let top = menu.y

    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin)
    }
    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin)
    }

    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
  }, [menu.x, menu.y, menu.msg.id])

  useEffect(() => {
    const close = () => onClose()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const { msg } = menu

  return (
    <div
      ref={panelRef}
      className="message-context-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="message-context-menu-item"
        role="menuitem"
        onClick={() => {
          onCopy(msg)
          onClose()
        }}
      >
        Sao chép
      </button>
      <button
        type="button"
        className="message-context-menu-item"
        role="menuitem"
        onClick={() => {
          onReply(msg)
          onClose()
        }}
      >
        Trả lời
      </button>
      {onEdit && msg.outgoing ? (
        <button
          type="button"
          className="message-context-menu-item"
          role="menuitem"
          onClick={() => {
            onEdit(msg)
            onClose()
          }}
        >
          Sửa
        </button>
      ) : null}
      {onSelect ? (
        <button
          type="button"
          className="message-context-menu-item"
          role="menuitem"
          onClick={() => {
            onSelect(msg)
            onClose()
          }}
        >
          Chọn nhiều tin
        </button>
      ) : null}
      <button
        type="button"
        className="message-context-menu-item"
        role="menuitem"
        disabled={forwarding}
        onClick={() => {
          onForward(msg)
          onClose()
        }}
      >
        Forward
      </button>
      {canPin ? (
        <button
          type="button"
          className="message-context-menu-item"
          role="menuitem"
          disabled={pinningId === msg.id || sending}
          onClick={() => {
            onPin(msg)
            onClose()
          }}
        >
          {pinningId === msg.id ? '…' : msg.pinned ? 'Bỏ ghim' : 'Ghim'}
        </button>
      ) : null}
      {msg.outgoing ? (
        <button
          type="button"
          className="message-context-menu-item message-context-menu-item--danger"
          role="menuitem"
          disabled={deletingId === msg.id || sending}
          onClick={() => {
            onDelete(msg)
            onClose()
          }}
        >
          {deletingId === msg.id ? '…' : 'Xóa'}
        </button>
      ) : null}
    </div>
  )
}