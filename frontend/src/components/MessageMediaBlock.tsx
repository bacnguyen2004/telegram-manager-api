import { api } from '../api/client'
import { mediaTypeLabel } from '../utils/avatar'

type MessageMediaBlockProps = {
  phone: string
  peerId: string
  messageId: number
  contentType: string
  fileName?: string
  revealed: boolean
  selectMode: boolean
  onReveal: (messageId: number) => void
  onLoaded?: () => void
}

function mediaTriggerLabel(contentType: string): string {
  const map: Record<string, string> = {
    video: 'Xem video',
    audio: 'Nghe audio',
    sticker: 'Xem sticker',
    document: 'Tải file',
  }
  return map[contentType] ?? `Xem ${mediaTypeLabel(contentType)}`
}

export function MessageMediaBlock({
  phone,
  peerId,
  messageId,
  contentType,
  fileName,
  revealed,
  selectMode,
  onReveal,
  onLoaded,
}: MessageMediaBlockProps) {
  const url = api.messageMediaUrl(phone, peerId, messageId)
  const label = fileName?.trim() || mediaTypeLabel(contentType)

  if (selectMode) {
    return <span className="message-media-placeholder muted">{label}</span>
  }

  if (!revealed) {
    return (
      <button
        type="button"
        className="message-media-trigger"
        onClick={(event) => {
          event.stopPropagation()
          onReveal(messageId)
        }}
      >
        <span className={`message-media-trigger-icon message-media-trigger-icon--${contentType}`}>
          {contentType === 'video' ? '▶' : contentType === 'audio' ? '♪' : contentType === 'sticker' ? '☺' : '📎'}
        </span>
        <span>{mediaTriggerLabel(contentType)}</span>
        {fileName ? <span className="message-media-trigger-name muted">{fileName}</span> : null}
      </button>
    )
  }

  if (contentType === 'video') {
    return (
      <video
        className="message-media-video"
        src={url}
        controls
        preload="metadata"
        onLoadedData={() => onLoaded?.()}
      >
        Video
      </video>
    )
  }

  if (contentType === 'audio') {
    return (
      <audio
        className="message-media-audio"
        src={url}
        controls
        preload="metadata"
        onLoadedData={() => onLoaded?.()}
      >
        Audio
      </audio>
    )
  }

  if (contentType === 'sticker') {
    return (
      <img
        className="message-media-sticker"
        src={url}
        alt="Sticker"
        onLoad={() => onLoaded?.()}
      />
    )
  }

  return (
    <a
      className="message-media-document"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="message-media-document-icon" aria-hidden>
        📎
      </span>
      <span className="message-media-document-label">{label}</span>
    </a>
  )
}