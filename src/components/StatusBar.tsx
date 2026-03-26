import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { useSessionStore } from '@/store/session-store';
import { useConfigStore } from '@/store/config-store';
import { useLayoutStore } from '@/store/layout-store';

const MAX_BUFFER_LINES = 5000
const CONTEXT_POLL_MS = 15_000

interface ContextStats {
  totalLines: number
  estimatedTokens: number
  outputSizeBytes: number
}

function useContextIndicator() {
  const [totalTokens, setTotalTokens] = useState(0)
  const [maxRatio, setMaxRatio] = useState(0)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch('http://127.0.0.1:3001/api/pty/context-stats')
        if (!res.ok || cancelled) return
        const data: Record<string, ContextStats> = await res.json()
        const entries = Object.values(data)
        const tokens = entries.reduce((sum, s) => sum + s.estimatedTokens, 0)
        const ratio = entries.length > 0
          ? Math.max(...entries.map((s) => s.totalLines / MAX_BUFFER_LINES))
          : 0
        if (!cancelled) {
          setTotalTokens(tokens)
          setMaxRatio(ratio)
        }
      } catch {
        // server unreachable — keep last known values
      }
    }
    void poll()
    const timer = setInterval(poll, CONTEXT_POLL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  return { totalTokens, maxRatio }
}

function contextColor(ratio: number): string {
  if (ratio > 0.85) return '#e74c3c'
  if (ratio >= 0.6) return '#f39c12'
  return '#2ecc71'
}

const VIBE_API = 'http://127.0.0.1:3001/api/vibe'

function vibeColor(score: number): string {
  if (score <= 30) return '#ef4444'
  if (score <= 60) return '#eab308'
  return '#22c55e'
}

const StatusBar: React.FC = () => {
  const connections = useConnectionStore((s) => s.connections);
  const sessions = useSessionStore((s) => s.sessions);
  const isSyncing = useConfigStore((s) => s.isSyncing);
  const syncError = useConfigStore((s) => s.syncError);
  const { totalTokens, maxRatio } = useContextIndicator();

  // Vibe score state
  const [vibeScore, setVibeScore] = useState<number | null>(null)
  const vibeCancelledRef = useRef(false)

  useEffect(() => {
    vibeCancelledRef.current = false
    const poll = async () => {
      try {
        const res = await fetch(VIBE_API)
        if (!res.ok || vibeCancelledRef.current) return
        const data = await res.json() as { score: number }
        if (!vibeCancelledRef.current) setVibeScore(data.score)
      } catch {
        // Non-critical — silently ignore
      }
    }
    void poll()
    const timer = setInterval(poll, 60_000)
    return () => { vibeCancelledRef.current = true; clearInterval(timer) }
  }, [])

  const openVibePanel = useCallback(() => {
    const store = useLayoutStore.getState()
    // Don't add if already open
    const existing = store.panels.find((p) => p.type === 'vibe')
    if (existing) return
    store.addPanel({
      id: `vibe-${Date.now()}`,
      type: 'vibe',
      title: 'Vibe Score',
      x: 9,
      y: 0,
      w: 3,
      h: 4,
    })
  }, [])

  // Derive connection status
  const connEntries = Array.from(connections.values());
  const connectedCount = connEntries.filter((c) => c.state === 'connected').length;
  const totalConns = connEntries.length;
  const connectionLabel =
    totalConns === 0
      ? 'No connections'
      : `${connectedCount}/${totalConns} connected`;

  // Derive active agent count
  const activeSessions = Object.values(sessions).filter(
    (s) => s.status === 'running' || s.status === 'paused',
  );
  const agentLabel = `${activeSessions.length} agent${activeSessions.length !== 1 ? 's' : ''} active`;

  // Git sync status
  let syncLabel = 'Synced';
  let syncClass = 'statusbar__indicator--ok';
  if (isSyncing) {
    syncLabel = 'Syncing...';
    syncClass = 'statusbar__indicator--syncing';
  } else if (syncError) {
    syncLabel = 'Sync error';
    syncClass = 'statusbar__indicator--error';
  }

  // Context usage indicator
  const ctxColor = contextColor(maxRatio)
  const ctxLabel = totalTokens > 0
    ? `${totalTokens.toLocaleString()} ctx tokens`
    : 'No ctx'

  return (
    <footer className="statusbar">
      <div className="statusbar__left">
        <span className="statusbar__indicator statusbar__indicator--connection">
          <span
            className={`statusbar__dot ${connectedCount > 0 ? 'statusbar__dot--connected' : 'statusbar__dot--disconnected'}`}
          />
          {connectionLabel}
        </span>
        <span className="statusbar__indicator">{agentLabel}</span>
      </div>
      <div className="statusbar__right">
        {vibeScore !== null && (
          <button
            onClick={openVibePanel}
            className="statusbar__indicator statusbar__indicator--vibe"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 8px',
              borderRadius: 4,
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
            }}
            title="Open Vibe Score panel"
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: vibeColor(vibeScore),
              }}
            />
            <span style={{ color: vibeColor(vibeScore), fontWeight: 600 }}>
              {vibeScore}
            </span>
          </button>
        )}
        <span
          className="statusbar__indicator"
          style={{ color: ctxColor }}
          title={`Peak buffer usage: ${Math.round(maxRatio * 100)}%`}
        >
          {ctxLabel}
        </span>
        <span className={`statusbar__indicator ${syncClass}`}>{syncLabel}</span>
      </div>
    </footer>
  );
};

export default React.memo(StatusBar);
