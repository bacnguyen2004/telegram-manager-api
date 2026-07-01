import { api } from '../api/client'
import type { CheckSessionItem } from '../types/api'
import {
  getActionMeta,
  type TaskAction,
  type ParsedTelegramLink,
} from './telegramLink'

export type TaskRowStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'
  | 'cancelled'

export interface TaskProgressRow {
  phone: string
  status: TaskRowStatus
  message: string
}

export interface TaskRunOptions {
  phones: string[]
  action: TaskAction
  parsed: ParsedTelegramLink
  emoji: string
  text: string
  mediaFile: File | null
  delaySeconds: number
  delayMinSeconds: number
  delayMaxSeconds: number
  useRandomDelay: boolean
  retryAttempts: number
  stopAfterConsecutiveErrors: number
  preCheckLive: boolean
  pipelineStepDelaySeconds: number
  signal?: AbortSignal
  onProgress: (rows: TaskProgressRow[]) => void
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'))
      return
    }
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('Cancelled', 'AbortError'))
      },
      { once: true },
    )
  })
}

function randomDelayMs(minSeconds: number, maxSeconds: number): number {
  const min = Math.min(minSeconds, maxSeconds)
  const max = Math.max(minSeconds, maxSeconds)
  if (max <= min) return min * 1000
  const span = max - min
  return (min + Math.random() * span) * 1000
}

function resolveDelayMs(options: TaskRunOptions): number {
  if (options.useRandomDelay) {
    return randomDelayMs(options.delayMinSeconds, options.delayMaxSeconds)
  }
  return options.delaySeconds * 1000
}

function resultMessage(
  action: TaskAction,
  data: { status?: string; message?: string; left_count?: number } | null | undefined,
  fallback: string,
): string {
  if (!data) return fallback
  if (data.message) return data.message
  if (data.status === 'success') {
    if (action === 'join') return 'Đã join'
    if (action === 'leave') return 'Đã rời nhóm'
    if (action === 'leave-all') {
      return data.left_count != null
        ? `Đã rời ${data.left_count} nhóm`
        : 'Đã rời tất cả nhóm'
    }
    if (action === 'react') return 'Đã thả reaction'
    if (action === 'remove-reaction') return 'Đã gỡ reaction'
    if (action === 'reply') return 'Đã reply'
    if (action === 'delete-message') return 'Đã xóa tin'
    if (action === 'mark-read') return 'Đã đánh dấu đọc'
    if (action === 'send-media') return 'Đã gửi media'
    return 'Đã gửi tin'
  }
  return fallback
}

function pipelineSteps(action: TaskAction): TaskAction[] {
  if (action === 'pipeline-join-send') return ['join', 'send']
  if (action === 'pipeline-join-reply') return ['join', 'reply']
  return [action]
}

async function runSingleTask(
  phone: string,
  action: TaskAction,
  parsed: ParsedTelegramLink,
  emoji: string,
  text: string,
  mediaFile: File | null,
): Promise<{ ok: boolean; message: string }> {
  if (action === 'join') {
    const res = await api.joinGroup(phone, parsed.groupLink || parsed.raw)
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Join thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã join'),
    }
  }

  if (action === 'leave') {
    const res = await api.leaveGroup(phone, parsed.groupLink || parsed.raw)
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Leave thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã rời'),
    }
  }

  if (action === 'leave-all') {
    const res = await api.leaveAllGroups(phone)
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Leave all thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã rời tất cả'),
    }
  }

  if (action === 'mark-read') {
    const res = await api.markDialogRead(phone, parsed.peerId)
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Mark read thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã đọc'),
    }
  }

  if (action === 'react') {
    if (!parsed.messageId) {
      return { ok: false, message: 'Link post thiếu message ID' }
    }
    const res = await api.sendReaction(
      phone,
      parsed.peerId,
      parsed.messageId,
      emoji,
    )
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Reaction thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã react'),
    }
  }

  if (action === 'remove-reaction') {
    if (!parsed.messageId) {
      return { ok: false, message: 'Link post thiếu message ID' }
    }
    const res = await api.removeReaction(
      phone,
      parsed.peerId,
      parsed.messageId,
    )
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Gỡ reaction thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã gỡ'),
    }
  }

  if (action === 'reply') {
    if (!parsed.messageId) {
      return { ok: false, message: 'Link post thiếu message ID' }
    }
    const res = await api.replyMessage(
      phone,
      parsed.peerId,
      parsed.messageId,
      text,
    )
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Reply thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã reply'),
    }
  }

  if (action === 'delete-message') {
    if (!parsed.messageId) {
      return { ok: false, message: 'Link post thiếu message ID' }
    }
    const res = await api.deleteMessage(
      phone,
      parsed.peerId,
      parsed.messageId,
    )
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Xóa tin thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã xóa'),
    }
  }

  if (action === 'send-media') {
    if (!mediaFile) {
      return { ok: false, message: 'Chưa chọn file media' }
    }
    const res = await api.sendMedia(
      phone,
      parsed.peerId,
      mediaFile,
      text.trim() || undefined,
    )
    if (!res.success || !res.data) {
      return { ok: false, message: res.error ?? 'Gửi media thất bại' }
    }
    if (res.data.status === 'error') {
      return { ok: false, message: res.data.message }
    }
    return {
      ok: true,
      message: resultMessage(action, res.data, res.data.message || 'Đã gửi media'),
    }
  }

  const res = await api.sendMessage(phone, parsed.peerId, text)
  if (!res.success || !res.data) {
    return { ok: false, message: res.error ?? 'Gửi tin thất bại' }
  }
  if (res.data.status === 'error') {
    return { ok: false, message: res.data.message }
  }
  return {
    ok: true,
    message: resultMessage(action, res.data, res.data.message || 'Đã gửi'),
  }
}

async function runWithRetry(
  phone: string,
  steps: TaskAction[],
  parsed: ParsedTelegramLink,
  emoji: string,
  text: string,
  mediaFile: File | null,
  retryAttempts: number,
  pipelineStepDelaySeconds: number,
  signal?: AbortSignal,
): Promise<{ ok: boolean; message: string }> {
  const maxAttempts = Math.max(1, retryAttempts + 1)
  let lastMessage = 'Lỗi không xác định'

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const stepMessages: string[] = []

    for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
      if (signal?.aborted) {
        throw new DOMException('Cancelled', 'AbortError')
      }

      const step = steps[stepIndex]
      const result = await runSingleTask(
        phone,
        step,
        parsed,
        emoji,
        text,
        mediaFile,
      )

      if (!result.ok) {
        lastMessage =
          steps.length > 1
            ? `Bước ${stepIndex + 1} (${step}): ${result.message}`
            : result.message
        break
      }

      stepMessages.push(result.message)

      if (stepIndex < steps.length - 1 && pipelineStepDelaySeconds > 0) {
        await sleep(pipelineStepDelaySeconds * 1000, signal)
      }
    }

    if (stepMessages.length === steps.length) {
      return {
        ok: true,
        message: stepMessages.join(' → '),
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(1500, signal)
    }
  }

  return { ok: false, message: lastMessage }
}

async function filterLivePhones(
  phones: string[],
  signal?: AbortSignal,
): Promise<{ phones: string[]; skipped: Map<string, string> }> {
  const res = await api.checkSessions(phones)
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Pre-check session thất bại')
  }

  if (signal?.aborted) {
    throw new DOMException('Cancelled', 'AbortError')
  }

  const statusMap = new Map<string, CheckSessionItem>(
    res.data.sessions.map((item) => [item.phone, item]),
  )
  const live: string[] = []
  const skipped = new Map<string, string>()

  for (const phone of phones) {
    const item = statusMap.get(phone)
    if (item?.status === 'active') {
      live.push(phone)
    } else {
      const reason =
        item?.status === 'unauthorized'
          ? 'Session die'
          : item?.status === 'error'
            ? item.message || 'Lỗi session'
            : 'Không live'
      skipped.set(phone, reason)
    }
  }

  return { phones: live, skipped }
}

function markAllPendingCancelled(rows: TaskProgressRow[]): void {
  for (let j = 0; j < rows.length; j += 1) {
    if (rows[j].status === 'pending' || rows[j].status === 'running') {
      rows[j] = { ...rows[j], status: 'cancelled', message: 'Đã dừng' }
    }
  }
}

export async function runTaskQueue(options: TaskRunOptions): Promise<TaskProgressRow[]> {
  const {
    phones,
    action,
    parsed,
    emoji,
    text,
    mediaFile,
    signal,
    onProgress,
    preCheckLive,
    stopAfterConsecutiveErrors,
    retryAttempts,
    pipelineStepDelaySeconds,
  } = options

  const meta = getActionMeta(action)
  const steps = pipelineSteps(action)

  let queue = [...phones]
  const rows: TaskProgressRow[] = phones.map((phone) => ({
    phone,
    status: 'pending',
    message: 'Chờ…',
  }))
  onProgress([...rows])

  if (preCheckLive) {
    for (let i = 0; i < rows.length; i += 1) {
      rows[i] = { ...rows[i], status: 'running', message: 'Đang pre-check…' }
    }
    onProgress([...rows])

    const filtered = await filterLivePhones(phones, signal)
    queue = filtered.phones

    for (let i = 0; i < rows.length; i += 1) {
      const phone = rows[i].phone
      const skipReason = filtered.skipped.get(phone)
      if (skipReason) {
        rows[i] = { phone, status: 'skipped', message: skipReason }
      } else if (!queue.includes(phone)) {
        rows[i] = { phone, status: 'skipped', message: 'Bỏ qua' }
      } else {
        rows[i] = { phone, status: 'pending', message: 'Chờ…' }
      }
    }
    onProgress([...rows])
  }

  let consecutiveErrors = 0

  for (let index = 0; index < queue.length; index += 1) {
    if (signal?.aborted) {
      markAllPendingCancelled(rows)
      onProgress([...rows])
      return rows
    }

    if (
      stopAfterConsecutiveErrors > 0 &&
      consecutiveErrors >= stopAfterConsecutiveErrors
    ) {
      const phone = queue[index]
      const rowIndex = rows.findIndex((row) => row.phone === phone)
      if (rowIndex >= 0) {
        rows[rowIndex] = {
          phone,
          status: 'skipped',
          message: `Dừng sau ${consecutiveErrors} lỗi liên tiếp`,
        }
      }
      for (let j = index + 1; j < queue.length; j += 1) {
        const skippedPhone = queue[j]
        const skippedRowIndex = rows.findIndex((row) => row.phone === skippedPhone)
        if (skippedRowIndex >= 0 && rows[skippedRowIndex].status === 'pending') {
          rows[skippedRowIndex] = {
            phone: skippedPhone,
            status: 'skipped',
            message: 'Bỏ qua do dừng sớm',
          }
        }
      }
      onProgress([...rows])
      return rows
    }

    const phone = queue[index]
    const rowIndex = rows.findIndex((row) => row.phone === phone)
    if (rowIndex < 0) continue

    rows[rowIndex] = {
      phone,
      status: 'running',
      message: meta.isPipeline ? 'Đang chạy pipeline…' : 'Đang chạy…',
    }
    onProgress([...rows])

    try {
      const result = await runWithRetry(
        phone,
        steps,
        parsed,
        emoji,
        text,
        mediaFile,
        retryAttempts,
        meta.isPipeline ? pipelineStepDelaySeconds : 0,
        signal,
      )
      rows[rowIndex] = {
        phone,
        status: result.ok ? 'success' : 'error',
        message: result.message,
      }
      if (result.ok) {
        consecutiveErrors = 0
      } else {
        consecutiveErrors += 1
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        rows[rowIndex] = { phone, status: 'cancelled', message: 'Đã dừng' }
        markAllPendingCancelled(rows)
        onProgress([...rows])
        return rows
      }
      rows[rowIndex] = {
        phone,
        status: 'error',
        message: err instanceof Error ? err.message : 'Lỗi không xác định',
      }
      consecutiveErrors += 1
    }

    onProgress([...rows])

    if (index < queue.length - 1) {
      const delayMs = resolveDelayMs(options)
      if (delayMs > 0) {
        try {
          await sleep(delayMs, signal)
        } catch {
          markAllPendingCancelled(rows)
          onProgress([...rows])
          return rows
        }
      }
    }
  }

  return rows
}