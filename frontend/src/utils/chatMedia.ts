export type ChatMediaKind = 'image' | 'video' | 'document'

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
])

const DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const MAX_BYTES: Record<ChatMediaKind, number> = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 20 * 1024 * 1024,
}

export const CHAT_MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.zip,.doc,.docx'

export function detectChatMediaKind(file: File): ChatMediaKind | null {
  const type = (file.type || '').split(';')[0].trim().toLowerCase()
  if (IMAGE_TYPES.has(type)) return 'image'
  if (VIDEO_TYPES.has(type)) return 'video'
  if (DOCUMENT_TYPES.has(type)) return 'document'

  const name = file.name.toLowerCase()
  if (/\.(jpe?g|png|webp|gif)$/.test(name)) return 'image'
  if (/\.(mp4|webm|mov)$/.test(name)) return 'video'
  if (/\.(pdf|zip|doc|docx)$/.test(name)) return 'document'
  return null
}

export function validateChatMediaFile(file: File): string | null {
  const kind = detectChatMediaKind(file)
  if (!kind) {
    return 'Chỉ hỗ trợ ảnh, video (MP4/WebM) hoặc file PDF/ZIP/DOC.'
  }
  if (file.size > MAX_BYTES[kind]) {
    if (kind === 'image') return 'Ảnh tối đa 10MB.'
    if (kind === 'video') return 'Video tối đa 50MB.'
    return 'File tối đa 20MB.'
  }
  return null
}

export function chatMediaKindLabel(kind: ChatMediaKind): string {
  const map: Record<ChatMediaKind, string> = {
    image: 'Ảnh',
    video: 'Video',
    document: 'File',
  }
  return map[kind]
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}