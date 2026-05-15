/**
 * Static-mount module — serves the built frontend `dist/` directory when
 * Mira Studio runs in production (npx mira-studio) mode.
 *
 * Behaviour:
 *   - If `dist/` does not exist (dev mode, Vite handles assets), this is a
 *     no-op and returns `false`.
 *   - If `dist/` exists, mounts it at `/` with a SPA fallback that lets the
 *     React router handle any non-`/api/`, non-`/ws/` path.
 */

import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { existsSync } from "node:fs";

export async function registerStaticMount(
  server: FastifyInstance,
  projectRoot: string,
): Promise<boolean> {
  const distDir = path.join(projectRoot, "dist");
  if (!existsSync(distDir)) {
    server.log.info(
      "Frontend dist/ not found — skipping static mount (dev mode)",
    );
    return false;
  }
  await server.register(fastifyStatic, {
    root: distDir,
    prefix: "/",
    wildcard: false,
  });
  server.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith("/api") || req.url.startsWith("/ws")) {
      reply.code(404).send({ error: "Not Found" });
      return;
    }
    reply.sendFile("index.html");
  });
  server.log.info(`Static frontend mounted from ${distDir}`);
  return true;
}
