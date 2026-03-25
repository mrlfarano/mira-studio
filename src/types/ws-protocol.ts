/**
 * Client-side WebSocket message protocol types.
 *
 * Mirrors server-side definitions from server/src/pty/pty-protocol.ts.
 */

// ── Generic wrapper ─────────────────────────────────────────────────────────

export interface WsMessage<T = unknown> {
  type: string;
  payload?: T;
}

// ── PTY status ──────────────────────────────────────────────────────────────

export type PtyStatus = "idle" | "thinking" | "running" | "error";

// ── Client -> Server messages ───────────────────────────────────────────────

export interface PtySpawnMessage {
  type: "spawn";
  shell?: string;
  cols?: number;
  rows?: number;
}

export interface PtyInputMessage {
  type: "input";
  data: string;
}

export interface PtyResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

export interface PtyKillMessage {
  type: "kill";
}

export type PtyClientMessage =
  | PtySpawnMessage
  | PtyInputMessage
  | PtyResizeMessage
  | PtyKillMessage;

// ── Server -> Client messages ───────────────────────────────────────────────

export interface PtyOutputMessage {
  type: "output";
  data: string;
}

export interface PtyStatusMessage {
  type: "status";
  status: PtyStatus;
  sessionId: string;
}

export interface PtySpawnedMessage {
  type: "spawned";
  sessionId: string;
}

export interface PtyErrorMessage {
  type: "error";
  message: string;
}

export interface PtyExitMessage {
  type: "exit";
  exitCode: number;
  signal?: number;
}

export type PtyServerMessage =
  | PtyOutputMessage
  | PtyStatusMessage
  | PtySpawnedMessage
  | PtyErrorMessage
  | PtyExitMessage;
