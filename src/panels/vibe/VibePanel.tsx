import React, { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VibeFactors {
  errorRate: number
  buildSuccess: number
  sessionActivity: number
  timeOnTask: number
}

interface VibeData {
  score: number
  factors: VibeFactors
}

interface VibeHistoryEntry {
  date: string
  score: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://127.0.0.1:3001'

function scoreColor(score: number): string {
  if (score <= 30) return '#ef4444'
  if (score <= 60) return '#eab308'
  return '#22c55e'
}

function factorLabel(key: string): string {
  const labels: Record<string, string> = {
    errorRate: 'Error Rate',
    buildSuccess: 'Build Success',
    sessionActivity: 'Session Activity',
    timeOnTask: 'Time on Task',
  }
  return labels[key] ?? key
}

// ---------------------------------------------------------------------------
// ScoreGauge — circular SVG gauge
// ---------------------------------------------------------------------------

const GAUGE_SIZE = 140
const STROKE_WIDTH = 12
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE
  const color = scoreColor(score)

  return (
    <div style={{ position: 'relative', width: GAUGE_SIZE, height: GAUGE_SIZE, margin: '0 auto' }}>
      <svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#2a2a3e"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Score arc */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>VIBE</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FactorBar — mini horizontal bar for a single factor
// ---------------------------------------------------------------------------

const FactorBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const color = scoreColor(value)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#2a2a3e', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            borderRadius: 3,
            background: color,
            transition: 'width 0.6s ease, background 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sparkline — simple SVG polyline of last 7 days
// ---------------------------------------------------------------------------

const SPARKLINE_W = 200
const SPARKLINE_H = 40
const SPARKLINE_PAD = 4

const Sparkline: React.FC<{ history: VibeHistoryEntry[] }> = ({ history }) => {
  const last7 = history.slice(-7)
  if (last7.length < 2) {
    return (
      <div style={{ textAlign: 'center', fontSize: 11, color: '#555', padding: '8px 0' }}>
        Not enough history for sparkline
      </div>
    )
  }

  const scores = last7.map((h) => h.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1

  const points = scores
    .map((s, i) => {
      const x = SPARKLINE_PAD + (i / (scores.length - 1)) * (SPARKLINE_W - 2 * SPARKLINE_PAD)
      const y = SPARKLINE_PAD + (1 - (s - min) / range) * (SPARKLINE_H - 2 * SPARKLINE_PAD)
      return `${x},${y}`
    })
    .join(' ')

  const lastScore = scores[scores.length - 1]

  return (
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Last 7 days</div>
      <svg width={SPARKLINE_W} height={SPARKLINE_H} style={{ display: 'block', margin: '0 auto' }}>
        <polyline
          points={points}
          fill="none"
          stroke={scoreColor(lastScore)}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots at each point */}
        {scores.map((s, i) => {
          const x = SPARKLINE_PAD + (i / (scores.length - 1)) * (SPARKLINE_W - 2 * SPARKLINE_PAD)
          const y = SPARKLINE_PAD + (1 - (s - min) / range) * (SPARKLINE_H - 2 * SPARKLINE_PAD)
          return (
            <circle
              key={last7[i].date}
              cx={x}
              cy={y}
              r={3}
              fill={scoreColor(s)}
            />
          )
        })}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VibePanel — main panel component
// ---------------------------------------------------------------------------

const VibePanel: React.FC = () => {
  const [vibe, setVibe] = useState<VibeData | null>(null)
  const [history, setHistory] = useState<VibeHistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchVibe = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vibe`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: VibeData = await res.json()
      setVibe(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vibe score')
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vibe/history`)
      if (!res.ok) return
      const data = await res.json() as { history: VibeHistoryEntry[] }
      setHistory(data.history)
    } catch {
      // History fetch is non-critical
    }
  }, [])

  useEffect(() => {
    fetchVibe()
    fetchHistory()

    const vibeTimer = setInterval(fetchVibe, 30_000)
    const historyTimer = setInterval(fetchHistory, 5 * 60_000)

    return () => {
      clearInterval(vibeTimer)
      clearInterval(historyTimer)
    }
  }, [fetchVibe, fetchHistory])

  if (error && !vibe) {
    return (
      <div style={{ padding: 16, color: '#ef4444', fontSize: 13 }}>
        Failed to load vibe score: {error}
      </div>
    )
  }

  if (!vibe) {
    return (
      <div style={{ padding: 16, color: '#666', fontSize: 13 }}>
        Loading vibe score...
      </div>
    )
  }

  return (
    <div
      style={{
        padding: 16,
        height: '100%',
        overflowY: 'auto',
        background: '#0f0f1a',
        color: '#e0e0e0',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <ScoreGauge score={vibe.score} />

      <div style={{ marginTop: 16 }}>
        {(Object.keys(vibe.factors) as Array<keyof VibeFactors>).map((key) => (
          <FactorBar key={key} label={factorLabel(key)} value={vibe.factors[key]} />
        ))}
      </div>

      <Sparkline history={history} />
    </div>
  )
}

export default React.memo(VibePanel)
