import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { PhoneSelect } from '../components/PhoneSelect'
import type { DialogCounts, DialogItem, DialogMessageItem } from '../types/api'

type KindFilter = 'all' | 'private' | 'bot' | 'group' | 'channel'

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    private: 'Private',
    bot: 'Bot',
    group: 'Group',
    channel: 'Channel',
    chat: 'Chat',
  }
  return map[kind] ?? kind
}

function kindBadgeClass(kind: string): string {
  const map: Record<string, string> = {
    private: 'badge--info',
    bot: 'badge--warn',
    group: 'badge--active',
    channel: 'badge--success',
  }
  return `badge ${map[kind] ?? 'badge--default'}`
}

export function DialogsPage() {
  const [phone, setPhone] = useState('')
  const [dialogs, setDialogs] = useState<DialogItem[]>([])
  const [counts, setCounts] = useState<DialogCounts | null>(null)
  const [selected, setSelected] = useState<DialogItem | null>(null)
  const [messages, setMessages] = useState<DialogMessageItem[]>([])
  const [messagesTitle, setMessagesTitle] = useState('')
  const [filter, setFilter] = useState<KindFilter>('all')
  const [search, setSearch] = useState('')
  const [draftText, setDraftText] = useState('')
  const [replyTo, setReplyTo] = useState<DialogMessageItem | null>(null)
  const [loadingDialogs, setLoadingDialogs] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const filteredDialogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return dialogs.filter((dialog) => {
      if (filter !== 'all' && dialog.kind !== filter) return false
      if (!q) return true
      return (
        dialog.title.toLowerCase().includes(q) ||
        dialog.username.toLowerCase().includes(q) ||
        dialog.last_message.toLowerCase().includes(q)
      )
    })
  }, [dialogs, filter, search])

  function resetAlerts() {
    setError('')
    setSuccess('')
  }

  function clearSelectedImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setSelectedImage(null)
    setImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chọn file ảnh (JPEG, PNG, WebP, GIF).')
      clearSelectedImage()
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh tối đa 10MB.')
      clearSelectedImage()
      return
    }
    resetAlerts()
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleLoadDialogs(e: React.FormEvent) {
    e.preventDefault()
    setLoadingDialogs(true)
    resetAlerts()
    setDialogs([])
    setCounts(null)
    setSelected(null)
    setMessages([])
    setMessagesTitle('')
    setReplyTo(null)
    try {
      const res = await api.listDialogs(phone)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được danh sách chat')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      setDialogs(res.data.dialogs)
      setCounts(res.data.counts)
      setSuccess(`Tải ${res.data.total} chat`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
    } finally {
      setLoadingDialogs(false)
    }
  }

  async function loadMessages(dialog: DialogItem, showLoading = true) {
    if (!phone) return false
    if (showLoading) {
      setLoadingMessages(true)
      setMessages([])
    }
    try {
      const res = await api.getDialogMessages(phone, dialog.id)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được tin nhắn')
        return false
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return false
      }
      setMessages(res.data.messages)
      setMessagesTitle(res.data.title || dialog.title)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
      return false
    } finally {
      if (showLoading) setLoadingMessages(false)
    }
  }

  async function handleSelectDialog(dialog: DialogItem) {
    setSelected(dialog)
    setDraftText('')
    setReplyTo(null)
    clearSelectedImage()
    resetAlerts()
    setMessagesTitle(dialog.title)
    await loadMessages(dialog)
  }

  async function handleDeleteMessage(msg: DialogMessageItem) {
    if (!phone || !selected) return
    const confirmed = window.confirm(`Xóa tin nhắn #${msg.id}?`)
    if (!confirmed) return

    setDeletingId(msg.id)
    resetAlerts()
    try {
      const res = await api.deleteMessage(phone, selected.id, msg.id)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Xóa tin thất bại')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      if (replyTo?.id === msg.id) setReplyTo(null)
      setSuccess(res.data.message)
      await loadMessages(selected, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!phone || !selected) return
    const text = draftText.trim()
    if (!text && !selectedImage) return

    setSending(true)
    resetAlerts()
    try {
      const res = selectedImage
        ? await api.sendMedia(
            phone,
            selected.id,
            selectedImage,
            text || undefined,
            replyTo?.id,
          )
        : replyTo
          ? await api.replyMessage(phone, selected.id, replyTo.id, text)
          : await api.sendMessage(phone, selected.id, text)
      if (!res.success || !res.data) {
        setError(
          res.error ??
            (selectedImage
              ? 'Gửi ảnh thất bại'
              : replyTo
                ? 'Trả lời thất bại'
                : 'Gửi tin thất bại'),
        )
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      setDraftText('')
      setReplyTo(null)
      clearSelectedImage()
      setSuccess(res.data.message)
      await loadMessages(selected, false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dialogs</h1>
          <p className="page-desc">
            Tất cả chat — private, bot, group, channel
          </p>
        </div>
      </header>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <section className="panel">
        <h2>
          <code>GET /api/dialogs/{'{phone}'}</code>
        </h2>
        <form className="inline-form" onSubmit={(e) => void handleLoadDialogs(e)}>
          <PhoneSelect value={phone} onChange={setPhone} allowManual={false} />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loadingDialogs || !phone}
          >
            {loadingDialogs ? 'Đang tải…' : 'Tải dialogs'}
          </button>
        </form>
      </section>

      {counts && (
        <section className="stats-grid dialogs-stats">
          <article className="stat-card">
            <p className="stat-label">Private</p>
            <p className="stat-value">{counts.private}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Bot</p>
            <p className="stat-value">{counts.bot}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Group</p>
            <p className="stat-value">{counts.group}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Channel</p>
            <p className="stat-value">{counts.channel}</p>
          </article>
        </section>
      )}

      {dialogs.length > 0 && (
        <section className="dialogs-layout">
          <div className="dialogs-list-panel panel">
            <div className="dialogs-list-head">
              <h2>Danh sách chat</h2>
              <span className="panel-meta">
                {filteredDialogs.length}/{dialogs.length}
              </span>
            </div>

            <div className="dialogs-toolbar">
              <input
                type="search"
                className="dialogs-search"
                placeholder="Tìm theo tên, username…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="dialogs-filters">
                {(
                  [
                    { id: 'all' as KindFilter, label: 'Tất cả' },
                    { id: 'private' as KindFilter, label: 'Private' },
                    { id: 'bot' as KindFilter, label: 'Bot' },
                    { id: 'group' as KindFilter, label: 'Group' },
                    { id: 'channel' as KindFilter, label: 'Channel' },
                  ]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`dialogs-filter-btn${filter === item.id ? ' dialogs-filter-btn--active' : ''}`}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="dialogs-list">
              {filteredDialogs.map((dialog) => (
                <li key={dialog.id}>
                  <button
                    type="button"
                    className={`dialog-item${selected?.id === dialog.id ? ' dialog-item--active' : ''}`}
                    onClick={() => void handleSelectDialog(dialog)}
                  >
                    <div className="dialog-item-top">
                      <span className="dialog-item-title">{dialog.title}</span>
                      {dialog.unread_count > 0 && (
                        <span className="dialog-unread">{dialog.unread_count}</span>
                      )}
                    </div>
                    <div className="dialog-item-meta">
                      <span className={kindBadgeClass(dialog.kind)}>
                        {kindLabel(dialog.kind)}
                      </span>
                      {dialog.username && (
                        <span className="muted">@{dialog.username}</span>
                      )}
                      {dialog.pinned && <span className="dialog-pin">📌</span>}
                      {dialog.muted && <span className="dialog-muted">🔇</span>}
                    </div>
                    {dialog.last_message && (
                      <p className="dialog-preview">{dialog.last_message}</p>
                    )}
                    {dialog.date && (
                      <p className="dialog-date muted">{dialog.date}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {filteredDialogs.length === 0 && (
              <p className="muted dialogs-empty">Không có chat khớp bộ lọc.</p>
            )}
          </div>

          <div className="dialogs-messages-panel panel">
            <div className="dialogs-list-head">
              <h2>
                {selected ? (
                  <>
                    <code>GET /api/dialogs/{'{phone}'}/messages</code>
                  </>
                ) : (
                  'Tin nhắn'
                )}
              </h2>
              {messagesTitle && (
                <span className="panel-meta">{messagesTitle}</span>
              )}
            </div>

            {!selected && (
              <div className="empty-state">
                <p>Chọn một chat bên trái để đọc tin nhắn.</p>
              </div>
            )}

            {selected && loadingMessages && (
              <p className="muted">Đang tải tin nhắn…</p>
            )}

            {selected && !loadingMessages && messages.length === 0 && (
              <div className="empty-state">
                <p>Không có tin nhắn hoặc chat trống.</p>
              </div>
            )}

            {selected && !loadingMessages && messages.length > 0 && (
              <ul className="messages-list">
                {messages.map((msg) => (
                  <li
                    key={msg.id}
                    className={`message-row${msg.outgoing ? ' message-row--out' : ''}`}
                  >
                    <div className="message-bubble">
                      <div className="message-head">
                        <span className="message-sender">
                          {msg.outgoing ? 'Bạn' : msg.sender_name || '—'}
                        </span>
                        <span className="message-date muted">{msg.date}</span>
                      </div>
                      <p className="message-text">{msg.text || '—'}</p>
                      {msg.has_media && (
                        <span className="message-type muted">{msg.content_type}</span>
                      )}
                      <div className="message-actions">
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost message-reply-btn"
                          onClick={() => {
                            setReplyTo(msg)
                            setDraftText('')
                            resetAlerts()
                          }}
                        >
                          Reply
                        </button>
                        {msg.outgoing && (
                          <button
                            type="button"
                            className="btn btn--sm btn--danger message-reply-btn"
                            disabled={deletingId === msg.id || sending}
                            onClick={() => void handleDeleteMessage(msg)}
                          >
                            {deletingId === msg.id ? '…' : 'Xóa'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {selected && (
              <form className="message-compose" onSubmit={(e) => void handleSendMessage(e)}>
                {replyTo && (
                  <div className="reply-preview">
                    <div>
                      <p className="reply-preview-label">
                        Trả lời #{replyTo.id} —{' '}
                        {replyTo.outgoing ? 'Bạn' : replyTo.sender_name || '—'}
                      </p>
                      <p className="reply-preview-text muted">
                        {(replyTo.text || '[media]').slice(0, 120)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => setReplyTo(null)}
                    >
                      Hủy
                    </button>
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="message-image-input"
                  onChange={handleImageSelect}
                  disabled={sending || loadingMessages}
                />
                {selectedImage && imagePreview && (
                  <div className="message-image-preview">
                    <img src={imagePreview} alt={selectedImage.name} />
                    <div className="message-image-preview-meta">
                      <span className="muted">{selectedImage.name}</span>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={clearSelectedImage}
                        disabled={sending}
                      >
                        Bỏ ảnh
                      </button>
                    </div>
                  </div>
                )}
                <label className="field message-compose-field">
                  <span>
                    <code>
                      {selectedImage
                        ? 'POST /api/messages/send-media'
                        : replyTo
                          ? 'POST /api/messages/reply'
                          : 'POST /api/messages/send'}
                    </code>
                  </span>
                  <textarea
                    rows={3}
                    placeholder={
                      selectedImage
                        ? 'Caption (tùy chọn)…'
                        : 'Nhập tin nhắn…'
                    }
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    disabled={sending || loadingMessages}
                    maxLength={selectedImage ? 1024 : 4096}
                  />
                </label>
                <div className="message-compose-actions">
                  <div className="message-compose-actions-left">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={sending || loadingMessages}
                    >
                      Chọn ảnh
                    </button>
                    <span className="muted">
                      {selectedImage
                        ? `${draftText.length}/1024`
                        : `${draftText.length}/4096`}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={
                      sending ||
                      loadingMessages ||
                      (!draftText.trim() && !selectedImage)
                    }
                  >
                    {sending
                      ? 'Đang gửi…'
                      : selectedImage
                        ? 'Gửi ảnh'
                        : replyTo
                          ? 'Trả lời'
                          : 'Gửi'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  )
}