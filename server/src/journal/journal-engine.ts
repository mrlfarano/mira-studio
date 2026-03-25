/**
 * JournalEngine -- auto-generates timestamped build journal entries.
 *
 * Listens to:
 *  - PTY session start / stop (via PtyManager events)
 *  - Config changes (via ConfigEngine "config:changed")
 *  - Kanban card moves (via external `logKanbanMove` calls)
 *
 * Writes entries to .mira/journals/YYYY-MM-DD.md in the format:
 *   [HH:MM] [source] description
 *
 * Provides a daily summary generation method that compiles key events
 * into a summary paragraph at session end.
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import type { PtyManager } from "../pty/pty-manager.js";
import type { ConfigEngine } from "../config/config-engine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JournalEntry {
  timestamp: string; // HH:MM
  source: string;    // e.g. "pty", "config", "kanban", "system"
  description: string;
}

// ---------------------------------------------------------------------------
// JournalEngine
// ---------------------------------------------------------------------------

export class JournalEngine extends EventEmitter {
  private projectRoot: string;
  private todayEntries: JournalEntry[] = [];
  private currentDate: string = "";

  constructor(projectRoot: string) {
    super();
    this.projectRoot = projectRoot;
    this.currentDate = this.getDateString();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Absolute path to the journals directory */
  getJournalsDir(): string {
    return path.join(this.projectRoot, ".mira", "journals");
  }

  /**
   * Initialise the engine: ensure journals directory exists, wire up
   * event listeners on PtyManager and ConfigEngine.
   */
  async init(
    ptyManager: PtyManager,
    configEngine: ConfigEngine,
  ): Promise<void> {
    await fs.mkdir(this.getJournalsDir(), { recursive: true });

    // Load any existing entries for today
    await this.loadTodayEntries();

    // Listen to PTY events
    // Listen to PTY status events — currently a no-op as session
    // start/stop is handled via spawn monkey-patch and exit listener.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ptyManager.on("status", (..._args: unknown[]) => { /* no-op */ });

    // Session spawned
    const originalSpawn = ptyManager.spawn.bind(ptyManager);
    ptyManager.spawn = (id?: string, shell?: string, cols?: number, rows?: number): string => {
      const sessionId = originalSpawn(id, shell, cols, rows);
      this.addEntry("pty", `Terminal session started: ${sessionId.slice(0, 8)}`);
      return sessionId;
    };

    // Session exited
    ptyManager.on("exit", (sessionId: string, exitCode: number | undefined, signal: number | undefined) => {
      const exitInfo = exitCode !== undefined ? `exit code ${exitCode}` : `signal ${signal}`;
      this.addEntry("pty", `Terminal session ended (${sessionId.slice(0, 8)}): ${exitInfo}`);
    });

    // Config changes
    configEngine.on("config:changed", ({ filePath }: { filePath: string }) => {
      const relative = path.relative(
        path.join(this.projectRoot, ".mira"),
        filePath,
      );
      this.addEntry("config", `Configuration updated: ${relative}`);
    });
  }

  /**
   * Log a kanban card move. Called externally by kanban-related code.
   */
  logKanbanMove(cardTitle: string, fromColumn: string, toColumn: string): void {
    this.addEntry(
      "kanban",
      `Card "${cardTitle}" moved: ${fromColumn} -> ${toColumn}`,
    );
  }

  /**
   * Add a journal entry and persist it to disk.
   */
  async addEntry(source: string, description: string): Promise<void> {
    this.rollDateIfNeeded();

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const entry: JournalEntry = { timestamp, source, description };
    this.todayEntries.push(entry);

    const line = `[${timestamp}] [${source}] ${description}\n`;

    try {
      await fs.mkdir(this.getJournalsDir(), { recursive: true });
      await fs.appendFile(this.getTodayFilePath(), line, "utf-8");
      this.emit("entry", entry);
    } catch (err) {
      this.emit("error", err);
    }
  }

  /**
   * Get all entries for today (from memory).
   */
  getTodayEntries(): JournalEntry[] {
    this.rollDateIfNeeded();
    return [...this.todayEntries];
  }

  /**
   * List all journal files (date strings).
   */
  async listJournalDates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.getJournalsDir());
      return files
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(".md", ""))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * Read the raw content of a specific date's journal.
   */
  async getJournalByDate(date: string): Promise<string | null> {
    const filePath = path.join(this.getJournalsDir(), `${date}.md`);
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Parse a journal file into structured entries.
   */
  parseJournalContent(content: string): JournalEntry[] {
    const entryPattern = /^\[(\d{2}:\d{2})\] \[(\w+)\] (.+)$/;
    const entries: JournalEntry[] = [];

    for (const line of content.split("\n")) {
      const match = entryPattern.exec(line.trim());
      if (match) {
        entries.push({
          timestamp: match[1],
          source: match[2],
          description: match[3],
        });
      }
    }
    return entries;
  }

  /**
   * Generate a daily summary paragraph from the day's entries.
   * Called at session end to compile key events.
   */
  async generateDailySummary(date?: string): Promise<string> {
    const targetDate = date ?? this.currentDate;
    let entries: JournalEntry[];

    if (targetDate === this.currentDate) {
      entries = this.todayEntries;
    } else {
      const content = await this.getJournalByDate(targetDate);
      if (!content) return "No journal entries for this date.";
      entries = this.parseJournalContent(content);
    }

    if (entries.length === 0) {
      return "No journal entries for this date.";
    }

    // Tally events by source
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    }

    // Build summary parts
    const parts: string[] = [];
    const first = entries[0];
    const last = entries[entries.length - 1];

    parts.push(`Session ran from ${first.timestamp} to ${last.timestamp} with ${entries.length} total events.`);

    if (counts.pty) {
      parts.push(`${counts.pty} terminal event${counts.pty > 1 ? "s" : ""} recorded.`);
    }
    if (counts.config) {
      parts.push(`${counts.config} configuration change${counts.config > 1 ? "s" : ""} detected.`);
    }
    if (counts.kanban) {
      parts.push(`${counts.kanban} kanban card movement${counts.kanban > 1 ? "s" : ""} tracked.`);
    }

    // Highlight any errors from PTY
    const errorEntries = entries.filter(
      (e) => e.description.toLowerCase().includes("error") || e.description.includes("exit code")
    );
    if (errorEntries.length > 0) {
      parts.push(`Notable: ${errorEntries.length} event${errorEntries.length > 1 ? "s" : ""} may require attention.`);
    }

    const summary = parts.join(" ");

    // Append summary to the journal file
    const summaryBlock = `\n---\n**Daily Summary:** ${summary}\n`;
    try {
      const filePath = path.join(this.getJournalsDir(), `${targetDate}.md`);
      await fs.appendFile(filePath, summaryBlock, "utf-8");
    } catch (err) {
      this.emit("error", err);
    }

    return summary;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private getDateString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  private getTodayFilePath(): string {
    return path.join(this.getJournalsDir(), `${this.currentDate}.md`);
  }

  /** If the date has rolled over, reset in-memory entries. */
  private rollDateIfNeeded(): void {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.todayEntries = [];
      this.currentDate = today;
    }
  }

  /** Load existing entries for today from disk (if any). */
  private async loadTodayEntries(): Promise<void> {
    const content = await this.getJournalByDate(this.currentDate);
    if (content) {
      this.todayEntries = this.parseJournalContent(content);
    }
  }
}
