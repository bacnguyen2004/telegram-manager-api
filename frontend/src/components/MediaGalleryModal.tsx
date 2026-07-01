import { api } from '../api/client'
import type { DialogMessageItem } from '../types/api'
import { mediaTypeLabel } from '../utils/avatar'

interface MediaGalleryModalProps {
  open: boolean
  phone: string
  peerId: string
  messages: DialogMessageItem[]
  loadedPhotoIds: Set<number>
  onClose: () => void
  onRevealPhoto: (messageId: number) => void
}

function isGalleryPhoto(msg: DialogMessageItem): boolean {
  return (
    msg.has_photo ||
    msg.content_type === 'photo' ||
    (msg.has_media && msg.text === '[photo]')
  )
}

export function MediaGalleryModal({
  open,
  phone,
  peerId,
  messages,
  loadedPhotoIds,
  onClose,
  onRevealPhoto,
}: MediaGalleryModalProps) {
  if (!open) return null

  const items = messages.filter(
    (msg) => isGalleryPhoto(msg) || msg.content_type === 'video',
  )

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--wide media-gallery-modal"
        role="dialog"
        aria-labelledby="media-gallery-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head media-gallery-head">
          <div>
            <h3 id="media-gallery-title">Media gallery</h3>
            <p className="panel-meta">{items.length} mục trong tin đã tải</p>
          </div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </header>

        {items.length === 0 ? (
          <p className="muted media-gallery-empty">
            Chưa có ảnh/video trong các tin đã tải. Cuộn lên để tải thêm tin cũ.
          </p>
        ) : (
          <div className="media-gallery-grid">
            {items.map((msg) => {
              const isPhoto = isGalleryPhoto(msg)
              const revealed = loadedPhotoIds.has(msg.id)
              return (
                <article key={msg.id} className="media-gallery-item">
                  {isPhoto && revealed ? (
                    <img
                      className="media-gallery-thumb"
                      src={api.messagePhotoUrl(phone, peerId, msg.id)}
                      alt={`Ảnh #${msg.id}`}
                      loading="lazy"
                    />
                  ) : (
                    <button
                      type="button"
                      className="media-gallery-placeholder"
                      onClick={() => {
                        if (isPhoto) onRevealPhoto(msg.id)
                      }}
                    >
                      <span className="media-gallery-type">
                        {isPhoto ? 'Ảnh' : mediaTypeLabel(msg.content_type)}
                      </span>
                      <span className="muted">#{msg.id}</span>
                      {isPhoto ? <span className="media-gallery-tap">Bấm xem</span> : null}
                    </button>
                  )}
                  <p className="media-gallery-caption muted">
                    {(msg.text && msg.text !== '[photo]' ? msg.text : msg.date).slice(0, 80)}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}