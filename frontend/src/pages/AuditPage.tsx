import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { Pagination } from '../components/Pagination'
import { PhoneSelect } from '../components/PhoneSelect'
import { useSessionAccounts } from '../hooks/useSessionAccounts'
import type { AuditLogItem, MetadataOverviewData } from '../types/api'
import {
  AUDIT_CATEGORY_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  auditActionLabel,
  auditActionToneClass,
  auditStatusClass,
  auditStatusLabel,
  parseAuditDetail,
  type AuditCategory,
  type AuditStatusFilter,
} from '../utils/auditLabels'
import { formatDate, formatRelativeDate } from '../utils/format'

const PAGE_SIZE = 20

function categoryFromParam(value: string | null): AuditCategory {
  const match = AUDIT_CATEGORY_OPTIONS.find((item) => item.id === value)
  return match?.id ?? 'all'
}

function statusFromParam(value: string | null): AuditStatusFilter {
  const match = AUDIT_STATUS_OPTIONS.find((item) => item.id === value)
  return match?.id ?? 'all'
}

function AuditDetailCell({ detail }: { detail: string | null }) {
  const fields = parseAuditDetail(detail)
  if (fields.length === 0) return <span className="muted">—</span>

  return (
    <div className="audit-detail-chips">
      {fields.map((field) => (
        <span key={field.key} className="audit-detail-chip" title={`${field.key}: ${field.value}`}>
          <span className="audit-detail-chip-label">{field.label}</span>
          <span className="audit-detail-chip-value">{field.value}</span>
        </span>
      ))}
    </div>
  )
}

export function AuditPage() {
  const accounts = useSessionAccounts()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPhone = searchParams.get('phone') ?? ''
  const initialCategory = categoryFromParam(searchParams.get('category'))
  const initialStatus = statusFromParam(searchParams.get('status'))

  const [phoneFilter, setPhoneFilter] = useState(initialPhone)
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>(initialCategory)
  const [statusFilter, setStatusFilter] = useState<AuditStatusFilter>(initialStatus)
  const [overview, setOverview] = useState<MetadataOverviewData | null>(null)
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const actionPrefix = useMemo(() => {
    const option = AUDIT_CATEGORY_OPTIONS.find((item) => item.id === categoryFilter)
    return option?.prefix
  }, [categoryFilter])

  const statusValue = useMemo(() => {
    const option = AUDIT_STATUS_OPTIONS.find((item) => item.id === statusFilter)
    return option?.value
  }, [statusFilter])

  const hasActiveFilters = Boolean(phoneFilter || categoryFilter !== 'all' || statusFilter !== 'all')

  const loadOverview = useCallback(async () => {
    try {
      const res = await api.metadataOverview()
      if (res.success && res.data) setOverview(res.data)
    } catch {
      /* optional */
    }
  }, [])

  const loadAudit = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.listAuditLogs({
        phone: phoneFilter || undefined,
        actionPrefix,
        status: statusValue,
        limit: PAGE_SIZE,
        offset,
      })
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được audit log')
        setItems([])
        setTotal(0)
        return
      }
      if (!res.data.database_enabled) {
        setError('Database chưa bật — cấu hình DATABASE_URL trong backend/.env')
        setItems([])
        setTotal(0)
        return
      }
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được audit log')
    } finally {
      setLoading(false)
    }
  }, [phoneFilter, actionPrefix, statusValue, offset])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadAudit()
  }, [loadAudit])

  useEffect(() => {
    const next: Record<string, string> = {}
    const phone = phoneFilter.trim()
    if (phone) next.phone = phone
    if (categoryFilter !== 'all') next.category = categoryFilter
    if (statusFilter !== 'all') next.status = statusFilter
    setSearchParams(next, { replace: true })
  }, [phoneFilter, categoryFilter, statusFilter, setSearchParams])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  const stats = useMemo(
    () => ({
      sessions: overview?.session_meta_count ?? 0,
      audits: overview?.audit_log_count ?? 0,
      scans: overview?.group_scan_count ?? 0,
    }),
    [overview],
  )

  const recentAudit = overview?.recent_audit ?? []
  const showRecent = !hasActiveFilters && recentAudit.length > 0

  function resetFilters() {
    setPhoneFilter('')
    setCategoryFilter('all')
    setStatusFilter('all')
    setOffset(0)
  }

  function setCategory(next: AuditCategory) {
    setCategoryFilter(next)
    setOffset(0)
  }

  function setStatus(next: AuditStatusFilter) {
    setStatusFilter(next)
    setOffset(0)
  }

  return (
    <div className="page page--audit">
      <header className="page-header">
        <div>
          <span className="audit-page-kicker">PostgreSQL metadata</span>
          <h1>Nhật ký hoạt động</h1>
          <p className="page-desc">
            Login, join/leave group, quét nhóm — lưu trong <code>audit_logs</code>. Xem chi tiết
            từng acc ở <Link to="/sessions">Sessions</Link>.
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => void loadAudit()}>
          Làm mới
        </button>
      </header>

      <Alert type="error" message={error} />

      <section className="stats-grid audit-stats">
        <article className="stat-card">
          <p className="stat-label">Session đã lưu</p>
          <p className="stat-value">{stats.sessions}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Tổng audit</p>
          <p className="stat-value">{stats.audits}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Lần quét nhóm</p>
          <p className="stat-value">{stats.scans}</p>
        </article>
        <article className="stat-card stat-card--active">
          <p className="stat-label">Kết quả lọc</p>
          <p className="stat-value">{total}</p>
        </article>
      </section>

      {showRecent ? (
        <section className="panel audit-recent-panel">
          <div className="audit-recent-head">
            <h2>Hoạt động gần đây</h2>
            <p className="panel-meta">{recentAudit.length} bản ghi mới nhất</p>
          </div>
          <ul className="audit-recent-list">
            {recentAudit.map((row) => (
              <li key={row.id} className="audit-recent-item">
                <span className={`audit-recent-dot ${auditActionToneClass(row.action)}`} />
                <div className="audit-recent-body">
                  <span className={`audit-action ${auditActionToneClass(row.action)}`}>
                    {auditActionLabel(row.action)}
                  </span>
                  <span className="audit-recent-meta muted">
                    <Link to={`/audit?phone=${encodeURIComponent(row.phone)}`} className="mono">
                      {row.phone}
                    </Link>
                    {' · '}
                    <time dateTime={row.created_at} title={formatDate(row.created_at)}>
                      {formatRelativeDate(row.created_at)}
                    </time>
                  </span>
                </div>
                <span className={`audit-status ${auditStatusClass(row.status)}`}>
                  {auditStatusLabel(row.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel audit-panel">
        <div className="panel-head audit-panel-head">
          <div>
            <h2>Audit log</h2>
            <p className="panel-meta">
              {hasActiveFilters
                ? `${total} bản ghi khớp bộ lọc`
                : 'Tất cả hành động được ghi tự động'}
            </p>
          </div>
          <div className="audit-filters">
            <PhoneSelect
              value={phoneFilter}
              onChange={(value) => {
                setPhoneFilter(value)
                setOffset(0)
              }}
              allowManual
              required={false}
              label="Lọc theo acc"
              sessions={accounts.sessions}
              metaByPhone={accounts.metaByPhone}
              loading={accounts.loading}
            />
            {hasActiveFilters ? (
              <button type="button" className="btn btn--sm btn--ghost" onClick={resetFilters}>
                Xóa lọc
              </button>
            ) : null}
          </div>
        </div>

        <div className="audit-toolbar">
          <div className="audit-filter-row">
            <span className="audit-filter-label">Loại</span>
            <div className="audit-filter-pills">
              {AUDIT_CATEGORY_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`audit-filter-pill${categoryFilter === item.id ? ' audit-filter-pill--active' : ''}`}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="audit-filter-row">
            <span className="audit-filter-label">Trạng thái</span>
            <div className="audit-filter-pills">
              {AUDIT_STATUS_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`audit-filter-pill${statusFilter === item.id ? ' audit-filter-pill--active' : ''}`}
                  onClick={() => setStatus(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>{hasActiveFilters ? 'Không có bản ghi khớp bộ lọc.' : 'Chưa có bản ghi audit.'}</p>
            <p className="muted">
              {hasActiveFilters
                ? 'Thử bỏ bớt bộ lọc hoặc chọn acc khác.'
                : 'Đăng nhập acc, quét nhóm hoặc join/leave — hành động sẽ được ghi tự động khi DB bật.'}
            </p>
            {hasActiveFilters ? (
              <button type="button" className="btn btn--sm btn--ghost" onClick={resetFilters}>
                Xóa tất cả lọc
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table data-table--audit">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Acc</th>
                    <th>Hành động</th>
                    <th>Trạng thái</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className="audit-cell-time">
                        <time dateTime={row.created_at} title={formatDate(row.created_at)}>
                          {formatRelativeDate(row.created_at)}
                        </time>
                        <span className="audit-cell-time-full muted">{formatDate(row.created_at)}</span>
                      </td>
                      <td>
                        <Link to={`/audit?phone=${encodeURIComponent(row.phone)}`} className="mono">
                          {row.phone}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={`audit-action ${auditActionToneClass(row.action)}`}
                          title={row.action}
                        >
                          {auditActionLabel(row.action)}
                        </span>
                        {row.resource && row.resource !== row.phone ? (
                          <span className="audit-resource muted">{row.resource}</span>
                        ) : null}
                      </td>
                      <td>
                        <span className={`audit-status ${auditStatusClass(row.status)}`}>
                          {auditStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="audit-cell-detail">
                        <AuditDetailCell detail={row.detail} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > PAGE_SIZE ? (
              <Pagination
                page={currentPage}
                totalPages={pageCount}
                from={offset + 1}
                to={Math.min(offset + PAGE_SIZE, total)}
                total={total}
                onPageChange={(page) => setOffset((page - 1) * PAGE_SIZE)}
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}