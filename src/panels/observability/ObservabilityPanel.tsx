import React, { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcessInfo {
  sessionId: string
  pid: number
  status: 'idle' | 'thinking' | 'running' | 'error'
  startedAt: string
  bufferLines: number
}

interface PortStatus {
  port: number
  listening: boolean
  host: string
}

interface AgentHistoryEntry {
  timestamp: string
  source: string
  description: string
}

type Tab = 'processes' | 'ports' | 'history'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'http://127.0.0.1:3001'

const STATUS_COLORS: Record<string, string> = {
  idle: '#6b7280',
  thinking: '#eab308',
  running: '#22c55e',
  error: '#ef4444',
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#1e1e2f',
    color: '#e2e2e2',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 13,
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  tab: (active: boolean) => ({
    padding: '5px 14px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    background: active ? '#4f46e5' : '#2a2a3e',
    color: active ? '#fff' : '#aaa',
    transition: 'background 0.15s, color 0.15s',
  }),
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 12,
  },
  th: {
    textAlign: 'left' as const,
    padding: '6px 8px',
    borderBottom: '1px solid #333',
    color: '#888',
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  td: {
    padding: '6px 8px',
    borderBottom: '1px solid #2a2a3e',
  },
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: `${color}22`,
    color,
  }),
  dot: (listening: boolean) => ({
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: listening ? '#22c55e' : '#6b7280',
    marginRight: 6,
    verticalAlign: 'middle',
  }),
  historyItem: {
    padding: '8px 0',
    borderBottom: '1px solid #2a2a3e',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  historyTime: {
    color: '#6b7280',
    fontFamily: 'monospace',
    fontSize: 12,
    flexShrink: 0,
    minWidth: 44,
  },
  historySource: {
    fontSize: 11,
    fontWeight: 600,
    color: '#818cf8',
    flexShrink: 0,
    minWidth: 54,
  },
  historyDesc: {
    color: '#ccc',
    fontSize: 12,
  },
  empty: {
    padding: 24,
    textAlign: 'center' as const,
    color: '#555',
    fontSize: 13,
  },
  error: {
    padding: 16,
    color: '#ef4444',
    fontSize: 13,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(startedAt: string): string {
  const start = new Date(startedAt).getTime()
  const diff = Date.now() - start
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

// ---------------------------------------------------------------------------
// ProcessesTab
// ---------------------------------------------------------------------------

const ProcessesTab: React.FC = () => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/observability/processes`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { processes: ProcessInfo[] }
      setProcesses(data.processes)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        await fetchProcesses()
        await new Promise((r) => setTimeout(r, 5000))
      }
    }

    void poll()
    return () => { cancelled = true }
  }, [fetchProcesses])

  if (error && processes.length === 0) {
    return <div style={styles.error}>Failed to load processes: {error}</div>
  }

  if (processes.length === 0) {
    return <div style={styles.empty}>No active PTY sessions</div>
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Session</th>
          <th style={styles.th}>PID</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Uptime</th>
          <th style={styles.th}>Buffer</th>
        </tr>
      </thead>
      <tbody>
        {processes.map((p) => (
          <tr key={p.sessionId}>
            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>
              {p.sessionId.slice(0, 8)}
            </td>
            <td style={{ ...styles.td, fontFamily: 'monospace' }}>{p.pid}</td>
            <td style={styles.td}>
              <span style={styles.badge(STATUS_COLORS[p.status] ?? '#6b7280')}>
                {p.status}
              </span>
            </td>
            <td style={styles.td}>{formatUptime(p.startedAt)}</td>
            <td style={{ ...styles.td, fontFamily: 'monospace' }}>
              {p.bufferLines.toLocaleString()} lines
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// PortsTab
// ---------------------------------------------------------------------------

const PortsTab: React.FC = () => {
  const [ports, setPorts] = useState<PortStatus[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchPorts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/observability/ports`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { ports: PortStatus[] }
      setPorts(data.ports)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      while (!cancelled) {
        await fetchPorts()
        await new Promise((r) => setTimeout(r, 10_000))
      }
    }

    void poll()
    return () => { cancelled = true }
  }, [fetchPorts])

  if (error && ports.length === 0) {
    return <div style={styles.error}>Failed to scan ports: {error}</div>
  }

  if (ports.length === 0) {
    return <div style={styles.empty}>Scanning ports...</div>
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Port</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Host</th>
        </tr>
      </thead>
      <tbody>
        {ports.map((p) => (
          <tr key={p.port}>
            <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600 }}>
              {p.port}
            </td>
            <td style={styles.td}>
              <span style={styles.dot(p.listening)} />
              {p.listening ? 'Listening' : 'Closed'}
            </td>
            <td style={{ ...styles.td, fontFamily: 'monospace', color: '#888' }}>
              {p.host}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------
// HistoryTab
// ---------------------------------------------------------------------------

const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<AgentHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/observability/agent-history`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { history: AgentHistoryEntry[] }
        if (!cancelled) {
          setHistory(data.history)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch')
        }
      }
    }

    void fetchHistory()
    return () => { cancelled = true }
  }, [])

  if (error && history.length === 0) {
    return <div style={styles.error}>Failed to load history: {error}</div>
  }

  if (history.length === 0) {
    return <div style={styles.empty}>No agent activity recorded today</div>
  }

  return (
    <div>
      {history.map((entry, i) => (
        <div key={`${entry.timestamp}-${i}`} style={styles.historyItem}>
          <span style={styles.historyTime}>{entry.timestamp}</span>
          <span style={styles.historySource}>{entry.source}</span>
          <span style={styles.historyDesc}>{entry.description}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ObservabilityPanel -- tabbed container
// ---------------------------------------------------------------------------

const TABS: { key: Tab; label: string }[] = [
  { key: 'processes', label: 'Processes' },
  { key: 'ports', label: 'Ports' },
  { key: 'history', label: 'History' },
]

const ObservabilityPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('processes')

  return (
    <div style={styles.container}>
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            style={styles.tab(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {activeTab === 'processes' && <ProcessesTab />}
        {activeTab === 'ports' && <PortsTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}

export default React.memo(ObservabilityPanel)
