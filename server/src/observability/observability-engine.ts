/**
 * ObservabilityEngine -- provides process list, port scanning, and agent
 * history queries for the Observability Workspace.
 */

import net from 'node:net'
import type { PtyManager } from '../pty/pty-manager.js'
import type { JournalEngine, JournalEntry } from '../journal/journal-engine.js'
import type { PtyStatus } from '../pty/pty-protocol.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessInfo {
  sessionId: string
  pid: number
  status: PtyStatus
  startedAt: string
  bufferLines: number
}

export interface PortStatus {
  port: number
  listening: boolean
  host: string
}

export interface AgentHistoryEntry {
  timestamp: string
  source: string
  description: string
}

// ---------------------------------------------------------------------------
// Default ports to scan
// ---------------------------------------------------------------------------

const DEFAULT_PORTS = [3000, 3001, 4000, 5000, 5173, 8000, 8080, 8888]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkPort(port: number, host: string, timeoutMs = 500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    const cleanup = () => {
      socket.removeAllListeners()
      socket.destroy()
    }

    socket.setTimeout(timeoutMs)

    socket.on('connect', () => {
      cleanup()
      resolve(true)
    })

    socket.on('timeout', () => {
      cleanup()
      resolve(false)
    })

    socket.on('error', () => {
      cleanup()
      resolve(false)
    })

    socket.connect(port, host)
  })
}

// ---------------------------------------------------------------------------
// Engine functions
// ---------------------------------------------------------------------------

/**
 * Return metadata for every active PTY session.
 */
export function getProcessList(ptyManager: PtyManager): ProcessInfo[] {
  return ptyManager.listSessions().map((s) => ({
    sessionId: s.id,
    pid: s.pid,
    status: s.status,
    startedAt: s.createdAt.toISOString(),
    bufferLines: s.bufferLines,
  }))
}

/**
 * Probe a list of ports and report which are listening.
 */
export async function scanPorts(
  ports: number[] = DEFAULT_PORTS,
  host = '127.0.0.1',
): Promise<PortStatus[]> {
  const results = await Promise.all(
    ports.map(async (port) => ({
      port,
      listening: await checkPort(port, host),
      host,
    })),
  )
  return results
}

/**
 * Return recent journal entries that relate to agent / PTY activity.
 */
export function getAgentHistory(journalEngine: JournalEngine): AgentHistoryEntry[] {
  const today: JournalEntry[] = journalEngine.getTodayEntries()

  // Filter to agent-relevant sources
  const agentSources = new Set(['pty', 'system', 'kanban'])
  const relevant = today.filter((e) => agentSources.has(e.source))

  return relevant.map((e) => ({
    timestamp: e.timestamp,
    source: e.source,
    description: e.description,
  }))
}
