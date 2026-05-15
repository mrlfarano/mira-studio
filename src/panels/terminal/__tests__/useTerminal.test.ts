import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTerminal } from '../useTerminal'
import { useSessionStore } from '@/store/session-store'

vi.mock('@/hooks/useTerminalSocket', () => ({
  useTerminalSocket: () => ({
    sendInput: vi.fn(),
    resize: vi.fn(),
    spawn: vi.fn(),
    lastMessage: { type: 'spawned', sessionId: 'sess-123' },
    connectionState: 'connected',
  }),
}))

describe('useTerminal — spawned message', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSessions()
  })

  it('registers session in store when server emits spawned', () => {
    renderHook(() => useTerminal({ sessionId: 'sess-123' }))
    const sessions = useSessionStore.getState().sessions
    expect(sessions['sess-123']).toBeDefined()
    expect(sessions['sess-123'].id).toBe('sess-123')
  })
})
