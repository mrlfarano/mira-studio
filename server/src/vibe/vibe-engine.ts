/**
 * VibeEngine -- computes a 0-100 "vibe score" from session energy metrics.
 *
 * Factors (weighted):
 *  - Error rate     (30%): ratio of error journal entries to total in last hour
 *  - Build success  (30%): ratio of non-error PTY exits to total exits
 *  - Session activity (20%): number of active PTY sessions
 *  - Time on task   (20%): penalises long sessions without breaks
 *
 * Persists daily snapshots to .mira/vibe-history.yml for sparkline display.
 */

import fs from "node:fs/promises"
import path from "node:path"
import yaml from "js-yaml"
import type { PtyManager } from "../pty/pty-manager.js"
import type { JournalEngine, JournalEntry } from "../journal/journal-engine.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VibeFactors {
  errorRate: number
  buildSuccess: number
  sessionActivity: number
  timeOnTask: number
}

export interface VibeScore {
  score: number
  factors: VibeFactors
}

export interface VibeHistoryEntry {
  date: string
  score: number
}

// ---------------------------------------------------------------------------
// VibeEngine
// ---------------------------------------------------------------------------

export class VibeEngine {
  private configDir: string
  private ptyManager: PtyManager
  private journalEngine: JournalEngine

  /** Timestamp of when the server / engine started (proxy for session start) */
  private sessionStartedAt: number = Date.now()

  constructor(
    configDir: string,
    ptyManager: PtyManager,
    journalEngine: JournalEngine,
  ) {
    this.configDir = configDir
    this.ptyManager = ptyManager
    this.journalEngine = journalEngine
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Compute the current vibe score and individual factors. */
  getScore(): VibeScore {
    const errorRate = this.computeErrorRate()
    const buildSuccess = this.computeBuildSuccess()
    const sessionActivity = this.computeSessionActivity()
    const timeOnTask = this.computeTimeOnTask()

    const score = Math.round(
      errorRate * 0.3 +
      buildSuccess * 0.3 +
      sessionActivity * 0.2 +
      timeOnTask * 0.2,
    )

    return {
      score: Math.max(0, Math.min(100, score)),
      factors: { errorRate, buildSuccess, sessionActivity, timeOnTask },
    }
  }

  /** Read persisted vibe history from .mira/vibe-history.yml. */
  async getHistory(): Promise<VibeHistoryEntry[]> {
    const filePath = this.getHistoryPath()
    try {
      const raw = await fs.readFile(filePath, "utf-8")
      const data = yaml.load(raw) as VibeHistoryEntry[] | null
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  /** Append (or update) today's score in vibe-history.yml. */
  async recordSnapshot(): Promise<void> {
    const { score } = this.getScore()
    const today = this.getDateString()
    const history = await this.getHistory()

    // Update today's entry if it exists, otherwise append
    const existing = history.find((h) => h.date === today)
    if (existing) {
      existing.score = score
    } else {
      history.push({ date: today, score })
    }

    // Keep at most 90 days
    const trimmed = history.slice(-90)

    const content = yaml.dump(trimmed, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    })

    await fs.mkdir(this.configDir, { recursive: true })
    await fs.writeFile(this.getHistoryPath(), content, "utf-8")
  }

  // -----------------------------------------------------------------------
  // Factor computations
  // -----------------------------------------------------------------------

  /**
   * Error rate (0-100): ratio of error entries in the last hour.
   * 0 errors = 100, 5+ errors = 0, linear between.
   */
  private computeErrorRate(): number {
    const entries = this.getRecentEntries(60)
    if (entries.length === 0) return 100

    const errorCount = entries.filter(
      (e) =>
        e.description.toLowerCase().includes("error") ||
        e.source === "error",
    ).length

    if (errorCount >= 5) return 0
    return Math.round(100 - (errorCount / 5) * 100)
  }

  /**
   * Build success (0-100): ratio of successful (non-error) PTY exits to total.
   * If no builds recorded, default to 70.
   */
  private computeBuildSuccess(): number {
    const entries = this.journalEngine.getTodayEntries()
    const exitEntries = entries.filter((e) =>
      e.description.includes("Terminal session ended"),
    )

    if (exitEntries.length === 0) return 70

    const errorExits = exitEntries.filter(
      (e) =>
        e.description.includes("exit code") &&
        !e.description.includes("exit code 0"),
    )

    const successRatio =
      (exitEntries.length - errorExits.length) / exitEntries.length
    return Math.round(successRatio * 100)
  }

  /**
   * Session activity (0-100): number of active PTY sessions.
   * 0 = 0, 1 = 50, 2+ = 100.
   */
  private computeSessionActivity(): number {
    const count = this.ptyManager.size
    if (count === 0) return 0
    if (count === 1) return 50
    return 100
  }

  /**
   * Time on task (0-100): penalises long sessions.
   * < 1hr = 100, 1-2hr = 70, 2-3hr = 40, 3+hr = 20.
   */
  private computeTimeOnTask(): number {
    const hours = (Date.now() - this.sessionStartedAt) / (1000 * 60 * 60)
    if (hours < 1) return 100
    if (hours < 2) return 70
    if (hours < 3) return 40
    return 20
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Get journal entries from the last N minutes. */
  private getRecentEntries(minutes: number): JournalEntry[] {
    const entries = this.journalEngine.getTodayEntries()
    const now = new Date()
    const cutoffMinutes =
      now.getHours() * 60 + now.getMinutes() - minutes

    return entries.filter((e) => {
      const [h, m] = e.timestamp.split(":").map(Number)
      const entryMinutes = h * 60 + m
      return entryMinutes >= cutoffMinutes
    })
  }

  private getHistoryPath(): string {
    return path.join(this.configDir, "vibe-history.yml")
  }

  private getDateString(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
}
