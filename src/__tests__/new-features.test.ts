import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCompanionStore } from '@/store/companion-store'
import type { CompanionMessage, ActionSuggestion } from '@/store/companion-store'
import { useSIStore } from '@/store/si-store'
import type { SIBuildResult } from '@/store/si-store'
import { useLayoutStore } from '@/store/layout-store'
import type { PanelConfig } from '@/types/panel'
import { useSessionStore } from '@/store/session-store'
import { useNotificationStore } from '@/store/notification-store'
import { buildPrompt, sendToAgent } from '@/lib/send-to-agent'
import type { KanbanCard } from '@/types/kanban'
import { broadcastToAgents } from '@/lib/broadcast'
import { QUICK_PROMPT_PRESETS } from '@/hooks/useQuickPrompt'

// ---------------------------------------------------------------------------
// 1. Companion Store
// ---------------------------------------------------------------------------

describe('Companion Store', () => {
  beforeEach(() =>
    useCompanionStore.setState(useCompanionStore.getInitialState()),
  )

  it('chatSessionId starts null', () => {
    expect(useCompanionStore.getState().chatSessionId).toBeNull()
  })

  it('setChatSessionId sets the ID', () => {
    useCompanionStore.getState().setChatSessionId('sess-abc-123')
    expect(useCompanionStore.getState().chatSessionId).toBe('sess-abc-123')
  })

  it('setChatSessionId can clear to null', () => {
    useCompanionStore.getState().setChatSessionId('sess-1')
    useCompanionStore.getState().setChatSessionId(null)
    expect(useCompanionStore.getState().chatSessionId).toBeNull()
  })

  it('isStreaming starts false', () => {
    expect(useCompanionStore.getState().isStreaming).toBe(false)
  })

  it('setStreaming updates to true', () => {
    useCompanionStore.getState().setStreaming(true)
    expect(useCompanionStore.getState().isStreaming).toBe(true)
  })

  it('setStreaming updates back to false', () => {
    useCompanionStore.getState().setStreaming(true)
    useCompanionStore.getState().setStreaming(false)
    expect(useCompanionStore.getState().isStreaming).toBe(false)
  })

  it('updateLastMessage updates the last companion message text', () => {
    const msg: CompanionMessage = {
      id: 'msg-1',
      role: 'companion',
      text: 'Hello there',
      timestamp: Date.now(),
    }
    useCompanionStore.getState().addMessage(msg)
    useCompanionStore.getState().updateLastMessage('Updated text')

    const messages = useCompanionStore.getState().messages
    expect(messages).toHaveLength(1)
    expect(messages[0].text).toBe('Updated text')
  })

  it('updateLastMessage does not modify user messages', () => {
    const userMsg: CompanionMessage = {
      id: 'msg-u1',
      role: 'user',
      text: 'User says hi',
      timestamp: Date.now(),
    }
    useCompanionStore.getState().addMessage(userMsg)
    useCompanionStore.getState().updateLastMessage('Should not apply')

    expect(useCompanionStore.getState().messages[0].text).toBe('User says hi')
  })

  it('updateLastMessage updates actions when provided', () => {
    const msg: CompanionMessage = {
      id: 'msg-2',
      role: 'companion',
      text: 'Initial',
      timestamp: Date.now(),
    }
    useCompanionStore.getState().addMessage(msg)

    const actions: ActionSuggestion[] = [
      {
        type: 'config_change',
        description: 'Enable dark mode',
        payload: { theme: 'dark' },
      },
    ]
    useCompanionStore.getState().updateLastMessage('With actions', actions)

    const updated = useCompanionStore.getState().messages[0]
    expect(updated.text).toBe('With actions')
    expect(updated.actions).toHaveLength(1)
    expect(updated.actions![0].type).toBe('config_change')
  })

  it('addMessage with actions array', () => {
    const actions: ActionSuggestion[] = [
      {
        type: 'skill_install',
        description: 'Install BMAD',
        payload: { skill: 'bmad' },
      },
      {
        type: 'command',
        description: 'Open terminal',
        payload: { cmd: 'terminal.new' },
      },
    ]
    const msg: CompanionMessage = {
      id: 'msg-3',
      role: 'companion',
      text: 'Here are some suggestions',
      timestamp: Date.now(),
      actions,
    }
    useCompanionStore.getState().addMessage(msg)

    const stored = useCompanionStore.getState().messages[0]
    expect(stored.actions).toHaveLength(2)
    expect(stored.actions![0].type).toBe('skill_install')
    expect(stored.actions![1].type).toBe('command')
  })
})

// ---------------------------------------------------------------------------
// 2. SI Store
// ---------------------------------------------------------------------------

describe('SI Store', () => {
  beforeEach(() => useSIStore.setState(useSIStore.getInitialState()))

  it('agentStatus starts as idle', () => {
    expect(useSIStore.getState().agentStatus).toBe('idle')
  })

  it('setAgentStatus changes status to running', () => {
    useSIStore.getState().setAgentStatus('running')
    expect(useSIStore.getState().agentStatus).toBe('running')
  })

  it('setAgentStatus changes status back to idle', () => {
    useSIStore.getState().setAgentStatus('running')
    useSIStore.getState().setAgentStatus('idle')
    expect(useSIStore.getState().agentStatus).toBe('idle')
  })

  it('currentBuild starts as null', () => {
    expect(useSIStore.getState().currentBuild).toBeNull()
  })

  it('setCurrentBuild sets build data', () => {
    const build: SIBuildResult = {
      id: 'build-1',
      branch: 'mira/si-2026-03-26-test',
      hypothesisId: 'hyp-1',
      hypothesisTitle: 'Improve test speed',
      success: true,
      output: 'All tests passed',
      duration: 12345,
      timestamp: Date.now(),
    }
    useSIStore.getState().setCurrentBuild(build)

    const current = useSIStore.getState().currentBuild
    expect(current).not.toBeNull()
    expect(current!.id).toBe('build-1')
    expect(current!.branch).toBe('mira/si-2026-03-26-test')
    expect(current!.success).toBe(true)
  })

  it('setCurrentBuild can clear to null', () => {
    const build: SIBuildResult = {
      id: 'build-2',
      branch: 'mira/si-2026-03-26-clear',
      hypothesisId: 'hyp-2',
      hypothesisTitle: 'Clear test',
      success: false,
      output: '',
      duration: 0,
      timestamp: Date.now(),
    }
    useSIStore.getState().setCurrentBuild(build)
    useSIStore.getState().setCurrentBuild(null)
    expect(useSIStore.getState().currentBuild).toBeNull()
  })

  it('buildHistory starts empty', () => {
    expect(useSIStore.getState().buildHistory).toHaveLength(0)
  })

  it('addBuildToHistory appends to history', () => {
    const build1: SIBuildResult = {
      id: 'build-h1',
      branch: 'mira/si-2026-03-26-h1',
      hypothesisId: 'hyp-1',
      hypothesisTitle: 'First build',
      success: true,
      output: 'ok',
      duration: 1000,
      timestamp: 1000,
    }
    const build2: SIBuildResult = {
      id: 'build-h2',
      branch: 'mira/si-2026-03-26-h2',
      hypothesisId: 'hyp-2',
      hypothesisTitle: 'Second build',
      success: false,
      output: 'fail',
      duration: 2000,
      timestamp: 2000,
    }

    useSIStore.getState().addBuildToHistory(build1)
    expect(useSIStore.getState().buildHistory).toHaveLength(1)

    useSIStore.getState().addBuildToHistory(build2)
    expect(useSIStore.getState().buildHistory).toHaveLength(2)
    // Most recent build is prepended
    expect(useSIStore.getState().buildHistory[0].id).toBe('build-h2')
    expect(useSIStore.getState().buildHistory[1].id).toBe('build-h1')
  })
})

// ---------------------------------------------------------------------------
// 3. Send-to-Agent validation
// ---------------------------------------------------------------------------

describe('send-to-agent', () => {
  describe('buildPrompt', () => {
    it('formats card with title and description', () => {
      const card: KanbanCard = {
        id: 'card-1',
        title: 'Implement auth',
        description: 'Add JWT-based authentication',
        status: 'specced',
        priority: 'high',
        context: [],
      }
      const prompt = buildPrompt(card)
      expect(prompt).toContain('# Task: Implement auth')
      expect(prompt).toContain('Add JWT-based authentication')
    })

    it('formats card with context items', () => {
      const card: KanbanCard = {
        id: 'card-2',
        title: 'Fix bug',
        description: 'Fix the login bug',
        status: 'specced',
        priority: 'critical',
        context: [
          { type: 'file', content: 'src/auth.ts' },
          { type: 'url', content: 'https://example.com/docs' },
          { type: 'note', content: 'Check the token expiry logic' },
        ],
      }
      const prompt = buildPrompt(card)
      expect(prompt).toContain('## Context')
      expect(prompt).toContain('[file] src/auth.ts')
      expect(prompt).toContain('[url]  https://example.com/docs')
      expect(prompt).toContain('[note] Check the token expiry logic')
    })

    it('omits context section when no context items', () => {
      const card: KanbanCard = {
        id: 'card-3',
        title: 'Simple task',
        description: 'Do something',
        status: 'idea',
        priority: 'low',
        context: [],
      }
      const prompt = buildPrompt(card)
      expect(prompt).not.toContain('## Context')
    })
  })

  describe('sendToAgent', () => {
    beforeEach(() => {
      useSessionStore.setState(useSessionStore.getInitialState())
      useNotificationStore.setState(useNotificationStore.getInitialState())
    })

    it('returns error when session does not exist', async () => {
      const card: KanbanCard = {
        id: 'card-send-1',
        title: 'Test card',
        description: 'Testing',
        status: 'specced',
        priority: 'medium',
        context: [],
      }
      const result = await sendToAgent(card, 'nonexistent-session')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error when session is in error state', async () => {
      useSessionStore.getState().upsertSession({
        id: 'err-session',
        agentName: 'claude',
        status: 'error',
        startedAt: Date.now(),
        updatedAt: Date.now(),
        error: 'Something went wrong',
      })

      const card: KanbanCard = {
        id: 'card-send-2',
        title: 'Test card',
        description: '',
        status: 'specced',
        priority: 'medium',
        context: [],
      }
      const result = await sendToAgent(card, 'err-session')
      expect(result.success).toBe(false)
      expect(result.error).toContain('error state')
    })

    it('returns error when session is done', async () => {
      useSessionStore.getState().upsertSession({
        id: 'done-session',
        agentName: 'codex',
        status: 'done',
        startedAt: Date.now(),
        updatedAt: Date.now(),
      })

      const card: KanbanCard = {
        id: 'card-send-3',
        title: 'Test card',
        description: '',
        status: 'specced',
        priority: 'medium',
        context: [],
      }
      const result = await sendToAgent(card, 'done-session')
      expect(result.success).toBe(false)
      expect(result.error).toContain('has ended')
    })

    it('dispatches notification on failure', async () => {
      const card: KanbanCard = {
        id: 'card-send-4',
        title: 'Notify card',
        description: '',
        status: 'specced',
        priority: 'low',
        context: [],
      }
      await sendToAgent(card, 'missing-session')

      const notifications = useNotificationStore.getState().notifications
      expect(notifications.length).toBeGreaterThan(0)
      expect(notifications[0].title).toBe('Send to Agent failed')
    })
  })
})

// ---------------------------------------------------------------------------
// 4. Broadcast client
// ---------------------------------------------------------------------------

describe('broadcastToAgents', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch)
  })

  it('calls the correct endpoint with POST', async () => {
    const mockResponse: Response = {
      ok: true,
      json: () =>
        Promise.resolve({ sent: ['s1', 's2'], failed: [] }),
    } as unknown as Response

    const mockFetch = vi.fn().mockResolvedValue(mockResponse)
    vi.stubGlobal('fetch', mockFetch)

    const result = await broadcastToAgents('Hello agents\n', ['s1', 's2'])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://127.0.0.1:3001/api/pty/broadcast')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })

    const body = JSON.parse(options.body as string) as {
      data: string
      sessionIds: string[]
    }
    expect(body.data).toBe('Hello agents\n')
    expect(body.sessionIds).toEqual(['s1', 's2'])
    expect(result.sent).toEqual(['s1', 's2'])
    expect(result.failed).toEqual([])
  })

  it('throws on non-ok response', async () => {
    const mockResponse: Response = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Response

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    await expect(
      broadcastToAgents('test', ['s1']),
    ).rejects.toThrow('Broadcast failed: 500 Internal Server Error')
  })
})

// ---------------------------------------------------------------------------
// 5. Quick Prompt presets
// ---------------------------------------------------------------------------

describe('Quick Prompt presets', () => {
  it('QUICK_PROMPT_PRESETS exists and has entries', () => {
    expect(QUICK_PROMPT_PRESETS).toBeDefined()
    expect(QUICK_PROMPT_PRESETS.length).toBeGreaterThan(0)
  })

  it('all presets are non-empty strings', () => {
    for (const preset of QUICK_PROMPT_PRESETS) {
      expect(typeof preset).toBe('string')
      expect(preset.trim().length).toBeGreaterThan(0)
    }
  })

  it('contains expected preset entries', () => {
    expect(QUICK_PROMPT_PRESETS).toContain('Run tests')
    expect(QUICK_PROMPT_PRESETS).toContain('Fix the failing test')
    expect(QUICK_PROMPT_PRESETS).toContain('Explain this error')
  })
})

// ---------------------------------------------------------------------------
// 6. Layout Store — panel types
// ---------------------------------------------------------------------------

describe('Layout Store — panel types', () => {
  beforeEach(() => useLayoutStore.setState({ panels: [], isDragging: false, topZ: 1 }))

  const NEW_PANEL_TYPES = [
    'journal',
    'deploy',
    'vibe',
    'context-cleaner',
    'observability',
    'replay',
    'project-map',
    'registry',
    'pair',
    'si',
  ] as const

  function makePanel(type: string, id?: string): PanelConfig {
    return {
      id: id ?? `panel-${type}`,
      type,
      title: `${type} panel`,
      x: 0,
      y: 0,
      w: 4,
      h: 3,
    }
  }

  for (const panelType of NEW_PANEL_TYPES) {
    it(`addPanel works with type "${panelType}"`, () => {
      useLayoutStore.getState().addPanel(makePanel(panelType))

      const panels = useLayoutStore.getState().panels
      expect(panels).toHaveLength(1)
      expect(panels[0].type).toBe(panelType)
      expect(panels[0].id).toBe(`panel-${panelType}`)
    })
  }

  it('addPanel assigns default minW and minH', () => {
    useLayoutStore.getState().addPanel(makePanel('si'))

    const panel = useLayoutStore.getState().panels[0]
    expect(panel.minW).toBe(2)
    expect(panel.minH).toBe(2)
  })

  it('addPanel assigns incrementing zIndex', () => {
    useLayoutStore.getState().addPanel(makePanel('journal', 'p1'))
    useLayoutStore.getState().addPanel(makePanel('deploy', 'p2'))

    const panels = useLayoutStore.getState().panels
    expect(panels[1].zIndex).toBeGreaterThan(panels[0].zIndex!)
  })

  it('removePanel removes the correct panel', () => {
    useLayoutStore.getState().addPanel(makePanel('journal', 'p-journal'))
    useLayoutStore.getState().addPanel(makePanel('si', 'p-si'))
    expect(useLayoutStore.getState().panels).toHaveLength(2)

    useLayoutStore.getState().removePanel('p-journal')
    const remaining = useLayoutStore.getState().panels
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('p-si')
  })

  it('removePanel with nonexistent id leaves panels unchanged', () => {
    useLayoutStore.getState().addPanel(makePanel('vibe', 'p-vibe'))
    useLayoutStore.getState().removePanel('does-not-exist')
    expect(useLayoutStore.getState().panels).toHaveLength(1)
  })

  it('can add multiple panel types simultaneously', () => {
    for (const panelType of NEW_PANEL_TYPES) {
      useLayoutStore.getState().addPanel(makePanel(panelType))
    }
    expect(useLayoutStore.getState().panels).toHaveLength(NEW_PANEL_TYPES.length)

    const types = useLayoutStore.getState().panels.map((p) => p.type)
    for (const panelType of NEW_PANEL_TYPES) {
      expect(types).toContain(panelType)
    }
  })
})
