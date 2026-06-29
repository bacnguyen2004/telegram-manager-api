import { useMemo, useState } from 'react'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { Pagination } from '../components/Pagination'
import { PhoneSelect } from '../components/PhoneSelect'
import { usePagination } from '../hooks/usePagination'
import type { GroupItem } from '../types/api'

type KindFilter = 'all' | 'group' | 'channel'
type SortKey = 'title' | 'members' | 'type'
type SortDir = 'asc' | 'desc'
type OpsTab = 'join' | 'leave' | 'leave-all'

const FILTER_OPTIONS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'group', label: 'Groups' },
  { id: 'channel', label: 'Channels' },
]

function formatMembers(count: number): string {
  if (!count) return '—'
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString('vi-VN')
}

function groupRef(group: GroupItem): string {
  return group.link || (group.username ? `@${group.username}` : String(group.id))
}

function GroupTypeIcon({ isChannel }: { isChannel: boolean }) {
  if (isChannel) {
    return (
      <svg className="groups-type-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 10v4m0-4 8-3v10l-8-3m8 3 4-1.5V11.5L12 10"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg className="groups-type-svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5M14 19c0-2 1.5-3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function sortGroups(
  items: GroupItem[],
  key: SortKey,
  dir: SortDir,
): GroupItem[] {
  const sorted = [...items].sort((a, b) => {
    if (key === 'title') return a.title.localeCompare(b.title, 'vi')
    if (key === 'members') return (a.members_count || 0) - (b.members_count || 0)
    const typeA = a.is_channel ? 1 : 0
    const typeB = b.is_channel ? 1 : 0
    return typeA - typeB
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function GroupsPage() {
  const [phone, setPhone] = useState('')
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [filter, setFilter] = useState<KindFilter>('all')
  const [search, setSearch] = useState('')
  const [opsTab, setOpsTab] = useState<OpsTab>('join')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [groupLink, setGroupLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [leavingId, setLeavingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [info, setInfo] = useState('')
  const [leaveAllCount, setLeaveAllCount] = useState<number | null>(null)

  const filterCounts = useMemo(() => {
    const tallies: Record<KindFilter, number> = {
      all: groups.length,
      group: 0,
      channel: 0,
    }
    for (const group of groups) {
      if (group.is_channel) tallies.channel += 1
      else tallies.group += 1
    }
    return tallies
  }, [groups])

  const totalMembers = useMemo(
    () => groups.reduce((sum, group) => sum + (group.members_count || 0), 0),
    [groups],
  )

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matched = groups.filter((group) => {
      if (filter === 'group' && group.is_channel) return false
      if (filter === 'channel' && !group.is_channel) return false
      if (!q) return true
      return (
        group.title.toLowerCase().includes(q) ||
        group.username.toLowerCase().includes(q) ||
        group.type.toLowerCase().includes(q) ||
        String(group.id).includes(q)
      )
    })
    return sortGroups(matched, sortKey, sortDir)
  }, [groups, filter, search, sortKey, sortDir])

  const {
    items: pagedGroups,
    page,
    setPage,
    totalPages,
    from,
    to,
    pageSize,
    setPageSize,
  } = usePagination(filteredGroups, 20)

  function resetAlerts() {
    setError('')
    setSuccess('')
    setInfo('')
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'members' ? 'desc' : 'asc')
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  async function handleLoadGroups(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    resetAlerts()
    setGroups([])
    try {
      const res = await api.listGroups(phone)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được danh sách nhóm')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      setGroups(res.data.groups)
      setSuccess(`Quét xong — ${res.data.total} nhóm / channel`)
    } catch {
      setError('Không kết nối được API.')
    } finally {
      setLoading(false)
    }
  }

  async function reloadGroups() {
    if (!phone) return
    const res = await api.listGroups(phone)
    if (res.success && res.data?.status === 'success') {
      setGroups(res.data.groups)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading(true)
    resetAlerts()
    try {
      const res = await api.joinGroup(phone, groupLink.trim())
      if (!res.success || !res.data) {
        setError(res.error ?? 'Join thất bại')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      if (res.data.status === 'info') {
        setInfo(res.data.message)
        return
      }
      setSuccess(res.data.message)
      setGroupLink('')
      await reloadGroups()
    } catch {
      setError('Không kết nối được API.')
    } finally {
      setActionLoading(false)
    }
  }

  async function leaveGroupTarget(target: string, removeId?: number) {
    if (!phone || !target.trim()) return
    setActionLoading(true)
    if (removeId !== undefined) setLeavingId(removeId)
    resetAlerts()
    try {
      const res = await api.leaveGroup(phone, target.trim())
      if (!res.success || !res.data) {
        setError(res.error ?? 'Rời nhóm thất bại')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      setSuccess(res.data.message)
      if (removeId !== undefined) {
        setGroups((prev) => prev.filter((item) => item.id !== removeId))
      }
      setGroupLink('')
    } catch {
      setError('Không kết nối được API.')
    } finally {
      setActionLoading(false)
      setLeavingId(null)
    }
  }

  async function handleLeave(e: React.FormEvent) {
    e.preventDefault()
    await leaveGroupTarget(groupLink)
  }

  async function handleLeaveRow(group: GroupItem) {
    const confirmed = window.confirm(`Rời "${group.title}"?`)
    if (!confirmed) return
    await leaveGroupTarget(groupRef(group), group.id)
  }

  async function handleLeaveAll(e: React.FormEvent) {
    e.preventDefault()
    const confirmed = window.confirm(
      `Rời TẤT CẢ nhóm/channel của ${phone}?\n\nHành động này không hoàn tác được.`,
    )
    if (!confirmed) return

    setActionLoading(true)
    resetAlerts()
    setLeaveAllCount(null)
    try {
      const res = await api.leaveAllGroups(phone)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Leave all thất bại')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      setLeaveAllCount(res.data.left_count)
      setSuccess(res.data.message)
      setGroups([])
    } catch {
      setError('Không kết nối được API.')
    } finally {
      setActionLoading(false)
    }
  }

  const hasData = groups.length > 0

  return (
    <div className={`page page--groups${hasData ? ' page--groups-active' : ''}`}>
      <header className="page-header groups-page-header">
        <div>
          <span className="groups-page-kicker">Community manager</span>
          <h1>Groups & Channels</h1>
          <p className="page-desc">
            Quản lý membership — join, rời, lọc theo bảng. Không phải giao diện chat.
          </p>
        </div>
        <form className="groups-session-bar" onSubmit={(e) => void handleLoadGroups(e)}>
          <PhoneSelect value={phone} onChange={setPhone} allowManual={false} />
          <button type="submit" className="btn btn--primary" disabled={loading || !phone}>
            {loading ? 'Đang quét…' : hasData ? 'Quét lại' : 'Quét nhóm'}
          </button>
        </form>
      </header>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />
      {info && <Alert type="info" message={info} />}

      <section className="stats-grid groups-stats">
        <article className="stat-card stat-card--groups">
          <p className="stat-label">Groups</p>
          <p className="stat-value">{loading ? '—' : filterCounts.group}</p>
        </article>
        <article className="stat-card stat-card--channels">
          <p className="stat-label">Channels</p>
          <p className="stat-value">{loading ? '—' : filterCounts.channel}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Thành viên (ước tính)</p>
          <p className="stat-value">{loading ? '—' : formatMembers(totalMembers)}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Đang hiển thị</p>
          <p className="stat-value">{hasData ? filteredGroups.length : '—'}</p>
        </article>
      </section>

      <section className="panel groups-ops-panel">
        <div className="groups-ops-tabs" role="tablist" aria-label="Thao tác nhóm">
          <button
            type="button"
            role="tab"
            aria-selected={opsTab === 'join'}
            className={`groups-ops-tab${opsTab === 'join' ? ' groups-ops-tab--active' : ''}`}
            onClick={() => setOpsTab('join')}
          >
            Join nhóm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={opsTab === 'leave'}
            className={`groups-ops-tab${opsTab === 'leave' ? ' groups-ops-tab--active' : ''}`}
            onClick={() => setOpsTab('leave')}
          >
            Rời 1 nhóm
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={opsTab === 'leave-all'}
            className={`groups-ops-tab groups-ops-tab--danger${opsTab === 'leave-all' ? ' groups-ops-tab--active' : ''}`}
            onClick={() => setOpsTab('leave-all')}
          >
            Rời tất cả
          </button>
        </div>

        {opsTab === 'join' && (
          <form className="groups-ops-form" onSubmit={(e) => void handleJoin(e)}>
            <label className="field groups-ops-field">
              <span>Link invite</span>
              <input
                type="url"
                placeholder="https://t.me/example_group"
                value={groupLink}
                onChange={(e) => setGroupLink(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={actionLoading || !phone}
            >
              {actionLoading ? 'Đang join…' : 'Join'}
            </button>
          </form>
        )}

        {opsTab === 'leave' && (
          <form className="groups-ops-form" onSubmit={(e) => void handleLeave(e)}>
            <label className="field groups-ops-field">
              <span>Link, @username hoặc ID</span>
              <input
                type="text"
                placeholder="https://t.me/example_group"
                value={groupLink}
                onChange={(e) => setGroupLink(e.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className="btn btn--danger"
              disabled={actionLoading || !phone}
            >
              {actionLoading ? 'Đang rời…' : 'Rời'}
            </button>
          </form>
        )}

        {opsTab === 'leave-all' && (
          <div className="groups-ops-form groups-ops-form--danger">
            <p className="groups-ops-warning">
              Rời <strong>tất cả</strong> group và channel của session — không hoàn tác.
            </p>
            <form onSubmit={(e) => void handleLeaveAll(e)}>
              <button
                type="submit"
                className="btn btn--danger"
                disabled={actionLoading || !phone}
              >
                {actionLoading ? 'Đang rời từng nhóm…' : 'Leave tất cả'}
              </button>
            </form>
            {leaveAllCount !== null && (
              <p className="groups-leaveall-note">
                Đã rời <strong>{leaveAllCount}</strong> nhóm / channel
              </p>
            )}
          </div>
        )}
      </section>

      <section className="panel groups-directory-panel">
        <div className="groups-directory-top">
          <div className="groups-directory-title">
            <h2>Danh mục đã join</h2>
            <span className="panel-meta">
              {hasData
                ? `${filteredGroups.length} / ${groups.length} mục`
                : 'Chưa quét session'}
            </span>
          </div>
        </div>

        {hasData && (
          <div className="groups-directory-toolbar">
            <input
              type="search"
              className="groups-directory-search"
              placeholder="Tìm tên, @username, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="groups-filter-pills">
              {FILTER_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`groups-filter-pill${filter === item.id ? ' groups-filter-pill--active' : ''}`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span>{filterCounts[item.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasData && !loading && (
          <div className="groups-directory-empty">
            <div className="groups-directory-empty-icon" aria-hidden>
              <svg viewBox="0 0 64 64" fill="none">
                <rect x="8" y="14" width="48" height="36" rx="6" stroke="currentColor" strokeWidth="2" />
                <path d="M8 24h48M20 34h24M20 42h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>Chưa có dữ liệu nhóm</h3>
            <p className="muted">
              Chọn session ở góc phải và bấm <strong>Quét nhóm</strong> để lấy danh sách từ Telegram.
            </p>
          </div>
        )}

        {loading && (
          <div className="empty-state">Đang quét nhóm từ session…</div>
        )}

        {hasData && filteredGroups.length === 0 && (
          <div className="empty-state">Không có nhóm khớp bộ lọc.</div>
        )}

        {hasData && pagedGroups.length > 0 && (
          <>
            <div className="table-wrap groups-table-wrap">
              <table className="data-table data-table--groups">
                <thead>
                  <tr>
                    <th className="col-type">
                      <button type="button" className="groups-th-btn" onClick={() => toggleSort('type')}>
                        Loại{sortIndicator('type')}
                      </button>
                    </th>
                    <th>
                      <button type="button" className="groups-th-btn" onClick={() => toggleSort('title')}>
                        Tên nhóm{sortIndicator('title')}
                      </button>
                    </th>
                    <th>Username</th>
                    <th className="col-members">
                      <button type="button" className="groups-th-btn" onClick={() => toggleSort('members')}>
                        Thành viên{sortIndicator('members')}
                      </button>
                    </th>
                    <th>Telegram ID</th>
                    <th className="col-actions" />
                  </tr>
                </thead>
                <tbody>
                  {pagedGroups.map((group) => {
                    const isLeaving = leavingId === group.id
                    return (
                      <tr key={group.id} className={group.is_channel ? 'groups-row--channel' : 'groups-row--group'}>
                        <td>
                          <span
                            className={`groups-type-badge${group.is_channel ? ' groups-type-badge--channel' : ' groups-type-badge--group'}`}
                          >
                            <GroupTypeIcon isChannel={group.is_channel} />
                            {group.is_channel ? 'Channel' : 'Group'}
                          </span>
                        </td>
                        <td>
                          <span className="groups-row-title">{group.title || '—'}</span>
                          <span className="groups-row-sub">{group.type || 'Private'}</span>
                        </td>
                        <td>
                          {group.username ? (
                            <code className="groups-username">@{group.username}</code>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="groups-members-cell">{formatMembers(group.members_count)}</td>
                        <td>
                          <code className="groups-id">{group.id}</code>
                        </td>
                        <td className="cell-actions">
                          {group.link && (
                            <a
                              className="btn btn--sm btn--ghost"
                              href={group.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Mở TG
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            disabled={actionLoading || isLeaving || !phone}
                            onClick={() => void handleLeaveRow(group)}
                          >
                            {isLeaving ? '…' : 'Rời'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              className="pagination--groups"
              page={page}
              totalPages={totalPages}
              total={filteredGroups.length}
              from={from}
              to={to}
              onPageChange={setPage}
              pageSize={pageSize}
              pageSizeOptions={[20, 50, 100]}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </section>
    </div>
  )
}