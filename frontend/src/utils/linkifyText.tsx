import type { ReactNode } from 'react'

const LINK_PATTERN =
  /((?:https?:\/\/|www\.)[^\s<]+|(?:t\.me|telegram\.me|telegram\.dog)\/[^\s<]+)/gi

function normalizeHref(raw: string): string {
  const trimmed = raw.replace(/[),.!?;:]+$/g, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  return `https://${trimmed}`
}

export function splitTextWithLinks(text: string): Array<{ kind: 'text' | 'link'; value: string }> {
  if (!text) return []

  const parts: Array<{ kind: 'text' | 'link'; value: string }> = []
  let lastIndex = 0
  const pattern = new RegExp(LINK_PATTERN.source, LINK_PATTERN.flags)

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, index) })
    }
    parts.push({ kind: 'link', value: match[0] })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ kind: 'text', value: text }]
}

export function renderLinkifiedText(text: string): ReactNode[] {
  return splitTextWithLinks(text).map((part, index) => {
    if (part.kind === 'text') {
      return <span key={`text-${index}`}>{part.value}</span>
    }
    const href = normalizeHref(part.value)
    return (
      <a
        key={`link-${index}`}
        className="message-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
      >
        {part.value}
      </a>
    )
  })
}