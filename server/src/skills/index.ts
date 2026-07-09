/**
 * Skill system routes — Fastify plugin that registers REST endpoints for
 * skill installation, listing, removal, and hot-reload.
 *
 * Routes:
 *   GET    /api/skills           — list installed skills
 *   POST   /api/skills/install   — install a skill from source
 *   DELETE /api/skills/:id       — uninstall a skill
 *   POST   /api/skills/:id/reload — hot-reload a changed skill
 *   POST   /api/skills/create    — generate skill from description via LLM
 *   POST   /api/skills/:id/publish — publish to community registry via GitHub PR
 */

import type { FastifyInstance } from 'fastify'
import path from 'node:path'
import fs from 'node:fs/promises'
import type { ConfigEngine } from '../config/config-engine.js'
import { SkillRuntime } from './skill-runtime.js'
import { SkillStore } from './skill-store.js'
import { SkillCreator } from './skill-creator.js'
import { SkillPublisher } from './skill-publisher.js'
import type { LLMAdapter } from '../companion/types.js'
import { ClaudeAdapter } from '../companion/adapters/claude-adapter.js'
import { OllamaAdapter } from '../companion/adapters/ollama-adapter.js'

export { SkillRuntime } from './skill-runtime.js'
export { SkillStore } from './skill-store.js'
export { SkillCreator } from './skill-creator.js'
export type * from './types.js'

/**
 * Initialise the Skill Runtime and Store, then register all skill REST routes.
 * Call once during server bootstrap.
 */
export async function registerSkillRoutes(
  server: FastifyInstance,
  projectRoot: string,
  configEngine: ConfigEngine,
): Promise<{
  runtime: SkillRuntime
  store: SkillStore
  creator: SkillCreator
}> {
  const runtime = new SkillRuntime(projectRoot, configEngine)
  const store = new SkillStore(configEngine)

  // Warm up: load manifests for already-installed skills
  await runtime.init()

  // Forward runtime events to Fastify logger
  runtime.on('skill:installed', (skill) => {
    server.log.info(`Skill installed: ${skill.id}@${skill.version}`)
  })
  runtime.on('skill:uninstalled', (id) => {
    server.log.info(`Skill uninstalled: ${id}`)
  })
  runtime.on('skill:reloaded', (manifest) => {
    server.log.info(`Skill hot-reloaded: ${manifest.id}@${manifest.version}`)
  })
  runtime.on('skill:loaded', (manifest) => {
    server.log.info(`Skill manifest loaded: ${manifest.id}`)
  })

  // -----------------------------------------------------------------------
  // GET /api/skills — list all installed skills
  // -----------------------------------------------------------------------

  server.get('/api/skills', async () => {
    const skills = await store.listAll()
    return { skills }
  })

  // -----------------------------------------------------------------------
  // POST /api/skills/install — install a skill from a source path
  // -----------------------------------------------------------------------

  server.post<{ Body: { source: string } }>(
    '/api/skills/install',
    async (req, reply) => {
      const { source } = req.body ?? {}

      if (!source || typeof source !== 'string') {
        return reply
          .status(400)
          .send({ error: '"source" is required (path to skill directory)' })
      }

      try {
        const installed = await runtime.installSkill(source)
        return reply.status(201).send(installed)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown install error'
        return reply.status(400).send({ error: message })
      }
    },
  )

  // -----------------------------------------------------------------------
  // DELETE /api/skills/:id — uninstall a skill
  // -----------------------------------------------------------------------

  server.delete<{ Params: { id: string } }>(
    '/api/skills/:id',
    async (req, reply) => {
      const { id } = req.params

      try {
        await runtime.uninstallSkill(id)
        return { ok: true, id }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown uninstall error'
        return reply.status(404).send({ error: message })
      }
    },
  )

  // -----------------------------------------------------------------------
  // POST /api/skills/:id/reload — hot-reload a skill manifest
  // -----------------------------------------------------------------------

  server.post<{ Params: { id: string } }>(
    '/api/skills/:id/reload',
    async (req, reply) => {
      const { id } = req.params

      try {
        const manifest = await runtime.hotReload(id)
        return { ok: true, manifest }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown reload error'
        return reply.status(400).send({ error: message })
      }
    },
  )

  // -----------------------------------------------------------------------
  // POST /api/skills/create — generate skill from description via LLM
  // -----------------------------------------------------------------------

  const defaultAdapter: LLMAdapter = process.env.ANTHROPIC_API_KEY
    ? new ClaudeAdapter()
    : new OllamaAdapter()
  const creator = new SkillCreator(defaultAdapter, configEngine)
  const publisher = new SkillPublisher()

  server.post<{
    Body: { description: string; author?: string; autoInstall?: boolean }
  }>('/api/skills/create', async (req, reply) => {
    const { description, author, autoInstall } = req.body ?? {}

    if (!description || typeof description !== 'string') {
      return reply.status(400).send({ error: 'description is required' })
    }

    try {
      const result = await creator.createAndInstall(
        description,
        author ?? 'mira-user',
      )

      if (autoInstall) {
        try {
          const skillDir = path.join(
            configEngine.getConfigDir(),
            'skills',
            result.manifest.id,
          )
          await runtime.installSkill(skillDir)
        } catch {
          // May already be installed from the file write — that's fine
        }
      }

      return { manifest: result.manifest, installed: result.installed }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create skill'
      return reply.status(500).send({ error: message })
    }
  })

  // -----------------------------------------------------------------------
  // POST /api/skills/:id/publish — publish a skill to the community registry
  // -----------------------------------------------------------------------

  server.post<{ Params: { id: string }; Body: { registryRepo?: string } }>(
    '/api/skills/:id/publish',
    async (req, reply) => {
      const { id } = req.params
      const { registryRepo } = req.body ?? {}

      const skillDir = path.join(configEngine.getConfigDir(), 'skills', id)
      try {
        await fs.access(skillDir)
      } catch {
        return reply
          .status(404)
          .send({ error: `Skill "${id}" is not installed locally` })
      }

      const result = await publisher.publishViaPR(skillDir, registryRepo)
      if (!result.ok) {
        return reply.status(500).send({ error: result.error })
      }
      return result
    },
  )

  return { runtime, store, creator }
}
