import { useState } from 'react'

interface JumpToMessageModalProps {
  open: boolean
  loading?: boolean
  onClose: () => void
  onJumpToId: (messageId: number) => void
  onJumpToDate: (date: string) => void
}

export function JumpToMessageModal({
  open,
  loading = false,
  onClose,
  onJumpToId,
  onJumpToDate,
}: JumpToMessageModalProps) {
  const [messageId, setMessageId] = useState('')
  const [date, setDate] = useState('')

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal jump-modal"
        role="dialog"
        aria-labelledby="jump-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <div>
            <h3 id="jump-modal-title">Nhảy tới tin</h3>
            <p className="panel-meta">Theo ID hoặc ngày (DD/MM/YYYY)</p>
          </div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </header>

        <label className="jump-modal-field">
          <span className="jump-modal-label">Tin #ID</span>
          <div className="jump-modal-row">
            <input
              type="number"
              min={1}
              className="jump-modal-input"
              placeholder="vd. 12345"
              value={messageId}
              onChange={(e) => setMessageId(e.target.value)}
            />
            <button
              type="button"
              className="btn btn--sm btn--primary"
              disabled={loading || !messageId.trim()}
              onClick={() => onJumpToId(Number(messageId))}
            >
              Tới tin
            </button>
          </div>
        </label>

        <label className="jump-modal-field">
          <span className="jump-modal-label">Ngày</span>
          <div className="jump-modal-row">
            <input
              type="text"
              className="jump-modal-input"
              placeholder="DD/MM/YYYY"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              type="button"
              className="btn btn--sm btn--primary"
              disabled={loading || !date.trim()}
              onClick={() => onJumpToDate(date.trim())}
            >
              Tới ngày
            </button>
          </div>
        </label>
      </div>
    </div>
  )
}