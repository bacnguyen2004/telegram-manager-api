import type { SessionMetaOverviewItem } from '../types/api'
import { useSessionAccounts } from '../hooks/useSessionAccounts'
import { formatSessionPickerLabel, getMetaForPhone } from '../utils/sessionDisplay'

interface PhoneSelectProps {
  value: string
  onChange: (phone: string) => void
  allowManual?: boolean
  required?: boolean
  label?: string
  emptyOptionLabel?: string
  sessions?: string[]
  metaByPhone?: Map<string, SessionMetaOverviewItem>
  loading?: boolean
}

export function PhoneSelect({
  value,
  onChange,
  allowManual = true,
  required = true,
  label = 'Chọn tài khoản',
  emptyOptionLabel,
  sessions: sessionsProp,
  metaByPhone: metaProp,
  loading: loadingProp,
}: PhoneSelectProps) {
  const emptyLabel = emptyOptionLabel ?? (required ? '— Chọn số điện thoại —' : 'Tất cả acc')
  const internal = useSessionAccounts({ enabled: sessionsProp === undefined })
  const sessions = sessionsProp ?? internal.sessions
  const metaByPhone = metaProp ?? internal.metaByPhone
  const loading = loadingProp ?? internal.loading

  if (loading) {
    return <p className="muted">Đang tải danh sách session…</p>
  }

  if (sessions.length === 0 && !allowManual) {
    return (
      <p className="muted">
        Chưa có session. Hãy <strong>Đăng nhập</strong> hoặc <strong>Đăng ký</strong> trước.
      </p>
    )
  }

  if (sessions.length > 0) {
    return (
      <label className="field">
        <span>{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
          <option value="">{emptyLabel}</option>
          {sessions.map((phone) => (
            <option key={phone} value={phone}>
              {formatSessionPickerLabel(phone, getMetaForPhone(phone, metaByPhone))}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="field">
      <span>Số điện thoại (E.164)</span>
      <input
        type="tel"
        placeholder="+84901234567"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  )
}