interface MessageSelectionBarProps {
  count: number
  forwarding?: boolean
  deleting?: boolean
  canDelete?: boolean
  onForward: () => void
  onDelete: () => void
  onCancel: () => void
}

export function MessageSelectionBar({
  count,
  forwarding = false,
  deleting = false,
  canDelete = true,
  onForward,
  onDelete,
  onCancel,
}: MessageSelectionBarProps) {
  return (
    <div className="message-selection-bar">
      <span className="message-selection-count">
        {count > 0 ? `${count} tin đã chọn` : 'Bấm tin hoặc tick ô để chọn'}
      </span>
      <div className="message-selection-actions">
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          disabled={forwarding || deleting || count <= 0}
          onClick={onForward}
        >
          {forwarding ? 'Đang forward…' : 'Forward'}
        </button>
        {canDelete ? (
          <button
            type="button"
            className="btn btn--sm btn--danger"
            disabled={forwarding || deleting || count <= 0}
            onClick={onDelete}
          >
            {deleting ? 'Đang xóa…' : 'Xóa'}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          disabled={forwarding || deleting}
          onClick={onCancel}
        >
          Hủy
        </button>
      </div>
    </div>
  )
}