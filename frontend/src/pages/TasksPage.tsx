import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { StatusBadge } from '../components/StatusBadge'
import type { CheckSessionItem } from '../types/api'
import { DEFAULT_QUICK_REACTIONS } from '../utils/reactions'
import {
  actionsForGroup,
  getActionMeta,
  isActionAllowed,
  parseTelegramLink,
  TASK_ACTION_GROUPS,
  type TaskAction,
  type TaskActionGroup,
} from '../utils/telegramLink'
import {
  runTaskQueue,
  type TaskProgressRow,
  type TaskRowStatus,
} from '../utils/taskRunner'

function statusLabel(status: TaskRowStatus): string {
  const map: Record<TaskRowStatus, string> = {
    pending: 'Chờ',
    running: 'Đang chạy',
    success: 'Xong',
    error: 'Lỗi',
    skipped: 'Bỏ qua',
    cancelled: 'Đã dừng',
  }
  return map[status]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TasksPage() {
  const [sessions, setSessions] = useState<string[]>([])
  const [checkResults, setCheckResults] = useState<CheckSessionItem[]>([])
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set())
  const [targetLink, setTargetLink] = useState('')
  const [actionGroup, setActionGroup] = useState<TaskActionGroup>('reactions')
  const [action, setAction] = useState<TaskAction>('react')
  const [emoji, setEmoji] = useState<string>(DEFAULT_QUICK_REACTIONS[0])
  const [text, setText] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [delaySeconds, setDelaySeconds] = useState(5)
  const [delayMinSeconds, setDelayMinSeconds] = useState(3)
  const [delayMaxSeconds, setDelayMaxSeconds] = useState(8)
  const [useRandomDelay, setUseRandomDelay] = useState(false)
  const [retryAttempts, setRetryAttempts] = useState(1)
  const [stopAfterConsecutiveErrors, setStopAfterConsecutiveErrors] = useState(0)
  const [preCheckLive, setPreCheckLive] = useState(true)
  const [pipelineStepDelaySeconds, setPipelineStepDelaySeconds] = useState(3)
  const [showRunOptions, setShowRunOptions] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [checking, setChecking] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<TaskProgressRow[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const parsedLink = useMemo(() => parseTelegramLink(targetLink), [targetLink])
  const actionMeta = useMemo(() => getActionMeta(action), [action])

  const sessionRows = useMemo(() => {
    const statusMap = new Map(checkResults.map((item) => [item.phone, item]))
    return sessions.map((phone) => ({
      phone,
      check: statusMap.get(phone) ?? null,
    }))
  }, [sessions, checkResults])

  const activeCount = useMemo(
    () => checkResults.filter((item) => item.status === 'active').length,
    [checkResults],
  )

  const groupActions = useMemo(() => actionsForGroup(actionGroup), [actionGroup])

  const selectedList = useMemo(
    () => sessions.filter((phone) => selectedPhones.has(phone)),
    [sessions, selectedPhones],
  )

  const progressStats = useMemo(() => {
    const done = progress.filter((row) => row.status === 'success').length
    const failed = progress.filter((row) => row.status === 'error').length
    const skipped = progress.filter((row) => row.status === 'skipped').length
    const runningCount = progress.filter((row) => row.status === 'running').length
    const total = progress.length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { done, failed, skipped, runningCount, total, pct }
  }, [progress])

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    setError('')
    try {
      const res = await api.listSessions()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được sessions')
        return
      }
      setSessions(res.data.sessions)
      setSelectedPhones((prev) => {
        const next = new Set<string>()
        for (const phone of res.data!.sessions) {
          if (prev.has(phone)) next.add(phone)
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (action !== 'send-media') {
      setMediaFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [action])

  function togglePhone(phone: string) {
    setSelectedPhones((prev) => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone)
      else next.add(phone)
      return next
    })
  }

  function selectAll() {
    setSelectedPhones(new Set(sessions))
  }

  function selectActiveOnly() {
    const active = new Set(
      checkResults.filter((item) => item.status === 'active').map((item) => item.phone),
    )
    setSelectedPhones(active)
  }

  function clearSelection() {
    setSelectedPhones(new Set())
  }

  function selectCategory(group: TaskActionGroup) {
    const actions = actionsForGroup(group)
    setActionGroup(group)
    if (!actions.some((item) => item.id === action)) {
      setAction(actions[0]?.id ?? 'react')
    }
  }

  function selectAction(next: TaskAction) {
    setAction(next)
    setActionGroup(getActionMeta(next).group)
  }

  function isActionDisabled(item: TaskAction): boolean {
    if (item === 'leave-all') return false
    if (parsedLink.kind === 'invalid') return false
    return !isActionAllowed(parsedLink, item)
  }

  async function handleCheckSessions() {
    setChecking(true)
    setError('')
    try {
      const res = await api.checkSessions()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Kiểm tra session thất bại')
        return
      }
      setCheckResults(res.data.sessions)
      setSuccess(
        `Live: ${res.data.active} · Lỗi: ${res.data.unauthorized + res.data.error}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kết nối được API.')
    } finally {
      setChecking(false)
    }
  }

  function handleMediaChange(file: File | null) {
    setMediaFile(file)
  }

  function validateBeforeRun(): string | null {
    if (selectedList.length === 0) return 'Chọn ít nhất một tài khoản'

    if (actionMeta.requiresLink) {
      if (parsedLink.kind === 'invalid') return parsedLink.label
      if (!isActionAllowed(parsedLink, action)) {
        return `Link này không hỗ trợ "${actionMeta.label}"`
      }
      if (actionMeta.requiresMessageId && !parsedLink.messageId) {
        return 'Cần link bài post dạng t.me/channel/123'
      }
    }

    if (actionMeta.needsEmoji && !emoji.trim()) return 'Chọn emoji reaction'
    if (actionMeta.needsText && !text.trim()) return 'Nhập nội dung tin nhắn'
    if (actionMeta.needsMedia && !mediaFile) return 'Chọn file media để gửi'

    if (useRandomDelay && delayMinSeconds > delayMaxSeconds) {
      return 'Delay min phải ≤ max'
    }

    return null
  }

  async function handleRun() {
    const validationError = validateBeforeRun()
    if (validationError) {
      setError(validationError)
      return
    }

    setRunning(true)
    setError('')
    setSuccess('')
    abortRef.current = new AbortController()

    const initialRows: TaskProgressRow[] = selectedList.map((phone) => ({
      phone,
      status: 'pending',
      message: 'Chờ…',
    }))
    setProgress(initialRows)

    try {
      const finalRows = await runTaskQueue({
        phones: selectedList,
        action,
        parsed: parsedLink,
        emoji,
        text: text.trim(),
        mediaFile,
        delaySeconds,
        delayMinSeconds,
        delayMaxSeconds,
        useRandomDelay,
        retryAttempts,
        stopAfterConsecutiveErrors,
        preCheckLive,
        pipelineStepDelaySeconds,
        signal: abortRef.current.signal,
        onProgress: setProgress,
      })
      const ok = finalRows.filter((row) => row.status === 'success').length
      const fail = finalRows.filter((row) => row.status === 'error').length
      const skip = finalRows.filter((row) => row.status === 'skipped').length
      setSuccess(`Hoàn tất: ${ok} thành công, ${fail} lỗi${skip ? `, ${skip} bỏ qua` : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chạy task thất bại')
    } finally {
      setRunning(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  const currentStep =
    selectedList.length === 0 ? 1 : action === 'leave-all' || targetLink.trim() ? 3 : 2

  const needsTextField = actionMeta.needsText || action === 'send-media'

  return (
    <div className="page page--tasks">
      <header className="page-header tasks-page-header">
        <div>
          <span className="tasks-page-kicker">Bulk automation</span>
          <h1>Tác vụ hàng loạt</h1>
          <p className="page-desc">
            Chọn nhiều acc, dán link bài post hoặc group, chạy lần lượt — react,
            reply, gửi tin, join/leave và hơn thế nữa.
          </p>
        </div>
        <div className="tasks-header-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void loadSessions()}
            disabled={loadingSessions || running}
          >
            Tải lại acc
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void handleCheckSessions()}
            disabled={checking || running || sessions.length === 0}
          >
            {checking ? 'Đang check…' : 'Check live'}
          </button>
        </div>
      </header>

      <section className="stats-grid tasks-stats">
        <article className="stat-card">
          <p className="stat-label">Sessions</p>
          <p className="stat-value">{loadingSessions ? '—' : sessions.length}</p>
        </article>
        <article className="stat-card stat-card--active">
          <p className="stat-label">Đã chọn</p>
          <p className="stat-value">{selectedList.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Acc live</p>
          <p className="stat-value">
            {checkResults.length > 0 ? activeCount : '—'}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Tiến trình</p>
          <p className="stat-value">
            {progress.length > 0 ? `${progressStats.done}/${progressStats.total}` : '—'}
          </p>
        </article>
      </section>

      <nav className="tasks-steps" aria-label="Các bước thực hiện">
        <div className={`tasks-step${currentStep >= 1 ? ' tasks-step--active' : ''}`}>
          <span className="tasks-step-num">1</span>
          <span className="tasks-step-label">Chọn tài khoản</span>
        </div>
        <div className={`tasks-step${currentStep >= 2 ? ' tasks-step--active' : ''}`}>
          <span className="tasks-step-num">2</span>
          <span className="tasks-step-label">Hành động & cấu hình</span>
        </div>
        <div className={`tasks-step${currentStep >= 3 ? ' tasks-step--active' : ''}`}>
          <span className="tasks-step-num">3</span>
          <span className="tasks-step-label">Chạy & theo dõi</span>
        </div>
      </nav>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="tasks-layout">
        <section className="panel tasks-accounts-panel">
          <div className="tasks-accounts-head">
            <div>
              <h2>Tài khoản</h2>
              <p className="panel-meta">
                {selectedList.length}/{sessions.length} đã chọn
              </p>
            </div>
          </div>

          <div className="tasks-account-toolbar">
            <button type="button" className="tasks-filter-pill" onClick={selectAll}>
              Tất cả
            </button>
            <button
              type="button"
              className="tasks-filter-pill"
              onClick={selectActiveOnly}
              disabled={checkResults.length === 0}
            >
              Live
            </button>
            <button type="button" className="tasks-filter-pill" onClick={clearSelection}>
              Bỏ chọn
            </button>
          </div>

          <ul className="tasks-account-list">
            {loadingSessions ? (
              <li className="tasks-account-empty">Đang tải sessions…</li>
            ) : sessions.length === 0 ? (
              <li className="tasks-account-empty">
                <p>Chưa có session</p>
                <p className="tasks-account-empty-hint">
                  Đăng nhập ở trang Tài khoản trước.
                </p>
              </li>
            ) : (
              sessionRows.map(({ phone, check }) => {
                const selected = selectedPhones.has(phone)
                return (
                  <li key={phone}>
                    <label
                      className={`tasks-account-item${selected ? ' tasks-account-item--selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="tasks-account-check"
                        checked={selected}
                        onChange={() => togglePhone(phone)}
                        disabled={running}
                      />
                      <span className="tasks-account-main">
                        <span className="tasks-account-phone">{phone}</span>
                        {check?.username ? (
                          <span className="tasks-account-username">@{check.username}</span>
                        ) : null}
                      </span>
                      {check ? (
                        <StatusBadge status={check.status} />
                      ) : (
                        <span className="tasks-account-muted">chưa check</span>
                      )}
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <section className="panel tasks-workflow-panel">
          <div className="tasks-category-bar" role="tablist" aria-label="Nhóm hành động">
            {TASK_ACTION_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={actionGroup === group.id}
                className={`tasks-category-tab${actionGroup === group.id ? ' tasks-category-tab--active' : ''}`}
                disabled={running}
                onClick={() => selectCategory(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="tasks-action-grid">
            {groupActions.map((item) => {
              const disabled = isActionDisabled(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`tasks-action-card${action === item.id ? ' tasks-action-card--active' : ''}${disabled ? ' tasks-action-card--disabled' : ''}`}
                  disabled={running || disabled}
                  onClick={() => selectAction(item.id)}
                  title={disabled ? 'Link hiện tại không hỗ trợ' : item.hint}
                >
                  <span className="tasks-action-card-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="tasks-action-card-label">{item.label}</span>
                  {item.isPipeline ? (
                    <span className="tasks-action-card-badge">2 bước</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="tasks-workflow-body">
            <div className="tasks-action-summary">
              <span className="tasks-action-summary-icon" aria-hidden>
                {actionMeta.icon}
              </span>
              <div>
                <p className="tasks-action-summary-title">{actionMeta.label}</p>
                <p className="tasks-action-hint">{actionMeta.hint}</p>
              </div>
            </div>

            {actionMeta.requiresLink ? (
              <>
                <label className="field tasks-field">
                  <span>Link mục tiêu</span>
                  <input
                    type="url"
                    placeholder="https://t.me/channel/123 hoặc https://t.me/+invite"
                    value={targetLink}
                    onChange={(e) => setTargetLink(e.target.value)}
                    disabled={running}
                  />
                </label>

                <div
                  className={`tasks-link-preview${
                    parsedLink.kind === 'invalid' && targetLink.trim()
                      ? ' tasks-link-preview--invalid'
                      : parsedLink.kind !== 'invalid' && targetLink.trim()
                        ? ' tasks-link-preview--valid'
                        : ''
                  }`}
                >
                  <p className="tasks-link-preview-label">Phân tích link</p>
                  <p className="tasks-link-preview-text">
                    {targetLink.trim() ? parsedLink.label : 'Dán link Telegram để xem preview'}
                  </p>
                  {parsedLink.kind !== 'invalid' && targetLink.trim() ? (
                    <p className="tasks-link-preview-meta">
                      Hỗ trợ:{' '}
                      {parsedLink.supportedActions
                        .filter((item) => !item.startsWith('pipeline-'))
                        .map((item) => getActionMeta(item).label)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="tasks-no-link-banner">
                <p>
                  <strong>Leave all</strong> — rời toàn bộ group/channel của từng acc đã chọn.
                  Không cần link mục tiêu.
                </p>
              </div>
            )}

            {actionMeta.needsEmoji ? (
              <div className="field tasks-field">
                <span>Reaction</span>
                <div className="tasks-emoji-picker">
                  {DEFAULT_QUICK_REACTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`tasks-emoji-btn${emoji === item ? ' tasks-emoji-btn--active' : ''}`}
                      onClick={() => setEmoji(item)}
                      disabled={running}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {actionMeta.needsMedia ? (
              <div className="field tasks-field">
                <span>File media</span>
                <div className="tasks-file-upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf,.zip,.doc,.docx"
                    disabled={running}
                    onChange={(e) => handleMediaChange(e.target.files?.[0] ?? null)}
                  />
                  {mediaFile ? (
                    <div className="tasks-file-preview">
                      <span className="tasks-file-name">{mediaFile.name}</span>
                      <span className="tasks-file-size">{formatFileSize(mediaFile.size)}</span>
                      <button
                        type="button"
                        className="tasks-file-clear"
                        disabled={running}
                        onClick={() => {
                          setMediaFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  ) : (
                    <p className="tasks-file-hint">Ảnh, video hoặc file — dùng chung cho mọi acc</p>
                  )}
                </div>
              </div>
            ) : null}

            {needsTextField ? (
              <label className="field tasks-field">
                <span>
                  {action === 'send-media'
                    ? 'Caption (tùy chọn)'
                    : action === 'pipeline-join-send'
                      ? 'Tin nhắn sau khi join'
                      : action === 'reply' || action === 'pipeline-join-reply'
                        ? 'Nội dung reply'
                        : 'Nội dung'}
                </span>
                <textarea
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    action === 'send-media'
                      ? 'Caption kèm file (có thể để trống)…'
                      : action === 'pipeline-join-send'
                        ? 'Tin nhắn gửi vào group sau khi join…'
                        : action === 'reply' || action === 'pipeline-join-reply'
                          ? 'Nội dung reply bài post…'
                          : 'Tin nhắn gửi vào group/chat…'
                  }
                  disabled={running}
                  required={actionMeta.needsText}
                />
              </label>
            ) : null}

            {actionMeta.isPipeline ? (
              <label className="field tasks-field tasks-field--inline">
                <span>Delay giữa các bước pipeline</span>
                <div className="tasks-delay-input">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={pipelineStepDelaySeconds}
                    onChange={(e) =>
                      setPipelineStepDelaySeconds(Number(e.target.value) || 0)
                    }
                    disabled={running}
                  />
                  <span className="tasks-delay-unit">giây</span>
                </div>
              </label>
            ) : null}

            <div className="tasks-run-options">
              <button
                type="button"
                className="tasks-run-options-toggle"
                onClick={() => setShowRunOptions((prev) => !prev)}
                aria-expanded={showRunOptions}
              >
                <span>Tùy chọn chạy</span>
                <span className="tasks-run-options-chevron">
                  {showRunOptions ? '▾' : '▸'}
                </span>
              </button>

              {showRunOptions ? (
                <div className="tasks-run-options-body">
                  <label className="tasks-option-check">
                    <input
                      type="checkbox"
                      checked={preCheckLive}
                      onChange={(e) => setPreCheckLive(e.target.checked)}
                      disabled={running}
                    />
                    <span>Pre-check live trước khi chạy (bỏ qua acc die)</span>
                  </label>

                  <label className="tasks-option-check">
                    <input
                      type="checkbox"
                      checked={useRandomDelay}
                      onChange={(e) => setUseRandomDelay(e.target.checked)}
                      disabled={running}
                    />
                    <span>Random delay giữa các acc</span>
                  </label>

                  {useRandomDelay ? (
                    <div className="tasks-delay-range">
                      <label className="field tasks-field tasks-field--inline">
                        <span>Min</span>
                        <div className="tasks-delay-input">
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={delayMinSeconds}
                            onChange={(e) =>
                              setDelayMinSeconds(Number(e.target.value) || 0)
                            }
                            disabled={running}
                          />
                          <span className="tasks-delay-unit">s</span>
                        </div>
                      </label>
                      <label className="field tasks-field tasks-field--inline">
                        <span>Max</span>
                        <div className="tasks-delay-input">
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={delayMaxSeconds}
                            onChange={(e) =>
                              setDelayMaxSeconds(Number(e.target.value) || 0)
                            }
                            disabled={running}
                          />
                          <span className="tasks-delay-unit">s</span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <label className="field tasks-field tasks-field--inline">
                      <span>Delay giữa các acc</span>
                      <div className="tasks-delay-input">
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={delaySeconds}
                          onChange={(e) => setDelaySeconds(Number(e.target.value) || 0)}
                          disabled={running}
                        />
                        <span className="tasks-delay-unit">giây</span>
                      </div>
                    </label>
                  )}

                  <div className="tasks-option-row">
                    <label className="field tasks-field tasks-field--inline">
                      <span>Retry khi lỗi</span>
                      <div className="tasks-delay-input">
                        <input
                          type="number"
                          min={0}
                          max={3}
                          value={retryAttempts}
                          onChange={(e) => setRetryAttempts(Number(e.target.value) || 0)}
                          disabled={running}
                        />
                        <span className="tasks-delay-unit">lần</span>
                      </div>
                    </label>

                    <label className="field tasks-field tasks-field--inline">
                      <span>Dừng sau N lỗi liên tiếp</span>
                      <div className="tasks-delay-input">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={stopAfterConsecutiveErrors}
                          onChange={(e) =>
                            setStopAfterConsecutiveErrors(Number(e.target.value) || 0)
                          }
                          disabled={running}
                        />
                        <span className="tasks-delay-unit">0 = tắt</span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="tasks-run-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleRun()}
                disabled={running || selectedList.length === 0}
              >
                {running ? 'Đang chạy…' : `Chạy ${selectedList.length} acc`}
              </button>
              {running ? (
                <button type="button" className="btn btn--danger" onClick={handleStop}>
                  Dừng
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section className="panel tasks-progress-panel">
        <div className="tasks-progress-head">
          <div>
            <h2>Tiến trình</h2>
            <p className="panel-meta">
              {progress.length > 0
                ? `${progressStats.done} xong · ${progressStats.failed} lỗi · ${progressStats.skipped} bỏ qua`
                : 'Chưa chạy task'}
            </p>
          </div>
          {progress.length > 0 ? (
            <span className="tasks-progress-pct">{progressStats.pct}%</span>
          ) : null}
        </div>

        {progress.length > 0 ? (
          <>
            <div className="tasks-progress-bar" role="progressbar" aria-valuenow={progressStats.pct}>
              <div
                className="tasks-progress-bar-fill"
                style={{ width: `${progressStats.pct}%` }}
              />
            </div>
            <div className="table-wrap tasks-table-wrap">
              <table className="data-table tasks-progress-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Phone</th>
                    <th>Trạng thái</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((row, index) => (
                    <tr key={row.phone} className={`tasks-row--${row.status}`}>
                      <td>{index + 1}</td>
                      <td className="mono">{row.phone}</td>
                      <td>
                        <span className={`tasks-status-pill tasks-status-pill--${row.status}`}>
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="tasks-result-cell">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="tasks-progress-empty">
            <p>Chọn acc, cấu hình hành động và bấm <strong>Chạy</strong> để xem log từng tài khoản.</p>
          </div>
        )}
      </section>
    </div>
  )
}