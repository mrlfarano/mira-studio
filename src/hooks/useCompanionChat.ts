/**
 * Hook that wires the Companion panel to the server's SSE chat endpoint.
 *
 * Exposes `sendMessage(text)` which:
 *  1. Adds the user message to the store immediately
 *  2. POSTs to the server SSE endpoint
 *  3. Streams text chunks into the store as they arrive
 *  4. Handles errors and tracks the session ID
 */

import { useCallback, useRef } from 'react'
import { useCompanionStore } from '@/store/companion-store.ts'
import type { ActionSuggestion } from '@/store/companion-store.ts'

const COMPANION_CHAT_URL = 'http://127.0.0.1:3001/api/companion/chat'

// ---------------------------------------------------------------------------
// SSE event data shapes (mirrors server output)
// ---------------------------------------------------------------------------

interface SSETextChunk {
  text: string
  done?: undefined
  error?: undefined
}

interface SSEDone {
  done: true
  sessionId: string
  actions?: ActionSuggestion[]
  text?: undefined
  error?: undefined
}

interface SSEError {
  error: string
  text?: undefined
  done?: undefined
}

type SSEData = SSETextChunk | SSEDone | SSEError

function isSSEText(data: SSEData): data is SSETextChunk {
  return typeof data.text === 'string' && data.done === undefined
}

function isSSEDone(data: SSEData): data is SSEDone {
  return data.done === true
}

function isSSEError(data: SSEData): data is SSEError {
  return typeof data.error === 'string'
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseCompanionChatReturn {
  sendMessage: (text: string) => Promise<void>
}

export function useCompanionChat(): UseCompanionChatReturn {
  // Keep an AbortController ref so we could cancel in-flight requests if
  // the component unmounts or the user sends a new message.
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    const store = useCompanionStore.getState()

    // Abort any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // 1. Add user message immediately
    store.addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    })

    // 2. Create a placeholder companion message for streaming
    const companionMsgId = `companion-${Date.now()}`
    store.addMessage({
      id: companionMsgId,
      role: 'companion',
      text: '',
      timestamp: Date.now(),
    })

    store.setStreaming(true)

    let accumulated = ''

    try {
      const response = await fetch(COMPANION_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: store.chatSessionId ?? undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE lines are separated by double newlines
        const parts = buffer.split('\n\n')
        // The last element may be an incomplete chunk — keep it in the buffer
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue

          const jsonStr = line.slice('data: '.length)
          let parsed: SSEData
          try {
            parsed = JSON.parse(jsonStr) as SSEData
          } catch {
            // Non-JSON SSE line — skip
            continue
          }

          if (isSSEError(parsed)) {
            // Show the error in the companion message
            accumulated += `\n[Error: ${parsed.error}]`
            useCompanionStore.getState().updateLastMessage(accumulated)
          } else if (isSSEText(parsed)) {
            accumulated += parsed.text
            useCompanionStore.getState().updateLastMessage(accumulated)
          } else if (isSSEDone(parsed)) {
            // Persist the session ID for conversation continuity
            useCompanionStore.getState().setChatSessionId(parsed.sessionId)
            // Attach any action suggestions to the message
            if (parsed.actions && parsed.actions.length > 0) {
              useCompanionStore
                .getState()
                .updateLastMessage(accumulated, parsed.actions)
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was intentionally cancelled — not an error
        return
      }
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      accumulated += accumulated
        ? `\n[Error: ${errorMsg}]`
        : `Sorry, I could not connect to the Mira server. (${errorMsg})`
      useCompanionStore.getState().updateLastMessage(accumulated)
    } finally {
      useCompanionStore.getState().setStreaming(false)
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }, [])

  return { sendMessage }
}
