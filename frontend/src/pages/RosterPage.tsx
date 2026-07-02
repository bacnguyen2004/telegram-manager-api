import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './RosterPage.css'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import type { RosterRowItem } from '../types/api'
import { formatDate, formatRelativeDate } from '../utils/format'
import { formatUsername } from '../utils/sessionDisplay'
import {
  buildRosterCsv,
  getCellValue,
  parseRosterCsvForApi,
  rosterDataToStore,
  setCellValue,
  type RosterColumn,
  type RosterStore,
} from '../utils/rosterStorage'

type FixedSortKey = 'phone' | 'name' | 'username' | 'status' | 'synced'
type SortKey = FixedSortKey | string
type SortDir = 'asc' | 'desc'

interface RosterDisplayRow {
  phone: string
  name: string
  username: string
  status: string
  synced: string
}

const FIXED_COLUMNS: { key: FixedSortKey; label: string; className: string }[] = [
  { key: 'phone', label: 'Số ĐT', className: 'roster-col--fixed roster-col--phone' },
  { key: 'name', label: 'Tên', className: 'roster-col--fixed' },
  { key: 'username', label: 'Username', className: 'roster-col--fixed' },
  { key: 'status', label: 'Trạng thái', className: 'roster-col--fixed' },
  { key: 'synced', label: 'Kiểm tra', className: 'roster-col--fixed' },
]

const PATCH_DEBOUNCE_MS = 600
const DEFAULT_PAGE_SIZE = 20

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'vi', { sensitivity: 'base', numeric: true })
}

function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return '↕'
  return dir === 'asc' ? '↑' : '↓'
}

function toDisplayRow(row: RosterRowItem): RosterDisplayRow {
  const name = row.display_name?.trim() || '—'
  const username = formatUsername(row.username) ?? '—'
  const status = row.status && row.status !== 'unknown' ? row.status : '—'
  const synced = row.last_synced_at ?? row.imported_at ?? ''
  return { phone: row.phone, name, username, status, synced }
}

export function RosterPage() {
  const [store, setStore] = useState<RosterStore>({ columns: [], rows: {} })
  const [sheetRows, setSheetRows] = useState<RosterRowItem[]>([])
  const [databaseEnabled, setDatabaseEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('phone')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [renameColumn, setRenameColumn] = useState<RosterColumn | null>(null)
  const [newColumnLabel, setNewColumnLabel] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [dataVersion, setDataVersion] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)
  const patchTimersRef = useRef<Map<string, number>>(new Map())

  const loadRoster = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getRoster()
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không tải được sổ acc')
        setSheetRows([])
        setStore({ columns: [], rows: {} })
        return
      }
      setDatabaseEnabled(res.data.database_enabled)
      if (!res.data.database_enabled) {
        setError('Database chưa bật — cấu hình DATABASE_URL trong backend/.env')
        setSheetRows([])
        setStore({ columns: [], rows: {} })
        return
      }
      setSheetRows(res.data.rows ?? [])
      setStore(rosterDataToStore(res.data.columns, res.data.rows))
      setDataVersion((value) => value + 1)
      setPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sổ acc')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(''), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  useEffect(() => {
    return () => {
      for (const timer of patchTimersRef.current.values()) {
        window.clearTimeout(timer)
      }
      patchTimersRef.current.clear()
    }
  }, [])

  const tableRows = useMemo<RosterDisplayRow[]>(() => {
    return sheetRows.map(toDisplayRow)
  }, [sheetRows])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return tableRows

    return tableRows.filter((row) => {
      const haystack = [
        row.phone,
        row.name,
        row.username,
        row.status,
        ...store.columns.map((col) => getCellValue(store, row.phone, col.key)),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [tableRows, search, store])

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows]
    rows.sort((a, b) => {
      let left = ''
      let right = ''

      if (sortKey === 'phone') {
        left = a.phone
        right = b.phone
      } else if (sortKey === 'name') {
        left = a.name
        right = b.name
      } else if (sortKey === 'username') {
        left = a.username
        right = b.username
      } else if (sortKey === 'status') {
        left = a.status
        right = b.status
      } else if (sortKey === 'synced') {
        left = a.synced
        right = b.synced
      } else {
        left = getCellValue(store, a.phone, sortKey)
        right = getCellValue(store, b.phone, sortKey)
      }

      const cmp = compareText(left, right)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [filteredRows, sortKey, sortDir, store])

  const filledCellCount = useMemo(() => {
    let count = 0
    for (const fields of Object.values(store.rows)) {
      count += Object.values(fields).filter((value) => value.trim()).length
    }
    return count
  }, [store.rows])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))

  const pagedRows = useMemo(() => {
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, page, pageSize, totalPages])

  const pageFrom = sortedRows.length === 0 ? 0 : (Math.min(page, totalPages) - 1) * pageSize + 1
  const pageTo = Math.min(sortedRows.length, Math.min(page, totalPages) * pageSize)

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const schedulePatch = useCallback((phone: string, columnKey: string, value: string) => {
    const timerKey = `${phone}:${columnKey}`
    const existing = patchTimersRef.current.get(timerKey)
    if (existing) window.clearTimeout(existing)

    const timer = window.setTimeout(() => {
      patchTimersRef.current.delete(timerKey)
      setSaving(true)
      void api
        .patchRosterRow(phone, { [columnKey]: value })
        .then((res) => {
          if (!res.success) {
            setError(res.error ?? 'Không lưu được ô')
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Không lưu được ô')
        })
        .finally(() => setSaving(false))
    }, PATCH_DEBOUNCE_MS)

    patchTimersRef.current.set(timerKey, timer)
  }, [])

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const handleCellBlur = useCallback(
    (phone: string, columnKey: string, value: string) => {
      setStore((prev) => {
        const previous = getCellValue(prev, phone, columnKey)
        if (previous === value) return prev
        schedulePatch(phone, columnKey, value)
        return setCellValue(prev, phone, columnKey, value)
      })
    },
    [schedulePatch],
  )

  const handleAddColumn = useCallback(async () => {
    const label = newColumnLabel.trim()
    if (!label) return
    setError('')
    try {
      const res = await api.createRosterColumn(label)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không thêm được cột')
        return
      }
      setStore((prev) => ({
        ...prev,
        columns: [
          ...prev.columns,
          { key: res.data!.column_key, label: res.data!.label },
        ],
      }))
      setNewColumnLabel('')
      setAddColumnOpen(false)
      setSuccess(`Đã thêm cột "${label}"`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được cột')
    }
  }, [newColumnLabel])

  const handleRenameColumn = useCallback(async () => {
    if (!renameColumn) return
    const label = newColumnLabel.trim()
    if (!label || label === renameColumn.label) {
      setRenameColumn(null)
      setNewColumnLabel('')
      return
    }
    setError('')
    try {
      const res = await api.renameRosterColumn(renameColumn.key, label)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Không đổi tên được cột')
        return
      }
      setStore((prev) => ({
        ...prev,
        columns: prev.columns.map((col) =>
          col.key === renameColumn.key ? { ...col, label: res.data!.label } : col,
        ),
      }))
      setRenameColumn(null)
      setNewColumnLabel('')
      setSuccess(`Đã đổi tên cột thành "${label}"`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi tên được cột')
    }
  }, [renameColumn, newColumnLabel])

  const handleRemoveColumn = useCallback(
    async (column: RosterColumn) => {
      const confirmed = window.confirm(
        `Xóa cột "${column.label}"?\n\nDữ liệu trong cột này sẽ mất trên toàn bộ acc.`,
      )
      if (!confirmed) return
      setError('')
      try {
        const res = await api.deleteRosterColumn(column.key)
        if (!res.success) {
          setError(res.error ?? 'Không xóa được cột')
          return
        }
        setStore((prev) => ({
          columns: prev.columns.filter((col) => col.key !== column.key),
          rows: Object.fromEntries(
            Object.entries(prev.rows).map(([phone, row]) => {
              if (!(column.key in row)) return [phone, row]
              const next = { ...row }
              delete next[column.key]
              return [phone, next]
            }),
          ),
        }))
        if (sortKey === column.key) setSortKey('phone')
        setSuccess(`Đã xóa cột "${column.label}"`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không xóa được cột')
      }
    },
    [sortKey],
  )

  const handleExport = useCallback(() => {
    const csv = buildRosterCsv(
      store,
      tableRows.map((row) => ({
        phone: row.phone,
        name: row.name === '—' ? '' : row.name,
        username: row.username === '—' ? '' : row.username,
        status: row.status === '—' ? '' : row.status,
        synced: row.synced ? formatDate(row.synced) : '',
      })),
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `roster-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    setSuccess('Đã tải CSV')
  }, [store, tableRows])

  const handleImportFile = useCallback(
    async (file: File) => {
      setError('')
      try {
        const text = await file.text()
        const knownPhones = new Set(sheetRows.map((row) => row.phone))
        const payload = parseRosterCsvForApi(store, text, knownPhones)
        const res = await api.importRoster(payload)
        if (!res.success || !res.data) {
          setError(res.error ?? 'Import thất bại')
          return
        }
        await loadRoster()
        setSuccess(
          `Import xong — ${res.data.updated_phones} dòng, ${res.data.new_columns} cột mới`,
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không đọc được file CSV')
      }
    },
    [store, sheetRows, loadRoster],
  )

  return (
    <div className="page page--roster">
      <header className="page-header">
        <div>
          <span className="roster-page-kicker">Bảng nội bộ</span>
          <h1>Sổ acc</h1>
          <p className="page-desc">
            Bảng kiểu Excel — map Telegram với BTSE, Binance, Discord… Cột Telegram từ{' '}
            <Link to="/sessions">Sessions</Link>; cột tùy chỉnh lưu trong database.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => void loadRoster()}
          disabled={loading}
        >
          Làm mới
        </button>
      </header>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Session</p>
          <p className="stat-value">{sheetRows.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Cột tùy chỉnh</p>
          <p className="stat-value">{store.columns.length}</p>
        </article>
        <article className="stat-card stat-card--active">
          <p className="stat-label">Ô đã điền</p>
          <p className="stat-value">{filledCellCount}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Hiển thị</p>
          <p className="stat-value">{sortedRows.length}</p>
        </article>
      </section>

      <section className="panel roster-sheet-panel">
        <div
          className="roster-toolbar"
          style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}
        >
          <div className="roster-toolbar-left">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setAddColumnOpen(true)}
              disabled={!databaseEnabled || loading}
            >
              + Cột
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleExport}>
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => importInputRef.current?.click()}
              disabled={!databaseEnabled || loading}
            >
              Import CSV
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleImportFile(file)
              }}
            />
          </div>
          <div className="roster-toolbar-right roster-search">
            <input
              type="search"
              className="input"
              placeholder="Tìm SĐT, tên, UID, email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="roster-sheet-wrap">
          {loading ? (
            <div className="roster-empty">Đang tải sổ acc…</div>
          ) : sortedRows.length === 0 ? (
            <div className="roster-empty">
              {sheetRows.length === 0
                ? 'Chưa có session — thêm ở Sessions hoặc Tài khoản.'
                : 'Không có dòng khớp bộ lọc.'}
            </div>
          ) : pagedRows.length === 0 ? (
            <div className="roster-empty">Không có dòng trên trang này.</div>
          ) : (
            <table className="roster-sheet">
              <thead>
                <tr>
                  {FIXED_COLUMNS.map((col) => (
                    <th key={col.key} className={col.className}>
                      <button
                        type="button"
                        className={`roster-th-btn${sortKey === col.key ? ' roster-th-btn--active' : ''}`}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="roster-th-label">{col.label}</span>
                        <span className="roster-th-sort">
                          {sortIndicator(sortKey === col.key, sortDir)}
                        </span>
                      </button>
                    </th>
                  ))}
                  {store.columns.map((col) => (
                    <th key={col.key} className="roster-col--custom">
                      <div className="roster-th-actions">
                        <button
                          type="button"
                          className={`roster-th-btn${sortKey === col.key ? ' roster-th-btn--active' : ''}`}
                          onClick={() => handleSort(col.key)}
                        >
                          <span className="roster-th-label">{col.label}</span>
                          <span className="roster-th-sort">
                            {sortIndicator(sortKey === col.key, sortDir)}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="roster-col-action"
                          title={`Đổi tên cột ${col.label}`}
                          onClick={() => {
                            setRenameColumn(col)
                            setNewColumnLabel(col.label)
                          }}
                          disabled={!databaseEnabled}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="roster-col-action roster-col-action--danger"
                          title={`Xóa cột ${col.label}`}
                          onClick={() => void handleRemoveColumn(col)}
                          disabled={!databaseEnabled}
                        >
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.phone}>
                    <td className="roster-col--phone">
                      <div className="roster-cell-fixed mono">{row.phone}</div>
                    </td>
                    <td>
                      <div className="roster-cell-fixed" title={row.name}>
                        {row.name}
                      </div>
                    </td>
                    <td>
                      <div className="roster-cell-fixed roster-cell-fixed--muted">
                        {row.username}
                      </div>
                    </td>
                    <td>
                      <div className="roster-cell-fixed">
                        {row.status !== '—' ? <StatusBadge status={row.status} /> : '—'}
                      </div>
                    </td>
                    <td>
                      <div
                        className="roster-cell-fixed roster-cell-fixed--muted"
                        title={row.synced ? formatDate(row.synced) : undefined}
                      >
                        {row.synced ? formatRelativeDate(row.synced) : '—'}
                      </div>
                    </td>
                    {store.columns.map((col) => (
                      <td key={`${row.phone}-${col.key}`} className="roster-col--custom">
                        <input
                          key={`${dataVersion}-${row.phone}-${col.key}`}
                          type="text"
                          className="roster-cell-input"
                          defaultValue={getCellValue(store, row.phone, col.key)}
                          placeholder="—"
                          disabled={!databaseEnabled}
                          onBlur={(event) =>
                            handleCellBlur(row.phone, col.key, event.target.value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="roster-foot">
          <span className="roster-local-pill">
            {databaseEnabled ? 'Lưu database' : 'Database tắt'}
            {saving ? ' · đang lưu…' : ''}
          </span>
          <Pagination
            page={Math.min(page, totalPages)}
            totalPages={totalPages}
            total={sortedRows.length}
            from={pageFrom}
            to={pageTo}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          <span>Sửa ô → blur để lưu · Export/Import CSV</span>
        </div>
      </section>

      {renameColumn ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setRenameColumn(null)
            setNewColumnLabel('')
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-labelledby="roster-rename-col-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="roster-rename-col-title">Đổi tên cột</h2>
              <button
                type="button"
                className="btn btn--icon"
                aria-label="Đóng"
                onClick={() => {
                  setRenameColumn(null)
                  setNewColumnLabel('')
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                className="roster-add-col-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleRenameColumn()
                }}
              >
                <label>
                  Tên mới
                  <input
                    className="input"
                    autoFocus
                    value={newColumnLabel}
                    onChange={(event) => setNewColumnLabel(event.target.value)}
                  />
                </label>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  Dữ liệu trong cột giữ nguyên — chỉ đổi tên hiển thị.
                </p>
                <div className="roster-add-col-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setRenameColumn(null)
                      setNewColumnLabel('')
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={!newColumnLabel.trim() || newColumnLabel.trim() === renameColumn.label}
                  >
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {addColumnOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setAddColumnOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-labelledby="roster-add-col-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="roster-add-col-title">Thêm cột</h2>
              <button
                type="button"
                className="btn btn--icon"
                aria-label="Đóng"
                onClick={() => setAddColumnOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form
                className="roster-add-col-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleAddColumn()
                }}
              >
                <label>
                  Tên cột
                  <input
                    className="input"
                    autoFocus
                    placeholder="VD: Discord, WhatsApp, MEXC UID…"
                    value={newColumnLabel}
                    onChange={(event) => setNewColumnLabel(event.target.value)}
                  />
                </label>
                <div className="roster-add-col-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setAddColumnOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={!newColumnLabel.trim()}
                  >
                    Thêm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}