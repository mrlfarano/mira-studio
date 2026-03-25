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
const { runtime: skillRuntime, store: skillStore } =
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
const companionEngine = await registerCompanionRoutes(
  server,
  PROJECT_ROOT,
  configEngine,
);
server.log.info("CompanionEngine initialised");

// Register MCP bridge and REST routes
const mcpBridge = await registerMcpRoutes(server, PROJECT_ROOT);
server.log.info("McpBridge initialised");

// Register snapshot engine and REST routes
const snapshotEngine = await registerSnapshotRoutes(server, configEngine);
server.log.info("SnapshotEngine initialised");

// Register Self-Improvement (SI) engine and REST routes
const siEngine = await registerSIRoutes(server, PROJECT_ROOT);
server.log.info("SIEngine initialised");

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
