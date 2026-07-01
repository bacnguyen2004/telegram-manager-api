import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { PollInfoData, PollOptionItem } from '../types/api'

type MessagePollBlockProps = {
  phone: string
  peerId: string
  messageId: number
  question: string
  disabled?: boolean
}

function pollOptionVoteKey(option: PollOptionItem): string {
  if (option.option_hex) return option.option_hex
  if (option.todo_item_id != null) return String(option.todo_item_id)
  return String(option.index)
}

function pollVoterPercent(voters: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((voters / total) * 100)
}

function chosenKeysFromOptions(options: PollOptionItem[]): Set<string> {
  return new Set(
    options.filter((option) => option.chosen).map((option) => pollOptionVoteKey(option)),
  )
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}

export function MessagePollBlock({
  phone,
  peerId,
  messageId,
  question,
  disabled = false,
}: MessagePollBlockProps) {
  const [pollInfo, setPollInfo] = useState<PollInfoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [voting, setVoting] = useState(false)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set())
  const [localChosenKey, setLocalChosenKey] = useState<string | null>(null)

  const allowsMultiple = Boolean(
    pollInfo?.multiple_choice || pollInfo?.kind === 'todo',
  )

  const loadPoll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getPollInfo(phone, peerId, messageId)
      if (!res.success || !res.data || res.data.status === 'error') {
        setPollInfo(null)
        setError(res.error ?? res.data?.message ?? 'Không tải được poll')
        return
      }
      setPollInfo(res.data)
      const serverChosen = chosenKeysFromOptions(res.data.options)
      if (res.data.multiple_choice || res.data.kind === 'todo') {
        setPendingKeys(serverChosen)
      } else {
        setLocalChosenKey(null)
      }
    } catch (err) {
      setPollInfo(null)
      setError(err instanceof Error ? err.message : 'Không tải được poll')
    } finally {
      setLoading(false)
    }
  }, [phone, peerId, messageId])

  useEffect(() => {
    void loadPoll()
  }, [loadPoll])

  const serverChosenKeys = useMemo(
    () => chosenKeysFromOptions(pollInfo?.options ?? []),
    [pollInfo],
  )

  const isOptionChosen = useCallback(
    (option: PollOptionItem) => {
      const key = pollOptionVoteKey(option)
      if (allowsMultiple) return pendingKeys.has(key)
      return Boolean(option.chosen) || localChosenKey === key
    },
    [allowsMultiple, pendingKeys, localChosenKey],
  )

  const chosenOptions = useMemo(
    () => (pollInfo?.options ?? []).filter((option) => isOptionChosen(option)),
    [pollInfo, isOptionChosen],
  )

  const hasPendingChanges = useMemo(
    () => allowsMultiple && !setsEqual(pendingKeys, serverChosenKeys),
    [allowsMultiple, pendingKeys, serverChosenKeys],
  )

  const maxVoters = useMemo(() => {
    if (!pollInfo?.can_view_stats) return 0
    return Math.max(
      0,
      ...(pollInfo.options ?? []).map((option) => option.voters ?? 0),
    )
  }, [pollInfo])

  function togglePendingOption(option: PollOptionItem) {
    const key = pollOptionVoteKey(option)
    setPendingKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function submitMultipleVote() {
    if (disabled || voting || pollInfo?.closed || !hasPendingChanges) return

    const pending = [...pendingKeys]
    const toAdd = pending.filter((key) => !serverChosenKeys.has(key))
    const toRemove = [...serverChosenKeys].filter((key) => !pendingKeys.has(key))

    setVoting(true)
    setError('')
    try {
      if (pollInfo?.kind === 'todo' && toRemove.length > 0) {
        const cancelRes = await api.cancelPollVote(
          phone,
          peerId,
          messageId,
          undefined,
          toRemove,
        )
        if (!cancelRes.success || !cancelRes.data || cancelRes.data.status === 'error') {
          setError(cancelRes.error ?? cancelRes.data?.message ?? 'Không bỏ chọn được')
          return
        }
      }

      if (pollInfo?.multiple_choice) {
        if (pending.length === 0) {
          const cancelRes = await api.cancelPollVote(phone, peerId, messageId)
          if (!cancelRes.success || !cancelRes.data || cancelRes.data.status === 'error') {
            setError(cancelRes.error ?? cancelRes.data?.message ?? 'Không hủy vote được')
            return
          }
        } else {
          const res = await api.votePoll(
            phone,
            peerId,
            messageId,
            pending[0],
            undefined,
            pending,
          )
          if (!res.success || !res.data || res.data.status === 'error') {
            setError(res.error ?? res.data?.message ?? 'Vote thất bại')
            return
          }
        }
      } else if (pollInfo?.kind === 'todo' && toAdd.length > 0) {
        const res = await api.votePoll(
          phone,
          peerId,
          messageId,
          toAdd[0],
          undefined,
          toAdd,
        )
        if (!res.success || !res.data || res.data.status === 'error') {
          setError(res.error ?? res.data?.message ?? 'Vote thất bại')
          return
        }
      }

      await loadPoll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote thất bại')
    } finally {
      setVoting(false)
    }
  }

  async function voteSingleOption(option: PollOptionItem) {
    if (disabled || voting || pollInfo?.closed) return
    if (
      isOptionChosen(option) &&
      !pollInfo?.revoting_allowed
    ) {
      return
    }
    const key = pollOptionVoteKey(option)
    setVoting(true)
    setError('')
    setLocalChosenKey(key)
    try {
      const res = await api.votePoll(phone, peerId, messageId, key)
      if (!res.success || !res.data || res.data.status === 'error') {
        setError(res.error ?? res.data?.message ?? 'Vote thất bại')
        return
      }
      await loadPoll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote thất bại')
    } finally {
      setVoting(false)
    }
  }

  function handleOptionClick(option: PollOptionItem) {
    if (allowsMultiple) {
      if (disabled || voting || pollInfo?.closed) return
      togglePendingOption(option)
      return
    }
    void voteSingleOption(option)
  }

  const displayQuestion = pollInfo?.question?.trim() || question.trim() || 'Poll'
  const userVoted =
    Boolean(pollInfo?.user_voted) ||
    serverChosenKeys.size > 0 ||
    (!allowsMultiple && localChosenKey != null)

  return (
    <div className={`chat-poll-block${userVoted ? ' chat-poll-block--voted' : ''}`}>
      <div className="chat-poll-head">
        <p className="chat-poll-question">{displayQuestion}</p>
        {userVoted && !hasPendingChanges ? (
          <span className="chat-poll-voted-badge" title="Bạn đã vote">
            ✓ Đã vote
          </span>
        ) : null}
      </div>
      {loading ? (
        <p className="chat-poll-state muted">Đang tải lựa chọn…</p>
      ) : null}
      {!loading && error ? (
        <p className="chat-poll-error">{error}</p>
      ) : null}
      {!loading && pollInfo && pollInfo.options.length > 0 ? (
        <>
          <div className="chat-poll-meta muted">
            {pollInfo.kind === 'todo' ? 'To-Do' : 'Poll'}
            {pollInfo.multiple_choice ? ' · Nhiều đáp án' : ''}
            {pollInfo.closed ? ' · Đã đóng' : ''}
            {pollInfo.can_view_stats && pollInfo.total_voters != null
              ? ` · ${pollInfo.total_voters} người vote`
              : ''}
          </div>
          {allowsMultiple && !pollInfo.closed ? (
            <p className="chat-poll-hint muted">
              Chọn nhiều đáp án (tick ✓) rồi bấm «Gửi vote»
            </p>
          ) : userVoted && chosenOptions.length > 0 && !hasPendingChanges ? (
            <p className="chat-poll-chosen-summary">
              Bạn chọn:{' '}
              <strong>{chosenOptions.map((option) => option.label).join(', ')}</strong>
            </p>
          ) : !userVoted && !pollInfo.closed ? (
            <p className="chat-poll-hint muted">Chưa vote — bấm một lựa chọn bên dưới</p>
          ) : null}
          {hasPendingChanges && pendingKeys.size > 0 ? (
            <p className="chat-poll-pending-summary">
              Đang chọn ({pendingKeys.size}):{' '}
              <strong>
                {(pollInfo.options ?? [])
                  .filter((option) => pendingKeys.has(pollOptionVoteKey(option)))
                  .map((option) => option.label)
                  .join(', ')}
              </strong>
            </p>
          ) : null}
          <div
            className="chat-poll-options"
            role={allowsMultiple ? 'group' : 'radiogroup'}
            aria-label="Lựa chọn poll"
          >
            {pollInfo.options.map((option) => {
              const chosen = isOptionChosen(option)
              const voters = option.voters ?? 0
              const showStats =
                pollInfo.can_view_stats && (voters > 0 || maxVoters > 0)
              const percent = showStats
                ? pollVoterPercent(voters, pollInfo.total_voters ?? maxVoters)
                : 0
              return (
                <button
                  key={pollOptionVoteKey(option)}
                  type="button"
                  className={`chat-poll-option${chosen ? ' chat-poll-option--chosen' : ''}`}
                  disabled={disabled || voting || pollInfo.closed}
                  aria-pressed={chosen}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleOptionClick(option)
                  }}
                >
                  {showStats ? (
                    <span
                      className="chat-poll-option-bar"
                      style={{ width: `${Math.max(percent, chosen ? 8 : 0)}%` }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="chat-poll-option-num">
                    {chosen ? '✓' : allowsMultiple ? '+' : option.index}
                  </span>
                  <span className="chat-poll-option-content">
                    <span className="chat-poll-option-label">{option.label}</span>
                    {showStats ? (
                      <span className="chat-poll-option-voters muted">
                        {voters} · {percent}%
                      </span>
                    ) : chosen ? (
                      <span className="chat-poll-option-voters muted">Đã chọn</span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
          {allowsMultiple && !pollInfo.closed ? (
            <div className="chat-poll-actions">
              <button
                type="button"
                className="btn btn--sm btn--primary chat-poll-submit"
                disabled={disabled || voting || !hasPendingChanges}
                onClick={(event) => {
                  event.stopPropagation()
                  void submitMultipleVote()
                }}
              >
                {voting
                  ? 'Đang gửi…'
                  : `Gửi vote${pendingKeys.size > 0 ? ` (${pendingKeys.size})` : ''}`}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {!loading && !error && pollInfo && pollInfo.options.length === 0 ? (
        <p className="chat-poll-state muted">Poll không có lựa chọn.</p>
      ) : null}
    </div>
  )
}