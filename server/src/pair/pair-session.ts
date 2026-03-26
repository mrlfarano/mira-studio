/**
 * PairSessionManager — manages real-time shared workspace sessions
 * between two developers (owner + guest) via WebSocket relay.
 */

import type { WebSocket } from '@fastify/websocket'
import crypto from 'node:crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PairRole = 'owner' | 'guest'

export interface PairParticipant {
  ws: WebSocket
  role: PairRole
  name: string
}

export interface PairSession {
  id: string
  owner: PairParticipant
  guest: PairParticipant | null
  createdAt: number
  winCondition: string
}

/** Serialisable session info (no WebSocket refs) */
export interface PairSessionInfo {
  id: string
  ownerName: string
  guestName: string | null
  createdAt: number
  winCondition: string
}

export type PairMessageType =
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

export interface PairMessage {
  type: PairMessageType
  [key: string]: unknown
}

// Messages the guest is NOT allowed to send
const OWNER_ONLY_TYPES: Set<string> = new Set([
  'session-ended',
  'win-condition',
])

// ---------------------------------------------------------------------------
// Session ID generator — short 6-char alphanumeric code
// ---------------------------------------------------------------------------

function generateSessionId(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

// ---------------------------------------------------------------------------
// PairSessionManager
// ---------------------------------------------------------------------------

export class PairSessionManager {
  private sessions = new Map<string, PairSession>()

  /** Create a new pair session. Returns the session ID. */
  createSession(
    ownerWs: WebSocket,
    ownerName: string,
    winCondition: string,
  ): string {
    let id = generateSessionId()
    // Extremely unlikely collision, but handle it
    while (this.sessions.has(id)) {
      id = generateSessionId()
    }

    const session: PairSession = {
      id,
      owner: { ws: ownerWs, role: 'owner', name: ownerName },
      guest: null,
      createdAt: Date.now(),
      winCondition,
    }

    this.sessions.set(id, session)
    return id
  }

  /** Add a guest to an existing session. */
  joinSession(
    sessionId: string,
    guestWs: WebSocket,
    guestName: string,
  ): PairSession {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    if (session.guest !== null) {
      throw new Error('Session already has a guest')
    }

    session.guest = { ws: guestWs, role: 'guest', name: guestName }

    // Notify the owner that a guest joined
    this.sendTo(session.owner.ws, {
      type: 'participant-joined',
      name: guestName,
      role: 'guest',
    })

    return session
  }

  /** Get session info (without ws refs). */
  getSession(sessionId: string): PairSessionInfo | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    return {
      id: session.id,
      ownerName: session.owner.name,
      guestName: session.guest?.name ?? null,
      createdAt: session.createdAt,
      winCondition: session.winCondition,
    }
  }

  /** Relay a message to the other participant. Enforces role permissions. */
  broadcast(
    sessionId: string,
    senderWs: WebSocket,
    message: PairMessage,
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    // Determine sender role
    const senderRole = this.getRole(session, senderWs)
    if (!senderRole) return

    // Enforce owner-only message types
    if (senderRole === 'guest' && OWNER_ONLY_TYPES.has(message.type)) {
      this.sendTo(senderWs, {
        type: 'error',
        message: `Guests cannot send "${message.type}" messages`,
      })
      return
    }

    // Relay to the other participant
    const target =
      senderRole === 'owner' ? session.guest?.ws : session.owner.ws
    if (target && target.readyState === target.OPEN) {
      target.send(
        JSON.stringify({ ...message, from: senderRole }),
      )
    }
  }

  /** End a session. Only the owner can end it. */
  endSession(sessionId: string, requesterWs?: WebSocket): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // If a requester is specified, verify they are the owner
    if (requesterWs && session.owner.ws !== requesterWs) {
      return false
    }

    // Notify guest that the session ended
    if (session.guest) {
      this.sendTo(session.guest.ws, { type: 'session-ended' })
    }

    this.sessions.delete(sessionId)
    return true
  }

  /** Remove a participant by their WebSocket (on disconnect). */
  removeParticipant(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    if (session.owner.ws === ws) {
      // Owner left — end the session entirely
      if (session.guest) {
        this.sendTo(session.guest.ws, { type: 'session-ended' })
      }
      this.sessions.delete(sessionId)
    } else if (session.guest?.ws === ws) {
      // Guest left — notify owner
      const guestName = session.guest.name
      session.guest = null
      this.sendTo(session.owner.ws, {
        type: 'participant-left',
        name: guestName,
        role: 'guest',
      })
    }
  }

  /** List all active sessions (serialisable — no ws refs). */
  listSessions(): PairSessionInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      ownerName: s.owner.name,
      guestName: s.guest?.name ?? null,
      createdAt: s.createdAt,
      winCondition: s.winCondition,
    }))
  }

  /** Check whether a session exists. */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  /** Replace the owner's WebSocket (used when upgrading from REST to WS). */
  setOwnerWs(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.owner.ws = ws
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private getRole(
    session: PairSession,
    ws: WebSocket,
  ): PairRole | null {
    if (session.owner.ws === ws) return 'owner'
    if (session.guest?.ws === ws) return 'guest'
    return null
  }

  private sendTo(ws: WebSocket, msg: PairMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }
}
