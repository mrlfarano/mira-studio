/**
 * SI routes — Fastify plugin that registers REST endpoints for the
 * Self-Improvement cycle stored in .mira/project_SI.yml.
 *
 * Routes:
 *   GET  /api/si             — full project SI data
 *   GET  /api/si/health      — SI health score
 *   POST /api/si/hypotheses  — add a hypothesis
 *   POST /api/si/lessons     — add a lesson
 *   GET  /api/si/builds      — list past builds
 *   POST /api/si/builds      — record a build outcome
 */

import type { FastifyInstance } from "fastify";
import { SIEngine } from "./si-engine.js";
import type { SIHypothesis, SILesson, SIBuild } from "./types.js";

export { SIEngine } from "./si-engine.js";
export type * from "./types.js";

/**
 * Initialise the SIEngine and register all SI routes.
 * Call once during server bootstrap.
 */
export async function registerSIRoutes(
  server: FastifyInstance,
  projectRoot: string,
): Promise<SIEngine> {
  const engine = new SIEngine(projectRoot);
  await engine.loadProjectSI();

  // -------------------------------------------------------------------------
  // GET /api/si — full project SI data
  // -------------------------------------------------------------------------
  server.get("/api/si", async () => {
    const data = await engine.getData();
    return data;
  });

  // -------------------------------------------------------------------------
  // GET /api/si/health — SI health score
  // -------------------------------------------------------------------------
  server.get("/api/si/health", async () => {
    const health = await engine.getHealth();
    return health;
  });

  // -------------------------------------------------------------------------
  // POST /api/si/hypotheses — add a hypothesis
  // -------------------------------------------------------------------------
  server.post<{
    Body: Omit<SIHypothesis, "id" | "createdAt">;
  }>("/api/si/hypotheses", async (req) => {
    const hypothesis = await engine.addHypothesis(req.body);
    return hypothesis;
  });

  // -------------------------------------------------------------------------
  // POST /api/si/lessons — add a lesson
  // -------------------------------------------------------------------------
  server.post<{
    Body: Omit<SILesson, "id" | "date">;
  }>("/api/si/lessons", async (req) => {
    const lesson = await engine.addLesson(req.body);
    return lesson;
  });

  // -------------------------------------------------------------------------
  // GET /api/si/builds — list past builds
  // -------------------------------------------------------------------------
  server.get("/api/si/builds", async () => {
    const data = await engine.getData();
    return { builds: data.builds };
  });

  // -------------------------------------------------------------------------
  // POST /api/si/builds — record a build outcome
  // -------------------------------------------------------------------------
  server.post<{
    Body: Omit<SIBuild, "id" | "date">;
  }>("/api/si/builds", async (req) => {
    const build = await engine.recordBuild(req.body);
    return build;
  });

  return engine;
}
