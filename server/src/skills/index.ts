/**
 * Skill system routes — Fastify plugin that registers REST endpoints for
 * skill installation, listing, removal, and hot-reload.
 *
 * Routes:
 *   GET    /api/skills           — list installed skills
 *   POST   /api/skills/install   — install a skill from source
 *   DELETE /api/skills/:id       — uninstall a skill
 *   POST   /api/skills/:id/reload — hot-reload a changed skill
 */

import type { FastifyInstance } from "fastify";
import type { ConfigEngine } from "../config/config-engine.js";
import { SkillRuntime } from "./skill-runtime.js";
import { SkillStore } from "./skill-store.js";

export { SkillRuntime } from "./skill-runtime.js";
export { SkillStore } from "./skill-store.js";
export type * from "./types.js";

/**
 * Initialise the Skill Runtime and Store, then register all skill REST routes.
 * Call once during server bootstrap.
 */
export async function registerSkillRoutes(
  server: FastifyInstance,
  projectRoot: string,
  configEngine: ConfigEngine,
): Promise<{ runtime: SkillRuntime; store: SkillStore }> {
  const runtime = new SkillRuntime(projectRoot, configEngine);
  const store = new SkillStore(configEngine);

  // Warm up: load manifests for already-installed skills
  await runtime.init();

  // Forward runtime events to Fastify logger
  runtime.on("skill:installed", (skill) => {
    server.log.info(`Skill installed: ${skill.id}@${skill.version}`);
  });
  runtime.on("skill:uninstalled", (id) => {
    server.log.info(`Skill uninstalled: ${id}`);
  });
  runtime.on("skill:reloaded", (manifest) => {
    server.log.info(`Skill hot-reloaded: ${manifest.id}@${manifest.version}`);
  });
  runtime.on("skill:loaded", (manifest) => {
    server.log.info(`Skill manifest loaded: ${manifest.id}`);
  });

  // -----------------------------------------------------------------------
  // GET /api/skills — list all installed skills
  // -----------------------------------------------------------------------

  server.get("/api/skills", async () => {
    const skills = await store.listAll();
    return { skills };
  });

  // -----------------------------------------------------------------------
  // POST /api/skills/install — install a skill from a source path
  // -----------------------------------------------------------------------

  server.post<{ Body: { source: string } }>(
    "/api/skills/install",
    async (req, reply) => {
      const { source } = req.body ?? {};

      if (!source || typeof source !== "string") {
        return reply
          .status(400)
          .send({ error: '"source" is required (path to skill directory)' });
      }

      try {
        const installed = await runtime.installSkill(source);
        return reply.status(201).send(installed);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown install error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  // -----------------------------------------------------------------------
  // DELETE /api/skills/:id — uninstall a skill
  // -----------------------------------------------------------------------

  server.delete<{ Params: { id: string } }>(
    "/api/skills/:id",
    async (req, reply) => {
      const { id } = req.params;

      try {
        await runtime.uninstallSkill(id);
        return { ok: true, id };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown uninstall error";
        return reply.status(404).send({ error: message });
      }
    },
  );

  // -----------------------------------------------------------------------
  // POST /api/skills/:id/reload — hot-reload a skill manifest
  // -----------------------------------------------------------------------

  server.post<{ Params: { id: string } }>(
    "/api/skills/:id/reload",
    async (req, reply) => {
      const { id } = req.params;

      try {
        const manifest = await runtime.hotReload(id);
        return { ok: true, manifest };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown reload error";
        return reply.status(400).send({ error: message });
      }
    },
  );

  return { runtime, store };
}
