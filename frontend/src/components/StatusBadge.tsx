type StatusKind = 'active' | 'unauthorized' | 'error' | 'success' | 'info' | 'default'

const statusMap: Record<string, StatusKind> = {
  active: 'active',
  success: 'success',
  unauthorized: 'unauthorized',
  error: 'error',
  info: 'info',
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const kind = statusMap[status.toLowerCase()] ?? 'default'

  return <span className={`badge badge--${kind}`}>{status}</span>
}