import type { DialogMessageItem } from '../types/api'

export type ChatTimelineItem =
  | { type: 'date'; key: string; label: string }
  | { type: 'unread'; key: string }
  | { type: 'message'; key: string; msg: DialogMessageItem }

function parseMessageDayKey(dateStr: string): string {
  const trimmed = dateStr.trim()
  if (!trimmed) return ''
  const [dayPart] = trimmed.split(' ')
  return dayPart || trimmed
}

function parseDayParts(dayKey: string): { day: number; month: number; year: number } | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dayKey)
  if (!match) return null
  return {
    day: Number(match[1]),
    month: Number(match[2]),
    year: Number(match[3]),
  }
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function formatDateSeparatorLabel(dayKey: string, now = new Date()): string {
  const parts = parseDayParts(dayKey)
  if (!parts) return dayKey

  const messageDate = new Date(parts.year, parts.month - 1, parts.day)
  const today = startOfLocalDay(now).getTime()
  const target = startOfLocalDay(messageDate).getTime()
  const diffDays = Math.round((today - target) / 86_400_000)

  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  return dayKey
}

export function buildChatTimeline(
  messages: DialogMessageItem[],
  unreadAfterId: number | null = null,
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = []
  let lastDateKey = ''
  let unreadInserted = false

  for (const msg of messages) {
    const dateKey = parseMessageDayKey(msg.date)
    if (dateKey && dateKey !== lastDateKey) {
      items.push({
        type: 'date',
        key: `date-${dateKey}-${msg.id}`,
        label: formatDateSeparatorLabel(dateKey),
      })
      lastDateKey = dateKey
    }

    if (
      !unreadInserted &&
      unreadAfterId != null &&
      unreadAfterId > 0 &&
      msg.id > unreadAfterId
    ) {
      items.push({ type: 'unread', key: `unread-${unreadAfterId}` })
      unreadInserted = true
    }

    items.push({ type: 'message', key: `msg-${msg.id}`, msg })
  }

  return items
}