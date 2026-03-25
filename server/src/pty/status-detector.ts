/**
 * StatusDetector — refined heuristics for detecting PTY agent status.
 *
 * Statuses:
 *   idle:     no output for `idleTimeoutMs` AND last output matched a prompt pattern
 *   thinking: spinner characters or "thinking"/"processing" keywords detected
 *   running:  active output stream / command execution patterns
 *   error:    stderr patterns, "Error:", "FAIL", non-zero exit codes, stack traces
 *
 * All thresholds and patterns are configurable via StatusDetectorConfig.
 */

import type { PtyStatus } from "./pty-protocol.js";

// ── Configuration ────────────────────────────────────────────────────────────

export interface StatusDetectorConfig {
  /** Milliseconds of silence before the session is considered idle (default: 3000). */
  idleTimeoutMs: number;

  /** Regex patterns that indicate a shell prompt (tested against the last line of output). */
  promptPatterns: RegExp[];

  /** Set of individual characters treated as spinner animation frames. */
  spinnerChars: Set<string>;

  /** Keywords (case-insensitive) that indicate the agent is "thinking". */
  thinkingKeywords: string[];

  /** Regex patterns that indicate an error in output. */
  errorPatterns: RegExp[];

  /** Regex patterns that indicate a stack trace. */
  stackTracePatterns: RegExp[];

  /** Regex patterns that indicate active command execution. */
  commandPatterns: RegExp[];
}

export const DEFAULT_CONFIG: StatusDetectorConfig = {
  idleTimeoutMs: 3_000,

  promptPatterns: [
    /[$>%#]\s*$/,        // common shell prompts: $, >, %, #
    /\$\s*$/,            // explicit dollar prompt
    />>>\s*$/,           // Python REPL
    /\.\.\.\s*$/,        // Python continuation
  ],

  spinnerChars: new Set([
    // Braille spinner frames
    "\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F",
    // Classic ASCII spinner
    "|", "/", "-", "\\",
  ]),

  thinkingKeywords: [
    "thinking",
    "processing",
    "loading",
    "analyzing",
    "generating",
    "waiting",
    "compiling",
  ],

  errorPatterns: [
    /Error[:!]/,
    /\bERROR\b/,
    /\bFAIL\b/,
    /\bfailed\b/i,
    /\bFATAL\b/i,
    /\bpanic\b/i,
    /ENOENT/,
    /EACCES/,
    /EPERM/,
    /ERR!/,
    /errno/i,
    /segmentation fault/i,
    /command not found/,
  ],

  stackTracePatterns: [
    /^\s+at\s+.+\(.+:\d+:\d+\)/m,   // Node/JS stack trace
    /Traceback \(most recent call last\)/,  // Python
    /^\s+File ".+", line \d+/m,       // Python stack frame
    /goroutine \d+ \[/,               // Go
  ],

  commandPatterns: [
    /^\+\s/m,             // set -x trace output
    /^>>>/m,              // shell heredoc / Python REPL active
  ],
};

// ── StatusDetector ───────────────────────────────────────────────────────────

export type StatusChangeCallback = (status: PtyStatus) => void;

export class StatusDetector {
  private config: StatusDetectorConfig;
  private currentStatus: PtyStatus = "running";
  private lastOutputTime = 0;
  private lastOutputLine = "";
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private onChange: StatusChangeCallback | null = null;

  constructor(config?: Partial<StatusDetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Register a callback invoked whenever the detected status changes.
   */
  onStatusChange(cb: StatusChangeCallback): void {
    this.onChange = cb;
  }

  /**
   * Feed new output data to the detector. Returns the detected status.
   */
  feed(data: string): PtyStatus {
    this.lastOutputTime = Date.now();
    this.resetIdleTimer();

    // Keep track of the last line for prompt detection
    const lines = data.split(/\r?\n/);
    const lastNonEmpty = lines.filter((l) => l.trim().length > 0).pop();
    if (lastNonEmpty !== undefined) {
      this.lastOutputLine = lastNonEmpty;
    }

    // Priority 1: error detection
    if (this.detectError(data)) {
      this.setStatus("error");
      return this.currentStatus;
    }

    // Priority 2: thinking / spinner detection
    if (this.detectThinking(data)) {
      this.setStatus("thinking");
      return this.currentStatus;
    }

    // Default: running (active output)
    this.setStatus("running");
    return this.currentStatus;
  }

  /**
   * Notify the detector of a process exit. Non-zero exit codes map to "error".
   */
  handleExit(exitCode: number): PtyStatus {
    this.clearIdleTimer();
    const status: PtyStatus = exitCode !== 0 ? "error" : "idle";
    this.setStatus(status);
    return this.currentStatus;
  }

  /**
   * Get the current detected status.
   */
  getStatus(): PtyStatus {
    return this.currentStatus;
  }

  /**
   * Clean up timers. Call when the session is destroyed.
   */
  dispose(): void {
    this.clearIdleTimer();
    this.onChange = null;
  }

  /**
   * Get the current configuration (useful for tests / inspection).
   */
  getConfig(): Readonly<StatusDetectorConfig> {
    return this.config;
  }

  // ── Detection heuristics ─────────────────────────────────────────────────

  private detectError(data: string): boolean {
    // Check error keyword patterns
    if (this.config.errorPatterns.some((re) => re.test(data))) {
      return true;
    }

    // Check stack trace patterns
    if (this.config.stackTracePatterns.some((re) => re.test(data))) {
      return true;
    }

    return false;
  }

  private detectThinking(data: string): boolean {
    const trimmed = data.trim();

    // Spinner character detection: short output consisting of spinner chars
    if (trimmed.length > 0 && trimmed.length <= 3) {
      const chars = Array.from(trimmed);
      if (chars.some((ch) => this.config.spinnerChars.has(ch))) {
        return true;
      }
    }

    // Keyword detection (case-insensitive)
    const lower = data.toLowerCase();
    if (this.config.thinkingKeywords.some((kw) => lower.includes(kw))) {
      return true;
    }

    return false;
  }

  private detectPrompt(): boolean {
    return this.config.promptPatterns.some((re) => re.test(this.lastOutputLine));
  }

  // ── Timer management ─────────────────────────────────────────────────────

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      // Only transition to idle if a prompt pattern is detected
      if (this.detectPrompt()) {
        this.setStatus("idle");
      }
      // If no prompt detected, stay in current status but keep checking
    }, this.config.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // ── Status transitions ───────────────────────────────────────────────────

  private setStatus(status: PtyStatus): void {
    if (status === this.currentStatus) return;
    this.currentStatus = status;
    if (this.onChange) {
      this.onChange(status);
    }
  }
}
