import React, { useCallback, useEffect, useState } from 'react'

const MAX_BUFFER_LINES = 5000
const API_BASE = 'http://127.0.0.1:3001'
const POLL_INTERVAL_MS = 10_000

interface ContextStats {
  totalLines: number
  estimatedTokens: number
  outputSizeBytes: number
}

type AllStats = Record<string, ContextStats>

function usageRatio(totalLines: number): number {
  return totalLines / MAX_BUFFER_LINES
}

function barColor(ratio: number): string {
  if (ratio > 0.85) return '#e74c3c'
  if (ratio >= 0.6) return '#f39c12'
  return '#2ecc71'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ContextCleanerPanel: React.FC = () => {
  const [stats, setStats] = useState<AllStats>({})
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState<Set<string>>(new Set())

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pty/context-stats`)
      if (res.ok) {
        const data: AllStats = await res.json()
        setStats(data)
      }
    } catch {
      // Server may be unreachable — keep last known stats
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const timer = setInterval(fetchStats, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchStats])

  const handleClear = useCallback(async (sessionId: string) => {
    setClearing((prev) => new Set(prev).add(sessionId))
    try {
      await fetch(`${API_BASE}/api/pty/${sessionId}/clear-buffer`, {
        method: 'POST',
      })
      // Refresh stats after clearing
      const res = await fetch(`${API_BASE}/api/pty/context-stats`)
      if (res.ok) {
        const data: AllStats = await res.json()
        setStats(data)
      }
    } catch {
      // ignore
    } finally {
      setClearing((prev) => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }, [])

  const entries = Object.entries(stats)

  return (
    <div style={styles.container}>
      <div style={styles.header}>Context Cleaner</div>
      {loading && entries.length === 0 && (
        <div style={styles.empty}>Loading...</div>
      )}
      {!loading && entries.length === 0 && (
        <div style={styles.empty}>No active sessions</div>
      )}
      <div style={styles.list}>
        {entries.map(([sessionId, s]) => {
          const ratio = usageRatio(s.totalLines)
          const color = barColor(ratio)
          const pct = Math.min(ratio * 100, 100)
          const isClearing = clearing.has(sessionId)
          return (
            <div key={sessionId} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.sessionId} title={sessionId}>
                  {sessionId.length > 12
                    ? `${sessionId.slice(0, 12)}...`
                    : sessionId}
                </span>
                <button
                  style={{
                    ...styles.clearBtn,
                    opacity: isClearing ? 0.5 : 1,
                  }}
                  disabled={isClearing}
                  onClick={() => handleClear(sessionId)}
                >
                  {isClearing ? 'Clearing...' : 'Clear Buffer'}
                </button>
              </div>
              <div style={styles.barOuter}>
                <div
                  style={{
                    ...styles.barInner,
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div style={styles.meta}>
                <span>{s.totalLines.toLocaleString()} / {MAX_BUFFER_LINES.toLocaleString()} lines</span>
                <span>{s.estimatedTokens.toLocaleString()} tokens (est.)</span>
                <span>{formatBytes(s.outputSizeBytes)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1e1e2f',
    color: '#e2e2e2',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
    fontSize: '13px',
    overflow: 'hidden',
  },
  header: {
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: '14px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 14px',
  },
  empty: {
    padding: '24px 14px',
    color: '#888',
    textAlign: 'center',
  },
  card: {
    background: '#262640',
    borderRadius: '6px',
    border: '1px solid #333',
    padding: '10px 12px',
    marginBottom: '8px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  sessionId: {
    fontWeight: 600,
    fontSize: '12px',
    color: '#c0c0e0',
  },
  clearBtn: {
    background: '#3a3a5c',
    color: '#e2e2e2',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '3px 10px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  barOuter: {
    background: '#111',
    borderRadius: '3px',
    height: '8px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  barInner: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#999',
  },
}

export default React.memo(ContextCleanerPanel)
