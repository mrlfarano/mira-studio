import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types (mirror server types for the client)
// ---------------------------------------------------------------------------

export interface SIHypothesis {
  id: string
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  status: 'queued' | 'testing' | 'accepted' | 'rejected'
  createdAt: string
}

export interface SILesson {
  id: string
  content: string
  source: 'mira' | 'agent' | 'user'
  date: string
  cycleId?: string
}

export interface SIBuild {
  id: string
  date: string
  branch: string
  hypothesis: string
  outcome: string
  testResults: string
  accepted: boolean
}

export interface SIHealth {
  score: number
  recentBuilds: number
  acceptanceRate: number
  daysSinceLastActivity: number
  queuedHypotheses: number
}

export interface SIBuildResult {
  id: string
  branch: string
  hypothesisId: string
  hypothesisTitle: string
  success: boolean
  output: string
  duration: number
  timestamp: number
}

export interface SIAgentStatus {
  running: boolean
  currentHypothesis?: string
  currentBranch?: string
  currentBuildId?: string
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface SIState {
  hypotheses: SIHypothesis[]
  lessons: SILesson[]
  builds: SIBuild[]
  health: SIHealth | null
  loading: boolean
  error: string | null

  // Agent state
  agentStatus: 'idle' | 'running'
  currentBuild: SIBuildResult | null
  buildHistory: SIBuildResult[]

  // --- actions ---
  fetchAll: () => Promise<void>
  fetchHealth: () => Promise<void>
  addHypothesis: (input: Pick<SIHypothesis, 'title' | 'description' | 'impact' | 'status'>) => Promise<void>
  addLesson: (input: Pick<SILesson, 'content' | 'source' | 'cycleId'>) => Promise<void>
  setAgentStatus: (status: 'idle' | 'running') => void
  setCurrentBuild: (build: SIBuildResult | null) => void
  addBuildToHistory: (build: SIBuildResult) => void
  fetchAgentStatus: () => Promise<void>
  fetchAgentBuilds: () => Promise<void>
  runCycle: (hypothesisId: string) => Promise<void>
  consentPR: (buildId: string) => Promise<{ branch: string, suggestedCommand: string, pushed: boolean }>
}

const API_BASE = 'http://localhost:3001'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSIStore = create<SIState>()(
  devtools(
    (set, get) => ({
      hypotheses: [],
      lessons: [],
      builds: [],
      health: null,
      loading: false,
      error: null,

      // Agent state
      agentStatus: 'idle',
      currentBuild: null,
      buildHistory: [],

      fetchAll: async () => {
        set({ loading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/api/si`)
          if (!res.ok) throw new Error(`Failed to fetch SI data: ${res.status}`)
          const data = await res.json()
          set({
            hypotheses: data.hypotheses ?? [],
            lessons: data.lessons ?? [],
            builds: data.builds ?? [],
            loading: false,
          })
        } catch (err) {
          set({ error: (err as Error).message, loading: false })
        }
      },

      fetchHealth: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/si/health`)
          if (!res.ok) throw new Error(`Failed to fetch SI health: ${res.status}`)
          const health = await res.json()
          set({ health })
        } catch (err) {
          set({ error: (err as Error).message })
        }
      },

      addHypothesis: async (input) => {
        try {
          const res = await fetch(`${API_BASE}/api/si/hypotheses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!res.ok) throw new Error(`Failed to add hypothesis: ${res.status}`)
          const hypothesis = await res.json()
          set((state) => ({ hypotheses: [...state.hypotheses, hypothesis] }))
        } catch (err) {
          set({ error: (err as Error).message })
        }
      },

      addLesson: async (input) => {
        try {
          const res = await fetch(`${API_BASE}/api/si/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (!res.ok) throw new Error(`Failed to add lesson: ${res.status}`)
          const lesson = await res.json()
          set((state) => ({ lessons: [...state.lessons, lesson] }))
        } catch (err) {
          set({ error: (err as Error).message })
        }
      },

      setAgentStatus: (status) => {
        set({ agentStatus: status })
      },

      setCurrentBuild: (build) => {
        set({ currentBuild: build })
      },

      addBuildToHistory: (build) => {
        set((state) => ({
          buildHistory: [build, ...state.buildHistory],
        }))
      },

      fetchAgentStatus: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/si/agent-status`)
          if (!res.ok) return
          const status: SIAgentStatus = await res.json()
          set({ agentStatus: status.running ? 'running' : 'idle' })
        } catch {
          // Silently fail — polling should not crash the UI
        }
      },

      fetchAgentBuilds: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/si/agent-builds`)
          if (!res.ok) return
          const data = await res.json()
          const builds: SIBuildResult[] = data.builds ?? []
          set({ buildHistory: builds })

          // If there is a completed build that we were tracking, update currentBuild
          const current = get().currentBuild
          if (current) {
            const updated = builds.find((b) => b.id === current.id)
            if (updated) {
              set({ currentBuild: updated })
            }
          }
        } catch {
          // Silently fail
        }
      },

      runCycle: async (hypothesisId) => {
        try {
          set({ agentStatus: 'running', error: null })
          const res = await fetch(`${API_BASE}/api/si/run-cycle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hypothesisId }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error ?? `Failed to start cycle: ${res.status}`)
          }
        } catch (err) {
          set({ agentStatus: 'idle', error: (err as Error).message })
        }
      },

      consentPR: async (buildId) => {
        const res = await fetch(`${API_BASE}/api/si/consent-pr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buildId }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? `Failed to create PR: ${res.status}`)
        }
        return res.json()
      },
    }),
    { name: 'si-store' },
  ),
)
