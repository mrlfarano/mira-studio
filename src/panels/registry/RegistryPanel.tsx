/**
 * RegistryPanel — browse and install community workspace configs from
 * the Mira community registry (GitHub-hosted JSON index).
 */

import React, { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types (mirrored from server)
// ---------------------------------------------------------------------------

type Category = 'stack' | 'workflow' | 'minimal' | 'theme' | 'skill'

interface RegistryEntry {
  id: string
  name: string
  description: string
  author: string
  category: Category
  stars: number
  configUrl: string
  version: string
  tags: string[]
}

type InstallStatus = 'idle' | 'installing' | 'success' | 'error'

interface InstallState {
  status: InstallStatus
  error?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'http://127.0.0.1:3001/api/registry'

const ALL_CATEGORIES: Array<{ label: string; value: Category | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Stack', value: 'stack' },
  { label: 'Workflow', value: 'workflow' },
  { label: 'Minimal', value: 'minimal' },
  { label: 'Theme', value: 'theme' },
  { label: 'Skill', value: 'skill' },
]

const CATEGORY_COLORS: Record<Category, string> = {
  stack: '#6366f1',
  workflow: '#f59e0b',
  minimal: '#10b981',
  theme: '#ec4899',
  skill: '#8b5cf6',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
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

const searchStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: '#16213e',
  border: '1px solid #333',
  borderRadius: 6,
  color: '#e2e2e2',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const pillContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginTop: 10,
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  cursor: 'pointer',
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 16,
  border: active ? '1px solid #6366f1' : '1px solid #444',
  background: active ? '#6366f1' : 'transparent',
  color: active ? '#fff' : '#aaa',
  transition: 'all 0.15s ease',
})

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 12,
  marginTop: 14,
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 8,
  padding: '14px 16px',
  background: 'rgba(255, 255, 255, 0.03)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const badgeStyle = (category: Category): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '2px 8px',
  borderRadius: 4,
  background: CATEGORY_COLORS[category] + '22',
  color: CATEGORY_COLORS[category],
})

const installBtn: React.CSSProperties = {
  cursor: 'pointer',
  background: '#6366f1',
  border: 'none',
  borderRadius: 4,
  color: '#fff',
  padding: '6px 16px',
  fontSize: 12,
  fontWeight: 600,
  alignSelf: 'flex-start',
}

const installBtnDisabled: React.CSSProperties = {
  ...installBtn,
  background: '#555',
  cursor: 'not-allowed',
}

const emptyStyle: React.CSSProperties = {
  color: '#aaa',
  textAlign: 'center',
  padding: '32px 16px',
  lineHeight: 1.6,
}

// ---------------------------------------------------------------------------
// EntryCard
// ---------------------------------------------------------------------------

const EntryCard: React.FC<{
  entry: RegistryEntry
  state: InstallState
  onInstall: (id: string) => void
}> = ({ entry, state, onInstall }) => (
  <div style={cardStyle}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <strong style={{ fontSize: 14 }}>{entry.name}</strong>
      <span style={badgeStyle(entry.category)}>{entry.category}</span>
    </div>

    <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
      {entry.description}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#888' }}>
      <span>{entry.author}</span>
      <span>v{entry.version}</span>
      <span>{entry.stars} stars</span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
      <button
        style={state.status === 'installing' ? installBtnDisabled : installBtn}
        disabled={state.status === 'installing'}
        onClick={() => onInstall(entry.id)}
      >
        {state.status === 'installing'
          ? 'Installing...'
          : state.status === 'success'
            ? 'Installed'
            : 'Install'}
      </button>

      {state.status === 'success' && (
        <span style={{ fontSize: 12, color: '#10b981' }}>Done</span>
      )}
      {state.status === 'error' && (
        <span style={{ fontSize: 12, color: '#f44336' }}>
          {state.error ?? 'Install failed'}
        </span>
      )}
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// RegistryPanel
// ---------------------------------------------------------------------------

const RegistryPanel: React.FC = () => {
  const [entries, setEntries] = useState<RegistryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [installStates, setInstallStates] = useState<Record<string, InstallState>>({})

  // -----------------------------------------------------------------------
  // Fetch entries
  // -----------------------------------------------------------------------

  const fetchEntries = useCallback(async (q?: string, cat?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (cat && cat !== 'all') params.set('category', cat)
      const qs = params.toString()
      const url = `${API_BASE}/browse${qs ? `?${qs}` : ''}`
      const data = await fetchJson<{ entries: RegistryEntry[] }>(url)
      setEntries(data.entries)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      await fetchEntries()
    })()
    return () => { cancelled = true }
  }, [fetchEntries])

  // Refetch when category changes (server-side filter)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      await fetchEntries(query || undefined, activeCategory)
    })()
    return () => { cancelled = true }
  }, [activeCategory, fetchEntries, query])

  // -----------------------------------------------------------------------
  // Client-side filter (query also filters locally for instant feedback)
  // -----------------------------------------------------------------------

  const filteredEntries = query
    ? entries.filter((e) => {
        const q = query.toLowerCase()
        const haystack = [e.name, e.description, e.author, ...e.tags]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    : entries

  // -----------------------------------------------------------------------
  // Search debounce — re-fetch on server after typing stops
  // -----------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntries(query || undefined, activeCategory)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, activeCategory, fetchEntries])

  // -----------------------------------------------------------------------
  // Install handler
  // -----------------------------------------------------------------------

  const handleInstall = useCallback(async (id: string) => {
    setInstallStates((prev) => ({
      ...prev,
      [id]: { status: 'installing' },
    }))

    try {
      await fetchJson<{ ok: true; id: string }>(
        `${API_BASE}/install/${id}`,
        { method: 'POST' },
      )
      setInstallStates((prev) => ({
        ...prev,
        [id]: { status: 'success' },
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setInstallStates((prev) => ({
        ...prev,
        [id]: { status: 'error', error: message },
      }))
    }
  }, [])

  const getInstallState = useCallback(
    (id: string): InstallState => installStates[id] ?? { status: 'idle' },
    [installStates],
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: '0 0 12px' }}>Community Registry</h3>

      {/* Search input */}
      <input
        style={searchStyle}
        placeholder="Search configs, themes, workflows..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Category pills */}
      <div style={pillContainerStyle}>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            style={pillStyle(activeCategory === cat.value)}
            onClick={() => setActiveCategory(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
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

      {/* Loading */}
      {loading && (
        <p style={{ color: '#aaa', marginTop: 16 }}>
          Loading registry...
        </p>
      )}

      {/* Empty state */}
      {!loading && filteredEntries.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0, fontWeight: 600, color: '#e2e2e2' }}>
            No configs found
          </p>
          <p style={{ margin: '8px 0 0' }}>
            Try a different search term or category filter.
          </p>
        </div>
      )}

      {/* Card grid */}
      {!loading && filteredEntries.length > 0 && (
        <div style={gridStyle}>
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              state={getInstallState(entry.id)}
              onInstall={handleInstall}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default React.memo(RegistryPanel)
