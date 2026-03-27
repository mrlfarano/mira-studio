/**
 * Terminal panel powered by xterm.js with WebGL rendering, auto-fit,
 * agent status indicator, and session persistence.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";

import { useTerminal } from "./useTerminal";
import type { PtyStatus } from "@/types/ws-protocol";

// ── Agent status badge ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PtyStatus, { label: string; color: string }> = {
  idle: { label: "Idle", color: "#6b7280" },
  thinking: { label: "Thinking", color: "#f59e0b" },
  running: { label: "Running", color: "#22c55e" },
  error: { label: "Error", color: "#ef4444" },
};

const AgentStatusBadge: React.FC<{ status: PtyStatus }> = ({ status }) => {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "11px",
        color,
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
          animation: status === "thinking" ? "pulse 1.5s infinite" : undefined,
        }}
      />
      {label}
    </span>
  );
};

// ── Toolbar ─────────────────────────────────────────────────────────────────

interface TerminalToolbarProps {
  agentStatus: PtyStatus;
  onClear: () => void;
  onCopy: () => void;
}

const toolbarBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #444",
  borderRadius: "3px",
  color: "#ccc",
  cursor: "pointer",
  fontSize: "11px",
  padding: "2px 7px",
  lineHeight: "18px",
};

const TerminalToolbar: React.FC<TerminalToolbarProps> = ({
  agentStatus,
  onClear,
  onCopy,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "3px 8px",
      background: "#0d1117",
      borderBottom: "1px solid #222",
      flexShrink: 0,
    }}
  >
    <AgentStatusBadge status={agentStatus} />
    <span style={{ display: "flex", gap: "4px" }}>
      <button onClick={onCopy} style={toolbarBtnStyle} title="Copy selection">
        Copy
      </button>
      <button onClick={onClear} style={toolbarBtnStyle} title="Clear terminal">
        Clear
      </button>
    </span>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────

export interface TerminalPanelProps {
  sessionId?: string;
}

const DEFAULT_SESSION_ID = "default";

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  sessionId = DEFAULT_SESSION_ID,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { attach, detach, notifyResize, agentStatus } =
    useTerminal({ sessionId });

  // ── Initialize xterm ────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      lineHeight: 1.25,
      theme: {
        background: "#0d1117",
        foreground: "#c9d1d9",
        cursor: "#58a6ff",
        selectionBackground: "#264f78",
        black: "#0d1117",
        red: "#ff7b72",
        green: "#7ee787",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39c5cf",
        white: "#b1bac4",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#79c0ff",
        brightMagenta: "#d2a8ff",
        brightCyan: "#56d4dd",
        brightWhite: "#f0f6fc",
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);

    // Try WebGL renderer, fall back to canvas
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
    } catch {
      // Canvas renderer is the default fallback — no action needed.
    }

    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;
    setIsReady(true);

    return () => {
      setIsReady(false);
      detach();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Attach hook to terminal once ready ────────────────────────────────

  useEffect(() => {
    if (isReady && terminalRef.current) {
      attach(terminalRef.current);
    }
  }, [isReady, attach]);

  // ── ResizeObserver for auto-fit ───────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const fitAddon = fitAddonRef.current;
      const term = terminalRef.current;
      if (!fitAddon || !term) return;

      try {
        fitAddon.fit();
        notifyResize(term.cols, term.rows);
      } catch {
        // Container might not be visible yet
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [notifyResize]);

  // ── Toolbar handlers ──────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const handleCopy = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    const selection = term.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection).catch(() => {
        // Clipboard write failed silently
      });
    }
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0d1117",
      }}
    >
      <TerminalToolbar
        agentStatus={agentStatus}
        onClear={handleClear}
        onCopy={handleCopy}
      />
      <div
        data-testid="terminal-container"
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "2px 4px",
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(TerminalPanel);
