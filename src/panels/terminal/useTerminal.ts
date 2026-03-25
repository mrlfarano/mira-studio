/**
 * Hook that bridges an xterm.js Terminal instance with the PTY WebSocket.
 *
 * Responsibilities:
 * - Writes PTY output to the terminal
 * - Forwards terminal input to the PTY
 * - Sends resize events when the terminal dimensions change
 * - Tracks agent status from PTY status messages
 * - Supports session persistence: replays buffered output on reconnect
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal } from "xterm";
import { useTerminalSocket } from "@/hooks/useTerminalSocket";
import type { PtyStatus, PtyServerMessage } from "@/types/ws-protocol";

export interface UseTerminalOptions {
  sessionId: string;
}

export interface UseTerminalReturn {
  /** Attach the xterm Terminal to this hook. Call once after Terminal is created. */
  attach: (term: Terminal) => void;
  /** Detach from the terminal (called on unmount). */
  detach: () => void;
  /** Notify the hook that the terminal was resized (cols/rows changed). */
  notifyResize: (cols: number, rows: number) => void;
  /** Current agent status derived from PTY status messages. */
  agentStatus: PtyStatus;
  /** WebSocket connection state. */
  connectionState: string;
}

/** Per-session output buffer for replay on reconnect. */
const sessionBuffers = new Map<string, string>();

const MAX_BUFFER_SIZE = 512 * 1024; // 512 KB

function appendToBuffer(sessionId: string, data: string): void {
  const existing = sessionBuffers.get(sessionId) ?? "";
  let next = existing + data;
  if (next.length > MAX_BUFFER_SIZE) {
    next = next.slice(next.length - MAX_BUFFER_SIZE);
  }
  sessionBuffers.set(sessionId, next);
}

export function useTerminal(options: UseTerminalOptions): UseTerminalReturn {
  const { sessionId } = options;
  const termRef = useRef<Terminal | null>(null);
  const [agentStatus, setAgentStatus] = useState<PtyStatus>("idle");
  const hasSpawnedRef = useRef(false);
  const attachedSessionRef = useRef<string | null>(null);

  const {
    sendInput,
    resize,
    spawn,
    lastMessage,
    connectionState,
  } = useTerminalSocket(sessionId);

  // ── Attach / Detach ──────────────────────────────────────────────────────

  const attach = useCallback(
    (term: Terminal) => {
      termRef.current = term;

      // Replay buffered output for session persistence
      if (sessionId && sessionBuffers.has(sessionId) && attachedSessionRef.current !== sessionId) {
        const buffer = sessionBuffers.get(sessionId)!;
        term.write(buffer);
      }
      attachedSessionRef.current = sessionId;

      // Forward user input to PTY
      term.onData((data: string) => {
        sendInput(data);
      });

      // Spawn shell if not already done for this session
      if (!hasSpawnedRef.current && connectionState === "connected") {
        spawn(undefined, term.cols, term.rows);
        hasSpawnedRef.current = true;
      }
    },
    [sessionId, sendInput, spawn, connectionState],
  );

  const detach = useCallback(() => {
    termRef.current = null;
  }, []);

  // ── Spawn on connect ─────────────────────────────────────────────────────

  useEffect(() => {
    if (
      connectionState === "connected" &&
      !hasSpawnedRef.current &&
      termRef.current
    ) {
      spawn(undefined, termRef.current.cols, termRef.current.rows);
      hasSpawnedRef.current = true;
    }
  }, [connectionState, spawn]);

  // Reset spawn tracking when session changes
  useEffect(() => {
    hasSpawnedRef.current = false;
  }, [sessionId]);

  // ── Process incoming messages ─────────────────────────────────────────────

  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage as PtyServerMessage;
    const term = termRef.current;

    switch (msg.type) {
      case "output":
        if (term) {
          term.write(msg.data);
        }
        appendToBuffer(sessionId, msg.data);
        break;

      case "status":
        setAgentStatus(msg.status);
        break;

      case "spawned":
        // Shell is ready
        break;

      case "error":
        if (term) {
          term.write(`\r\n\x1b[31m[Error] ${msg.message}\x1b[0m\r\n`);
        }
        break;

      case "exit":
        if (term) {
          term.write(
            `\r\n\x1b[90m[Process exited with code ${msg.exitCode}]\x1b[0m\r\n`,
          );
        }
        setAgentStatus("idle");
        break;
    }
  }, [lastMessage, sessionId]);

  // ── Resize ────────────────────────────────────────────────────────────────

  const notifyResize = useCallback(
    (cols: number, rows: number) => {
      resize(cols, rows);
    },
    [resize],
  );

  return {
    attach,
    detach,
    notifyResize,
    agentStatus,
    connectionState,
  };
}
