/**
 * Terminal-specific WebSocket hook for PTY sessions.
 */

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import type {
  PtyClientMessage,
  PtyServerMessage,
  PtyOutputMessage,
  PtyStatusMessage,
} from "@/types/ws-protocol";

interface SocketDerivedState {
  output: string | null;
  status: PtyStatusMessage | null;
}

type SocketAction =
  | { type: "output"; data: string }
  | { type: "status"; msg: PtyStatusMessage }
  | { type: "reset" };

function socketReducer(state: SocketDerivedState, action: SocketAction): SocketDerivedState {
  switch (action.type) {
    case "output":
      return { ...state, output: action.data };
    case "status":
      return { ...state, status: action.msg };
    case "reset":
      return { output: null, status: null };
  }
}

export interface UseTerminalSocketReturn {
  /** Send raw input to the PTY. */
  sendInput: (data: string) => void;
  /** Resize the PTY. */
  resize: (cols: number, rows: number) => void;
  /** Spawn a new shell in this session. */
  spawn: (shell?: string, cols?: number, rows?: number) => void;
  /** Kill the running PTY process. */
  kill: () => void;
  /** Latest output data from the PTY (null until first output). */
  output: string | null;
  /** Latest PTY status (null until first status message). */
  status: PtyStatusMessage | null;
  /** Underlying connection state. */
  connectionState: string;
  /** Last raw server message. */
  lastMessage: PtyServerMessage | null;
}

function buildPtyUrl(sessionId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//127.0.0.1:3001/ws/pty/${sessionId}`;
}

export function useTerminalSocket(
  sessionId: string | null,
): UseTerminalSocketReturn {
  const url = sessionId ? buildPtyUrl(sessionId) : null;
  const { send, lastMessage, connectionState } = useWebSocket(url);

  const [derived, dispatch] = useReducer(socketReducer, { output: null, status: null });

  // Derive typed values from lastMessage
  const serverMsg = lastMessage as PtyServerMessage | null;

  useEffect(() => {
    if (!serverMsg) return;
    if (serverMsg.type === "output") {
      dispatch({ type: "output", data: (serverMsg as PtyOutputMessage).data });
    }
    if (serverMsg.type === "status") {
      dispatch({ type: "status", msg: serverMsg as PtyStatusMessage });
    }
  }, [serverMsg]);

  const sendInput = useCallback(
    (data: string) => {
      send<PtyClientMessage>({ type: "input", data });
    },
    [send],
  );

  const resize = useCallback(
    (cols: number, rows: number) => {
      send<PtyClientMessage>({ type: "resize", cols, rows });
    },
    [send],
  );

  const spawn = useCallback(
    (shell?: string, cols?: number, rows?: number) => {
      send<PtyClientMessage>({ type: "spawn", shell, cols, rows });
    },
    [send],
  );

  const kill = useCallback(() => {
    send<PtyClientMessage>({ type: "kill" });
  }, [send]);

  // Reset state when sessionId changes
  useEffect(() => {
    dispatch({ type: "reset" });
  }, [sessionId]);

  return useMemo(
    () => ({
      sendInput,
      resize,
      spawn,
      kill,
      output: derived.output,
      status: derived.status,
      connectionState,
      lastMessage: serverMsg,
    }),
    [sendInput, resize, spawn, kill, derived.output, derived.status, connectionState, serverMsg],
  );
}
