import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useSIStore } from '@/store/si-store'
import type { SIBuild, SILesson, SIHypothesis, SIBuildResult } from '@/store/si-store'

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const columnStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 8,
  background: '#12121a',
  borderRadius: 6,
  overflow: 'auto',
}

const columnHeaderStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#888',
  marginBottom: 4,
  paddingBottom: 4,
  borderBottom: '1px solid #2a2a3a',
}

const cardStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a3a',
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 12,
  lineHeight: 1.4,
}

const tagStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: 3,
  background: color,
  color: '#fff',
  marginRight: 4,
})

const healthBarOuter: React.CSSProperties = {
  height: 6,
  background: '#222',
  borderRadius: 3,
  overflow: 'hidden',
  marginTop: 4,
}

// ---------------------------------------------------------------------------
// Agent section styles
// ---------------------------------------------------------------------------

const agentSectionStyle: React.CSSProperties = {
  padding: '8px 8px 4px',
  borderBottom: '1px solid #2a2a3a',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const agentHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: '#ccc',
}

const statusDotStyle = (running: boolean): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: running ? '#2d6a4f' : '#555',
  display: 'inline-block',
  animation: running ? 'pulse 1.5s ease-in-out infinite' : 'none',
})

const agentBtnStyle: React.CSSProperties = {
  background: '#0077b6',
  border: 'none',
  borderRadius: 4,
  padding: '5px 10px',
  fontSize: 11,
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
}

const agentBtnDisabledStyle: React.CSSProperties = {
  ...agentBtnStyle,
  background: '#333',
  color: '#666',
  cursor: 'not-allowed',
}

const reviewCardStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2d6a4f',
  borderRadius: 6,
  padding: 10,
  fontSize: 12,
}

const buildOutputStyle: React.CSSProperties = {
  background: '#0e0e16',
  border: '1px solid #333',
  borderRadius: 4,
  padding: 6,
  fontFamily: 'monospace',
  fontSize: 10,
  color: '#aaa',
  maxHeight: 200,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}

const buildHistoryCardStyle: React.CSSProperties = {
  ...cardStyle,
  borderLeftWidth: 3,
  borderLeftStyle: 'solid',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const BuildCard: React.FC<{ build: SIBuild }> = ({ build }) => (
  <div style={cardStyle}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontWeight: 600, color: '#ccc' }}>{build.branch}</span>
      <span style={tagStyle(build.accepted ? '#2d6a4f' : '#9b2226')}>
        {build.accepted ? 'Accepted' : 'Rejected'}
      </span>
    </div>
    <div style={{ color: '#999', fontSize: 11 }}>{build.outcome}</div>
    <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
      {new Date(build.date).toLocaleDateString()}
    </div>
  </div>
)

const LessonCard: React.FC<{ lesson: SILesson }> = ({ lesson }) => {
  const sourceColors: Record<string, string> = {
    mira: '#7b2cbf',
    agent: '#0077b6',
    user: '#e07a22',
  }
  return (
    <div style={cardStyle}>
      <span style={tagStyle(sourceColors[lesson.source] ?? '#555')}>
        {lesson.source}
      </span>
      <span style={{ color: '#ccc' }}>{lesson.content}</span>
      <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
        {new Date(lesson.date).toLocaleDateString()}
      </div>
    </div>
  )
}

const HypothesisCard: React.FC<{
  hypothesis: SIHypothesis
  onRunCycle?: (id: string) => void
  canRun?: boolean
}> = ({ hypothesis, onRunCycle, canRun }) => {
  const impactColors: Record<string, string> = {
    low: '#555',
    medium: '#b08d1a',
    high: '#c0392b',
  }
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: '#ccc' }}>{hypothesis.title}</span>
        <span style={tagStyle(impactColors[hypothesis.impact] ?? '#555')}>
          {hypothesis.impact}
        </span>
      </div>
      <div style={{ color: '#999', fontSize: 11 }}>{hypothesis.description}</div>
      {onRunCycle && hypothesis.status === 'queued' && (
        <button
          onClick={() => onRunCycle(hypothesis.id)}
          disabled={!canRun}
          style={canRun ? {
            ...agentBtnStyle,
            marginTop: 4,
            fontSize: 10,
            padding: '3px 8px',
          } : {
            ...agentBtnDisabledStyle,
            marginTop: 4,
            fontSize: 10,
            padding: '3px 8px',
          }}
        >
          Run SI Cycle
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agent Build Review Card
// ---------------------------------------------------------------------------

const AgentBuildReview: React.FC<{
  build: SIBuildResult
  onDismiss: () => void
}> = ({ build, onDismiss }) => {
  const [showOutput, setShowOutput] = useState(false)
  const [prResult, setPRResult] = useState<{
    branch: string
    suggestedCommand: string
    pushed: boolean
  } | null>(null)
  const [prError, setPRError] = useState<string | null>(null)

  const handleConsentPR = useCallback(async () => {
    try {
      setPRError(null)
      const store = useSIStore.getState()
      const result = await store.consentPR(build.id)
      setPRResult(result)
    } catch (err) {
      setPRError((err as Error).message)
    }
  }, [build.id])

  const durationStr = build.duration < 60000
    ? `${Math.round(build.duration / 1000)}s`
    : `${Math.round(build.duration / 60000)}m ${Math.round((build.duration % 60000) / 1000)}s`

  return (
    <div style={reviewCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: '#ccc', fontSize: 13 }}>
          Build Complete
        </span>
        <span style={tagStyle(build.success ? '#2d6a4f' : '#9b2226')}>
          {build.success ? 'Success' : 'Failed'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 }}>
        <div style={{ color: '#999', fontSize: 11 }}>
          <strong style={{ color: '#aaa' }}>Hypothesis:</strong> {build.hypothesisTitle}
        </div>
        <div style={{ color: '#999', fontSize: 11 }}>
          <strong style={{ color: '#aaa' }}>Branch:</strong>{' '}
          <code style={{ color: '#0077b6' }}>{build.branch}</code>
        </div>
        <div style={{ color: '#999', fontSize: 11 }}>
          <strong style={{ color: '#aaa' }}>Duration:</strong> {durationStr}
        </div>
      </div>

      {/* Collapsible output */}
      <button
        onClick={() => setShowOutput((v) => !v)}
        style={{
          background: 'transparent',
          border: '1px solid #333',
          borderRadius: 3,
          color: '#888',
          fontSize: 10,
          cursor: 'pointer',
          padding: '2px 6px',
          marginBottom: 6,
        }}
      >
        {showOutput ? 'Hide Output' : 'Show Output'}
      </button>
      {showOutput && (
        <div style={buildOutputStyle}>
          {build.output || '(no output captured)'}
        </div>
      )}

      {/* PR result */}
      {prResult && (
        <div style={{
          background: '#0e0e16',
          border: '1px solid #2d6a4f',
          borderRadius: 4,
          padding: 6,
          marginTop: 6,
          fontSize: 11,
        }}>
          <div style={{ color: '#2d6a4f', fontWeight: 600, marginBottom: 4 }}>
            {prResult.pushed ? 'Branch pushed!' : 'Push failed (push manually)'}
          </div>
          <div style={{ color: '#999', marginBottom: 4 }}>
            Create the PR with:
          </div>
          <code style={{
            display: 'block',
            background: '#000',
            padding: 4,
            borderRadius: 3,
            color: '#0077b6',
            fontSize: 10,
            wordBreak: 'break-all',
          }}>
            {prResult.suggestedCommand}
          </code>
        </div>
      )}

      {prError && (
        <div style={{ color: '#c0392b', fontSize: 11, marginTop: 4 }}>
          {prError}
        </div>
      )}

      {/* Action buttons */}
      {!prResult && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button
            onClick={handleConsentPR}
            style={{
              ...agentBtnStyle,
              background: '#2d6a4f',
            }}
          >
            Open PR
          </button>
          <button
            onClick={onDismiss}
            style={{
              ...agentBtnStyle,
              background: '#333',
              color: '#aaa',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Agent Build History Card
// ---------------------------------------------------------------------------

const AgentBuildHistoryCard: React.FC<{ build: SIBuildResult }> = ({ build }) => {
  const durationStr = build.duration < 60000
    ? `${Math.round(build.duration / 1000)}s`
    : `${Math.round(build.duration / 60000)}m`

  return (
    <div style={{
      ...buildHistoryCardStyle,
      borderLeftColor: build.success ? '#2d6a4f' : '#9b2226',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: '#ccc', fontSize: 11 }}>
          {build.hypothesisTitle}
        </span>
        <span style={tagStyle(build.success ? '#2d6a4f' : '#9b2226')}>
          {build.success ? 'Pass' : 'Fail'}
        </span>
      </div>
      <div style={{ color: '#666', fontSize: 10 }}>
        <code>{build.branch}</code> -- {durationStr}
      </div>
      <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>
        {new Date(build.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SIPanel — agent section + three-column layout
// ---------------------------------------------------------------------------

const SIPanel: React.FC = () => {
  const {
    hypotheses,
    lessons,
    builds,
    health,
    loading,
    error,
    agentStatus,
    currentBuild,
    buildHistory,
    fetchAll,
    fetchHealth,
    addHypothesis,
    addLesson,
    setCurrentBuild,
    fetchAgentStatus,
    fetchAgentBuilds,
    runCycle,
  } = useSIStore()

  const [showHypForm, setShowHypForm] = useState(false)
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [showBuildHistory, setShowBuildHistory] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchAll()
    fetchHealth()
    fetchAgentStatus()
    fetchAgentBuilds()
  }, [fetchAll, fetchHealth, fetchAgentStatus, fetchAgentBuilds])

  // Poll agent status every 3 seconds while running
  useEffect(() => {
    if (agentStatus === 'running') {
      pollRef.current = setInterval(() => {
        fetchAgentStatus()
        fetchAgentBuilds()
      }, 3000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
      // When agent finishes, fetch the latest builds
      fetchAgentBuilds()
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [agentStatus, fetchAgentStatus, fetchAgentBuilds])

  // When build history updates while running, check if there is a new completed build
  useEffect(() => {
    if (agentStatus === 'idle' && buildHistory.length > 0 && !currentBuild) {
      const latest = buildHistory[0]
      if (latest && Date.now() - latest.timestamp < 30000) {
        setCurrentBuild(latest)
      }
    }
  }, [agentStatus, buildHistory, currentBuild, setCurrentBuild])

  // --- Handlers ---

  const handleRunCycle = useCallback(
    async (hypothesisId: string) => {
      await runCycle(hypothesisId)
    },
    [runCycle],
  )

  const handleDismissReview = useCallback(() => {
    setCurrentBuild(null)
  }, [setCurrentBuild])

  const handleAddHypothesis = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const fd = new FormData(form)
      await addHypothesis({
        title: fd.get('title') as string,
        description: fd.get('description') as string,
        impact: (fd.get('impact') as 'low' | 'medium' | 'high') || 'medium',
        status: 'queued',
      })
      form.reset()
      setShowHypForm(false)
    },
    [addHypothesis],
  )

  const handleAddLesson = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const fd = new FormData(form)
      await addLesson({
        content: fd.get('content') as string,
        source: (fd.get('source') as 'mira' | 'agent' | 'user') || 'user',
      })
      form.reset()
      setShowLessonForm(false)
    },
    [addLesson],
  )

  // Filter hypotheses for "What's Next" column
  const queuedHypotheses = hypotheses.filter(
    (h) => h.status === 'queued' || h.status === 'testing',
  )

  const healthColor =
    health && health.score >= 60 ? '#2d6a4f' : health && health.score >= 30 ? '#b08d1a' : '#9b2226'

  if (loading && builds.length === 0) {
    return <div style={{ padding: 16, color: '#888' }}>Loading SI data...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* ================================================================= */}
      {/* SI Agent Section */}
      {/* ================================================================= */}
      <div style={agentSectionStyle}>
        <div style={agentHeaderStyle}>
          <span style={statusDotStyle(agentStatus === 'running')} />
          <span>SI Agent</span>
          <span style={{ fontSize: 10, fontWeight: 400, color: '#666' }}>
            {agentStatus === 'running' ? 'Running...' : 'Idle'}
          </span>
        </div>

        {/* Agent running indicator */}
        {agentStatus === 'running' && (
          <div style={{
            fontSize: 11,
            color: '#999',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              border: '2px solid #2d6a4f',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            Building improvement...
          </div>
        )}

        {/* Build review card */}
        {currentBuild && agentStatus === 'idle' && (
          <AgentBuildReview
            build={currentBuild}
            onDismiss={handleDismissReview}
          />
        )}

        {/* Build history toggle */}
        {buildHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowBuildHistory((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 10,
                padding: '2px 0',
                textDecoration: 'underline',
              }}
            >
              {showBuildHistory ? 'Hide' : 'Show'} build history ({buildHistory.length})
            </button>
            {showBuildHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {buildHistory.map((b) => (
                  <AgentBuildHistoryCard key={b.id} build={b} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Health bar */}
      {/* ================================================================= */}
      {health && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#888' }}>
          SI Health: {health.score}/100
          <div style={healthBarOuter}>
            <div
              style={{
                width: `${health.score}%`,
                height: '100%',
                background: healthColor,
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '4px 8px', fontSize: 11, color: '#c0392b' }}>{error}</div>
      )}

      {/* ================================================================= */}
      {/* Three-column layout */}
      {/* ================================================================= */}
      <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden', padding: '0 4px 4px' }}>
        {/* Column 1: What We Built */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle}>What We Built</div>
          {builds.length === 0 && (
            <div style={{ color: '#555', fontSize: 11 }}>No builds recorded yet.</div>
          )}
          {[...builds].reverse().map((b) => (
            <BuildCard key={b.id} build={b} />
          ))}
        </div>

        {/* Column 2: What We Learned */}
        <div style={columnStyle}>
          <div style={{ ...columnHeaderStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>What We Learned</span>
            <button
              onClick={() => setShowLessonForm((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Add lesson"
            >
              +
            </button>
          </div>
          {showLessonForm && (
            <form onSubmit={handleAddLesson} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input name="content" placeholder="What did we learn?" required style={inputStyle} />
              <select name="source" style={inputStyle}>
                <option value="user">User</option>
                <option value="mira">Mira</option>
                <option value="agent">Agent</option>
              </select>
              <button type="submit" style={submitBtnStyle}>Add Lesson</button>
            </form>
          )}
          {lessons.length === 0 && !showLessonForm && (
            <div style={{ color: '#555', fontSize: 11 }}>No lessons captured yet.</div>
          )}
          {[...lessons].reverse().map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </div>

        {/* Column 3: What's Next */}
        <div style={columnStyle}>
          <div style={{ ...columnHeaderStyle, display: 'flex', justifyContent: 'space-between' }}>
            <span>What&apos;s Next</span>
            <button
              onClick={() => setShowHypForm((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: 14,
              }}
              aria-label="Add hypothesis"
            >
              +
            </button>
          </div>
          {showHypForm && (
            <form onSubmit={handleAddHypothesis} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input name="title" placeholder="Hypothesis title" required style={inputStyle} />
              <input name="description" placeholder="Description" style={inputStyle} />
              <select name="impact" style={inputStyle}>
                <option value="medium">Medium Impact</option>
                <option value="high">High Impact</option>
                <option value="low">Low Impact</option>
              </select>
              <button type="submit" style={submitBtnStyle}>Add Hypothesis</button>
            </form>
          )}
          {queuedHypotheses.length === 0 && !showHypForm && (
            <div style={{ color: '#555', fontSize: 11 }}>No queued hypotheses.</div>
          )}
          {queuedHypotheses.map((h) => (
            <HypothesisCard
              key={h.id}
              hypothesis={h}
              onRunCycle={handleRunCycle}
              canRun={agentStatus === 'idle'}
            />
          ))}
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  background: '#0e0e16',
  border: '1px solid #333',
  borderRadius: 3,
  padding: '4px 6px',
  fontSize: 11,
  color: '#ccc',
  outline: 'none',
}

const submitBtnStyle: React.CSSProperties = {
  background: '#2d6a4f',
  border: 'none',
  borderRadius: 3,
  padding: '4px 8px',
  fontSize: 11,
  color: '#fff',
  cursor: 'pointer',
}

export default React.memo(SIPanel)
