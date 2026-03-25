/**
 * Git routes — Fastify plugin that registers REST endpoints for .mira/ git sync.
 *
 * Routes:
 *   GET  /api/git/status  — git status of .mira/ files
 *   POST /api/git/commit  — manual commit with message body
 *   POST /api/git/push    — push to remote
 *   GET  /api/git/log     — recent .mira/ commits
 */

import type { FastifyInstance } from "fastify";
import { GitSyncEngine } from "./git-sync.js";
import type { ConfigEngine } from "../config/config-engine.js";

export { GitSyncEngine } from "./git-sync.js";

/**
 * Initialise the GitSyncEngine and register all git routes.
 * Call once during server bootstrap.
 */
export async function registerGitRoutes(
  server: FastifyInstance,
  projectRoot: string,
  configEngine: ConfigEngine,
): Promise<GitSyncEngine> {
  const gitSync = new GitSyncEngine(projectRoot);
  await gitSync.init(configEngine);

  server.log.info(
    `GitSyncEngine initialised — repo detected: ${gitSync.initialized}`,
  );

  // -------------------------------------------------------------------------
  // GET /api/git/status
  // -------------------------------------------------------------------------
  server.get("/api/git/status", async () => {
    return gitSync.getStatus();
  });

  // -------------------------------------------------------------------------
  // POST /api/git/commit
  // -------------------------------------------------------------------------
  server.post<{ Body: { message: string } }>(
    "/api/git/commit",
    async (req, reply) => {
      const { message } = req.body ?? {};
      if (!message || typeof message !== "string" || message.trim() === "") {
        return reply.status(400).send({ error: "Commit message is required" });
      }

      try {
        const result = await gitSync.manualCommit(message.trim());
        if (result.hash === null) {
          return { committed: false, message: "No .mira/ changes to commit" };
        }
        return { committed: true, hash: result.hash };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // -------------------------------------------------------------------------
  // POST /api/git/push
  // -------------------------------------------------------------------------
  server.post<{ Body?: { remote?: string } }>(
    "/api/git/push",
    async (_req, reply) => {
      try {
        const remote = _req.body?.remote ?? "origin";
        const result = await gitSync.push(remote);
        if (!result.success) {
          return reply.status(400).send({ error: result.message });
        }
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return reply.status(500).send({ error: msg });
      }
    },
  );

  // -------------------------------------------------------------------------
  // GET /api/git/log
  // -------------------------------------------------------------------------
  server.get<{ Querystring: { limit?: string } }>(
    "/api/git/log",
    async (req) => {
      const limit = parseInt(req.query.limit ?? "20", 10);
      const entries = await gitSync.getLog(
        Number.isNaN(limit) ? 20 : Math.min(limit, 100),
      );
      return { entries };
    },
  );

  return gitSync;
}
