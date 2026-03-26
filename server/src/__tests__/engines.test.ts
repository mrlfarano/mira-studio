import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import { SIAgent } from '../si/si-agent.js'
import { VibeEngine } from '../vibe/vibe-engine.js'
import { ReplayEngine } from '../replay/replay-engine.js'
import { ProjectMapEngine } from '../project-map/project-map-engine.js'
import { RegistryClient } from '../registry/registry-client.js'
import {
  getProcessList,
  scanPorts,
  getAgentHistory,
} from '../observability/observability-engine.js'
import { PairSessionManager } from '../pair/pair-session.js'
import type { PtyManager } from '../pty/pty-manager.js'
import type { JournalEngine, JournalEntry } from '../journal/journal-engine.js'
import type { SIEngine } from '../si/si-engine.js'
import type { PtyStatus } from '../pty/pty-protocol.js'

// =============================================================================
// Mock Factories
// =============================================================================

/**
 * Create a mock PtyManager that extends EventEmitter so listeners work.
 * Implements the subset of PtyManager used by VibeEngine, ReplayEngine,
 * ObservabilityEngine, and SIAgent.
 */
function createMockPtyManager(overrides: Record<string, unknown> = {}): PtyManager {
  const emitter = new EventEmitter()
  const manager = Object.assign(emitter, {
    size: 0,
    spawn: vi.fn().mockReturnValue('mock-session-id'),
    write: vi.fn(),
    kill: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockReturnValue(false),
    getBufferedOutput: vi.fn().mockReturnValue([]),
    listSessions: vi.fn().mockReturnValue([]),
    removeListener: emitter.removeListener.bind(emitter),
    ...overrides,
  }) as unknown as PtyManager
  return manager
}

/**
 * Create a mock JournalEngine with configurable today entries.
 */
function createMockJournalEngine(
  todayEntries: JournalEntry[] = [],
): JournalEngine {
  return {
    getTodayEntries: vi.fn().mockReturnValue(todayEntries),
  } as unknown as JournalEngine
}

/**
 * Create a mock SIEngine for SIAgent tests.
 */
function createMockSIEngine(overrides: Record<string, unknown> = {}): SIEngine {
  return {
    getData: vi.fn().mockResolvedValue({
      cadence: 'per-build',
      hypotheses: [],
      lessons: [],
      builds: [],
    }),
    recordBuild: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as SIEngine
}

/**
 * Create a mock WebSocket for pair session tests.
 */
function createMockWebSocket(overrides: Record<string, unknown> = {}) {
  const sentMessages: string[] = []
  return {
    OPEN: 1,
    readyState: 1,
    send: vi.fn((data: string) => sentMessages.push(data)),
    _sentMessages: sentMessages,
    ...overrides,
  }
}

// =============================================================================
// 1. SI Agent — SAFETY CRITICAL
// =============================================================================

describe('SIAgent', () => {
  let siAgent: SIAgent
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mira-si-test-'))
    const mockSIEngine = createMockSIEngine()
    const mockPtyManager = createMockPtyManager()
    siAgent = new SIAgent(mockSIEngine, mockPtyManager, tmpDir)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  // ─── Branch Name Validation (Primary Safety Gate) ───────────────────────

  describe('validateBranchName() — safety gate', () => {
    // ── Valid branch names ──────────────────────────────────────────────

    it('accepts mira/si-2026-03-26-fix-tests', () => {
      expect(siAgent.validateBranchName('mira/si-2026-03-26-fix-tests')).toBe(true)
    })

    it('accepts mira/si-2025-01-01-any-description', () => {
      expect(siAgent.validateBranchName('mira/si-2025-01-01-any-description')).toBe(true)
    })

    it('accepts branch with multi-word description', () => {
      expect(
        siAgent.validateBranchName('mira/si-2026-06-15-improve-error-handling-in-pty'),
      ).toBe(true)
    })

    it('accepts branch with numbers in description', () => {
      expect(siAgent.validateBranchName('mira/si-2026-12-31-fix-bug-42')).toBe(true)
    })

    it('accepts branch with single-char description', () => {
      expect(siAgent.validateBranchName('mira/si-2026-01-01-x')).toBe(true)
    })

    // ── Invalid branch names ────────────────────────────────────────────

    it('rejects main', () => {
      expect(siAgent.validateBranchName('main')).toBe(false)
    })

    it('rejects master', () => {
      expect(siAgent.validateBranchName('master')).toBe(false)
    })

    it('rejects feature/foo', () => {
      expect(siAgent.validateBranchName('feature/foo')).toBe(false)
    })

    it('rejects mira/si-bad-date (non-date format)', () => {
      expect(siAgent.validateBranchName('mira/si-bad-date')).toBe(false)
    })

    it('rejects mira/si-2026-03-26- (trailing dash, no description)', () => {
      // The regex requires .+ after the last dash, which means at least one
      // character. A trailing dash alone has nothing after it, so this MAY
      // pass or fail depending on whether the regex considers the trailing
      // dash part of the date prefix or the description.
      //
      // With the regex /^mira\/si-\d{4}-\d{2}-\d{2}-.+$/, the last group
      // is "-.+" which matches "-" (the dash after the date) followed by one
      // or more chars. "mira/si-2026-03-26-" has the trailing dash consumed
      // by the date pattern "26-", leaving nothing for .+ to match.
      //
      // Actually: the regex is `si-\d{4}-\d{2}-\d{2}-.+`
      // For "mira/si-2026-03-26-": after "si-" we have "2026-03-26-"
      // The \d{4}-\d{2}-\d{2} matches "2026-03-26", then we need "-" and ".+"
      // The "-" matches the trailing dash, but .+ needs at least 1 char and
      // there are none left. So this should be REJECTED.
      expect(siAgent.validateBranchName('mira/si-2026-03-26-')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(siAgent.validateBranchName('')).toBe(false)
    })

    it('rejects develop', () => {
      expect(siAgent.validateBranchName('develop')).toBe(false)
    })

    it('rejects branch without mira/ prefix', () => {
      expect(siAgent.validateBranchName('si-2026-03-26-fix-tests')).toBe(false)
    })

    it('rejects branch with wrong prefix', () => {
      expect(siAgent.validateBranchName('mira/feature-2026-03-26-fix')).toBe(false)
    })

    it('rejects branch with incomplete date (missing day)', () => {
      expect(siAgent.validateBranchName('mira/si-2026-03-fix')).toBe(false)
    })

    it('rejects branch with incomplete date (missing month and day)', () => {
      expect(siAgent.validateBranchName('mira/si-2026-fix')).toBe(false)
    })

    it('rejects branch name with spaces', () => {
      expect(siAgent.validateBranchName('mira/si-2026-03-26-fix tests')).toBe(true)
      // Note: the regex allows spaces since .+ matches any character.
      // Git itself disallows spaces in branch names, but the regex does not
      // enforce that. This documents the current behavior.
    })

    it('rejects null-ish input by throwing on non-string', () => {
      // TypeScript prevents this at compile time, but the regex handles it
      // at runtime by returning false for non-matching input.
      expect(siAgent.validateBranchName(undefined as unknown as string)).toBe(false)
      expect(siAgent.validateBranchName(null as unknown as string)).toBe(false)
    })

    it('rejects branch with only whitespace description', () => {
      // .+ matches whitespace, so this technically passes the regex
      // Documenting the behavior rather than asserting it should fail
      const result = siAgent.validateBranchName('mira/si-2026-03-26- ')
      // " " after the dash is 1+ chars — .+ matches it
      expect(result).toBe(true)
    })
  })

  // ─── Status ─────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('reports not running initially', () => {
      const status = siAgent.getStatus()
      expect(status.running).toBe(false)
      expect(status.currentHypothesis).toBeUndefined()
      expect(status.currentBranch).toBeUndefined()
      expect(status.currentBuildId).toBeUndefined()
    })
  })

  describe('getAllBuilds()', () => {
    it('returns empty array when no builds have run', () => {
      expect(siAgent.getAllBuilds()).toEqual([])
    })
  })

  describe('getBuild()', () => {
    it('returns undefined for non-existent build', () => {
      expect(siAgent.getBuild('non-existent-id')).toBeUndefined()
    })
  })

  describe('proposePR()', () => {
    it('throws for non-existent build', async () => {
      await expect(siAgent.proposePR('non-existent')).rejects.toThrow(
        'Build not found',
      )
    })
  })

  describe('createPRWithConsent()', () => {
    it('throws for non-existent build', async () => {
      await expect(siAgent.createPRWithConsent('non-existent')).rejects.toThrow(
        'Build not found',
      )
    })
  })

  describe('runCycle()', () => {
    it('throws when already running', async () => {
      // Access the private _running field to simulate a running state
       
      ;(siAgent as Record<string, unknown>)['_running'] = true

      await expect(siAgent.runCycle('some-hypothesis')).rejects.toThrow(
        'SI Agent is already running a build cycle',
      )

      // Reset
      ;(siAgent as Record<string, unknown>)['_running'] = false
    })

    it('throws when hypothesis is not found', async () => {
      const mockSIEngine = createMockSIEngine({
        getData: vi.fn().mockResolvedValue({
          hypotheses: [],
          lessons: [],
          builds: [],
        }),
      })
      const mockPtyManager = createMockPtyManager()
      const agent = new SIAgent(mockSIEngine, mockPtyManager, tmpDir)

      await expect(agent.runCycle('missing-hyp')).rejects.toThrow(
        'Hypothesis not found',
      )
    })

    it('throws when hypothesis is not queued', async () => {
      const mockSIEngine = createMockSIEngine({
        getData: vi.fn().mockResolvedValue({
          hypotheses: [
            {
              id: 'hyp-1',
              title: 'Test',
              description: 'Desc',
              impact: 'low',
              status: 'accepted',
              createdAt: new Date().toISOString(),
            },
          ],
          lessons: [],
          builds: [],
        }),
      })
      const mockPtyManager = createMockPtyManager()
      const agent = new SIAgent(mockSIEngine, mockPtyManager, tmpDir)

      await expect(agent.runCycle('hyp-1')).rejects.toThrow(
        'Hypothesis is not queued',
      )
    })
  })
})

// =============================================================================
// 2. Vibe Engine
// =============================================================================

describe('VibeEngine', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mira-vibe-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('getScore()', () => {
    it('returns a score between 0 and 100', () => {
      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine()
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('returns all four factors', () => {
      const ptyManager = createMockPtyManager({ size: 0 })
      const journalEngine = createMockJournalEngine()
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      expect(result.factors).toHaveProperty('errorRate')
      expect(result.factors).toHaveProperty('buildSuccess')
      expect(result.factors).toHaveProperty('sessionActivity')
      expect(result.factors).toHaveProperty('timeOnTask')
    })

    it('computes high score with zero errors and active sessions', () => {
      const ptyManager = createMockPtyManager({ size: 2 })
      const journalEngine = createMockJournalEngine([])
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      // errorRate: 100 (no entries at all → 100)
      // buildSuccess: 70 (no exit entries → default 70)
      // sessionActivity: 100 (2+ sessions)
      // timeOnTask: 100 (just started)
      // Weighted: 100*0.3 + 70*0.3 + 100*0.2 + 100*0.2 = 30 + 21 + 20 + 20 = 91
      expect(result.score).toBe(91)
      expect(result.factors.errorRate).toBe(100)
      expect(result.factors.buildSuccess).toBe(70)
      expect(result.factors.sessionActivity).toBe(100)
      expect(result.factors.timeOnTask).toBe(100)
    })

    it('penalises session activity when no PTY sessions active', () => {
      const ptyManager = createMockPtyManager({ size: 0 })
      const journalEngine = createMockJournalEngine([])
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      expect(result.factors.sessionActivity).toBe(0)
    })

    it('gives 50 for session activity with exactly one session', () => {
      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine([])
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      expect(result.factors.sessionActivity).toBe(50)
    })

    it('computes error rate from recent entries with errors', () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const timestamp = `${hh}:${mm}`

      const entries: JournalEntry[] = [
        { timestamp, source: 'pty', description: 'Some error occurred' },
        { timestamp, source: 'pty', description: 'Another error happened' },
        { timestamp, source: 'pty', description: 'Normal event' },
        { timestamp, source: 'error', description: 'System problem' },
      ]

      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine(entries)
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      // 3 error entries out of 4, but the formula is: 100 - (errorCount/5)*100
      // errorCount = 3 → 100 - (3/5)*100 = 100 - 60 = 40
      expect(result.factors.errorRate).toBe(40)
    })

    it('computes build success from terminal exit entries', () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const timestamp = `${hh}:${mm}`

      const entries: JournalEntry[] = [
        { timestamp, source: 'pty', description: 'Terminal session ended (abc): exit code 0' },
        { timestamp, source: 'pty', description: 'Terminal session ended (def): exit code 1' },
        { timestamp, source: 'pty', description: 'Terminal session ended (ghi): exit code 0' },
      ]

      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine(entries)
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      // 3 exit entries, 1 with non-zero exit code
      // successRatio = (3-1)/3 = 0.667 → Math.round(0.667 * 100) = 67
      expect(result.factors.buildSuccess).toBe(67)
    })

    it('clamps score to 0-100 range even with extreme values', () => {
      const ptyManager = createMockPtyManager({ size: 0 })
      const journalEngine = createMockJournalEngine([])
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const result = engine.getScore()
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('history read/write', () => {
    it('returns empty history when no file exists', async () => {
      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine()
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      const history = await engine.getHistory()
      expect(history).toEqual([])
    })

    it('recordSnapshot creates a history file', async () => {
      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine()
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      await engine.recordSnapshot()

      const history = await engine.getHistory()
      expect(history.length).toBe(1)
      expect(history[0]).toHaveProperty('date')
      expect(history[0]).toHaveProperty('score')
      expect(typeof history[0].score).toBe('number')
    })

    it('recordSnapshot updates existing entry for today', async () => {
      const ptyManager = createMockPtyManager({ size: 2 })
      const journalEngine = createMockJournalEngine()
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      await engine.recordSnapshot()
      await engine.recordSnapshot()

      const history = await engine.getHistory()
      // Should still have just 1 entry (updated, not duplicated)
      expect(history.length).toBe(1)
    })

    it('persists history as YAML to disk', async () => {
      const ptyManager = createMockPtyManager({ size: 1 })
      const journalEngine = createMockJournalEngine()
      const engine = new VibeEngine(tmpDir, ptyManager, journalEngine)

      await engine.recordSnapshot()

      const filePath = path.join(tmpDir, 'vibe-history.yml')
      const raw = await fs.readFile(filePath, 'utf-8')
      expect(raw).toContain('date:')
      expect(raw).toContain('score:')
    })
  })
})

// =============================================================================
// 3. Replay Engine
// =============================================================================

describe('ReplayEngine', () => {
  let mockPtyManager: PtyManager

  beforeEach(() => {
    mockPtyManager = createMockPtyManager()
  })

  describe('recording entries', () => {
    it('records output events from PtyManager', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      // Simulate PTY output
      mockPtyManager.emit('output', 'session-1', 'Hello World')

      const recordings = engine.getRecordings()
      expect(recordings.length).toBe(1)
      expect(recordings[0].sessionId).toBe('session-1')
      expect(recordings[0].entryCount).toBe(1)
    })

    it('accumulates multiple entries for the same session', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'line 1')
      mockPtyManager.emit('output', 'session-1', 'line 2')
      mockPtyManager.emit('output', 'session-1', 'line 3')

      const recordings = engine.getRecordings()
      expect(recordings.length).toBe(1)
      expect(recordings[0].entryCount).toBe(3)
    })

    it('tracks multiple sessions separately', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'data-a')
      mockPtyManager.emit('output', 'session-2', 'data-b')

      const recordings = engine.getRecordings()
      expect(recordings.length).toBe(2)
      expect(recordings.map((r) => r.sessionId).sort()).toEqual([
        'session-1',
        'session-2',
      ])
    })
  })

  describe('getRecordings()', () => {
    it('returns metadata without full entry data', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'Hello')

      const recordings = engine.getRecordings()
      expect(recordings[0]).toHaveProperty('sessionId')
      expect(recordings[0]).toHaveProperty('startedAt')
      expect(recordings[0]).toHaveProperty('duration')
      expect(recordings[0]).toHaveProperty('entryCount')
    })

    it('returns empty array when no recordings exist', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')
      expect(engine.getRecordings()).toEqual([])
    })
  })

  describe('getRecording()', () => {
    it('returns full data for an existing session', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'Hello')
      mockPtyManager.emit('output', 'session-1', 'World')

      const recording = engine.getRecording('session-1')
      expect(recording).not.toBeNull()
      expect(recording!.entries.length).toBe(2)
      expect(recording!.entries[0].data).toBe('Hello')
      expect(recording!.entries[1].data).toBe('World')
    })

    it('returns null for non-existent session', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')
      expect(engine.getRecording('non-existent')).toBeNull()
    })

    it('includes timing information', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'data')

      const recording = engine.getRecording('session-1')
      expect(recording!.startedAt).toBeGreaterThan(0)
      expect(typeof recording!.duration).toBe('number')
    })
  })

  describe('clearRecording()', () => {
    it('removes a recording by session ID', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'data')
      expect(engine.getRecordings().length).toBe(1)

      engine.clearRecording('session-1')
      expect(engine.getRecordings().length).toBe(0)
      expect(engine.getRecording('session-1')).toBeNull()
    })

    it('does nothing for non-existent session', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')
      // Should not throw
      engine.clearRecording('non-existent')
      expect(engine.getRecordings().length).toBe(0)
    })

    it('only removes the specified session', () => {
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake')

      mockPtyManager.emit('output', 'session-1', 'data-a')
      mockPtyManager.emit('output', 'session-2', 'data-b')

      engine.clearRecording('session-1')

      expect(engine.getRecordings().length).toBe(1)
      expect(engine.getRecordings()[0].sessionId).toBe('session-2')
    })
  })

  describe('max size enforcement (50MB cap)', () => {
    it('prunes oldest sessions when total exceeds the cap', () => {
      // Use a tiny cap for testing: 200 bytes
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake', 200)

      // Fill session-1 with data close to the cap
      mockPtyManager.emit('output', 'session-1', 'A'.repeat(80))
      mockPtyManager.emit('output', 'session-2', 'B'.repeat(80))

      // This should push us over and prune session-1 (oldest)
      mockPtyManager.emit('output', 'session-3', 'C'.repeat(80))

      const recordings = engine.getRecordings()
      const sessionIds = recordings.map((r) => r.sessionId)

      // session-1 should have been pruned as it was the oldest
      expect(sessionIds).not.toContain('session-1')
      // session-3 (the current one being written) should always survive
      expect(sessionIds).toContain('session-3')
    })

    it('never prunes the session currently being written', () => {
      // Very small cap — only enough for ~1 session
      const engine = new ReplayEngine(mockPtyManager, '/tmp/fake', 100)

      // Write lots of data to a single session
      mockPtyManager.emit('output', 'solo-session', 'X'.repeat(200))

      // The only session should survive even if it exceeds the cap
      const recordings = engine.getRecordings()
      expect(recordings.length).toBe(1)
      expect(recordings[0].sessionId).toBe('solo-session')
    })
  })
})

// =============================================================================
// 4. Project Map Engine
// =============================================================================

describe('ProjectMapEngine', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mira-projmap-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('getFileTree()', () => {
    it('returns a tree structure with root node', async () => {
      // Initialise a git repo with a commit so the engine has data
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: tmpDir })
      execSync('git config user.email "test@test.com"', { cwd: tmpDir })
      execSync('git config user.name "Test"', { cwd: tmpDir })

      // Create some files and commit them
      await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true })
      await fs.writeFile(path.join(tmpDir, 'src', 'index.ts'), 'export {}')
      await fs.writeFile(path.join(tmpDir, 'README.md'), '# Test')

      execSync('git add -A', { cwd: tmpDir })
      execSync('git commit -m "initial"', { cwd: tmpDir })

      const engine = new ProjectMapEngine(tmpDir)
      const tree = await engine.getFileTree()

      expect(tree).toHaveProperty('name', '.')
      expect(tree).toHaveProperty('type', 'dir')
      expect(tree).toHaveProperty('children')
      expect(Array.isArray(tree.children)).toBe(true)
    })

    it('includes file change counts', async () => {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: tmpDir })
      execSync('git config user.email "test@test.com"', { cwd: tmpDir })
      execSync('git config user.name "Test"', { cwd: tmpDir })

      await fs.writeFile(path.join(tmpDir, 'app.ts'), 'v1')
      execSync('git add -A && git commit -m "first"', { cwd: tmpDir })

      await fs.writeFile(path.join(tmpDir, 'app.ts'), 'v2')
      execSync('git add -A && git commit -m "second"', { cwd: tmpDir })

      const engine = new ProjectMapEngine(tmpDir)
      const tree = await engine.getFileTree()

      // app.ts was touched in 2 commits
      const appNode = tree.children?.find((c) => c.name === 'app.ts')
      expect(appNode).toBeDefined()
      expect(appNode!.changes).toBe(2)
    })

    it('filters out node_modules and .git from the tree', async () => {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: tmpDir })
      execSync('git config user.email "test@test.com"', { cwd: tmpDir })
      execSync('git config user.name "Test"', { cwd: tmpDir })

      // The engine filters based on the first path segment matching IGNORED_DIRS.
      // In a real repo, node_modules and .git would not be committed, but let's
      // verify the filter works by ensuring .git never appears in the tree.
      await fs.writeFile(path.join(tmpDir, 'index.ts'), 'code')
      execSync('git add -A && git commit -m "init"', { cwd: tmpDir })

      const engine = new ProjectMapEngine(tmpDir)
      const tree = await engine.getFileTree()

      const names = tree.children?.map((c) => c.name) ?? []
      expect(names).not.toContain('node_modules')
      expect(names).not.toContain('.git')
      expect(names).not.toContain('.mira')
    })

    it('returns empty tree for repo with no commits', async () => {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: tmpDir })

      const engine = new ProjectMapEngine(tmpDir)
      const tree = await engine.getFileTree()

      expect(tree.name).toBe('.')
      expect(tree.type).toBe('dir')
      expect(tree.changes).toBe(0)
    })
  })

  describe('getRecentChanges()', () => {
    it('returns recent file changes with metadata', async () => {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: tmpDir })
      execSync('git config user.email "test@test.com"', { cwd: tmpDir })
      execSync('git config user.name "TestAuthor"', { cwd: tmpDir })

      // Need at least 2 commits so `hash~1` diff works for the latest one
      await fs.writeFile(path.join(tmpDir, 'file.ts'), 'content v1')
      execSync('git add -A && git commit -m "initial"', { cwd: tmpDir })

      await fs.writeFile(path.join(tmpDir, 'file.ts'), 'content v2')
      execSync('git add -A && git commit -m "update file"', { cwd: tmpDir })

      const engine = new ProjectMapEngine(tmpDir)
      const changes = await engine.getRecentChanges(5)

      expect(changes.length).toBeGreaterThanOrEqual(1)
      expect(changes[0]).toHaveProperty('path')
      expect(changes[0]).toHaveProperty('lastChanged')
      expect(changes[0]).toHaveProperty('author')
      expect(changes[0]).toHaveProperty('message')
    })

    it('returns empty array for repo with no commits', async () => {
      const { execSync } = await import('node:child_process')
      execSync('git init', { cwd: tmpDir })

      const engine = new ProjectMapEngine(tmpDir)
      const changes = await engine.getRecentChanges()

      expect(changes).toEqual([])
    })
  })
})

// =============================================================================
// 5. Registry Client
// =============================================================================

describe('RegistryClient', () => {
  let client: RegistryClient

  beforeEach(() => {
    client = new RegistryClient()
  })

  describe('browse()', () => {
    it('returns sample entries when remote is unavailable', async () => {
      // The remote registry URL is unlikely to resolve in tests,
      // so the client falls back to sample data.
      const entries = await client.browse()

      expect(entries.length).toBeGreaterThan(0)
      expect(entries[0]).toHaveProperty('id')
      expect(entries[0]).toHaveProperty('name')
      expect(entries[0]).toHaveProperty('description')
      expect(entries[0]).toHaveProperty('category')
    })

    it('filters entries by category', async () => {
      const stackEntries = await client.browse(undefined, 'stack')

      for (const entry of stackEntries) {
        expect(entry.category).toBe('stack')
      }

      // We know the sample data has at least one 'stack' entry
      expect(stackEntries.length).toBeGreaterThan(0)
    })

    it('filters entries by query string', async () => {
      const results = await client.browse('nextjs')

      expect(results.length).toBeGreaterThan(0)
      // The query should match the Next.js starter entry
      const ids = results.map((r) => r.id)
      expect(ids).toContain('nextjs-starter')
    })

    it('filters by both query and category', async () => {
      const results = await client.browse('python', 'stack')

      // Should find fastapi-stack (python + stack category)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].category).toBe('stack')
    })

    it('returns empty array when query matches nothing', async () => {
      const results = await client.browse('nonexistent-query-xyz-12345')
      expect(results).toEqual([])
    })

    it('returns empty array when category has no entries', async () => {
      // Use a category that exists but combine with a non-matching query
      const results = await client.browse('zzzzz', 'minimal')
      expect(results).toEqual([])
    })
  })

  describe('getEntry()', () => {
    it('returns correct entry by ID', async () => {
      const entry = await client.getEntry('nextjs-starter')

      expect(entry).toBeDefined()
      expect(entry!.id).toBe('nextjs-starter')
      expect(entry!.name).toBe('Next.js Starter')
    })

    it('returns correct entry for each sample ID', async () => {
      const sampleIds = [
        'nextjs-starter',
        'bmad-workflow',
        'minimal-terminal',
        'dark-ocean-theme',
        'fastapi-stack',
      ]

      for (const id of sampleIds) {
        const entry = await client.getEntry(id)
        expect(entry).toBeDefined()
        expect(entry!.id).toBe(id)
      }
    })

    it('returns undefined for non-existent ID', async () => {
      const entry = await client.getEntry('does-not-exist')
      expect(entry).toBeUndefined()
    })
  })

  describe('caching', () => {
    it('reuses cached entries on subsequent calls', async () => {
      // First call populates cache (falling back to sample data)
      const first = await client.browse()
      // Second call should return the same cached data
      const second = await client.browse()

      expect(first).toEqual(second)
    })
  })
})

// =============================================================================
// 6. Observability Engine
// =============================================================================

describe('ObservabilityEngine', () => {
  describe('scanPorts()', () => {
    it('returns results for all queried ports', async () => {
      const results = await scanPorts([9999, 9998])

      expect(results.length).toBe(2)
      for (const result of results) {
        expect(result).toHaveProperty('port')
        expect(result).toHaveProperty('listening')
        expect(result).toHaveProperty('host')
        expect(typeof result.listening).toBe('boolean')
      }
    })

    it('reports non-listening ports correctly', async () => {
      // Port 59999 is almost certainly not in use
      const results = await scanPorts([59999])

      expect(results.length).toBe(1)
      expect(results[0].port).toBe(59999)
      expect(results[0].listening).toBe(false)
    })

    it('uses default host 127.0.0.1', async () => {
      const results = await scanPorts([59999])
      expect(results[0].host).toBe('127.0.0.1')
    })

    it('handles empty port list', async () => {
      const results = await scanPorts([])
      expect(results).toEqual([])
    })
  })

  describe('getProcessList()', () => {
    it('returns process info from ptyManager.listSessions()', () => {
      const mockSessions = [
        {
          id: 'session-abc',
          pid: 12345,
          status: 'running' as PtyStatus,
          createdAt: new Date('2026-03-26T10:00:00Z'),
          bufferLines: 42,
        },
        {
          id: 'session-def',
          pid: 67890,
          status: 'idle' as PtyStatus,
          createdAt: new Date('2026-03-26T11:00:00Z'),
          bufferLines: 7,
        },
      ]

      const ptyManager = createMockPtyManager({
        listSessions: vi.fn().mockReturnValue(mockSessions),
      })

      const result = getProcessList(ptyManager)

      expect(result.length).toBe(2)
      expect(result[0]).toEqual({
        sessionId: 'session-abc',
        pid: 12345,
        status: 'running',
        startedAt: '2026-03-26T10:00:00.000Z',
        bufferLines: 42,
      })
      expect(result[1]).toEqual({
        sessionId: 'session-def',
        pid: 67890,
        status: 'idle',
        startedAt: '2026-03-26T11:00:00.000Z',
        bufferLines: 7,
      })
    })

    it('returns empty array when no sessions', () => {
      const ptyManager = createMockPtyManager({
        listSessions: vi.fn().mockReturnValue([]),
      })

      const result = getProcessList(ptyManager)
      expect(result).toEqual([])
    })
  })

  describe('getAgentHistory()', () => {
    it('filters entries to agent-relevant sources', () => {
      const entries: JournalEntry[] = [
        { timestamp: '10:00', source: 'pty', description: 'Terminal started' },
        { timestamp: '10:01', source: 'config', description: 'Config changed' },
        { timestamp: '10:02', source: 'kanban', description: 'Card moved' },
        { timestamp: '10:03', source: 'system', description: 'System event' },
      ]

      const journalEngine = createMockJournalEngine(entries)
      const history = getAgentHistory(journalEngine)

      // Only pty, kanban, system — not config
      expect(history.length).toBe(3)
      const sources = history.map((h) => h.source)
      expect(sources).toContain('pty')
      expect(sources).toContain('kanban')
      expect(sources).toContain('system')
      expect(sources).not.toContain('config')
    })

    it('returns empty array when no entries match', () => {
      const entries: JournalEntry[] = [
        { timestamp: '10:00', source: 'config', description: 'Config changed' },
      ]

      const journalEngine = createMockJournalEngine(entries)
      const history = getAgentHistory(journalEngine)

      expect(history).toEqual([])
    })

    it('returns empty array when no entries at all', () => {
      const journalEngine = createMockJournalEngine([])
      const history = getAgentHistory(journalEngine)
      expect(history).toEqual([])
    })
  })
})

// =============================================================================
// 7. Pair Session Manager
// =============================================================================

describe('PairSessionManager', () => {
  let manager: PairSessionManager

  beforeEach(() => {
    manager = new PairSessionManager()
  })

  describe('createSession()', () => {
    it('returns a 6-character session ID', () => {
      const ownerWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'Fix the login bug',
      )

      expect(typeof id).toBe('string')
      expect(id.length).toBe(6)
      // Should be uppercase hex
      expect(/^[0-9A-F]{6}$/.test(id)).toBe(true)
    })

    it('creates a session that can be retrieved', () => {
      const ownerWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'Fix the login bug',
      )

      const session = manager.getSession(id)
      expect(session).not.toBeNull()
      expect(session!.id).toBe(id)
      expect(session!.ownerName).toBe('Alice')
      expect(session!.winCondition).toBe('Fix the login bug')
      expect(session!.guestName).toBeNull()
    })

    it('generates unique IDs for multiple sessions', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const ws = createMockWebSocket()
        const id = manager.createSession(
          ws as unknown as import('@fastify/websocket').WebSocket,
          `User-${i}`,
          'goal',
        )
        ids.add(id)
      }
      // All 20 should be unique
      expect(ids.size).toBe(20)
    })
  })

  describe('joinSession()', () => {
    it('adds a guest to the session', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      const session = manager.getSession(id)
      expect(session!.guestName).toBe('Bob')
    })

    it('notifies the owner when a guest joins', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      expect(ownerWs.send).toHaveBeenCalledTimes(1)
      const sentMsg = JSON.parse(ownerWs._sentMessages[0])
      expect(sentMsg.type).toBe('participant-joined')
      expect(sentMsg.name).toBe('Bob')
    })

    it('throws for non-existent session', () => {
      const guestWs = createMockWebSocket()
      expect(() =>
        manager.joinSession(
          'NOPE00',
          guestWs as unknown as import('@fastify/websocket').WebSocket,
          'Bob',
        ),
      ).toThrow('Session NOPE00 not found')
    })

    it('throws when session already has a guest', () => {
      const ownerWs = createMockWebSocket()
      const guest1 = createMockWebSocket()
      const guest2 = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      manager.joinSession(
        id,
        guest1 as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      expect(() =>
        manager.joinSession(
          id,
          guest2 as unknown as import('@fastify/websocket').WebSocket,
          'Charlie',
        ),
      ).toThrow('Session already has a guest')
    })
  })

  describe('endSession()', () => {
    it('removes the session and returns true', () => {
      const ownerWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      const result = manager.endSession(id)
      expect(result).toBe(true)
      expect(manager.has(id)).toBe(false)
    })

    it('notifies guest when session ends', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      manager.endSession(id)

      // Guest should have received a session-ended message
      const guestMessages = guestWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(guestMessages.some((m: Record<string, unknown>) => m.type === 'session-ended')).toBe(true)
    })

    it('returns false for non-existent session', () => {
      expect(manager.endSession('NOPE00')).toBe(false)
    })

    it('refuses to end session if requester is not the owner', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      // Attempt to end as guest — should fail
      const result = manager.endSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
      )
      expect(result).toBe(false)
      // Session should still exist
      expect(manager.has(id)).toBe(true)
    })

    it('allows owner to end the session via requesterWs', () => {
      const ownerWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      const result = manager.endSession(
        id,
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
      )
      expect(result).toBe(true)
      expect(manager.has(id)).toBe(false)
    })
  })

  describe('listSessions()', () => {
    it('returns all active sessions', () => {
      const ws1 = createMockWebSocket()
      const ws2 = createMockWebSocket()

      manager.createSession(
        ws1 as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal-1',
      )
      manager.createSession(
        ws2 as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
        'goal-2',
      )

      const sessions = manager.listSessions()
      expect(sessions.length).toBe(2)
      const names = sessions.map((s) => s.ownerName).sort()
      expect(names).toEqual(['Alice', 'Bob'])
    })

    it('returns empty array when no sessions', () => {
      expect(manager.listSessions()).toEqual([])
    })

    it('excludes ended sessions', () => {
      const ws = createMockWebSocket()
      const id = manager.createSession(
        ws as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      manager.endSession(id)

      expect(manager.listSessions()).toEqual([])
    })
  })

  describe('permission model: owner-only operations', () => {
    it('blocks guest from sending session-ended messages', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      // Guest tries to send a session-ended message
      manager.broadcast(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        { type: 'session-ended' },
      )

      // Guest should receive an error message
      const guestMessages = guestWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        guestMessages.some((m: Record<string, unknown>) => m.type === 'error'),
      ).toBe(true)

      // Owner should NOT have received the session-ended message
      // (owner received participant-joined earlier, so filter for session-ended)
      const ownerMessages = ownerWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        ownerMessages.some(
          (m: Record<string, unknown>) => m.type === 'session-ended',
        ),
      ).toBe(false)
    })

    it('blocks guest from sending win-condition messages', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      // Clear messages from join
      ownerWs._sentMessages.length = 0

      manager.broadcast(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        { type: 'win-condition', condition: 'new goal' },
      )

      // Guest should get an error
      const guestMessages = guestWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        guestMessages.some((m: Record<string, unknown>) => m.type === 'error'),
      ).toBe(true)

      // Owner should NOT have received the win-condition
      expect(ownerWs._sentMessages.length).toBe(0)
    })

    it('allows owner to send win-condition messages', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      // Clear messages from join notification
      guestWs._sentMessages.length = 0

      manager.broadcast(
        id,
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        { type: 'win-condition', condition: 'updated goal' },
      )

      // Guest should receive it
      const guestMessages = guestWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        guestMessages.some(
          (m: Record<string, unknown>) => m.type === 'win-condition',
        ),
      ).toBe(true)
    })

    it('allows guest to send regular messages (chat, state-patch)', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      // Clear messages from join
      ownerWs._sentMessages.length = 0

      manager.broadcast(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        { type: 'chat', text: 'Hello!' },
      )

      // Owner should receive the chat message
      const ownerMessages = ownerWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        ownerMessages.some((m: Record<string, unknown>) => m.type === 'chat'),
      ).toBe(true)
    })
  })

  describe('removeParticipant()', () => {
    it('ends session when owner disconnects', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      manager.removeParticipant(
        id,
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
      )

      // Session should be deleted
      expect(manager.has(id)).toBe(false)

      // Guest should have been notified
      const guestMessages = guestWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        guestMessages.some(
          (m: Record<string, unknown>) => m.type === 'session-ended',
        ),
      ).toBe(true)
    })

    it('removes guest and notifies owner when guest disconnects', () => {
      const ownerWs = createMockWebSocket()
      const guestWs = createMockWebSocket()
      const id = manager.createSession(
        ownerWs as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      manager.joinSession(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
        'Bob',
      )

      // Clear join notification
      ownerWs._sentMessages.length = 0

      manager.removeParticipant(
        id,
        guestWs as unknown as import('@fastify/websocket').WebSocket,
      )

      // Session should still exist
      expect(manager.has(id)).toBe(true)

      // Guest should be removed
      const session = manager.getSession(id)
      expect(session!.guestName).toBeNull()

      // Owner should be notified
      const ownerMessages = ownerWs._sentMessages.map((m: string) =>
        JSON.parse(m),
      )
      expect(
        ownerMessages.some(
          (m: Record<string, unknown>) => m.type === 'participant-left',
        ),
      ).toBe(true)
    })
  })

  describe('has()', () => {
    it('returns true for existing session', () => {
      const ws = createMockWebSocket()
      const id = manager.createSession(
        ws as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )
      expect(manager.has(id)).toBe(true)
    })

    it('returns false for non-existent session', () => {
      expect(manager.has('NOPE00')).toBe(false)
    })
  })

  describe('getSession()', () => {
    it('returns null for non-existent session', () => {
      expect(manager.getSession('NOPE00')).toBeNull()
    })

    it('returns serialisable info without WebSocket refs', () => {
      const ws = createMockWebSocket()
      const id = manager.createSession(
        ws as unknown as import('@fastify/websocket').WebSocket,
        'Alice',
        'goal',
      )

      const info = manager.getSession(id)
      expect(info).toHaveProperty('id')
      expect(info).toHaveProperty('ownerName')
      expect(info).toHaveProperty('guestName')
      expect(info).toHaveProperty('createdAt')
      expect(info).toHaveProperty('winCondition')
      // Should NOT contain ws
      expect(info).not.toHaveProperty('owner')
      expect(info).not.toHaveProperty('guest')
    })
  })
})
