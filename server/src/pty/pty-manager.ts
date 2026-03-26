/**
 * PtyManager – manages multiple pseudo-terminal sessions backed by node-pty.
 *
 * Designed for 8+ concurrent terminals with output buffering, status
 * detection heuristics, and graceful shutdown.
 */

import * as pty from "node-pty";
import type { IPty } from "node-pty";
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "node:events";
import type { PtyStatus } from "./pty-protocol.js";
import { StatusDetector } from "./status-detector.js";
import type { StatusDetectorConfig } from "./status-detector.js";

// ── Ring buffer ──────────────────────────────────────────────────────────────

const MAX_BUFFER_LINES = 5000;

class RingBuffer {
  private buf: string[] = [];
  private head = 0;
  private count = 0;
  private readonly capacity: number;

  constructor(capacity = MAX_BUFFER_LINES) {
    this.capacity = capacity;
    this.buf = new Array<string>(capacity);
  }

  push(line: string): void {
    this.buf[this.head] = line;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  /** Return lines in insertion order. */
  toArray(): string[] {
    if (this.count < this.capacity) {
      return this.buf.slice(0, this.count);
    }
    return [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
  }

  /** Reset the buffer, discarding all stored lines. */
  clear(): void {
    this.buf = new Array<string>(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  /** Current number of stored lines. */
  get length(): number {
    return this.count;
  }
}

// ── Context stats type ───────────────────────────────────────────────────────

export interface ContextStats {
  totalLines: number
  estimatedTokens: number
  outputSizeBytes: number
}

// ── Session type ─────────────────────────────────────────────────────────────

export interface PtySession {
  id: string;
  pty: IPty;
  status: PtyStatus;
  createdAt: Date;
  outputBuffer: RingBuffer;
  statusDetector: StatusDetector;
}

// ── PtyManager ───────────────────────────────────────────────────────────────

export class PtyManager extends EventEmitter {
  private sessions = new Map<string, PtySession>();
  private shutdownInProgress = false;
  private detectorConfig?: Partial<StatusDetectorConfig>;

  constructor(detectorConfig?: Partial<StatusDetectorConfig>) {
    super();
    this.detectorConfig = detectorConfig;
    this.setupProcessHandlers();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Spawn a new PTY session. Returns the session ID.
   */
  spawn(
    id?: string,
    shell?: string,
    cols = 80,
    rows = 24,
  ): string {
    if (this.shutdownInProgress) {
      throw new Error("Manager is shutting down");
    }

    const sessionId = id ?? uuidv4();
    const resolvedShell = shell ?? process.env.SHELL ?? "bash";

    const ptyProcess = pty.spawn(resolvedShell, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd: process.env.HOME ?? "/",
      env: process.env as Record<string, string>,
    });

    const statusDetector = new StatusDetector(this.detectorConfig);

    const session: PtySession = {
      id: sessionId,
      pty: ptyProcess,
      status: "running",
      createdAt: new Date(),
      outputBuffer: new RingBuffer(MAX_BUFFER_LINES),
      statusDetector,
    };

    this.sessions.set(sessionId, session);

    // Forward status changes from the detector
    statusDetector.onStatusChange((status) => {
      this.setStatus(sessionId, status);
    });

    // Wire up data handler
    ptyProcess.onData((data: string) => {
      session.outputBuffer.push(data);
      this.emit("output", sessionId, data);
      statusDetector.feed(data);
    });

    // Wire up exit handler
    ptyProcess.onExit(({ exitCode, signal }) => {
      statusDetector.handleExit(exitCode);
      this.emit("exit", sessionId, exitCode, signal);
      statusDetector.dispose();
      this.sessions.delete(sessionId);
    });

    return sessionId;
  }

  /**
   * Write data to a session's PTY stdin.
   */
  write(id: string, data: string): void {
    const session = this.getSession(id);
    session.pty.write(data);
  }

  /**
   * Resize a session's terminal.
   */
  resize(id: string, cols: number, rows: number): void {
    const session = this.getSession(id);
    session.pty.resize(cols, rows);
  }

  /**
   * Kill a single session. SIGTERM first, SIGKILL after 5 s.
   */
  async kill(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;

    await this.gracefulKill(session);
  }

  /**
   * Kill every active session (used during server shutdown).
   */
  async killAll(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map((s) =>
      this.gracefulKill(s),
    );
    await Promise.allSettled(promises);
  }

  /**
   * Get the buffered output for a session (session replay).
   */
  getBufferedOutput(id: string): string[] {
    const session = this.sessions.get(id);
    if (!session) return [];
    return session.outputBuffer.toArray();
  }

  /**
   * Get a session's current status.
   */
  getStatus(id: string): PtyStatus | undefined {
    return this.sessions.get(id)?.status;
  }

  /**
   * Check whether a session exists.
   */
  has(id: string): boolean {
    return this.sessions.has(id);
  }

  /**
   * Number of active sessions.
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * List all active sessions with metadata (no IPty handle exposed).
   */
  listSessions(): Array<{
    id: string
    status: PtyStatus
    pid: number
    createdAt: Date
    bufferLines: number
  }> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      status: s.status,
      pid: s.pty.pid,
      createdAt: s.createdAt,
      bufferLines: s.outputBuffer.length,
    }))
  }

  /**
   * Get context stats for a single session's output buffer.
   */
  getContextStats(id: string): ContextStats | undefined {
    const session = this.sessions.get(id)
    if (!session) return undefined
    const lines = session.outputBuffer.toArray()
    const totalLines = lines.length
    const totalChars = lines.reduce((sum, l) => sum + l.length, 0)
    const outputSizeBytes = lines.reduce(
      (sum, l) => sum + Buffer.byteLength(l, 'utf-8'),
      0,
    )
    return {
      totalLines,
      estimatedTokens: Math.ceil(totalChars / 4),
      outputSizeBytes,
    }
  }

  /**
   * Clear a session's output buffer.
   */
  clearBuffer(id: string): void {
    const session = this.sessions.get(id)
    if (!session) throw new Error(`PTY session not found: ${id}`)
    session.outputBuffer.clear()
  }

  /**
   * Get context stats for all active sessions.
   */
  getAllContextStats(): Record<string, ContextStats> {
    const result: Record<string, ContextStats> = {}
    for (const [id] of this.sessions) {
      const stats = this.getContextStats(id)
      if (stats) result[id] = stats
    }
    return result
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private getSession(id: string): PtySession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`PTY session not found: ${id}`);
    return session;
  }

  private setStatus(id: string, status: PtyStatus): void {
    const session = this.sessions.get(id);
    if (!session || session.status === status) return;
    session.status = status;
    this.emit("status", id, status);
  }

  /**
   * Send SIGTERM, wait up to 5 s, then SIGKILL if still alive.
   */
  private gracefulKill(session: PtySession): Promise<void> {
    return new Promise<void>((resolve) => {
      const id = session.id;
      const KILL_TIMEOUT = 5_000;

      // If session was already cleaned up via onExit, nothing to do
      if (!this.sessions.has(id)) {
        resolve();
        return;
      }

      const cleanup = () => {
        session.statusDetector.dispose();
        this.sessions.delete(id);
        resolve();
      };

      // Listen for exit
      const onExit = (exitId: string) => {
        if (exitId === id) {
          clearTimeout(forceTimer);
          this.removeListener("exit", onExit);
          cleanup();
        }
      };
      this.on("exit", onExit);

      // Try SIGTERM first (node-pty kill sends the signal to the process)
      try {
        session.pty.kill("SIGTERM");
      } catch {
        // Process may already be dead
        this.removeListener("exit", onExit);
        cleanup();
        return;
      }

      // Force-kill after timeout
      const forceTimer = setTimeout(() => {
        this.removeListener("exit", onExit);
        try {
          session.pty.kill("SIGKILL");
        } catch {
          // ignore
        }
        // Give a moment for SIGKILL to propagate
        setTimeout(() => cleanup(), 200);
      }, KILL_TIMEOUT);
    });
  }

  // ── Process handlers (graceful server shutdown) ──────────────────────────

  private setupProcessHandlers(): void {
    const shutdown = async () => {
      if (this.shutdownInProgress) return;
      this.shutdownInProgress = true;
      await this.killAll();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}
