/**
 * ReplayEngine — records timestamped terminal output from PtyManager
 * and provides replay data for the Session Replay panel.
 *
 * Recordings are stored in memory per session. A configurable total size
 * cap (default 50 MB) auto-prunes the oldest sessions when exceeded.
 */

import type { PtyManager } from '../pty/pty-manager.js'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ReplayEntry {
  timestamp: number
  data: string
}

export interface RecordingMeta {
  sessionId: string
  startedAt: number
  duration: number
  entryCount: number
}

export interface Recording {
  entries: ReplayEntry[]
  startedAt: number
  duration: number
}

interface SessionRecording {
  entries: ReplayEntry[]
  startedAt: number
  sizeBytes: number
}

// ── ReplayEngine ────────────────────────────────────────────────────────────

const DEFAULT_MAX_TOTAL_BYTES = 50 * 1024 * 1024 // 50 MB

export class ReplayEngine {
  private recordings = new Map<string, SessionRecording>()
  private totalBytes = 0
  private readonly maxTotalBytes: number

  constructor(
    private readonly ptyManager: PtyManager,
    _configDir: string,
    maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
  ) {
    this.maxTotalBytes = maxTotalBytes
    this.attachListeners()
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** List metadata for all active recordings. */
  getRecordings(): RecordingMeta[] {
    const result: RecordingMeta[] = []
    for (const [sessionId, rec] of this.recordings) {
      const lastTs =
        rec.entries.length > 0
          ? rec.entries[rec.entries.length - 1].timestamp
          : rec.startedAt
      result.push({
        sessionId,
        startedAt: rec.startedAt,
        duration: lastTs - rec.startedAt,
        entryCount: rec.entries.length,
      })
    }
    return result
  }

  /** Get full recording data for a session. */
  getRecording(sessionId: string): Recording | null {
    const rec = this.recordings.get(sessionId)
    if (!rec) return null

    const lastTs =
      rec.entries.length > 0
        ? rec.entries[rec.entries.length - 1].timestamp
        : rec.startedAt

    return {
      entries: rec.entries,
      startedAt: rec.startedAt,
      duration: lastTs - rec.startedAt,
    }
  }

  /** Clear a single session's recording. */
  clearRecording(sessionId: string): void {
    const rec = this.recordings.get(sessionId)
    if (!rec) return
    this.totalBytes -= rec.sizeBytes
    this.recordings.delete(sessionId)
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private attachListeners(): void {
    this.ptyManager.on('output', (sessionId: string, data: string) => {
      this.recordEntry(sessionId, data)
    })
  }

  private recordEntry(sessionId: string, data: string): void {
    const now = Date.now()
    const entrySize = Buffer.byteLength(data, 'utf-8') + 16 // ~16 bytes overhead for timestamp + object

    let rec = this.recordings.get(sessionId)
    if (!rec) {
      rec = { entries: [], startedAt: now, sizeBytes: 0 }
      this.recordings.set(sessionId, rec)
    }

    rec.entries.push({ timestamp: now, data })
    rec.sizeBytes += entrySize
    this.totalBytes += entrySize

    // Auto-prune oldest sessions if we exceed the cap
    this.pruneIfNeeded(sessionId)
  }

  private pruneIfNeeded(currentSessionId: string): void {
    while (this.totalBytes > this.maxTotalBytes && this.recordings.size > 1) {
      // Find the oldest session that is not the current one
      let oldestId: string | null = null
      let oldestStart = Infinity

      for (const [id, rec] of this.recordings) {
        if (id !== currentSessionId && rec.startedAt < oldestStart) {
          oldestStart = rec.startedAt
          oldestId = id
        }
      }

      if (!oldestId) break
      this.clearRecording(oldestId)
    }
  }
}
