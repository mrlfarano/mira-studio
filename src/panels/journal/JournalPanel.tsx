import React from 'react'
import { useJournal } from './useJournal'
import type { JournalEntry } from './useJournal'

// ---------------------------------------------------------------------------
// Source badge colours
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  pty: '#4a9eff',
  kanban: '#f0a04b',
  config: '#a78bfa',
  system: '#6ee7b7',
  companion: '#f472b6',
}

function sourceBadgeStyle(source: string): React.CSSProperties {
  const color = SOURCE_COLORS[source] ?? '#9ca3af'
  return {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    marginRight: '8px',
    flexShrink: 0,
  }
}

// ---------------------------------------------------------------------------
// Entry row
// ---------------------------------------------------------------------------

const EntryRow: React.FC<{ entry: JournalEntry }> = ({ entry }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
      padding: '6px 0',
      borderBottom: '1px solid #1e293b',
      fontSize: '12px',
      lineHeight: '1.5',
    }}
  >
    <span
      style={{
        color: '#64748b',
        fontFamily: 'monospace',
        fontSize: '11px',
        flexShrink: 0,
        marginTop: '1px',
      }}
    >
      {entry.timestamp}
    </span>
    <span style={sourceBadgeStyle(entry.source)}>{entry.source}</span>
    <span style={{ color: '#cbd5e1', flex: 1 }}>{entry.description}</span>
  </div>
)

// ---------------------------------------------------------------------------
// JournalPanel
// ---------------------------------------------------------------------------

const JournalPanel: React.FC = () => {
  const { data, loading, error, refresh } = useJournal()

  if (loading) {
    return (
      <div
        style={{
          color: '#64748b',
          fontSize: '13px',
          padding: '16px',
          textAlign: 'center',
        }}
      >
        Loading journal...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '16px' }}>
        <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>
          Failed to load journal: {error}
        </p>
        <button
          onClick={refresh}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const entries = data?.entries ?? []
  const date = data?.date ?? ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0f172a',
      }}
    >
      {/* Date header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #1e293b',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          {date}
        </span>
        <button
          onClick={refresh}
          aria-label="Refresh journal"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
            padding: '2px 4px',
          }}
        >
          &#x21bb;
        </button>
      </div>

      {/* Entries */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 12px',
        }}
      >
        {entries.length === 0 ? (
          <p
            style={{
              color: '#475569',
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            No journal entries yet
          </p>
        ) : (
          entries.map((entry, idx) => (
            <EntryRow
              key={`${entry.timestamp}-${entry.source}-${idx}`}
              entry={entry}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default React.memo(JournalPanel)
