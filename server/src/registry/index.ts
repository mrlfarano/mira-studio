/**
 * Registry routes — Fastify endpoints for browsing and installing
 * community workspace configs from a GitHub-hosted registry.
 *
 * Routes:
 *   GET  /api/registry/browse?q=&category=  — search / browse entries
 *   GET  /api/registry/entries/:id           — single entry details
 *   POST /api/registry/install/:id           — install config into .mira/
 */

import type { FastifyInstance } from 'fastify'
import { RegistryClient } from './registry-client.js'

export { RegistryClient } from './registry-client.js'
export type { RegistryEntry } from './registry-client.js'

/**
 * Create a RegistryClient and register all community-registry REST routes.
 * Call once during server bootstrap.
 */
export function registerRegistryRoutes(
  server: FastifyInstance,
  configDir: string,
): void {
  const client = new RegistryClient()

  // -----------------------------------------------------------------------
  // GET /api/registry/browse — browse / search entries
  // -----------------------------------------------------------------------

  server.get<{
    Querystring: { q?: string; category?: string }
  }>('/api/registry/browse', async (req) => {
    const { q, category } = req.query
    const entries = await client.browse(q, category)
    return { entries }
  })

  // -----------------------------------------------------------------------
  // GET /api/registry/entries/:id — single entry details
  // -----------------------------------------------------------------------

  server.get<{ Params: { id: string } }>(
    '/api/registry/entries/:id',
    async (req, reply) => {
      const entry = await client.getEntry(req.params.id)
      if (!entry) {
        return reply.status(404).send({ error: `Entry "${req.params.id}" not found` })
      }
      return entry
    },
  )

  // -----------------------------------------------------------------------
  // POST /api/registry/install/:id — install config into local .mira/
  // -----------------------------------------------------------------------

  server.post<{ Params: { id: string } }>(
    '/api/registry/install/:id',
    async (req, reply) => {
      try {
        const result = await client.install(req.params.id, configDir)
        return reply.status(201).send(result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown install error'
        return reply.status(400).send({ error: message })
      }
    },
  )
}
