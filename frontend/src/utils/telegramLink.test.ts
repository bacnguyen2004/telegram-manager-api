import { describe, expect, it } from 'vitest'
import {
  getActionMeta,
  isActionAllowed,
  parseTelegramLink,
} from './telegramLink'

describe('parseTelegramLink', () => {
  it('parses public post links with poll option query', () => {
    const parsed = parseTelegramLink('https://t.me/Fomo_Gems_Chat/82839?option=Mg')
    expect(parsed.kind).toBe('post')
    expect(parsed.peerId).toBe('@Fomo_Gems_Chat')
    expect(parsed.messageId).toBe(82839)
    expect(parsed.cleanLink).toBe('https://t.me/Fomo_Gems_Chat/82839')
    expect(parsed.pollOptionToken).toBe('Mg')
  })

  it('parses public post links', () => {
    const parsed = parseTelegramLink('https://t.me/cexalerts/12345')
    expect(parsed.kind).toBe('post')
    expect(parsed.peerId).toBe('@cexalerts')
    expect(parsed.messageId).toBe(12345)
    expect(parsed.supportedActions).toContain('react')
    expect(parsed.supportedActions).toContain('remove-reaction')
    expect(parsed.supportedActions).toContain('vote-poll')
    expect(parsed.supportedActions).toContain('pipeline-join-reply')
  })

  it('parses private channel post links', () => {
    const parsed = parseTelegramLink('https://t.me/c/1234567890/42')
    expect(parsed.kind).toBe('post')
    expect(parsed.peerId).toBe('-1001234567890')
    expect(parsed.messageId).toBe(42)
    expect(parsed.supportedActions).toContain('delete-message')
  })

  it('parses invite links', () => {
    const parsed = parseTelegramLink('https://t.me/+AbCdEfGh')
    expect(parsed.kind).toBe('invite')
    expect(parsed.supportedActions).toEqual(['join', 'pipeline-join-send'])
  })

  it('parses group username links', () => {
    const parsed = parseTelegramLink('https://t.me/example_group')
    expect(parsed.kind).toBe('group')
    expect(parsed.peerId).toBe('@example_group')
    expect(parsed.supportedActions).toContain('join')
    expect(parsed.supportedActions).toContain('send')
    expect(parsed.supportedActions).toContain('leave')
    expect(parsed.supportedActions).toContain('send-media')
    expect(parsed.supportedActions).toContain('mark-read')
    expect(parsed.supportedActions).toContain('pipeline-join-send')
  })

  it('allows leave-all without link', () => {
    const parsed = parseTelegramLink('')
    expect(isActionAllowed(parsed, 'leave-all')).toBe(true)
  })
})

describe('getActionMeta', () => {
  it('marks leave-all as not requiring link', () => {
    const meta = getActionMeta('leave-all')
    expect(meta.requiresLink).toBe(false)
  })

  it('marks pipeline-join-send correctly', () => {
    const meta = getActionMeta('pipeline-join-send')
    expect(meta.isPipeline).toBe(true)
    expect(meta.needsText).toBe(true)
    expect(meta.requiresMessageId).toBe(false)
  })

  it('marks pipeline-join-reply correctly', () => {
    const meta = getActionMeta('pipeline-join-reply')
    expect(meta.isPipeline).toBe(true)
    expect(meta.needsText).toBe(true)
  })

  it('react hint does not require join', () => {
    const meta = getActionMeta('react')
    expect(meta.hint).toMatch(/không cần join/i)
  })

  it('marks vote-poll as needing poll option', () => {
    const meta = getActionMeta('vote-poll')
    expect(meta.needsVoteOption).toBe(true)
    expect(meta.requiresMessageId).toBe(true)
    expect(meta.group).toBe('polls')
  })

  it('includes cancel-vote-poll on post links', () => {
    const parsed = parseTelegramLink('https://t.me/example/99')
    expect(parsed.supportedActions).toContain('cancel-vote-poll')
    const meta = getActionMeta('cancel-vote-poll')
    expect(meta.needsVoteOption).toBe(false)
  })
})