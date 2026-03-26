/**
 * Vibe Score routes -- Fastify plugin that registers REST endpoints
 * for the session energy vibe score.
 *
 * Routes:
 *   GET /api/vibe         -- current score + factor breakdown
 *   GET /api/vibe/history -- last 30 days of daily scores
 */

import type { FastifyInstance } from "fastify"
import { VibeEngine } from "./vibe-engine.js"
import type { PtyManager } from "../pty/pty-manager.js"
import type { JournalEngine } from "../journal/journal-engine.js"
import path from "node:path"

export { VibeEngine } from "./vibe-engine.js"
export type { VibeScore, VibeFactors, VibeHistoryEntry } from "./vibe-engine.js"

/**
 * Initialise the VibeEngine and register all vibe routes.
 * Call once during server bootstrap.
 */
export function registerVibeRoutes(
  server: FastifyInstance,
  projectRoot: string,
  ptyManager: PtyManager,
  journalEngine: JournalEngine,
): VibeEngine {
  const configDir = path.join(projectRoot, ".mira")
  const engine = new VibeEngine(configDir, ptyManager, journalEngine)

  // -------------------------------------------------------------------------
  // GET /api/vibe -- current score + factors
  // -------------------------------------------------------------------------
  server.get("/api/vibe", async () => {
    return engine.getScore()
  })

  // -------------------------------------------------------------------------
  // GET /api/vibe/history -- last 30 days of daily scores
  // -------------------------------------------------------------------------
  server.get("/api/vibe/history", async () => {
    const history = await engine.getHistory()
    // Return last 30 entries
    return { history: history.slice(-30) }
  })

  // -------------------------------------------------------------------------
  // Periodic snapshot — record score every 30 minutes
  // -------------------------------------------------------------------------
  const SNAPSHOT_INTERVAL_MS = 30 * 60 * 1000
  const snapshotTimer = setInterval(async () => {
    try {
      await engine.recordSnapshot()
      server.log.info("Vibe score snapshot recorded")
    } catch (err) {
      server.log.error(err, "Failed to record vibe snapshot")
    }
  }, SNAPSHOT_INTERVAL_MS)

  // Clean up on server close
  server.addHook("onClose", async () => {
    clearInterval(snapshotTimer)
  })

  // Record an initial snapshot on startup
  engine.recordSnapshot().catch((err) => {
    server.log.error(err, "Failed to record initial vibe snapshot")
  })

  return engine
}
