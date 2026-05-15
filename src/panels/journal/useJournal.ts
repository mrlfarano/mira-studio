import { useEffect, useState } from 'react'

export interface JournalEntry {
  timestamp: string
  source: string
  description: string
}

export interface JournalDay {
  date: string
  entries: JournalEntry[]
}

export interface UseJournalResult {
  data: JournalDay | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useJournal(): UseJournalResult {
  const [data, setData] = useState<JournalDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bump, setBump] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/journal/today')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as JournalDay
      })
      .then((body) => {
        if (cancelled) return
        setData(body)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bump])

  const refresh = () => setBump((b) => b + 1)

  return { data, loading, error, refresh }
}
