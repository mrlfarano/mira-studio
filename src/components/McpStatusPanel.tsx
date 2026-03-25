/**
 * McpStatusPanel — shows connected MCP servers as cards with status,
 * tool count, and reconnect / disconnect controls.
 */

import React, { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types (mirrored from server)
// ---------------------------------------------------------------------------

interface McpConnection {
  id: string;
  name: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  error?: string;
  connectedAt?: string;
  toolCount: number;
}

interface McpTool {
  name: string;
  description?: string;
}

interface McpSuggestion {
  service: string;
  detected_from: string;
  suggested_mcp_server: string;
  command: string;
  args: string[];
}

const API_BASE = "/api/mcp";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<McpConnection["status"], string> = {
  connecting: "#f5a623",
  connected: "#4caf50",
  disconnected: "#9e9e9e",
  error: "#f44336",
};

const ConnectionCard: React.FC<{
  conn: McpConnection;
  onDisconnect: (id: string) => void;
  onReconnect: (conn: McpConnection) => void;
}> = ({ conn, onDisconnect, onReconnect }) => {
  const [tools, setTools] = useState<McpTool[] | null>(null);
  const [showTools, setShowTools] = useState(false);

  const loadTools = useCallback(async () => {
    if (conn.status !== "connected") return;
    try {
      const t = await fetchJson<McpTool[]>(
        `${API_BASE}/connections/${conn.id}/tools`,
      );
      setTools(t);
      setShowTools(true);
    } catch {
      setTools([]);
      setShowTools(true);
    }
  }, [conn.id, conn.status]);

  return (
    <div
      className="mcp-card"
      style={{
        border: "1px solid var(--border, #333)",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 8,
        background: "var(--surface, #1e1e1e)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: STATUS_DOT[conn.status],
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <strong style={{ flex: 1 }}>{conn.name}</strong>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-secondary, #aaa)",
            textTransform: "capitalize",
          }}
        >
          {conn.status}
        </span>
      </div>

      {conn.error && (
        <div style={{ color: "#f44336", fontSize: 12, marginTop: 4 }}>
          {conn.error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          fontSize: 12,
        }}
      >
        {conn.status === "connected" && (
          <>
            <span style={{ color: "var(--text-secondary, #aaa)" }}>
              {conn.toolCount} tool{conn.toolCount !== 1 ? "s" : ""}
            </span>
            <button
              onClick={loadTools}
              style={{ cursor: "pointer", background: "none", border: "none", color: "var(--link, #58a6ff)", padding: 0 }}
            >
              {showTools ? "Refresh tools" : "Show tools"}
            </button>
          </>
        )}

        {(conn.status === "disconnected" || conn.status === "error") && (
          <button
            onClick={() => onReconnect(conn)}
            style={{ cursor: "pointer", background: "none", border: "none", color: "var(--link, #58a6ff)", padding: 0 }}
          >
            Reconnect
          </button>
        )}

        <button
          onClick={() => onDisconnect(conn.id)}
          style={{ cursor: "pointer", background: "none", border: "none", color: "#f44336", padding: 0, marginLeft: "auto" }}
        >
          Disconnect
        </button>
      </div>

      {showTools && tools && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: 12 }}>
          {tools.length === 0 && <li style={{ color: "var(--text-secondary, #aaa)" }}>No tools available</li>}
          {tools.map((t) => (
            <li key={t.name}>
              <strong>{t.name}</strong>
              {t.description ? ` -- ${t.description}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const McpStatusPanel: React.FC = () => {
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [suggestions, setSuggestions] = useState<McpSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual connect form
  const [formName, setFormName] = useState("");
  const [formCommand, setFormCommand] = useState("");
  const [formArgs, setFormArgs] = useState("");

  const refresh = useCallback(async () => {
    try {
      const conns = await fetchJson<McpConnection[]>(
        `${API_BASE}/connections`,
      );
      setConnections(conns);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const discover = useCallback(async () => {
    try {
      const s = await fetchJson<McpSuggestion[]>(`${API_BASE}/discover`);
      setSuggestions(s);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    discover();
  }, [refresh, discover]);

  const handleConnect = useCallback(
    async (name: string, command: string, args: string[]) => {
      setLoading(true);
      setError(null);
      try {
        await fetchJson(`${API_BASE}/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, command, args }),
        });
        await refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  const handleDisconnect = useCallback(
    async (id: string) => {
      try {
        await fetchJson(`${API_BASE}/connections/${id}`, {
          method: "DELETE",
        });
        await refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refresh],
  );

  const handleReconnect = useCallback(
    (conn: McpConnection) => {
      handleConnect(conn.name, "npx", ["-y", conn.name]);
    },
    [handleConnect],
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCommand) return;
    const args = formArgs
      .split(" ")
      .map((a) => a.trim())
      .filter(Boolean);
    handleConnect(formName, formCommand, args);
    setFormName("");
    setFormCommand("");
    setFormArgs("");
  };

  return (
    <div
      className="mcp-status-panel"
      style={{
        padding: 16,
        color: "var(--text, #ccc)",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 13,
      }}
    >
      <h3 style={{ marginTop: 0 }}>MCP Connections</h3>

      {error && (
        <div
          style={{
            background: "#3c1414",
            color: "#f44336",
            padding: 8,
            borderRadius: 4,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Connected servers */}
      {connections.length === 0 ? (
        <p style={{ color: "var(--text-secondary, #aaa)" }}>
          No MCP servers connected.
        </p>
      ) : (
        connections.map((c) => (
          <ConnectionCard
            key={c.id}
            conn={c}
            onDisconnect={handleDisconnect}
            onReconnect={handleReconnect}
          />
        ))
      )}

      {/* Auto-discovery suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8 }}>Discovered Services</h4>
          {suggestions.map((s) => (
            <div
              key={s.suggested_mcp_server}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid var(--border, #333)",
                fontSize: 12,
              }}
            >
              <span>
                <strong>{s.service}</strong>{" "}
                <span style={{ color: "var(--text-secondary, #aaa)" }}>
                  (from {s.detected_from})
                </span>
              </span>
              <button
                disabled={loading}
                onClick={() =>
                  handleConnect(s.service, s.command, s.args)
                }
                style={{
                  cursor: "pointer",
                  background: "var(--accent, #58a6ff)",
                  border: "none",
                  borderRadius: 4,
                  color: "#000",
                  padding: "4px 8px",
                  fontSize: 11,
                }}
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual connect form */}
      <form
        onSubmit={handleFormSubmit}
        style={{
          marginTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <h4 style={{ margin: 0 }}>Connect Manually</h4>
        <input
          placeholder="Name (e.g. filesystem)"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Command (e.g. npx)"
          value={formCommand}
          onChange={(e) => setFormCommand(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Args (space-separated)"
          value={formArgs}
          onChange={(e) => setFormArgs(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={loading || !formName || !formCommand}
          style={{
            cursor: "pointer",
            background: "var(--accent, #58a6ff)",
            border: "none",
            borderRadius: 4,
            color: "#000",
            padding: "6px 12px",
            fontSize: 12,
            alignSelf: "flex-start",
          }}
        >
          {loading ? "Connecting..." : "Connect"}
        </button>
      </form>

      {/* Refresh */}
      <button
        onClick={() => { refresh(); discover(); }}
        style={{
          marginTop: 12,
          cursor: "pointer",
          background: "none",
          border: "1px solid var(--border, #333)",
          borderRadius: 4,
          color: "var(--text, #ccc)",
          padding: "4px 10px",
          fontSize: 12,
        }}
      >
        Refresh
      </button>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg, #2a2a2a)",
  border: "1px solid var(--border, #333)",
  borderRadius: 4,
  color: "var(--text, #ccc)",
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "inherit",
};

export default React.memo(McpStatusPanel);
