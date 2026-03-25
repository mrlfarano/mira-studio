/**
 * Snapshot routes -- Fastify plugin that registers REST endpoints for
 * workspace state snapshots.
 *
 * Routes:
 *   GET    /api/snapshots              -- list all snapshots
 *   POST   /api/snapshots              -- capture new snapshot { name }
 *   POST   /api/snapshots/:name/restore -- restore a snapshot
 *   DELETE /api/snapshots/:name        -- delete a snapshot
 */

import type { FastifyInstance } from "fastify";
import type { ConfigEngine } from "../config/config-engine.js";
import { SnapshotEngine } from "./snapshot-engine.js";

export { SnapshotEngine } from "./snapshot-engine.js";
export type { SnapshotData, SnapshotMeta } from "./snapshot-engine.js";

/**
 * Initialise the SnapshotEngine and register all snapshot routes.
 * Call once during server bootstrap.
 */
export async function registerSnapshotRoutes(
  server: FastifyInstance,
  configEngine: ConfigEngine,
): Promise<SnapshotEngine> {
  const engine = new SnapshotEngine(configEngine);
  await engine.init();

  // -----------------------------------------------------------------------
  // GET /api/snapshots -- list all snapshots
  // -----------------------------------------------------------------------
  server.get("/api/snapshots", async () => {
    const snapshots = await engine.list();
    return { snapshots };
  });

  // -----------------------------------------------------------------------
  // POST /api/snapshots -- capture new snapshot
  // -----------------------------------------------------------------------
  server.post<{ Body: { name: string } }>("/api/snapshots", async (req, reply) => {
    const { name } = req.body ?? {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return reply
        .status(400)
        .send({ error: "A non-empty 'name' field is required." });
    }

    try {
      const snapshot = await engine.capture(name.trim());
      return reply.status(201).send(snapshot);
    } catch (err) {
      server.log.error(err, "Failed to capture snapshot");
      return reply.status(500).send({ error: "Failed to capture snapshot." });
    }
  });

  // -----------------------------------------------------------------------
  // POST /api/snapshots/:name/restore -- restore a snapshot
  // -----------------------------------------------------------------------
  server.post<{ Params: { name: string } }>(
    "/api/snapshots/:name/restore",
    async (req, reply) => {
      const { name } = req.params;
      try {
        const snapshot = await engine.restore(name);
        return { restored: true, name: snapshot.name, capturedAt: snapshot.capturedAt };
      } catch (err) {
        const message =
          (err as NodeJS.ErrnoException).code === "ENOENT"
            ? `Snapshot '${name}' not found.`
            : "Failed to restore snapshot.";
        const status =
          (err as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
        server.log.error(err, "Failed to restore snapshot");
        return reply.status(status).send({ error: message });
      }
    },
  );

  // -----------------------------------------------------------------------
  // DELETE /api/snapshots/:name -- delete a snapshot
  // -----------------------------------------------------------------------
  server.delete<{ Params: { name: string } }>(
    "/api/snapshots/:name",
    async (req, reply) => {
      const { name } = req.params;
      try {
        await engine.delete(name);
        return { deleted: true, name };
      } catch (err) {
        const message =
          (err as NodeJS.ErrnoException).code === "ENOENT"
            ? `Snapshot '${name}' not found.`
            : "Failed to delete snapshot.";
        const status =
          (err as NodeJS.ErrnoException).code === "ENOENT" ? 404 : 500;
        server.log.error(err, "Failed to delete snapshot");
        return reply.status(status).send({ error: message });
      }
    },
  );

  return engine;
}
