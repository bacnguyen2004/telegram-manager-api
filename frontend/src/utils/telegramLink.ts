export type TaskAction =
  | 'join'
  | 'leave'
  | 'leave-all'
  | 'react'
  | 'remove-reaction'
  | 'vote-poll'
  | 'cancel-vote-poll'
  | 'reply'
  | 'send'
  | 'send-media'
  | 'delete-message'
  | 'mark-read'
  | 'pipeline-join-send'
  | 'pipeline-join-reply'

export type TaskActionGroup = 'groups' | 'messages' | 'reactions' | 'polls' | 'pipelines'

export interface ParsedTelegramLink {
  raw: string
  cleanLink: string
  pollOptionToken: string | null
  kind: 'post' | 'group' | 'invite' | 'invalid'
  peerId: string
  messageId: number | null
  groupLink: string
  label: string
  supportedActions: TaskAction[]
}

export interface TaskActionMeta {
  id: TaskAction
  group: TaskActionGroup
  label: string
  hint: string
  icon: string
  requiresLink: boolean
  requiresMessageId: boolean
  needsText: boolean
  needsEmoji: boolean
  needsMedia: boolean
  needsVoteOption: boolean
  isPipeline: boolean
}

const POST_ACTIONS: TaskAction[] = [
  'react',
  'reply',
  'remove-reaction',
  'vote-poll',
  'cancel-vote-poll',
  'delete-message',
  'pipeline-join-reply',
]

const GROUP_ACTIONS: TaskAction[] = [
  'join',
  'leave',
  'send',
  'send-media',
  'mark-read',
  'pipeline-join-send',
]

const INVITE_ACTIONS: TaskAction[] = ['join', 'pipeline-join-send']

const PEER_ID_ACTIONS: TaskAction[] = ['send', 'send-media', 'mark-read']

export const TASK_ACTION_META: TaskActionMeta[] = [
  {
    id: 'join',
    group: 'groups',
    label: 'Join',
    hint: 'Tham gia group/channel từ invite hoặc @username',
    icon: '➕',
    requiresLink: true,
    requiresMessageId: false,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'leave',
    group: 'groups',
    label: 'Leave',
    hint: 'Rời group/channel theo link hoặc @username',
    icon: '➖',
    requiresLink: true,
    requiresMessageId: false,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'leave-all',
    group: 'groups',
    label: 'Leave all',
    hint: 'Rời tất cả group/channel — không cần link',
    icon: '🚪',
    requiresLink: false,
    requiresMessageId: false,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'mark-read',
    group: 'groups',
    label: 'Đánh dấu đã đọc',
    hint: 'Đánh dấu đã đọc hội thoại với group/chat',
    icon: '✓',
    requiresLink: true,
    requiresMessageId: false,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'send',
    group: 'messages',
    label: 'Gửi tin',
    hint: 'Gửi tin nhắn văn bản vào group hoặc chat',
    icon: '💬',
    requiresLink: true,
    requiresMessageId: false,
    needsText: true,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'send-media',
    group: 'messages',
    label: 'Gửi media',
    hint: 'Gửi ảnh/video/file kèm caption tùy chọn',
    icon: '📎',
    requiresLink: true,
    requiresMessageId: false,
    needsText: false,
    needsEmoji: false,
    needsMedia: true,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'reply',
    group: 'messages',
    label: 'Reply',
    hint: 'Reply bài post với nội dung bạn nhập',
    icon: '↩',
    requiresLink: true,
    requiresMessageId: true,
    needsText: true,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'delete-message',
    group: 'messages',
    label: 'Xóa tin',
    hint: 'Xóa bài post/tin nhắn theo link t.me/channel/123',
    icon: '🗑',
    requiresLink: true,
    requiresMessageId: true,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'react',
    group: 'reactions',
    label: 'Reaction',
    hint: 'Thả reaction lên bài post — chỉ cần link, không cần join nhóm',
    icon: '👍',
    requiresLink: true,
    requiresMessageId: true,
    needsText: false,
    needsEmoji: true,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'remove-reaction',
    group: 'reactions',
    label: 'Gỡ reaction',
    hint: 'Gỡ reaction của bạn trên bài post',
    icon: '✕',
    requiresLink: true,
    requiresMessageId: true,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'vote-poll',
    group: 'polls',
    label: 'Vote poll',
    hint: 'Bình chọn poll trên bài post — dán link rồi chọn lựa chọn hiện ra',
    icon: '📊',
    requiresLink: true,
    requiresMessageId: true,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: true,
    isPipeline: false,
  },
  {
    id: 'cancel-vote-poll',
    group: 'polls',
    label: 'Hủy vote',
    hint: 'Hủy bình chọn poll/to-do trên bài post — chỉ cần link',
    icon: '↩',
    requiresLink: true,
    requiresMessageId: true,
    needsText: false,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: false,
  },
  {
    id: 'pipeline-join-send',
    group: 'pipelines',
    label: 'Join → Nhắn',
    hint: 'Join group từ invite/@username rồi gửi tin nhắn — hay dùng với link mời',
    icon: '⚡',
    requiresLink: true,
    requiresMessageId: false,
    needsText: true,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: true,
  },
  {
    id: 'pipeline-join-reply',
    group: 'pipelines',
    label: 'Join → Reply',
    hint: 'Chỉ dùng khi acc chưa vào channel — join rồi reply (thường reply chỉ cần link post)',
    icon: '⚡',
    requiresLink: true,
    requiresMessageId: true,
    needsText: true,
    needsEmoji: false,
    needsMedia: false,
    needsVoteOption: false,
    isPipeline: true,
  },
]

export const TASK_ACTION_GROUPS: { id: TaskActionGroup; label: string }[] = [
  { id: 'groups', label: 'Nhóm' },
  { id: 'messages', label: 'Tin nhắn' },
  { id: 'reactions', label: 'Reaction' },
  { id: 'polls', label: 'Vote' },
  { id: 'pipelines', label: 'Pipeline' },
]

const PUBLIC_POST_RE = /(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)\/(\d+)\/?$/i
const PRIVATE_POST_RE = /(?:https?:\/\/)?t\.me\/c\/(\d+)\/(\d+)\/?$/i
const INVITE_RE = /(?:https?:\/\/)?t\.me\/(?:\+|joinchat\/)([a-zA-Z0-9_-]+)\/?$/i
const GROUP_RE = /(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)\/?$/i

function stripLinkQuery(raw: string): string {
  return raw.trim().split('?')[0].split('#')[0].trim()
}

function extractPollOptionToken(raw: string): string | null {
  const queryIndex = raw.indexOf('?')
  if (queryIndex < 0) return null
  const params = new URLSearchParams(raw.slice(queryIndex + 1))
  return params.get('option') || params.get('vote')
}

function normalizeLinkInput(raw: string): string {
  const trimmed = stripLinkQuery(raw)
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('t.me/')) return `https://${trimmed}`
  if (trimmed.startsWith('@')) return `https://t.me/${trimmed.slice(1)}`
  return trimmed
}

export function parseTelegramLink(raw: string): ParsedTelegramLink {
  const pollOptionToken = extractPollOptionToken(raw)
  const normalized = normalizeLinkInput(raw)
  const invalid = (label: string): ParsedTelegramLink => ({
    raw: raw.trim(),
    cleanLink: normalized,
    pollOptionToken,
    kind: 'invalid',
    peerId: '',
    messageId: null,
    groupLink: normalized,
    label,
    supportedActions: [],
  })

  if (!normalized) {
    return invalid('Chưa nhập link')
  }

  const privateMatch = normalized.match(PRIVATE_POST_RE)
  if (privateMatch) {
    const channelId = privateMatch[1]
    const messageId = Number(privateMatch[2])
    const peerId = `-100${channelId}`
    return {
      raw: raw.trim(),
      cleanLink: normalized,
      pollOptionToken,
      kind: 'post',
      peerId,
      messageId,
      groupLink: normalized,
      label: `Post riêng tư · peer ${peerId} · msg #${messageId}`,
      supportedActions: [...POST_ACTIONS],
    }
  }

  const publicMatch = normalized.match(PUBLIC_POST_RE)
  if (publicMatch) {
    const username = publicMatch[1]
    const messageId = Number(publicMatch[2])
    if (username === 'c') return invalid('Link không hợp lệ')
    const peerId = `@${username}`
    return {
      raw: raw.trim(),
      cleanLink: normalized,
      pollOptionToken,
      kind: 'post',
      peerId,
      messageId,
      groupLink: `https://t.me/${username}`,
      label: `@${username} · post #${messageId}`,
      supportedActions: [...POST_ACTIONS],
    }
  }

  const inviteMatch = normalized.match(INVITE_RE)
  if (inviteMatch) {
    const hash = inviteMatch[1]
    const groupLink = `https://t.me/+${hash}`
    return {
      raw: raw.trim(),
      cleanLink: normalized,
      pollOptionToken,
      kind: 'invite',
      peerId: groupLink,
      messageId: null,
      groupLink,
      label: `Invite link · +${hash}`,
      supportedActions: [...INVITE_ACTIONS],
    }
  }

  const groupMatch = normalized.match(GROUP_RE)
  if (groupMatch) {
    const username = groupMatch[1]
    const groupLink = `https://t.me/${username}`
    return {
      raw: raw.trim(),
      cleanLink: normalized,
      pollOptionToken,
      kind: 'group',
      peerId: `@${username}`,
      messageId: null,
      groupLink,
      label: `@${username}`,
      supportedActions: [...GROUP_ACTIONS],
    }
  }

  if (/^-?\d+$/.test(normalized)) {
    return {
      raw: raw.trim(),
      cleanLink: normalized,
      pollOptionToken,
      kind: 'group',
      peerId: normalized,
      messageId: null,
      groupLink: normalized,
      label: `Peer ID ${normalized}`,
      supportedActions: [...PEER_ID_ACTIONS],
    }
  }

  if (normalized.startsWith('@')) {
    const peerId = normalized
    return {
      raw: raw.trim(),
      cleanLink: normalized,
      pollOptionToken,
      kind: 'group',
      peerId,
      messageId: null,
      groupLink: `https://t.me/${normalized.slice(1)}`,
      label: peerId,
      supportedActions: [...GROUP_ACTIONS],
    }
  }

  return invalid('Không nhận dạng được link Telegram')
}

export function getActionMeta(action: TaskAction): TaskActionMeta {
  const meta = TASK_ACTION_META.find((item) => item.id === action)
  if (!meta) throw new Error(`Unknown action: ${action}`)
  return meta
}

export function actionLabel(action: TaskAction): string {
  return getActionMeta(action).label
}

export function isActionAllowed(
  parsed: ParsedTelegramLink,
  action: TaskAction,
): boolean {
  if (action === 'leave-all') return true
  return parsed.supportedActions.includes(action)
}

export function actionsForGroup(group: TaskActionGroup): TaskActionMeta[] {
  return TASK_ACTION_META.filter((item) => item.group === group)
}