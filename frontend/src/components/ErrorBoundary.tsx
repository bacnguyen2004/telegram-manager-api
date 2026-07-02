import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 8px' }}>Lỗi hiển thị trang</h2>
          <p className="muted" style={{ margin: '0 0 12px' }}>
            {this.state.error.message || 'Unknown error'}
          </p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => this.setState({ error: null })}
          >
            Thử lại
          </button>
        </div>
      )
    }

    return this.props.children
  }
}