/**
 * ReplayPanel -- browse and replay recorded terminal sessions
 * with a scrubbable timeline, play/pause, and speed controls.
 *
 * Uses a simple <pre> element instead of xterm.js for lightweight replay.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────

interface ReplayEntry {
  timestamp: number
  data: string
}

interface RecordingMeta {
  sessionId: string
  startedAt: number
  duration: number
  entryCount: number
}

interface Recording {
  entries: ReplayEntry[]
  startedAt: number
  duration: number
}

type View = 'list' | 'player'

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    background: '#1e1e2f',
    color: '#c9d1d9',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
    gap: '8px',
  },
  btn: {
    background: '#2a2d35',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '3px 10px',
    lineHeight: '20px',
  },
  btnActive: {
    background: '#3a5a8a',
    border: '1px solid #58a6ff',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '3px 10px',
    lineHeight: '20px',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px',
  },
  listItem: {
    padding: '10px 12px',
    marginBottom: '6px',
    background: '#262640',
    border: '1px solid #333',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  listItemLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#c9d1d9',
    marginBottom: '4px',
  },
  listItemMeta: {
    fontSize: 11,
    color: '#6e7681',
  },
  terminal: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 10px',
    background: '#0d1117',
    color: '#7ee787',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    fontSize: 13,
    lineHeight: 1.4,
    margin: 0,
  },
  scrubber: {
    width: '100%',
    accentColor: '#58a6ff',
    cursor: 'pointer',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderTop: '1px solid #333',
    flexShrink: 0,
  },
  timeLabel: {
    fontSize: 11,
    color: '#6e7681',
    minWidth: '80px',
  },
  empty: {
    padding: '40px 16px',
    textAlign: 'center' as const,
    color: '#6e7681',
    fontSize: 14,
  },
} as const

// ── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = 'http://127.0.0.1:3001'

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

// ── Component ───────────────────────────────────────────────────────────────

const ReplayPanel: React.FC = () => {
  const [view, setView] = useState<View>('list')
  const [sessions, setSessions] = useState<RecordingMeta[]>([])
  const [recording, setRecording] = useState<Recording | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [displayText, setDisplayText] = useState('')

  const preRef = useRef<HTMLPreElement>(null)
  const playbackRef = useRef<{ timer: number | null; cancelled: boolean }>({
    timer: null,
    cancelled: false,
  })

  // ── Fetch session list ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`${API_BASE}/api/replay/sessions`)
        if (!res.ok) return
        const json = (await res.json()) as { sessions: RecordingMeta[] }
        if (!cancelled) {
          setSessions(json.sessions)
        }
      } catch {
        // Server may not be running
      }
    }

    void poll()
    const interval = setInterval(() => { void poll() }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // ── Load a recording ────────────────────────────────────────────────────

  const loadRecording = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/replay/${sessionId}`)
      if (!res.ok) return
      const data = (await res.json()) as Recording
      setRecording(data)
      setActiveSessionId(sessionId)
      setView('player')
      setCurrentTime(0)
      setDisplayText('')
      setIsPlaying(false)
    } catch {
      // Fetch failed silently
    }
  }, [])

  // ── Build display text for a given time offset ──────────────────────────

  const buildTextAtTime = useCallback(
    (timeMs: number): string => {
      if (!recording) return ''
      let text = ''
      for (const entry of recording.entries) {
        const offset = entry.timestamp - recording.startedAt
        if (offset > timeMs) break
        text += entry.data
      }
      return text
    },
    [recording],
  )

  // ── Scrubber change handler ─────────────────────────────────────────────

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value)
      setCurrentTime(time)
      setDisplayText(buildTextAtTime(time))
      setIsPlaying(false)

      // Cancel any in-flight playback
      playbackRef.current.cancelled = true
      if (playbackRef.current.timer !== null) {
        clearTimeout(playbackRef.current.timer)
        playbackRef.current.timer = null
      }
    },
    [buildTextAtTime],
  )

  // ── Playback loop ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying || !recording || recording.entries.length === 0) return

    const ctx = { cancelled: false }
    playbackRef.current = { timer: null, cancelled: false }

    // Find the index of the first entry beyond currentTime
    let startIdx = 0
    for (let i = 0; i < recording.entries.length; i++) {
      const offset = recording.entries[i].timestamp - recording.startedAt
      if (offset > currentTime) {
        startIdx = i
        break
      }
      if (i === recording.entries.length - 1) {
        // Already past the end
        startIdx = recording.entries.length
      }
    }

    let accumulated = buildTextAtTime(currentTime)

    function scheduleNext(idx: number, prevOffset: number) {
      if (ctx.cancelled || idx >= recording!.entries.length) {
        if (!ctx.cancelled) {
          setIsPlaying(false)
        }
        return
      }

      const entry = recording!.entries[idx]
      const offset = entry.timestamp - recording!.startedAt
      const delay = Math.max(0, (offset - prevOffset) / speed)

      playbackRef.current.timer = window.setTimeout(() => {
        if (ctx.cancelled) return

        accumulated += entry.data
        setDisplayText(accumulated)
        setCurrentTime(offset)

        // Auto-scroll
        if (preRef.current) {
          preRef.current.scrollTop = preRef.current.scrollHeight
        }

        scheduleNext(idx + 1, offset)
      }, delay)
    }

    scheduleNext(startIdx, currentTime)

    return () => {
      ctx.cancelled = true
      playbackRef.current.cancelled = true
      if (playbackRef.current.timer !== null) {
        clearTimeout(playbackRef.current.timer)
        playbackRef.current.timer = null
      }
    }
  }, [isPlaying, recording, currentTime, speed, buildTextAtTime])

  // ── Auto-scroll during scrub ────────────────────────────────────────────

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [displayText])

  // ── Back to list ────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    setIsPlaying(false)
    playbackRef.current.cancelled = true
    if (playbackRef.current.timer !== null) {
      clearTimeout(playbackRef.current.timer)
      playbackRef.current.timer = null
    }
    setView('list')
    setRecording(null)
    setActiveSessionId(null)
    setCurrentTime(0)
    setDisplayText('')
  }, [])

  // ── Delete recording ────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await fetch(`${API_BASE}/api/replay/${sessionId}`, { method: 'DELETE' })
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId))
      } catch {
        // Delete failed silently
      }
    },
    [],
  )

  // ── Render: List view ───────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div style={styles.container}>
        <div style={styles.toolbar}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Session Recordings</span>
          <span style={{ fontSize: 11, color: '#6e7681' }}>
            {sessions.length} recording{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={styles.list}>
          {sessions.length === 0 && (
            <div style={styles.empty}>
              No recordings yet. Terminal output is recorded automatically.
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              style={styles.listItem}
              onClick={() => { void loadRecording(s.sessionId) }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#58a6ff'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = '#333'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={styles.listItemLabel}>
                  {s.sessionId.length > 24
                    ? `${s.sessionId.slice(0, 24)}...`
                    : s.sessionId}
                </div>
                <button
                  style={{ ...styles.btn, fontSize: 11, padding: '1px 6px' }}
                  onClick={(e) => { void handleDelete(s.sessionId, e) }}
                  title="Delete recording"
                >
                  Delete
                </button>
              </div>
              <div style={styles.listItemMeta}>
                Started {formatTime(s.startedAt)} | Duration{' '}
                {formatDuration(s.duration)} | {s.entryCount} events
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Render: Player view ─────────────────────────────────────────────────

  const duration = recording?.duration ?? 0

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button style={styles.btn} onClick={handleBack}>
          Back to list
        </button>
        <span style={{ fontSize: 12, color: '#6e7681', flex: 1, textAlign: 'center' }}>
          {activeSessionId}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {([1, 2, 4] as const).map((s) => (
            <button
              key={s}
              style={speed === s ? styles.btnActive : styles.btn}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <pre ref={preRef} style={styles.terminal}>
        {displayText || '\n  -- Press Play to start replay --\n'}
      </pre>

      <div style={styles.controls}>
        <button
          style={styles.btn}
          onClick={() => setIsPlaying((p) => !p)}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={handleScrub}
          style={styles.scrubber}
        />
        <span style={styles.timeLabel}>
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>
    </div>
  )
}

export default React.memo(ReplayPanel)
