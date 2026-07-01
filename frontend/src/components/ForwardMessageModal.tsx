import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { DialogItem, DialogMessageItem } from '../types/api'
import { avatarHue, dialogInitials } from '../utils/avatar'

type TargetFilter = 'all' | 'group' | 'channel'

interface ForwardMessageModalProps {
  open: boolean
  message?: DialogMessageItem | null
  messages?: DialogMessageItem[]
  dialogs: DialogItem[]
  currentDialogId: string | null
  loading: boolean
  onClose: () => void
  onSend: (targets: DialogItem[]) => void
  onEnterSelectMode?: () => void
}

export function ForwardMessageModal({
  open,
  message = null,
  messages = [],
  dialogs,
  currentDialogId,
  loading,
  onClose,
  onSend,
  onEnterSelectMode,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState('')
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all')
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(
    () => new Set(),
  )

  useEffect(() => {
    if (!open) {
      setSearch('')
      setTargetFilter('all')
      setSelectedTargetIds(new Set())
    }
  }, [open])

  const items = messages.length > 0 ? messages : message ? [message] : []

  const targets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dialogs.filter((dialog) => {
      if (dialog.id === currentDialogId) return false
      if (targetFilter === 'group' && dialog.kind !== 'group') return false
      if (targetFilter === 'channel' && dialog.kind !== 'channel') return false
      if (!q) return true
      return (
        dialog.title.toLowerCase().includes(q) ||
        dialog.username.toLowerCase().includes(q)
      )
    })
  }, [dialogs, currentDialogId, search, targetFilter])

  const selectedTargets = useMemo(
    () => dialogs.filter((dialog) => selectedTargetIds.has(dialog.id)),
    [dialogs, selectedTargetIds],
  )

  if (!open || items.length === 0) return null

  const preview =
    items.length === 1
      ? (items[0].text || '[media]').slice(0, 120)
      : `${items.length} tin đã chọn`

  const toggleTarget = (dialogId: string) => {
    setSelectedTargetIds((prev) => {
      const next = new Set(prev)
      if (next.has(dialogId)) next.delete(dialogId)
      else next.add(dialogId)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedTargetIds((prev) => {
      const next = new Set(prev)
      for (const dialog of targets) next.add(dialog.id)
      return next
    })
  }

  const clearTargets = () => setSelectedTargetIds(new Set())

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal forward-modal"
        role="dialog"
        aria-labelledby="forward-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head forward-modal-head">
          <div>
            <h3 id="forward-modal-title">Forward tin nhắn</h3>
            <p className="panel-meta">
              {items.length === 1 ? `#${items[0].id} — ${preview}` : preview}
            </p>
            {items.length === 1 && onEnterSelectMode ? (
              <button
                type="button"
                className="forward-modal-select-more"
                onClick={onEnterSelectMode}
              >
                Chọn nhiều tin trong chat…
              </button>
            ) : null}
          </div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
            Hủy
          </button>
        </header>

        <div className="forward-modal-toolbar">
          <input
            type="search"
            className="forward-modal-search"
            placeholder="Tìm chat đích…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="forward-modal-filters">
            {(
              [
                ['all', 'Tất cả'],
                ['group', 'Group'],
                ['channel', 'Channel'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`forward-modal-filter${targetFilter === id ? ' forward-modal-filter--active' : ''}`}
                onClick={() => setTargetFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="forward-modal-bulk-actions">
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={targets.length === 0}
              onClick={selectAllVisible}
            >
              Chọn hiển thị
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={selectedTargetIds.size === 0}
              onClick={clearTargets}
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        <ul className="forward-modal-list">
          {targets.length === 0 ? (
            <li className="muted forward-modal-empty">Không có chat khớp.</li>
          ) : (
            targets.map((dialog) => {
              const checked = selectedTargetIds.has(dialog.id)
              return (
                <li key={dialog.id}>
                  <label
                    className={`forward-modal-item${checked ? ' forward-modal-item--selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={loading}
                      onChange={() => toggleTarget(dialog.id)}
                    />
                    <div
                      className="dialog-avatar"
                      style={
                        { '--avatar-hue': avatarHue(dialog.title) } as CSSProperties
                      }
                      aria-hidden
                    >
                      {dialogInitials(dialog.title)}
                    </div>
                    <span className="forward-modal-item-body">
                      <span className="forward-modal-item-title">{dialog.title}</span>
                      <span className="forward-modal-item-meta muted">
                        {dialog.kind === 'channel'
                          ? 'Channel'
                          : dialog.kind === 'group'
                            ? 'Group'
                            : dialog.kind}
                        {dialog.username ? ` · @${dialog.username}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })
          )}
        </ul>

        <footer className="forward-modal-foot">
          <p className="forward-modal-summary muted">
            {items.length} tin → {selectedTargets.length} chat
          </p>
          <button
            type="button"
            className="btn btn--primary"
            disabled={loading || selectedTargets.length === 0}
            onClick={() => onSend(selectedTargets)}
          >
            {loading ? 'Đang gửi…' : 'Gửi'}
          </button>
        </footer>
      </div>
    </div>
  )
}