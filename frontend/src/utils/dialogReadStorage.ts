import type { DialogItem } from '../types/api'
import {
  mergeDialogsWithStoredReadState,
  type StoredDialogRead,
} from './dialogMessages'

export const DIALOG_READ_STORAGE_KEY = 'telegram-manager-dialog-read-v1'

export function loadReadStateMap(phone: string): Record<string, StoredDialogRead> {
  try {
    const raw = localStorage.getItem(DIALOG_READ_STORAGE_KEY)
    if (!raw) return {}
    const all = JSON.parse(raw) as Record<string, Record<string, StoredDialogRead>>
    return all[phone] ?? {}
  } catch {
    return {}
  }
}

export function saveReadState(phone: string, dialogId: string, readMaxId: number) {
  if (!phone || !dialogId || readMaxId <= 0) return
  try {
    const raw = localStorage.getItem(DIALOG_READ_STORAGE_KEY)
    const all = raw
      ? (JSON.parse(raw) as Record<string, Record<string, StoredDialogRead>>)
      : {}
    all[phone] = all[phone] ?? {}
    all[phone][dialogId] = { readMaxId, at: Date.now() }
    localStorage.setItem(DIALOG_READ_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Bỏ qua nếu localStorage không khả dụng
  }
}

export function mergeDialogsWithReadState(
  phone: string,
  dialogs: DialogItem[],
): DialogItem[] {
  return mergeDialogsWithStoredReadState(dialogs, loadReadStateMap(phone))
}