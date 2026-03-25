/**
 * WebSocket message protocol for PTY sessions.
 *
 * All messages are JSON-encoded and travel over the /ws/pty/:sessionId route.
 */

// ── Status enum ──────────────────────────────────────────────────────────────

export type PtyStatus = "idle" | "thinking" | "running" | "error";

// ── Client -> Server messages ────────────────────────────────────────────────

export interface SpawnMessage {
  type: "spawn";
  shell?: string;
  cols?: number;
  rows?: number;
}

export interface InputMessage {
  type: "input";
  data: string;
}

export interface ResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

export interface KillMessage {
  type: "kill";
}

export type ClientMessage = SpawnMessage | InputMessage | ResizeMessage | KillMessage;

// ── Server -> Client messages ────────────────────────────────────────────────

export interface OutputMessage {
  type: "output";
  data: string;
}

export interface StatusMessage {
  type: "status";
  status: PtyStatus;
  sessionId: string;
}

export interface SpawnedMessage {
  type: "spawned";
  sessionId: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export interface ExitMessage {
  type: "exit";
  exitCode: number;
  signal?: number;
}

export type ServerMessage =
  | OutputMessage
  | StatusMessage
  | SpawnedMessage
  | ErrorMessage
  | ExitMessage;
