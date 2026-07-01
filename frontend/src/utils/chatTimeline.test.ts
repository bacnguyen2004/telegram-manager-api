import { describe, expect, it } from 'vitest'
import type { DialogMessageItem } from '../types/api'
import { buildChatTimeline, formatDateSeparatorLabel } from './chatTimeline'

function msg(id: number, date: string): DialogMessageItem {
  return {
    id,
    date,
    sender_id: '1',
    sender_name: 'A',
    outgoing: false,
    content_type: 'text',
    has_media: false,
    has_photo: false,
    text: `m${id}`,
    reactions: [],
  }
}

describe('formatDateSeparatorLabel', () => {
  it('labels today and yesterday in Vietnamese', () => {
    const now = new Date(2026, 5, 15, 12, 0, 0)
    expect(formatDateSeparatorLabel('15/06/2026', now)).toBe('Hôm nay')
    expect(formatDateSeparatorLabel('14/06/2026', now)).toBe('Hôm qua')
    expect(formatDateSeparatorLabel('10/06/2026', now)).toBe('10/06/2026')
  })
})

describe('buildChatTimeline', () => {
  it('inserts date separators and unread marker', () => {
    const timeline = buildChatTimeline(
      [
        msg(10, '14/06/2026 09:00:00'),
        msg(11, '15/06/2026 10:00:00'),
        msg(12, '15/06/2026 10:05:00'),
      ],
      10,
    )

    expect(timeline.map((item) => item.type)).toEqual([
      'date',
      'message',
      'date',
      'unread',
      'message',
      'message',
    ])
  })
})