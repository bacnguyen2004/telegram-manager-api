import { describe, expect, it } from 'vitest'
import type { DialogItem } from '../types/api'
import {
  inferHasMoreOlder,
  isStaleMessagesRequest,
  mergeDialogsWithStoredReadState,
} from './dialogMessages'

const baseDialog: DialogItem = {
  id: '100',
  entity_id: '100',
  title: 'Test Group',
  username: '',
  kind: 'group',
  is_private: false,
  is_group: true,
  is_channel: false,
  is_bot: false,
  link: '',
  unread_count: 10,
  read_inbox_max_id: 50,
  pinned: false,
  muted: false,
  date: '',
  last_message_id: 120,
  last_message: 'hello',
}

describe('inferHasMoreOlder', () => {
  it('uses API flag when provided', () => {
    expect(inferHasMoreOlder(10, 100, false)).toBe(false)
    expect(inferHasMoreOlder(10, 100, true)).toBe(true)
  })

  it('infers more pages when message count reaches limit', () => {
    expect(inferHasMoreOlder(100, 100)).toBe(true)
    expect(inferHasMoreOlder(40, 100)).toBe(false)
  })
})

describe('isStaleMessagesRequest', () => {
  it('detects stale sequence', () => {
    expect(isStaleMessagesRequest(1, 'a', 2, 'a')).toBe(true)
  })

  it('detects stale dialog id', () => {
    expect(isStaleMessagesRequest(2, 'a', 2, 'b')).toBe(true)
  })

  it('accepts current request', () => {
    expect(isStaleMessagesRequest(2, 'a', 2, 'a')).toBe(false)
  })
})

describe('mergeDialogsWithStoredReadState', () => {
  it('clears unread when local read state caught up', () => {
    const merged = mergeDialogsWithStoredReadState([baseDialog], {
      100: { readMaxId: 120, at: Date.now() },
    })

    expect(merged[0].unread_count).toBe(0)
    expect(merged[0].read_inbox_max_id).toBe(120)
  })

  it('keeps server unread when local read is behind', () => {
    const merged = mergeDialogsWithStoredReadState([baseDialog], {
      100: { readMaxId: 60, at: Date.now() },
    })

    expect(merged[0].unread_count).toBe(10)
    expect(merged[0].read_inbox_max_id).toBe(50)
  })
})