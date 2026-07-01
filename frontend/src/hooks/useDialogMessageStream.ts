import { useEffect, useRef } from 'react'
import type { DialogMessageItem } from '../types/api'
import { api } from '../api/client'

export type DialogPreviewPatch = {
  peer_id: string
  last_message: string
  last_message_id: number | string
  date?: string
}

type UseDialogMessageStreamOptions = {
  phone: string
  peerId: string
  minId: number
  enabled?: boolean
  onMessages: (messages: DialogMessageItem[], preview: DialogPreviewPatch | null) => void
  onError?: () => void
}

export function useDialogMessageStream({
  phone,
  peerId,
  minId,
  enabled = true,
  onMessages,
  onError,
}: UseDialogMessageStreamOptions) {
  const onMessagesRef = useRef(onMessages)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessagesRef.current = onMessages
  }, [onMessages])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const minIdRef = useRef(minId)
  minIdRef.current = minId

  useEffect(() => {
    if (!enabled || !phone || !peerId || minIdRef.current < 1) return

    const url = api.dialogMessageStreamUrl(phone, peerId, minIdRef.current)
    const source = new EventSource(url)

    source.addEventListener('messages', (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          messages?: DialogMessageItem[]
          dialog_preview?: DialogPreviewPatch | null
        }
        const incoming = payload.messages ?? []
        if (incoming.length === 0) return
        onMessagesRef.current(incoming, payload.dialog_preview ?? null)
      } catch {
        onErrorRef.current?.()
      }
    })

    source.onerror = () => {
      onErrorRef.current?.()
    }

    return () => {
      source.close()
    }
  }, [enabled, phone, peerId])
}