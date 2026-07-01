import { describe, expect, it } from 'vitest'
import { splitTextWithLinks } from './linkifyText'

describe('splitTextWithLinks', () => {
  it('splits http and t.me links', () => {
    const parts = splitTextWithLinks('Xem https://example.com/a va t.me/demo/123 nhe')
    expect(parts).toEqual([
      { kind: 'text', value: 'Xem ' },
      { kind: 'link', value: 'https://example.com/a' },
      { kind: 'text', value: ' va ' },
      { kind: 'link', value: 't.me/demo/123' },
      { kind: 'text', value: ' nhe' },
    ])
  })

  it('returns plain text when no links', () => {
    expect(splitTextWithLinks('hello')).toEqual([{ kind: 'text', value: 'hello' }])
  })
})