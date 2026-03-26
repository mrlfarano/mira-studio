import React, { useCallback, useEffect, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Types (mirrors server JournalEntry)
// ---------------------------------------------------------------------------

interface JournalEntry {
  timestamp: string  // HH:MM
  source: string     // e.g. "pty", "config", "kanban", "system"
  description: string
}

interface JournalDateResponse {
  date: string
  entries: JournalEntry[]
  raw?: string
}

interface JournalListResponse {
  journals: string[]
}

interface JournalSummaryResponse {
  date: string
  summary: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = '/api/journal'

function todayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateLabel(date: string): string {
  const today = todayString()
  if (date === today) return 'Today'
  const parts = date.split('-')
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
  return date
}

// ---------------------------------------------------------------------------
// Source badge colour mapping
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  pty: '#0077b6',
  config: '#7b2cbf',
  kanban: '#e07a22',
  system: '#2d6a4f',
}

function sourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#555'
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  fontSize: 13,
  color: '#e2e2e2',
  background: '#1e1e2f',
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '6px 10px',
  borderBottom: '1px solid #333',
  flexShrink: 0,
  flexWrap: 'wrap',
}

const dateNavStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const navBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#ccc',
  cursor: 'pointer',
  fontSize: 13,
  padding: '2px 8px',
  lineHeight: 1,
}

const actionBtnStyle: React.CSSProperties = {
  background: '#2a2a3e',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#ccc',
  cursor: 'pointer',
  fontSize: 11,
  padding: '4px 10px',
  whiteSpace: 'nowrap',
}

const summaryBtnStyle: React.CSSProperties = {
  ...actionBtnStyle,
  background: '#6366f1',
  border: '1px solid #6366f1',
  color: '#fff',
  fontWeight: 600,
}

const timelineStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 10px',
}

const entryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  alignItems: 'flex-start',
  padding: '6px 0',
  borderBottom: '1px solid #2a2a3a',
  fontSize: 12,
  lineHeight: 1.5,
}

const timestampStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  color: '#888',
  flexShrink: 0,
  fontSize: 11,
  minWidth: 40,
}

const badgeStyle = (bg: string): React.CSSProperties => ({
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  padding: '1px 6px',
  borderRadius: 3,
  background: bg,
  color: '#fff',
  flexShrink: 0,
  minWidth: 48,
  textAlign: 'center',
})

const descriptionStyle: React.CSSProperties = {
  color: '#ccc',
  flex: 1,
}

const summaryBoxStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderTop: '1px solid #333',
  fontSize: 12,
  color: '#aaa',
  lineHeight: 1.5,
  background: '#1a1a2e',
  flexShrink: 0,
}

const emptyStyle: React.CSSProperties = {
  color: '#555',
  textAlign: 'center',
  marginTop: 24,
  fontSize: 12,
}

const statusBarStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#666',
  padding: '3px 10px',
  borderTop: '1px solid #2a2a3a',
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'space-between',
}

// ---------------------------------------------------------------------------
// Entry row sub-component
// ---------------------------------------------------------------------------

const JournalEntryRow: React.FC<{ entry: JournalEntry }> = React.memo(
  ({ entry }) => (
    <div style={entryStyle}>
      <span style={timestampStyle}>{entry.timestamp}</span>
      <span style={badgeStyle(sourceColor(entry.source))}>{entry.source}</span>
      <span style={descriptionStyle}>{entry.description}</span>
    </div>
  ),
)

JournalEntryRow.displayName = 'JournalEntryRow'

// ---------------------------------------------------------------------------
// JournalPanel
// ---------------------------------------------------------------------------

const JournalPanel: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayString)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Fetch available dates ----
  const fetchDates = useCallback(async () => {
    try {
      const res = await fetch(API_BASE)
      if (!res.ok) return
      const data = (await res.json()) as JournalListResponse
      setAvailableDates(data.journals)
    } catch {
      // Silently ignore -- dates list is non-critical
    }
  }, [])

  // ---- Fetch entries for a given date ----
  const fetchEntries = useCallback(async (date: string) => {
    setLoading(true)
    setError(null)
    setSummary(null)
    try {
      const today = todayString()
      const url = date === today ? `${API_BASE}/today` : `${API_BASE}/${date}`
      const res = await fetch(url)
      if (res.status === 404) {
        setEntries([])
        setLoading(false)
        return
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch journal: ${res.status}`)
      }
      const data = (await res.json()) as JournalDateResponse
      setEntries(data.entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- Generate summary ----
  const handleGenerateSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      })
      if (!res.ok) {
        throw new Error(`Summary generation failed: ${res.status}`)
      }
      const data = (await res.json()) as JournalSummaryResponse
      setSummary(data.summary)
    } catch (err) {
      setSummary(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setSummaryLoading(false)
    }
  }, [selectedDate])

  // ---- Manual refresh ----
  const handleRefresh = useCallback(() => {
    fetchEntries(selectedDate)
    fetchDates()
  }, [selectedDate, fetchEntries, fetchDates])

  // ---- Date navigation ----
  const currentDateIndex = useMemo(
    () => availableDates.indexOf(selectedDate),
    [availableDates, selectedDate],
  )

  const goNewer = useCallback(() => {
    if (currentDateIndex > 0) {
      setSelectedDate(availableDates[currentDateIndex - 1])
    }
  }, [currentDateIndex, availableDates])

  const goOlder = useCallback(() => {
    if (currentDateIndex < availableDates.length - 1) {
      setSelectedDate(availableDates[currentDateIndex + 1])
    } else if (currentDateIndex === -1 && availableDates.length > 0) {
      setSelectedDate(availableDates[0])
    }
  }, [currentDateIndex, availableDates])

  const handleDateSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDate(e.target.value)
    },
    [],
  )

  // ---- Fetch on mount and when date changes ----
  useEffect(() => {
    fetchDates()
  }, [fetchDates])

  useEffect(() => {
    fetchEntries(selectedDate)
  }, [selectedDate, fetchEntries])

  // ---- Determine if navigation buttons should be disabled ----
  const canGoNewer = currentDateIndex > 0
  const canGoOlder =
    currentDateIndex < availableDates.length - 1 ||
    (currentDateIndex === -1 && availableDates.length > 0)

  // ---- Build select options ----
  const dateOptions = useMemo(() => {
    const today = todayString()
    const dates = availableDates.includes(today)
      ? [...availableDates]
      : [today, ...availableDates]
    // Deduplicate and sort descending
    return [...new Set(dates)].sort().reverse()
  }, [availableDates])

  return (
    <div style={panelStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        {/* Date navigator */}
        <div style={dateNavStyle}>
          <button
            style={{
              ...navBtnStyle,
              opacity: canGoNewer ? 1 : 0.35,
              cursor: canGoNewer ? 'pointer' : 'default',
            }}
            onClick={goNewer}
            disabled={!canGoNewer}
            aria-label="Newer day"
            title="Newer day"
          >
            &lt;
          </button>

          <select
            value={selectedDate}
            onChange={handleDateSelect}
            style={{
              background: '#1a1a2e',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#e2e2e2',
              fontSize: 12,
              padding: '3px 6px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {dateOptions.map((d) => (
              <option key={d} value={d}>
                {formatDateLabel(d)}  ({d})
              </option>
            ))}
          </select>

          <button
            style={{
              ...navBtnStyle,
              opacity: canGoOlder ? 1 : 0.35,
              cursor: canGoOlder ? 'pointer' : 'default',
            }}
            onClick={goOlder}
            disabled={!canGoOlder}
            aria-label="Older day"
            title="Older day"
          >
            &gt;
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={actionBtnStyle}
            onClick={handleRefresh}
            title="Refresh entries"
          >
            Refresh
          </button>
          <button
            style={{
              ...summaryBtnStyle,
              opacity: summaryLoading ? 0.6 : 1,
              cursor: summaryLoading ? 'default' : 'pointer',
            }}
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            title="Generate daily summary"
          >
            {summaryLoading ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div style={timelineStyle}>
        {loading && (
          <div style={emptyStyle}>Loading entries...</div>
        )}

        {!loading && error && (
          <div style={{ ...emptyStyle, color: '#c0392b' }}>{error}</div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div style={emptyStyle}>No journal entries for this date.</div>
        )}

        {!loading &&
          !error &&
          entries.map((entry, idx) => (
            <JournalEntryRow
              key={`${entry.timestamp}-${entry.source}-${idx}`}
              entry={entry}
            />
          ))}
      </div>

      {/* Summary */}
      {summary && (
        <div style={summaryBoxStyle}>
          <strong style={{ color: '#8b5cf6', fontSize: 11 }}>Daily Summary</strong>
          <div style={{ marginTop: 4 }}>{summary}</div>
        </div>
      )}

      {/* Status bar */}
      <div style={statusBarStyle}>
        <span>{entries.length} entries</span>
        <span>{formatDateLabel(selectedDate)}</span>
      </div>
    </div>
  )
}

export default React.memo(JournalPanel)
