interface AlertProps {
  type: 'error' | 'success' | 'info'
  message: string
}

export function Alert({ type, message }: AlertProps) {
  if (!message) return null

  return (
    <div className={`alert alert--${type}`} role="alert">
      {message}
    </div>
  )
}