import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import getPort from "get-port";
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
import { registerKeychainRoutes } from "./routes/keychain.js";
import { registerStaticMount } from "./static-mount.js";

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

// ── Spark Canvas persistence ────────────────────────────────────────────────

const canvasDir = path.join(PROJECT_ROOT, ".mira", "canvases");

server.post<{ Body: { name: string; elements: unknown[] } }>(
  "/api/canvas/save",
  async (request, reply) => {
    const { name, elements } = request.body;
    if (!name || !Array.isArray(elements)) {
      return reply.status(400).send({ error: "name and elements[] required" });
    }
    await fs.mkdir(canvasDir, { recursive: true });
    const filePath = path.join(canvasDir, `${name}.json`);
    await fs.writeFile(filePath, JSON.stringify({ name, elements }, null, 2), "utf-8");
    return { ok: true, name };
  },
);

server.get<{ Params: { name: string } }>(
  "/api/canvas/:name",
  async (request, reply) => {
    const { name } = request.params;
    const filePath = path.join(canvasDir, `${name}.json`);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return reply.status(404).send({ error: `Canvas '${name}' not found` });
    }
  },
);

server.get("/api/canvas", async () => {
  try {
    await fs.mkdir(canvasDir, { recursive: true });
    const files = await fs.readdir(canvasDir);
    const canvases = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
    return { canvases };
  } catch {
    return { canvases: [] };
  }
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

// Register OS keychain routes (API keys never live in .mira/)
registerKeychainRoutes(server);
server.log.info("Keychain routes initialised");

// Register static-mount for built frontend (production / npx mode).
// In dev mode (no dist/), this is a no-op and Vite serves the frontend.
// Must run AFTER all route registrations and BEFORE the server listens.
await registerStaticMount(server, PROJECT_ROOT);

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

// Start server — picks a free port (PORT env preferred, then 3001..3003,
// then any free). Emits a machine-readable ready line on stdout that the
// bin/mira launcher can capture.
const start = async () => {
  try {
    const port = await getPort({
      port: [Number(process.env.PORT ?? 3001), 3001, 3002, 3003, 0],
    });
    const host = process.env.HOST ?? "0.0.0.0";
    await server.listen({ port, host });
    server.log.info(`Mira Studio server listening on http://${host}:${port}`);
    process.stdout.write(`__MIRA_READY__ http://localhost:${port}\n`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
