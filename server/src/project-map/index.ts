/**
 * Project Map routes — Fastify plugin that registers REST endpoints for
 * the codebase treemap visualisation with git change frequency.
 *
 * Routes:
 *   GET /api/project-map/tree    — file tree with change frequency
 *   GET /api/project-map/recent  — recently changed files
 */

import type { FastifyInstance } from 'fastify'
import { ProjectMapEngine } from './project-map-engine.js'

export { ProjectMapEngine } from './project-map-engine.js'
export type { TreeNode, RecentChange } from './project-map-engine.js'

/**
 * Initialise the ProjectMapEngine and register all project-map routes.
 * Call once during server bootstrap.
 */
export function registerProjectMapRoutes(
  server: FastifyInstance,
  projectRoot: string,
): ProjectMapEngine {
  const engine = new ProjectMapEngine(projectRoot)

  // -------------------------------------------------------------------------
  // GET /api/project-map/tree — file tree with change frequency
  // -------------------------------------------------------------------------
  server.get('/api/project-map/tree', async () => {
    return engine.getFileTree()
  })

  // -------------------------------------------------------------------------
  // GET /api/project-map/recent — recently changed files
  // -------------------------------------------------------------------------
  server.get<{ Querystring: { limit?: string } }>(
    '/api/project-map/recent',
    async (req) => {
      const limit = parseInt(req.query.limit ?? '10', 10)
      const changes = await engine.getRecentChanges(
        Number.isNaN(limit) ? 10 : Math.min(limit, 50),
      )
      return { changes }
    },
  )

  return engine
}
