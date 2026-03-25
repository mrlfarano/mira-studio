/**
 * MCP routes — Fastify plugin that registers REST endpoints for the
 * MCP Connection Wizard: connect, disconnect, list, discover, tools.
 *
 * Routes:
 *   GET    /api/mcp/connections            — list all connections
 *   POST   /api/mcp/connect                — connect to a new MCP server
 *   DELETE  /api/mcp/connections/:id        — disconnect a server
 *   GET    /api/mcp/discover               — auto-discovery scan
 *   GET    /api/mcp/connections/:id/tools   — list tools for a connection
 */

import type { FastifyInstance } from "fastify";
import { McpBridge } from "./mcp-bridge.js";
import type { McpServerConfig } from "./mcp-bridge.js";
import { discoverMcpServices } from "./auto-discovery.js";

export { McpBridge } from "./mcp-bridge.js";
export { discoverMcpServices } from "./auto-discovery.js";

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerMcpRoutes(
  app: FastifyInstance,
  projectRoot: string,
): Promise<McpBridge> {
  const bridge = new McpBridge();

  // GET /api/mcp/connections — list all active connections with status
  app.get("/api/mcp/connections", async (_req, reply) => {
    const connections = await bridge.getConnections();
    return reply.send(connections);
  });

  // POST /api/mcp/connect — connect to a new MCP server
  app.post<{ Body: McpServerConfig }>("/api/mcp/connect", async (req, reply) => {
    const config = req.body;
    if (!config?.name || !config?.command) {
      return reply.status(400).send({ error: "name and command are required" });
    }
    const connection = await bridge.connect(config);
    return reply.status(201).send(connection);
  });

  // DELETE /api/mcp/connections/:id — disconnect a server
  app.delete<{ Params: { id: string } }>(
    "/api/mcp/connections/:id",
    async (req, reply) => {
      try {
        await bridge.disconnect(req.params.id);
        return reply.status(204).send();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(404).send({ error: message });
      }
    },
  );

  // GET /api/mcp/discover — auto-discovery scan
  app.get("/api/mcp/discover", async (_req, reply) => {
    const suggestions = await discoverMcpServices(projectRoot);
    return reply.send(suggestions);
  });

  // GET /api/mcp/connections/:id/tools — list tools for a connection
  app.get<{ Params: { id: string } }>(
    "/api/mcp/connections/:id/tools",
    async (req, reply) => {
      try {
        const tools = await bridge.listTools(req.params.id);
        return reply.send(tools);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.status(404).send({ error: message });
      }
    },
  );

  return bridge;
}
