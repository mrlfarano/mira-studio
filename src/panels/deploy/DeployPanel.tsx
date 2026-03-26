/**
 * DeployPanel -- one-click deploy via MCP tool invocation.
 *
 * On mount it fetches MCP connections, discovers deploy-related tools
 * (names containing "deploy", "build", or "publish"), and presents a
 * button for each.  Clicking a button invokes the tool via the
 * call-tool REST endpoint and shows the result inline.
 */

import React, { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types (mirrored from server)
// ---------------------------------------------------------------------------

interface McpConnection {
  id: string
  name: string
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  error?: string
  connectedAt?: string
  toolCount: number
}

interface McpTool {
  name: string
  description?: string
}

interface DeployTarget {
  connectionId: string
  connectionName: string
  tool: McpTool
}

type DeployStatus = 'idle' | 'deploying' | 'success' | 'error'

interface DeployState {
  status: DeployStatus
  result?: unknown
  error?: string
}

const API_BASE = '/api/mcp'

const DEPLOY_KEYWORDS = ['deploy', 'build', 'publish']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${body}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

function isDeployTool(toolName: string): boolean {
  const lower = toolName.toLowerCase()
  return DEPLOY_KEYWORDS.some((kw) => lower.includes(kw))
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
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 8,
  padding: '12px 16px',
  marginBottom: 8,
  background: 'rgba(255, 255, 255, 0.03)',
}

const btnDeploy: React.CSSProperties = {
  cursor: 'pointer',
  background: '#4caf50',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  padding: '6px 16px',
  fontSize: 12,
  fontWeight: 600,
}

const btnDeployDisabled: React.CSSProperties = {
  ...btnDeploy,
  background: '#555',
  cursor: 'not-allowed',
}

const statusDot = (status: DeployStatus): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
  background:
    status === 'idle'
      ? '#9e9e9e'
      : status === 'deploying'
        ? '#f5a623'
        : status === 'success'
          ? '#4caf50'
          : '#f44336',
})

const emptyStyle: React.CSSProperties = {
  color: '#aaa',
  textAlign: 'center',
  padding: '32px 16px',
  lineHeight: 1.6,
}

// ---------------------------------------------------------------------------
// DeployTargetCard
// ---------------------------------------------------------------------------

const DeployTargetCard: React.FC<{
  target: DeployTarget
  state: DeployState
  onDeploy: (target: DeployTarget) => void
}> = ({ target, state, onDeploy }) => (
  <div style={cardStyle}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={statusDot(state.status)} />
      <strong style={{ flex: 1 }}>{target.connectionName}</strong>
      <span style={{ fontSize: 11, color: '#aaa' }}>{target.tool.name}</span>
    </div>

    {target.tool.description && (
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
        {target.tool.description}
      </div>
    )}

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
      <button
        style={state.status === 'deploying' ? btnDeployDisabled : btnDeploy}
        disabled={state.status === 'deploying'}
        onClick={() => onDeploy(target)}
      >
        {state.status === 'deploying' ? 'Deploying...' : 'Deploy'}
      </button>

      {state.status === 'success' && (
        <span style={{ fontSize: 12, color: '#4caf50' }}>
          Deploy succeeded
        </span>
      )}
      {state.status === 'error' && (
        <span style={{ fontSize: 12, color: '#f44336' }}>
          {state.error ?? 'Deploy failed'}
        </span>
      )}
    </div>

    {state.status === 'success' && state.result != null && (
      <pre
        style={{
          marginTop: 8,
          padding: 8,
          background: '#12121f',
          borderRadius: 4,
          fontSize: 11,
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          color: '#ccc',
          maxHeight: 200,
        }}
      >
        {typeof state.result === 'string'
          ? state.result
          : JSON.stringify(state.result, null, 2)}
      </pre>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// DeployPanel
// ---------------------------------------------------------------------------

const DeployPanel: React.FC = () => {
  const [targets, setTargets] = useState<DeployTarget[]>([])
  const [deployStates, setDeployStates] = useState<Record<string, DeployState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const stateKey = (t: DeployTarget) => `${t.connectionId}:${t.tool.name}`

  const getState = useCallback(
    (t: DeployTarget): DeployState =>
      deployStates[stateKey(t)] ?? { status: 'idle' },
    [deployStates],
  )

  const setTargetState = useCallback(
    (t: DeployTarget, patch: Partial<DeployState>) => {
      setDeployStates((prev) => ({
        ...prev,
        [stateKey(t)]: { ...((prev[stateKey(t)] ?? { status: 'idle' }) as DeployState), ...patch },
      }))
    },
    [],
  )

  // -------------------------------------------------------------------------
  // Load deploy targets on mount
  // -------------------------------------------------------------------------

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const connections = await fetchJson<McpConnection[]>(
        `${API_BASE}/connections`,
      )

      const connected = connections.filter((c) => c.status === 'connected')

      const allTargets: DeployTarget[] = []
      for (const conn of connected) {
        try {
          const tools = await fetchJson<McpTool[]>(
            `${API_BASE}/connections/${conn.id}/tools`,
          )
          for (const tool of tools) {
            if (isDeployTool(tool.name)) {
              allTargets.push({
                connectionId: conn.id,
                connectionName: conn.name,
                tool,
              })
            }
          }
        } catch {
          // skip connections whose tools can't be listed
        }
      }

      setTargets(allTargets)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // -------------------------------------------------------------------------
  // Deploy handler
  // -------------------------------------------------------------------------

  const handleDeploy = useCallback(
    async (target: DeployTarget) => {
      setTargetState(target, { status: 'deploying', error: undefined, result: undefined })
      try {
        const result = await fetchJson<unknown>(
          `${API_BASE}/connections/${target.connectionId}/call-tool`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolName: target.tool.name, args: {} }),
          },
        )
        setTargetState(target, { status: 'success', result })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setTargetState(target, { status: 'error', error: message })
      }
    },
    [setTargetState],
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Deploy</h3>
        <button
          onClick={refresh}
          style={{
            cursor: 'pointer',
            background: 'none',
            border: '1px solid #333',
            borderRadius: 4,
            color: '#e2e2e2',
            padding: '4px 10px',
            fontSize: 12,
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            background: '#3c1414',
            color: '#f44336',
            padding: 8,
            borderRadius: 4,
            marginTop: 12,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <p style={{ color: '#aaa', marginTop: 16 }}>
          Scanning MCP connections for deploy tools...
        </p>
      )}

      {!loading && targets.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0, fontWeight: 600, color: '#e2e2e2' }}>
            No deploy targets found
          </p>
          <p style={{ margin: '8px 0 0' }}>
            Connect an MCP server that exposes deploy, build, or publish tools.
            You can add MCP connections from the MCP Status panel or the
            command palette.
          </p>
        </div>
      )}

      {!loading && targets.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {targets.map((t) => (
            <DeployTargetCard
              key={stateKey(t)}
              target={t}
              state={getState(t)}
              onDeploy={handleDeploy}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default React.memo(DeployPanel)
