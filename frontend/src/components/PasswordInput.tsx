import { useState } from 'react'

interface PasswordInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  disabled?: boolean
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M2.5 12C4.5 7.5 8 5 12 5s7.5 2.5 9.5 7c-2 4.5-5.5 7-9.5 7s-7.5-2.5-9.5-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.5 10.7A3 3 0 0 0 12 15a3 3 0 0 0 2.3-1M7.2 7.2C5.5 8.4 4 10 2.5 12c2 4.5 5.5 7 9.5 7 1.7 0 3.3-.4 4.8-1.2M14.1 14.1c-.6.6-1.4 1-2.3 1-1.9 0-3.4-1.5-3.4-3.4 0-.9.4-1.7 1-2.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 5.1A10.8 10.8 0 0 1 12 5c4 0 7.5 2.5 9.5 7a11.6 11.6 0 0 1-2.1 3.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  disabled = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="field field--password">
      <span>{label}</span>
      <div className="password-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          className="password-input-toggle"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  )
}