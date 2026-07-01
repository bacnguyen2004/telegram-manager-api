import type { ReplyQuotePreview } from '../utils/dialogMessages'

type MessageReplyQuoteProps = {
  quote: ReplyQuotePreview
  onJumpTo: (messageId: number) => void
}

export function MessageReplyQuote({ quote, onJumpTo }: MessageReplyQuoteProps) {
  return (
    <button
      type="button"
      className="message-reply-quote"
      onClick={(event) => {
        event.stopPropagation()
        onJumpTo(quote.id)
      }}
      title={`Tới tin #${quote.id}`}
    >
      <span className="message-reply-quote-bar" aria-hidden />
      <span className="message-reply-quote-body">
        <span className="message-reply-quote-sender">{quote.senderName}</span>
        <span className="message-reply-quote-text">{quote.text}</span>
      </span>
    </button>
  )
}