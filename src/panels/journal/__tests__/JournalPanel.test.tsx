import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import JournalPanel from '../JournalPanel'

describe('JournalPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            date: '2026-05-15',
            entries: [
              { timestamp: '10:30', source: 'pty', description: 'session-1 spawned' },
              { timestamp: '10:32', source: 'kanban', description: 'card moved to In Agent' },
            ],
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
  })

  it('renders today\'s entries', async () => {
    render(<JournalPanel />)
    await waitFor(() => {
      expect(screen.getByText(/session-1 spawned/)).toBeInTheDocument()
      expect(screen.getByText(/card moved to In Agent/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ date: '2026-05-15', entries: [] }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    render(<JournalPanel />)
    await waitFor(() => {
      expect(screen.getByText(/no journal entries yet/i)).toBeInTheDocument()
    })
  })
})
