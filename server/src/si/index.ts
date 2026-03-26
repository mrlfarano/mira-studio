/**
 * SI routes — Fastify plugin that registers REST endpoints for the
 * Self-Improvement cycle stored in .mira/project_SI.yml.
 *
 * Routes:
 *   GET  /api/si             — full project SI data
 *   GET  /api/si/health      — SI health score
 *   POST /api/si/hypotheses  — add a hypothesis
 *   POST /api/si/lessons     — add a lesson
 *   GET  /api/si/builds      — list past builds (engine + agent)
 *   POST /api/si/builds      — record a build outcome
 *   POST /api/si/run-cycle   — start an autonomous SI build cycle
 *   GET  /api/si/agent-status — current agent status
 *   POST /api/si/consent-pr  — create a PR with explicit user consent
 *   GET  /api/si/agent-builds — list agent build results
 */

import type { FastifyInstance } from "fastify";
import { SIEngine } from "./si-engine.js";
import { SIAgent } from "./si-agent.js";
import type { SIHypothesis, SILesson, SIBuild } from "./types.js";
import type { PtyManager } from "../pty/pty-manager.js";

export { SIEngine } from "./si-engine.js";
export { SIAgent } from "./si-agent.js";
export type * from "./types.js";
export type { SIBuildResult, SIAgentStatus } from "./si-agent.js";

/**
 * Initialise the SIEngine, SIAgent, and register all SI routes.
 * Call once during server bootstrap.
 */
export async function registerSIRoutes(
  server: FastifyInstance,
  projectRoot: string,
  ptyManager?: PtyManager,
): Promise<SIEngine> {
  const engine = new SIEngine(projectRoot);
  await engine.loadProjectSI();

  // Create the SI Agent if a PtyManager is available
  const agent = ptyManager
    ? new SIAgent(engine, ptyManager, projectRoot)
    : null;

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
  // GET /api/si/builds — list past builds (engine records)
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

  // =========================================================================
  // SI Agent routes
  // =========================================================================

  // -------------------------------------------------------------------------
  // POST /api/si/run-cycle — start an autonomous SI build cycle
  // -------------------------------------------------------------------------
  server.post<{
    Body: { hypothesisId: string };
  }>("/api/si/run-cycle", async (req, reply) => {
    if (!agent) {
      return reply.status(503).send({
        error: "SI Agent is not available (no PtyManager)",
      });
    }

    const { hypothesisId } = req.body;
    if (!hypothesisId) {
      return reply.status(400).send({ error: "hypothesisId is required" });
    }

    const status = agent.getStatus();
    if (status.running) {
      return reply.status(409).send({
        error: "SI Agent is already running a build cycle",
        currentHypothesis: status.currentHypothesis,
      });
    }

    // Generate a build ID and start the cycle asynchronously
    const buildId = `si-build-${Date.now()}`

    // Fire and forget — the cycle runs in the background
    agent.runCycle(hypothesisId).catch((err: Error) => {
      server.log.error(err, "SI Agent build cycle failed");
    });

    return { started: true, buildId };
  });

  // -------------------------------------------------------------------------
  // GET /api/si/agent-status — current agent status
  // -------------------------------------------------------------------------
  server.get("/api/si/agent-status", async (_req, reply) => {
    if (!agent) {
      return reply.status(503).send({
        error: "SI Agent is not available",
      });
    }
    return agent.getStatus();
  });

  // -------------------------------------------------------------------------
  // POST /api/si/consent-pr — create a PR with explicit user consent
  // -------------------------------------------------------------------------
  server.post<{
    Body: { buildId: string };
  }>("/api/si/consent-pr", async (req, reply) => {
    if (!agent) {
      return reply.status(503).send({
        error: "SI Agent is not available",
      });
    }

    const { buildId } = req.body;
    if (!buildId) {
      return reply.status(400).send({ error: "buildId is required" });
    }

    try {
      const result = await agent.createPRWithConsent(buildId);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: msg });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/si/agent-builds — list agent build results
  // -------------------------------------------------------------------------
  server.get("/api/si/agent-builds", async (_req, reply) => {
    if (!agent) {
      return reply.status(503).send({
        error: "SI Agent is not available",
      });
    }
    return { builds: agent.getAllBuilds() };
  });

  return engine;
}
