/**
 * Replay routes -- Fastify plugin that registers REST endpoints
 * for the Session Replay feature.
 *
 * Routes:
 *   GET    /api/replay/sessions    -- list all recordings with metadata
 *   GET    /api/replay/:sessionId  -- full recording data for a session
 *   DELETE /api/replay/:sessionId  -- clear a recording
 */

import type { FastifyInstance } from 'fastify'
import { ReplayEngine } from './replay-engine.js'
import type { PtyManager } from '../pty/pty-manager.js'

export { ReplayEngine } from './replay-engine.js'
export type { RecordingMeta, Recording, ReplayEntry } from './replay-engine.js'

/**
 * Initialise the ReplayEngine and register all replay routes.
 * Call once during server bootstrap.
 */
export function registerReplayRoutes(
  server: FastifyInstance,
  ptyManager: PtyManager,
  configDir: string,
): ReplayEngine {
  const engine = new ReplayEngine(ptyManager, configDir)

  // -------------------------------------------------------------------------
  // GET /api/replay/sessions -- list all recordings with metadata
  // -------------------------------------------------------------------------
  server.get('/api/replay/sessions', async () => {
    return { sessions: engine.getRecordings() }
  })

  // -------------------------------------------------------------------------
  // GET /api/replay/:sessionId -- full recording data for a session
  // -------------------------------------------------------------------------
  server.get<{ Params: { sessionId: string } }>(
    '/api/replay/:sessionId',
    async (request, reply) => {
      const { sessionId } = request.params
      const recording = engine.getRecording(sessionId)
      if (!recording) {
        return reply.status(404).send({ error: `Recording not found: ${sessionId}` })
      }
      return recording
    },
  )

  // -------------------------------------------------------------------------
  // DELETE /api/replay/:sessionId -- clear a recording
  // -------------------------------------------------------------------------
  server.delete<{ Params: { sessionId: string } }>(
    '/api/replay/:sessionId',
    async (request) => {
      const { sessionId } = request.params
      engine.clearRecording(sessionId)
      return { ok: true }
    },
  )

  return engine
}
