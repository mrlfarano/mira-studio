/**
 * PairModePanel — real-time shared workspace between two developers.
 *
 * Two views:
 *   1. Setup — create or join a session
 *   2. Active Session — info bar, chat, connection status
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { usePairMode } from '@/hooks/usePairMode'
import type { PairRole, ChatMessage } from '@/hooks/usePairMode'

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://127.0.0.1:3001/api/pair'

interface SessionListItem {
  id: string
  ownerName: string
  guestName: string | null
  createdAt: number
  winCondition: string
}

async function createSession(
  ownerName: string,
  winCondition: string,
): Promise<{ sessionId: string }> {
  const res = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerName, winCondition }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json() as Promise<{ sessionId: string }>
}

async function fetchSessions(): Promise<SessionListItem[]> {
  const res = await fetch(`${API_BASE}/sessions`)
  if (!res.ok) return []
  return res.json() as Promise<SessionListItem[]>
}

async function endSessionApi(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/${sessionId}/end`, { method: 'POST' })
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  padding: 16,
  color: '#e2e2e2',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 13,
  background: '#1e1e2f',
  height: '100%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: '#12121f',
  border: '1px solid #333',
  borderRadius: 4,
  color: '#e2e2e2',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 60,
}

const btnPrimary: React.CSSProperties = {
  cursor: 'pointer',
  background: '#6366f1',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
}

const btnSecondary: React.CSSProperties = {
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid #555',
  borderRadius: 4,
  color: '#e2e2e2',
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
}

const btnDanger: React.CSSProperties = {
  cursor: 'pointer',
  background: '#ef4444',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  padding: '6px 16px',
  fontSize: 12,
  fontWeight: 600,
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 8,
  padding: '12px 16px',
  marginBottom: 8,
  background: 'rgba(255, 255, 255, 0.03)',
}

const badgeStyle = (badgeRole: PairRole): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  background: badgeRole === 'owner' ? '#6366f1' : '#22c55e',
  color: '#fff',
})

const dotStyle = (connected: boolean): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  display: 'inline-block',
  background: connected ? '#22c55e' : '#ef4444',
  flexShrink: 0,
})

// ---------------------------------------------------------------------------
// SetupView
// ---------------------------------------------------------------------------

const SetupView: React.FC<{
  onCreateSession: (name: string, winCondition: string) => void
  onJoinSession: (sessionId: string, name: string) => void
}> = ({ onCreateSession, onJoinSession }) => {
  const [createName, setCreateName] = useState('')
  const [winCondition, setWinCondition] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [sessions, setSessions] = useState<SessionListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      setLoading(true)
      const list = await fetchSessions()
      if (!cancelled) {
        setSessions(list)
        setLoading(false)
      }
    }
    void poll()
    const timer = setInterval(poll, 5_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  const handleCreate = useCallback(() => {
    if (!createName.trim()) return
    onCreateSession(createName.trim(), winCondition.trim())
  }, [createName, winCondition, onCreateSession])

  const handleJoin = useCallback(() => {
    if (!joinCode.trim() || !joinName.trim()) return
    onJoinSession(joinCode.trim().toUpperCase(), joinName.trim())
  }, [joinCode, joinName, onJoinSession])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Create session */}
      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', color: '#a5b4fc' }}>
          Create Session
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            style={inputStyle}
            placeholder="Your name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <textarea
            style={textareaStyle}
            placeholder="Win condition (what are we building?)"
            value={winCondition}
            onChange={(e) => setWinCondition(e.target.value)}
          />
          <button
            style={btnPrimary}
            onClick={handleCreate}
            disabled={!createName.trim()}
          >
            Create Session
          </button>
        </div>
      </div>

      {/* Join session */}
      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', color: '#86efac' }}>
          Join Session
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            style={inputStyle}
            placeholder="Session code (e.g. A1B2C3)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={6}
          />
          <input
            style={inputStyle}
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            style={btnSecondary}
            onClick={handleJoin}
            disabled={!joinCode.trim() || !joinName.trim()}
          >
            Join Session
          </button>
        </div>
      </div>

      {/* Active sessions list */}
      {sessions.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', color: '#aaa', fontSize: 12 }}>
            Active Sessions
          </h4>
          {sessions.map((s) => (
            <div
              key={s.id}
              style={{
                ...cardStyle,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <code style={{ color: '#a5b4fc', fontWeight: 700 }}>{s.id}</code>
                <span style={{ color: '#aaa', marginLeft: 8 }}>
                  by {s.ownerName}
                </span>
                {s.guestName && (
                  <span style={{ color: '#86efac', marginLeft: 8 }}>
                    + {s.guestName}
                  </span>
                )}
              </div>
              <button
                style={{
                  ...btnSecondary,
                  padding: '4px 10px',
                  fontSize: 11,
                }}
                onClick={() => {
                  setJoinCode(s.id)
                }}
              >
                Select
              </button>
            </div>
          ))}
          {loading && (
            <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
              Refreshing...
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChatView
// ---------------------------------------------------------------------------

const ChatView: React.FC<{
  messages: ChatMessage[]
  onSend: (text: string) => void
}> = ({ messages, onSend }) => {
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }, [input, onSend])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          minHeight: 80,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#666', textAlign: 'center', padding: 16 }}>
            No messages yet. Say hi!
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: '4px 0',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                color: msg.from === 'owner' ? '#a5b4fc' : '#86efac',
                fontWeight: 600,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {msg.name}:
            </span>
            <span style={{ fontSize: 13, wordBreak: 'break-word' }}>
              {msg.text}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          style={{ ...btnPrimary, padding: '8px 16px' }}
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ActiveSessionView
// ---------------------------------------------------------------------------

const ActiveSessionView: React.FC<{
  pair: ReturnType<typeof usePairMode>
}> = ({ pair }) => {
  const {
    role,
    peerName,
    sessionInfo,
    isConnected,
    chatMessages,
    sendChat,
    disconnect,
    error,
  } = pair

  const handleEnd = useCallback(async () => {
    if (!sessionInfo) return
    await endSessionApi(sessionInfo.id)
    disconnect()
  }, [sessionInfo, disconnect])

  const handleCopyCode = useCallback(() => {
    if (sessionInfo) {
      navigator.clipboard.writeText(sessionInfo.id).catch(() => {
        // Clipboard not available
      })
    }
  }, [sessionInfo])

  if (!role || !sessionInfo) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 12 }}>
      {/* Session info bar */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={dotStyle(isConnected)} title={isConnected ? 'Connected' : 'Disconnected'} />
          <span style={badgeStyle(role)}>{role}</span>
          <button
            onClick={handleCopyCode}
            style={{
              background: '#2a2d35',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#a5b4fc',
              fontFamily: 'monospace',
              fontWeight: 700,
              fontSize: 14,
              padding: '2px 10px',
              cursor: 'pointer',
            }}
            title="Click to copy session code"
          >
            {sessionInfo.id}
          </button>
          <span style={{ color: '#aaa', fontSize: 12, marginLeft: 'auto' }}>
            {peerName ? `Paired with ${peerName}` : 'Waiting for peer...'}
          </span>
        </div>

        {sessionInfo.winCondition && (
          <div style={{ fontSize: 12, color: '#ccc' }}>
            <strong style={{ color: '#a5b4fc' }}>Win condition:</strong>{' '}
            {sessionInfo.winCondition}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            background: '#3c1414',
            color: '#f44336',
            padding: 8,
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Permissions info for guest */}
      {role === 'guest' && (
        <div
          style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            borderRadius: 4,
            padding: '8px 12px',
            fontSize: 11,
            color: '#86efac',
          }}
        >
          Guest mode: You can view all panels, edit kanban cards, and send to agents.
          Workspace scenes, SI builds, and PR merges are owner-only.
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#aaa' }}>
          Session Chat
        </h4>
        <ChatView
          messages={chatMessages}
          onSend={sendChat}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {role === 'owner' ? (
          <button style={btnDanger} onClick={handleEnd}>
            End Session
          </button>
        ) : (
          <button style={btnSecondary} onClick={disconnect}>
            Leave Session
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PairModePanel (main)
// ---------------------------------------------------------------------------

const PairModePanel: React.FC = () => {
  const pair = usePairMode()
  const { connect, isConnected, role } = pair

  const handleCreate = useCallback(async (name: string, winCondition: string) => {
    try {
      const { sessionId } = await createSession(name, winCondition)
      connect(sessionId, 'owner', name)
    } catch {
      // Error handled in usePairMode
    }
  }, [connect])

  const handleJoin = useCallback((sessionId: string, name: string) => {
    connect(sessionId, 'guest', name)
  }, [connect])

  const isActive = isConnected && role !== null

  return (
    <div style={panelStyle}>
      {!isActive ? (
        <>
          <h3 style={{ margin: '0 0 16px' }}>Pair Mode</h3>
          <SetupView
            onCreateSession={handleCreate}
            onJoinSession={handleJoin}
          />
        </>
      ) : (
        <ActiveSessionView pair={pair} />
      )}
    </div>
  )
}

export default React.memo(PairModePanel)
