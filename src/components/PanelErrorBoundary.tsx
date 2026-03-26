import React from 'react'

interface Props {
  panelId: string
  panelType: string
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary that catches crashes in individual panels and shows
 * a fallback UI instead of taking down the entire app.
 */
class PanelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[PanelErrorBoundary] ${this.props.panelType} panel (${this.props.panelId}) crashed:`,
      error,
      info.componentStack,
    )
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 24,
            color: '#999',
            textAlign: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 24 }}>!</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {this.props.panelType} panel crashed
          </div>
          <div style={{ fontSize: 11, color: '#666', maxWidth: 300 }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid #555',
              background: 'transparent',
              color: '#aaa',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default PanelErrorBoundary
