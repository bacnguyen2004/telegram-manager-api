import type { DialogItem } from '../types/api'

export function inferHasMoreOlder(
  messageCount: number,
  limit: number,
  apiValue?: boolean,
): boolean {
  if (typeof apiValue === 'boolean') return apiValue
  return messageCount >= limit
}

export function isStaleMessagesRequest(
  requestSeq: number,
  dialogId: string,
  currentSeq: number,
  currentDialogId: string | null,
): boolean {
  return requestSeq !== currentSeq || dialogId !== currentDialogId
}

export type StoredDialogRead = {
  readMaxId: number
  at: number
}

export function mergeDialogsWithStoredReadState(
  dialogs: DialogItem[],
  stored: Record<string, StoredDialogRead>,
): DialogItem[] {
  return dialogs.map((dialog) => {
    const local = stored[dialog.id]
    if (!local) return dialog

    const serverReadMax = dialog.read_inbox_max_id ?? 0
    const serverLastId = Number(dialog.last_message_id) || 0
    const caughtUp =
      local.readMaxId >= serverReadMax &&
      (serverLastId <= 0 || local.readMaxId >= serverLastId)

    if (caughtUp) {
      return {
        ...dialog,
        unread_count: 0,
        read_inbox_max_id: Math.max(serverReadMax, local.readMaxId),
      }
    }
    return dialog
  })
}