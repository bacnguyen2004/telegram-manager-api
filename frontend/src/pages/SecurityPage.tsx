import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { Alert } from '../components/Alert'
import { PasswordInput } from '../components/PasswordInput'
import { PhoneSelect } from '../components/PhoneSelect'
import { useSessionAccounts } from '../hooks/useSessionAccounts'
import type { PrivacyRuleType } from '../types/api'

const PRIVACY_OPTIONS: {
  id: PrivacyRuleType
  label: string
  desc: string
}[] = [
  {
    id: 'all',
    label: 'Mọi người',
    desc: 'Bất kỳ ai cũng có thể mời bạn vào nhóm',
  },
  {
    id: 'contacts',
    label: 'Danh bạ',
    desc: 'Chỉ người trong danh bạ Telegram',
  },
  {
    id: 'nobody',
    label: 'Không ai',
    desc: 'Không cho phép mời vào nhóm',
  },
]

export function SecurityPage() {
  const [searchParams] = useSearchParams()
  const accounts = useSessionAccounts()
  const [phone, setPhone] = useState(() => searchParams.get('phone') ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [hint, setHint] = useState('')
  const [ruleType, setRuleType] = useState<PrivacyRuleType>('all')
  const [loading2fa, setLoading2fa] = useState(false)
  const [loadingPrivacy, setLoadingPrivacy] = useState(false)
  const [error2fa, setError2fa] = useState('')
  const [success2fa, setSuccess2fa] = useState('')
  const [errorPrivacy, setErrorPrivacy] = useState('')
  const [successPrivacy, setSuccessPrivacy] = useState('')

  const hasSession = Boolean(phone)
  const actionBusy = loading2fa || loadingPrivacy

  useEffect(() => {
    if (!success2fa) return
    const timer = window.setTimeout(() => setSuccess2fa(''), 3000)
    return () => window.clearTimeout(timer)
  }, [success2fa])

  useEffect(() => {
    if (!successPrivacy) return
    const timer = window.setTimeout(() => setSuccessPrivacy(''), 3000)
    return () => window.clearTimeout(timer)
  }, [successPrivacy])

  async function handleUpdate2fa(e: React.FormEvent) {
    e.preventDefault()
    if (!phone) return
    setLoading2fa(true)
    setError2fa('')
    setSuccess2fa('')
    try {
      const res = await api.update2fa(
        phone,
        newPassword,
        currentPassword || undefined,
        hint || undefined,
      )
      if (!res.success || !res.data) {
        setError2fa(res.error ?? 'Cập nhật 2FA thất bại')
        return
      }
      if (res.data.status === 'error') {
        setError2fa(res.data.message)
        return
      }
      setSuccess2fa(res.data.message)
      setCurrentPassword('')
      setNewPassword('')
      setHint('')
    } catch {
      setError2fa('Không kết nối được API.')
    } finally {
      setLoading2fa(false)
    }
  }

  async function handleUpdatePrivacy(e: React.FormEvent) {
    e.preventDefault()
    if (!phone) return
    setLoadingPrivacy(true)
    setErrorPrivacy('')
    setSuccessPrivacy('')
    try {
      const res = await api.updatePrivacy(phone, ruleType)
      if (!res.success || !res.data) {
        setErrorPrivacy(res.error ?? 'Cập nhật privacy thất bại')
        return
      }
      if (res.data.status === 'error') {
        setErrorPrivacy(res.data.message)
        return
      }
      setSuccessPrivacy(res.data.message)
    } catch {
      setErrorPrivacy('Không kết nối được API.')
    } finally {
      setLoadingPrivacy(false)
    }
  }

  return (
    <div className={`page page--security${hasSession ? ' page--security-active' : ''}`}>
      <header className="page-header security-page-header">
        <div>
          <span className="security-page-kicker">Account</span>
          <h1>Bảo mật</h1>
          <p className="page-desc">
            Đổi mật khẩu 2FA và quyền mời vào nhóm theo từng session. Cần acc đã{' '}
            <Link to="/auth">đăng nhập</Link>.
          </p>
        </div>
        <div className="security-header-actions">
          <Link to="/sessions" className="btn btn--ghost btn--sm">
            Sessions
          </Link>
          <Link to="/auth" className="btn btn--primary btn--sm">
            Đăng nhập
          </Link>
        </div>
      </header>

      <div className="security-workspace">
        <aside className="panel security-session-panel">
          <div className="security-panel-head">
            <h2>Session</h2>
            <p className="panel-meta">
              {phone ? accounts.getPickerLabel(phone) : 'Chọn tài khoản'}
            </p>
          </div>

          <div className="security-session-form">
            <PhoneSelect
              value={phone}
              onChange={setPhone}
              allowManual={false}
              sessions={accounts.sessions}
              metaByPhone={accounts.metaByPhone}
              loading={accounts.loading}
            />
          </div>

          <div className="security-session-notes">
            <p className="security-control-label">Lưu ý</p>
            <ul className="security-note-list">
              <li>Mỗi thao tác chỉ áp dụng cho session đang chọn.</li>
              <li>
                Bật 2FA lần đầu: để trống mật khẩu hiện tại, nhập mật khẩu mới.
              </li>
              <li>Đổi 2FA: bắt buộc nhập mật khẩu 2FA hiện tại.</li>
              <li>Privacy chỉ đổi quy tắc mời bạn vào group — không ảnh hưởng kênh.</li>
            </ul>
          </div>

          <p className="security-panel-foot muted">
            Session lỗi hoặc hết hạn → kiểm tra tại{' '}
            <Link to="/sessions">Sessions</Link>.
          </p>
        </aside>

        <div className="security-main">
          <section className="panel security-card security-card--2fa">
            <div className="security-card-head">
              <div>
                <h2>Đổi / bật 2FA</h2>
                <p className="panel-meta">Mật khẩu xác thực hai lớp trên Telegram</p>
              </div>
              <span className="security-card-badge">2FA</span>
            </div>

            <div className="security-card-body">
              <Alert type="error" message={error2fa} />
              <Alert type="success" message={success2fa} />

              <form
                className="security-form"
                onSubmit={(e) => void handleUpdate2fa(e)}
              >
                <PasswordInput
                  label="Mật khẩu 2FA hiện tại"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Bỏ trống nếu chưa bật 2FA"
                  autoComplete="current-password"
                  disabled={!hasSession || actionBusy}
                />
                <PasswordInput
                  label="Mật khẩu 2FA mới"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Mật khẩu mới"
                  required
                  autoComplete="new-password"
                  disabled={!hasSession || actionBusy}
                />
                <label className="field">
                  <span>Gợi ý (tuỳ chọn)</span>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Gợi ý khi quên mật khẩu"
                    disabled={!hasSession || actionBusy}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn--primary security-submit-btn"
                  disabled={loading2fa || !hasSession || !newPassword.trim()}
                >
                  {loading2fa ? 'Đang cập nhật…' : 'Cập nhật 2FA'}
                </button>
              </form>
            </div>
          </section>

          <section className="panel security-card security-card--privacy">
            <div className="security-card-head">
              <div>
                <h2>Privacy — mời vào group</h2>
                <p className="panel-meta">Ai được phép mời bạn tham gia nhóm</p>
              </div>
              <span className="security-card-badge security-card-badge--privacy">
                Privacy
              </span>
            </div>

            <div className="security-card-body">
              <Alert type="error" message={errorPrivacy} />
              <Alert type="success" message={successPrivacy} />

              <form
                className="security-form"
                onSubmit={(e) => void handleUpdatePrivacy(e)}
              >
                <p className="security-control-label">Ai được mời bạn vào group</p>
                <div className="security-privacy-options" role="radiogroup">
                  {PRIVACY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={ruleType === option.id}
                      className={`security-privacy-option${ruleType === option.id ? ' security-privacy-option--active' : ''}`}
                      onClick={() => setRuleType(option.id)}
                      disabled={!hasSession || actionBusy}
                    >
                      <span className="security-privacy-option-label">
                        {option.label}
                      </span>
                      <span className="security-privacy-option-desc muted">
                        {option.desc}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="btn btn--primary security-submit-btn"
                  disabled={loadingPrivacy || !hasSession}
                >
                  {loadingPrivacy ? 'Đang cập nhật…' : 'Cập nhật Privacy'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}