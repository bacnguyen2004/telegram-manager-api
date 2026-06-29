import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { StatusBadge } from '../components/StatusBadge'
import type { CheckSessionItem, SessionMeData } from '../types/api'

export function SessionsPage() {
  const [sessions, setSessions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [checkResults, setCheckResults] = useState<CheckSessionItem[]>([])
  const [stats, setStats] = useState({ active: 0, unauthorized: 0, error: 0 })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [meData, setMeData] = useState<SessionMeData | null>(null)
  const [meLoading, setMeLoading] = useState(false)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.listSessions()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được danh sách session')
        return
      }
      setSessions(res.data.sessions)
      setTotal(res.data.total)
    } catch {
      setError('Không kết nối được API. Kiểm tra backend đang chạy port 8001.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  async function handleCheckAll() {
    setChecking(true)
    setError('')
    try {
      const res = await api.checkSessions()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Kiểm tra session thất bại')
        return
      }
      setCheckResults(res.data.sessions)
      setStats({
        active: res.data.active,
        unauthorized: res.data.unauthorized,
        error: res.data.error,
      })
    } catch {
      setError('Không kết nối được API khi kiểm tra session.')
    } finally {
      setChecking(false)
    }
  }

  async function handleViewMe(phone: string) {
    setSelectedPhone(phone)
    setMeData(null)
    setMeLoading(true)
    try {
      const res = await api.getSessionMe(phone)
      if (!res.success || !res.data) {
        setMeData({
          status: 'error',
          phone,
          me_id: null,
          first_name: null,
          last_name: null,
          username: null,
          message: res.error ?? 'Không lấy được thông tin',
        })
        return
      }
      setMeData(res.data)
    } catch {
      setMeData({
        status: 'error',
        phone,
        me_id: null,
        first_name: null,
        last_name: null,
        username: null,
        message: 'Lỗi kết nối API',
      })
    } finally {
      setMeLoading(false)
    }
  }

  function closeModal() {
    setSelectedPhone(null)
    setMeData(null)
  }

  const resultByPhone = new Map(checkResults.map((item) => [item.phone, item]))

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Sessions</h1>
          <p className="page-desc">
            Quản lý file <code>.session</code> Telegram trên server
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn--ghost" onClick={() => void loadSessions()}>
            Làm mới
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={checking || loading}
            onClick={() => void handleCheckAll()}
          >
            {checking ? 'Đang kiểm tra…' : 'Kiểm tra tất cả'}
          </button>
        </div>
      </header>

      <Alert type="error" message={error} />

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Tổng session</p>
          <p className="stat-value">{loading ? '—' : total}</p>
        </article>
        <article className="stat-card stat-card--active">
          <p className="stat-label">Active</p>
          <p className="stat-value">{checkResults.length ? stats.active : '—'}</p>
        </article>
        <article className="stat-card stat-card--warn">
          <p className="stat-label">Unauthorized</p>
          <p className="stat-value">{checkResults.length ? stats.unauthorized : '—'}</p>
        </article>
        <article className="stat-card stat-card--error">
          <p className="stat-label">Lỗi</p>
          <p className="stat-value">{checkResults.length ? stats.error : '—'}</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Danh sách</h2>
          {!loading && <span className="panel-meta">{sessions.length} session</span>}
        </div>

        {loading ? (
          <div className="empty-state">Đang tải…</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có session nào.</p>
            <p>
              Vào <strong>Đăng nhập mới</strong> để tạo file <code>.session</code>.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Username</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((phone) => {
                  const checked = resultByPhone.get(phone)
                  return (
                    <tr key={phone}>
                      <td>
                        <span className="phone">{phone}</span>
                      </td>
                      <td>
                        {checked ? (
                          <StatusBadge status={checked.status} />
                        ) : (
                          <span className="muted">Chưa kiểm tra</span>
                        )}
                      </td>
                      <td>{checked?.username ?? '—'}</td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          onClick={() => void handleViewMe(phone)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedPhone && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{selectedPhone}</h3>
              <button type="button" className="btn btn--icon" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {meLoading ? (
                <p className="muted">Đang tải thông tin tài khoản…</p>
              ) : meData ? (
                <>
                  <div className="detail-row">
                    <span>Trạng thái</span>
                    <StatusBadge status={meData.status} />
                  </div>
                  <div className="detail-row">
                    <span>Telegram ID</span>
                    <strong>{meData.me_id ?? '—'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Họ tên</span>
                    <strong>
                      {[meData.first_name, meData.last_name].filter(Boolean).join(' ') || '—'}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Username</span>
                    <strong>{meData.username ? `@${meData.username}` : '—'}</strong>
                  </div>
                  {meData.message && (
                    <p className="detail-message">{meData.message}</p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}