import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Alert } from '../components/Alert'

type Step = 'phone' | 'code' | '2fa' | 'done'

export function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [accountInfo, setAccountInfo] = useState({
    first_name: '',
    last_name: '',
    username: '',
    session_file: '',
  })

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.sendCode(phone.trim())
      if (!res.success || !res.data) {
        setError(res.error ?? 'Gửi mã thất bại')
        return
      }
      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }
      setSuccess(res.data.message)
      setStep('code')
    } catch {
      setError('Không kết nối được API. Kiểm tra backend đang chạy port 8001.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.login(phone.trim(), code.trim(), password || undefined)
      if (!res.success || !res.data) {
        setError(res.error ?? 'Đăng nhập thất bại')
        return
      }

      if (res.data.status === 'need_2fa') {
        setSuccess(res.data.message)
        setStep('2fa')
        return
      }

      if (res.data.status === 'error') {
        setError(res.data.message)
        return
      }

      setAccountInfo({
        first_name: res.data.first_name,
        last_name: res.data.last_name,
        username: res.data.username,
        session_file: res.data.session_file,
      })
      setSuccess(res.data.message)
      setStep('done')
    } catch {
      setError('Không kết nối được API khi đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setStep('phone')
    setPhone('')
    setCode('')
    setPassword('')
    setError('')
    setSuccess('')
    setAccountInfo({ first_name: '', last_name: '', username: '', session_file: '' })
  }

  const steps = [
    { id: 'phone', label: 'Số điện thoại' },
    { id: 'code', label: 'Mã OTP' },
    { id: '2fa', label: '2FA' },
    { id: 'done', label: 'Hoàn tất' },
  ]

  const stepIndex = steps.findIndex((s) => s.id === step)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Đăng nhập mới</h1>
          <p className="page-desc">
            Tạo file <code>.session</code> qua API — OTP gửi về app Telegram
          </p>
        </div>
      </header>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="login-layout">
        <section className="panel login-steps">
          <h2>Quy trình</h2>
          <ol className="step-list">
            {steps.map((s, i) => (
              <li
                key={s.id}
                className={
                  i < stepIndex
                    ? 'step-item step-item--done'
                    : i === stepIndex
                      ? 'step-item step-item--active'
                      : 'step-item'
                }
              >
                <span className="step-num">{i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
          <div className="hint-box">
            <p>
              <strong>Lưu ý:</strong> Đăng nhập Telegram trên điện thoại không tự tạo session
              cho API. Cần gửi OTP qua bước này.
            </p>
          </div>
        </section>

        <section className="panel login-form-panel">
          {step === 'phone' && (
            <form onSubmit={(e) => void handleSendCode(e)}>
              <h2>Bước 1 — Gửi mã OTP</h2>
              <label className="field">
                <span>Số điện thoại (E.164)</span>
                <input
                  type="tel"
                  placeholder="+84901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? 'Đang gửi…' : 'Gửi mã OTP'}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={(e) => void handleLogin(e)}>
              <h2>Bước 2 — Nhập mã OTP</h2>
              <p className="form-meta">
                Mã đã gửi tới <strong>{phone}</strong>
              </p>
              <label className="field">
                <span>Mã xác thực</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setStep('phone')}
                >
                  Quay lại
                </button>
                <button type="submit" className="btn btn--primary" disabled={loading}>
                  {loading ? 'Đang xác thực…' : 'Đăng nhập'}
                </button>
              </div>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={(e) => void handleLogin(e)}>
              <h2>Bước 3 — Mật khẩu 2FA</h2>
              <p className="form-meta">Tài khoản bật xác thực 2 bước</p>
              <label className="field">
                <span>Mật khẩu 2FA</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? 'Đang xác thực…' : 'Xác nhận 2FA'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="done-panel">
              <div className="done-icon">✓</div>
              <h2>Đăng nhập thành công</h2>
              <div className="detail-row">
                <span>Số điện thoại</span>
                <strong>{phone}</strong>
              </div>
              <div className="detail-row">
                <span>Họ tên</span>
                <strong>
                  {[accountInfo.first_name, accountInfo.last_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </strong>
              </div>
              <div className="detail-row">
                <span>Username</span>
                <strong>
                  {accountInfo.username ? `@${accountInfo.username}` : '—'}
                </strong>
              </div>
              <div className="detail-row">
                <span>Session file</span>
                <code className="session-path">{accountInfo.session_file}</code>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn--ghost" onClick={resetForm}>
                  Thêm tài khoản khác
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => navigate('/')}
                >
                  Xem Sessions
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}