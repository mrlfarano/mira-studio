import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CompanionConfig } from '@/types/config.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionSuggestionType = 'config_change' | 'skill_install' | 'command'

export interface ActionSuggestion {
  type: ActionSuggestionType
  description: string
  payload: Record<string, unknown>
}

export interface CompanionMessage {
  id: string
  role: 'user' | 'companion'
  text: string
  timestamp: number
  /** Action suggestions parsed from the companion response */
  actions?: ActionSuggestion[]
}

export interface CompanionState {
  /** Chat messages with the companion */
  messages: CompanionMessage[]

  /** Whether the companion panel is expanded */
  isExpanded: boolean

  /** Server-side personality / config mirror */
  personality: CompanionConfig | null

  /** Active chat session ID returned by the server */
  chatSessionId: string | null

  /** Whether the companion is currently streaming a response */
  isStreaming: boolean

  // --- actions ---
  addMessage: (msg: CompanionMessage) => void
  clearMessages: () => void
  setExpanded: (expanded: boolean) => void
  toggleExpanded: () => void
  setPersonality: (config: CompanionConfig) => void
  setChatSessionId: (id: string | null) => void
  setStreaming: (streaming: boolean) => void
  /** Update the text (and optionally actions) of the last companion message */
  updateLastMessage: (text: string, actions?: ActionSuggestion[]) => void

  /** Bulk-replace state — used by hydration & conflict resolution */
  _replace: (partial: Partial<CompanionState>) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCompanionStore = create<CompanionState>()(
  devtools(
    (set) => ({
      messages: [],
      isExpanded: false,
      personality: null,
      chatSessionId: null,
      isStreaming: false,

      addMessage: (msg) =>
        set(
          (s) => ({ messages: [...s.messages, msg] }),
          undefined,
          'companion/addMessage',
        ),

      clearMessages: () =>
        set({ messages: [] }, undefined, 'companion/clearMessages'),

      setExpanded: (expanded) =>
        set({ isExpanded: expanded }, undefined, 'companion/setExpanded'),

      toggleExpanded: () =>
        set(
          (s) => ({ isExpanded: !s.isExpanded }),
          undefined,
          'companion/toggleExpanded',
        ),

      setPersonality: (config) =>
        set({ personality: config }, undefined, 'companion/setPersonality'),

      setChatSessionId: (id) =>
        set({ chatSessionId: id }, undefined, 'companion/setChatSessionId'),

      setStreaming: (streaming) =>
        set({ isStreaming: streaming }, undefined, 'companion/setStreaming'),

      updateLastMessage: (text, actions) =>
        set(
          (s) => {
            const msgs = [...s.messages]
            const lastIdx = msgs.length - 1
            if (lastIdx >= 0 && msgs[lastIdx].role === 'companion') {
              msgs[lastIdx] = {
                ...msgs[lastIdx],
                text,
                ...(actions !== undefined ? { actions } : {}),
              }
            }
            return { messages: msgs }
          },
          undefined,
          'companion/updateLastMessage',
        ),

      _replace: (partial) => set(partial, undefined, 'companion/_replace'),
    }),
    { name: 'CompanionStore', enabled: import.meta.env.DEV },
  ),
)
