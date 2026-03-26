/**
 * McpBridge — manages connections to MCP servers via the
 * Model Context Protocol SDK.  Each connection is tracked by a
 * unique id and exposes helpers to list tools, disconnect, etc.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { v4 as uuid } from "uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  /** Human-readable name for the connection */
  name: string;
  /** Command to launch the MCP server (e.g. "npx") */
  command: string;
  /** Arguments passed to the command */
  args?: string[];
  /** Optional env vars forwarded to the child process */
  env?: Record<string, string>;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface McpConnection {
  id: string;
  name: string;
  status: ConnectionStatus;
  error?: string;
  connectedAt?: string;
  toolCount: number;
}

interface InternalConnection {
  id: string;
  config: McpServerConfig;
  client: Client;
  transport: StdioClientTransport;
  status: ConnectionStatus;
  error?: string;
  connectedAt?: string;
}

// ---------------------------------------------------------------------------
// McpBridge
// ---------------------------------------------------------------------------

export class McpBridge {
  private connections = new Map<string, InternalConnection>();

  /** Connect to an MCP server and return the connection id. */
  async connect(config: McpServerConfig): Promise<McpConnection> {
    const id = uuid();

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: { ...process.env, ...(config.env ?? {}) } as Record<string, string>,
    });

    const client = new Client(
      { name: "mira-studio", version: "0.1.0" },
      { capabilities: {} },
    );

    const internal: InternalConnection = {
      id,
      config,
      client,
      transport,
      status: "connecting",
    };

    this.connections.set(id, internal);

    try {
      await client.connect(transport);
      internal.status = "connected";
      internal.connectedAt = new Date().toISOString();
    } catch (err: unknown) {
      internal.status = "error";
      internal.error = err instanceof Error ? err.message : String(err);
    }

    return this.toPublic(internal);
  }

  /** List tools exposed by a specific connection. */
  async listTools(id: string): Promise<{ name: string; description?: string }[]> {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Connection ${id} not found`);
    if (conn.status !== "connected") throw new Error(`Connection ${id} is not connected`);

    const result = await conn.client.listTools();
    return (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  /** Disconnect a single server. */
  async disconnect(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Connection ${id} not found`);

    try {
      await conn.transport.close();
    } catch {
      // transport may already be closed
    }
    conn.status = "disconnected";
  }

  /** Return all connections with their current status. */
  async getConnections(): Promise<McpConnection[]> {
    const out: McpConnection[] = [];
    for (const conn of this.connections.values()) {
      out.push(await this.toPublic(conn));
    }
    return out;
  }

  /** Call a tool on a specific connection. */
  async callTool(
    connectionId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const conn = this.connections.get(connectionId);
    if (!conn) throw new Error(`Connection ${connectionId} not found`);
    if (conn.status !== "connected") {
      throw new Error(`Connection ${connectionId} is not connected`);
    }

    const result = await conn.client.callTool({ name: toolName, arguments: args });
    return result;
  }

  /** Disconnect every active connection (used during shutdown). */
  async disconnectAll(): Promise<void> {
    for (const id of this.connections.keys()) {
      try {
        await this.disconnect(id);
      } catch {
        // best-effort
      }
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private async toPublic(conn: InternalConnection): Promise<McpConnection> {
    let toolCount = 0;
    if (conn.status === "connected") {
      try {
        const res = await conn.client.listTools();
        toolCount = (res.tools ?? []).length;
      } catch {
        // ignore – tools unavailable
      }
    }
    return {
      id: conn.id,
      name: conn.config.name,
      status: conn.status,
      error: conn.error,
      connectedAt: conn.connectedAt,
      toolCount,
    };
  }
}
