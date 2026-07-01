export const DIALOG_DRAFT_STORAGE_KEY = 'telegram-manager-dialog-draft-v1'

export type DialogDraft = {
  text: string
  updatedAt: number
}

export function loadDraftMap(phone: string): Record<string, DialogDraft> {
  if (!phone) return {}
  try {
    const raw = localStorage.getItem(DIALOG_DRAFT_STORAGE_KEY)
    if (!raw) return {}
    const all = JSON.parse(raw) as Record<string, Record<string, DialogDraft>>
    return all[phone] ?? {}
  } catch {
    return {}
  }
}

export function loadDraft(phone: string, dialogId: string): string {
  if (!phone || !dialogId) return ''
  return loadDraftMap(phone)[dialogId]?.text ?? ''
}

export function saveDraft(phone: string, dialogId: string, text: string) {
  if (!phone || !dialogId) return
  try {
    const raw = localStorage.getItem(DIALOG_DRAFT_STORAGE_KEY)
    const all = raw
      ? (JSON.parse(raw) as Record<string, Record<string, DialogDraft>>)
      : {}
    all[phone] = all[phone] ?? {}
    const trimmed = text
    if (!trimmed) {
      delete all[phone][dialogId]
    } else {
      all[phone][dialogId] = { text: trimmed, updatedAt: Date.now() }
    }
    localStorage.setItem(DIALOG_DRAFT_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Bỏ qua nếu localStorage không khả dụng
  }
}

export function clearDraft(phone: string, dialogId: string) {
  saveDraft(phone, dialogId, '')
}