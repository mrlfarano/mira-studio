import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { PtyManager } from "./pty/index.js";
import { registerPtyRoutes } from "./ws/index.js";
import { registerConfigRoutes } from "./config/index.js";
import { registerGitRoutes } from "./git/index.js";
import { registerSkillRoutes } from "./skills/index.js";
import { registerJournalRoutes } from "./journal/index.js";
import { registerCompanionRoutes } from "./companion/index.js";
import { registerMcpRoutes } from "./mcp/index.js";
import { registerSnapshotRoutes } from "./snapshot/index.js";
import { registerSIRoutes } from "./si/index.js";
import { registerVibeRoutes } from "./vibe/index.js";
import { registerObservabilityRoutes } from "./observability/index.js";
import { registerReplayRoutes } from "./replay/index.js";
import { registerProjectMapRoutes } from "./project-map/index.js";
import { registerRegistryRoutes } from "./registry/index.js";
import { registerPairRoutes } from "./pair/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const server = Fastify({
  logger: true,
});

// Register CORS for Vite dev server
await server.register(cors, {
  origin: "http://localhost:5173",
});

// Register WebSocket support
await server.register(websocket);

// PTY manager (shared singleton)
const ptyManager = new PtyManager();

// Register PTY WebSocket routes
registerPtyRoutes(server, ptyManager);

// PTY broadcast endpoint — send input to multiple sessions simultaneously
server.post<{
  Body: { data: string; sessionIds: string[] };
}>("/api/pty/broadcast", async (request, reply) => {
  const { data, sessionIds } = request.body;
  if (!data || !Array.isArray(sessionIds) || sessionIds.length === 0) {
    return reply.status(400).send({ error: "data and sessionIds[] required" });
  }

  const results = await Promise.allSettled(
    sessionIds.map((id) => {
      if (!ptyManager.has(id)) {
        return Promise.reject(new Error(`Session ${id} not found`));
      }
      ptyManager.write(id, data);
      return Promise.resolve(id);
    }),
  );

  const sent = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<string>).value);
  const failed = results
    .filter((r) => r.status === "rejected")
    .map((r, i) => ({
      sessionId: sessionIds[i],
      error: (r as PromiseRejectedResult).reason?.message ?? "Unknown error",
    }));

  return { sent, failed };
});

// ── Context Cleaner endpoints ────────────────────────────────────────────────

// Get context stats for all sessions
server.get("/api/pty/context-stats", async () => {
  return ptyManager.getAllContextStats();
});

// Get context stats for a single session
server.get<{ Params: { sessionId: string } }>(
  "/api/pty/:sessionId/context-stats",
  async (request, reply) => {
    const { sessionId } = request.params;
    const stats = ptyManager.getContextStats(sessionId);
    if (!stats) {
      return reply.status(404).send({ error: `Session ${sessionId} not found` });
    }
    return stats;
  },
);

// Clear buffer for a single session
server.post<{ Params: { sessionId: string } }>(
  "/api/pty/:sessionId/clear-buffer",
  async (request, reply) => {
    const { sessionId } = request.params;
    try {
      ptyManager.clearBuffer(sessionId);
      return { ok: true };
    } catch {
      return reply.status(404).send({ error: `Session ${sessionId} not found` });
    }
  },
);

// Health check endpoint
server.get("/api/health", async () => {
  return { status: "ok" };
});

// Register .mira/ config engine and REST routes
const configEngine = await registerConfigRoutes(server, PROJECT_ROOT);
server.log.info(
  `ConfigEngine initialised — watching ${configEngine.getConfigDir()}`,
);

// Register .mira/ git sync engine and REST routes
const gitSync = await registerGitRoutes(server, PROJECT_ROOT, configEngine);
server.log.info(`GitSyncEngine initialised — repo: ${gitSync.initialized}`);

// Register skill system routes
await registerSkillRoutes(server, PROJECT_ROOT, configEngine);
server.log.info("SkillRuntime initialised");

// Register build journal engine and REST routes
const journalEngine = await registerJournalRoutes(
  server,
  PROJECT_ROOT,
  ptyManager,
  configEngine,
);
server.log.info("JournalEngine initialised");

// Register companion AI engine and REST/SSE routes
await registerCompanionRoutes(
  server,
  PROJECT_ROOT,
  configEngine,
);
server.log.info("CompanionEngine initialised");

// Register MCP bridge and REST routes
const mcpBridge = await registerMcpRoutes(server, PROJECT_ROOT);
server.log.info("McpBridge initialised");

// Register snapshot engine and REST routes
await registerSnapshotRoutes(server, configEngine);
server.log.info("SnapshotEngine initialised");

// Register Self-Improvement (SI) engine and REST routes (with PtyManager for SI Agent)
await registerSIRoutes(server, PROJECT_ROOT, ptyManager);
server.log.info("SIEngine + SIAgent initialised");

// Register Vibe Score engine and REST routes
registerVibeRoutes(server, PROJECT_ROOT, ptyManager, journalEngine);
server.log.info("VibeEngine initialised");

// Register Observability workspace routes
registerObservabilityRoutes(server, ptyManager, journalEngine);
server.log.info("Observability routes initialised");

// Register Session Replay engine and REST routes
registerReplayRoutes(server, ptyManager, configEngine.getConfigDir());
server.log.info("ReplayEngine initialised");

// Register Project Map engine and REST routes
registerProjectMapRoutes(server, PROJECT_ROOT);
server.log.info("ProjectMapEngine initialised");

// Register Community Registry routes
registerRegistryRoutes(server, configEngine.getConfigDir());
server.log.info("RegistryClient initialised");

// Register Pair Mode routes (WebSocket relay for shared workspaces)
registerPairRoutes(server);
server.log.info("PairSessionManager initialised");

// Graceful shutdown: generate daily summary, kill PTY sessions, close server
const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down...`);
  try {
    await journalEngine.addEntry("system", "Server shutting down");
    const summary = await journalEngine.generateDailySummary();
    server.log.info(`Daily summary: ${summary}`);
  } catch (err) {
    server.log.error(err, "Failed to generate daily summary on shutdown");
  }
  await mcpBridge.disconnectAll();
  await ptyManager.killAll();
  await server.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Start server
const start = async () => {
  try {
    await server.listen({ port: 3001, host: "127.0.0.1" });
    server.log.info("Mira Studio server listening on http://127.0.0.1:3001");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
