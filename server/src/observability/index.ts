/**
 * Observability routes -- Fastify plugin that registers REST endpoints
 * for process list, port health, and agent history.
 *
 * Routes:
 *   GET /api/observability/processes     -- active PTY session list
 *   GET /api/observability/ports         -- port scan results
 *   GET /api/observability/agent-history -- recent agent commands from journal
 */

import type { FastifyInstance } from 'fastify'
import type { PtyManager } from '../pty/pty-manager.js'
import type { JournalEngine } from '../journal/journal-engine.js'
import {
  getProcessList,
  scanPorts,
  getAgentHistory,
} from './observability-engine.js'

export {
  getProcessList,
  scanPorts,
  getAgentHistory,
} from './observability-engine.js'

export type {
  ProcessInfo,
  PortStatus,
  AgentHistoryEntry,
} from './observability-engine.js'

/**
 * Register all observability routes.
 * Call once during server bootstrap.
 */
export function registerObservabilityRoutes(
  server: FastifyInstance,
  ptyManager: PtyManager,
  journalEngine: JournalEngine,
): void {
  // -------------------------------------------------------------------------
  // GET /api/observability/processes -- active PTY sessions
  // -------------------------------------------------------------------------
  server.get('/api/observability/processes', async () => {
    return { processes: getProcessList(ptyManager) }
  })

  // -------------------------------------------------------------------------
  // GET /api/observability/ports -- port scan results
  // -------------------------------------------------------------------------
  server.get<{
    Querystring: { ports?: string }
  }>('/api/observability/ports', async (request) => {
    const qs = request.query.ports
    let ports: number[] | undefined
    if (qs) {
      ports = qs
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0 && n < 65536)
    }
    const results = await scanPorts(ports)
    return { ports: results }
  })

  // -------------------------------------------------------------------------
  // GET /api/observability/agent-history -- recent agent commands from journal
  // -------------------------------------------------------------------------
  server.get('/api/observability/agent-history', async () => {
    return { history: getAgentHistory(journalEngine) }
  })
}
