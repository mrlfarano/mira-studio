/**
 * usePairMode — hook managing the WebSocket connection for Pair Mode.
 *
 * Handles join/disconnect, message relay, state sync, and in-session chat.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLayoutStore } from '@/store/layout-store'
import { useKanbanStore } from '@/store/kanban-store'
import type { KanbanState } from '@/store/kanban-store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PairRole = 'owner' | 'guest'

export interface ChatMessage {
  from: PairRole
  name: string
  text: string
  timestamp: number
}

interface PairSessionInfo {
  id: string
  ownerName: string
  guestName: string | null
  createdAt: number
  winCondition: string
}

type PairMessageType =
  | 'join'
  | 'state-sync'
  | 'state-patch'
  | 'terminal-output'
  | 'chat'
  | 'win-condition'
  | 'participant-joined'
  | 'participant-left'
  | 'session-ended'
  | 'error'

interface PairWsMessage {
  type: PairMessageType
  from?: PairRole
  [key: string]: unknown
}

export interface UsePairModeReturn {
  connect: (sessionId: string, role: PairRole, name: string) => void
  disconnect: () => void
  sendMessage: (msg: Record<string, unknown>) => void
  sendChat: (text: string) => void
  isConnected: boolean
  role: PairRole | null
  peerName: string | null
  chatMessages: ChatMessage[]
  sessionInfo: PairSessionInfo | null
  error: string | null
}

const WS_BASE = `ws://127.0.0.1:3001`

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePairMode(): UsePairModeReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [role, setRole] = useState<PairRole | null>(null)
  const [peerName, setPeerName] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [sessionInfo, setSessionInfo] = useState<PairSessionInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs for current role/name so store subscriptions can access them
  const roleRef = useRef<PairRole | null>(null)
  const nameRef = useRef<string>('')

  // ── Store subscription for owner to broadcast state changes ───────────

  const layoutUnsubRef = useRef<(() => void) | null>(null)
  const kanbanUnsubRef = useRef<(() => void) | null>(null)

  const subscribeToStores = useCallback(() => {
    // Only the owner broadcasts state changes
    if (roleRef.current !== 'owner') return

    // Layout store subscription
    layoutUnsubRef.current = useLayoutStore.subscribe((state) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'state-sync',
          store: 'layout',
          state: {
            panels: state.panels.map(({ id, type, title, x, y, w, h, minW, minH, zIndex, minimized, props }) => ({
              id, type, title, x, y, w, h, minW, minH, zIndex, minimized, props,
            })),
          },
        }))
      }
    })

    // Kanban store subscription
    kanbanUnsubRef.current = useKanbanStore.subscribe((state) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'state-sync',
          store: 'kanban',
          state: {
            cards: state.cards,
            columns: state.columns,
          },
        }))
      }
    })
  }, [])

  const unsubscribeFromStores = useCallback(() => {
    layoutUnsubRef.current?.()
    layoutUnsubRef.current = null
    kanbanUnsubRef.current?.()
    kanbanUnsubRef.current = null
  }, [])

  // ── Handle incoming messages ──────────────────────────────────────────

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: PairWsMessage
    try {
      msg = JSON.parse(String(event.data))
    } catch {
      return
    }

    switch (msg.type) {
      case 'join': {
        setIsConnected(true)
        setError(null)
        if (msg.guestName) setPeerName(msg.guestName as string)
        if (msg.ownerName && roleRef.current === 'guest') {
          setPeerName(msg.ownerName as string)
        }
        setSessionInfo({
          id: msg.sessionId as string,
          ownerName: msg.ownerName as string,
          guestName: (msg.guestName as string) ?? null,
          createdAt: msg.createdAt as number,
          winCondition: msg.winCondition as string,
        })
        break
      }

      case 'participant-joined': {
        setPeerName(msg.name as string)
        break
      }

      case 'participant-left': {
        setPeerName(null)
        break
      }

      case 'session-ended': {
        setIsConnected(false)
        setRole(null)
        roleRef.current = null
        setPeerName(null)
        setSessionInfo(null)
        unsubscribeFromStores()
        wsRef.current?.close()
        wsRef.current = null
        break
      }

      case 'state-sync': {
        // Guest applies incoming state from owner
        if (roleRef.current === 'guest') {
          const store = msg.store as string
          const state = msg.state as Record<string, unknown>
          if (store === 'layout' && state.panels) {
            useLayoutStore.getState().setPanels(
              state.panels as Parameters<ReturnType<typeof useLayoutStore.getState>['setPanels']>[0],
            )
          } else if (store === 'kanban') {
            // Apply kanban state — replace cards and columns
            const cards = state.cards as KanbanState['cards']
            const columns = state.columns as KanbanState['columns']
            if (cards && columns) {
              useKanbanStore.setState({ cards, columns })
            }
          }
        }
        break
      }

      case 'state-patch': {
        // Guest applies incremental patches from owner
        if (roleRef.current === 'guest') {
          const store = msg.store as string
          const patch = msg.patch as Record<string, unknown>
          if (store === 'layout' && patch.panels) {
            useLayoutStore.getState().setPanels(
              patch.panels as Parameters<ReturnType<typeof useLayoutStore.getState>['setPanels']>[0],
            )
          } else if (store === 'kanban') {
            useKanbanStore.setState(patch as Partial<KanbanState>)
          }
        }
        break
      }

      case 'chat': {
        setChatMessages((prev) => [
          ...prev,
          {
            from: msg.from as PairRole,
            name: msg.name as string,
            text: msg.text as string,
            timestamp: Date.now(),
          },
        ])
        break
      }

      case 'win-condition': {
        setSessionInfo((prev) =>
          prev ? { ...prev, winCondition: msg.text as string } : prev,
        )
        break
      }

      case 'error': {
        setError(msg.message as string)
        break
      }
    }
  }, [unsubscribeFromStores])

  // ── Connect ───────────────────────────────────────────────────────────

  const connect = useCallback((sessionId: string, connectRole: PairRole, name: string) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setError(null)
    roleRef.current = connectRole
    nameRef.current = name
    setRole(connectRole)
    setChatMessages([])

    const ws = new WebSocket(`${WS_BASE}/ws/pair/${sessionId}`)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        role: connectRole,
        name,
      }))

      // Owner subscribes to store changes after joining
      if (connectRole === 'owner') {
        // Small delay to ensure join is processed
        setTimeout(() => subscribeToStores(), 100)
      }
    }

    ws.onmessage = handleMessage

    ws.onclose = () => {
      setIsConnected(false)
      unsubscribeFromStores()
    }

    ws.onerror = () => {
      setError('WebSocket connection error')
    }

    wsRef.current = ws
  }, [handleMessage, subscribeToStores, unsubscribeFromStores])

  // ── Disconnect ────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    unsubscribeFromStores()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setRole(null)
    roleRef.current = null
    setPeerName(null)
    setSessionInfo(null)
    setChatMessages([])
    setError(null)
  }, [unsubscribeFromStores])

  // ── Send arbitrary message ────────────────────────────────────────────

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  // ── Send chat message ─────────────────────────────────────────────────

  const sendChat = useCallback((text: string) => {
    const currentRole = roleRef.current
    const name = nameRef.current
    if (!currentRole) return

    sendMessage({ type: 'chat', text, name })

    // Add to local chat immediately
    setChatMessages((prev) => [
      ...prev,
      {
        from: currentRole,
        name,
        text,
        timestamp: Date.now(),
      },
    ])
  }, [sendMessage])

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      unsubscribeFromStores()
      wsRef.current?.close()
    }
  }, [unsubscribeFromStores])

  return {
    connect,
    disconnect,
    sendMessage,
    sendChat,
    isConnected,
    role,
    peerName,
    chatMessages,
    sessionInfo,
    error,
  }
}
