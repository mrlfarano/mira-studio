/**
 * SIAgent — autonomous build agent for the Self-Improvement cycle.
 *
 * Safety model (non-negotiable):
 *  - Writes ONLY to branches matching `mira/si-YYYY-MM-DD-*`
 *  - Can propose PRs but CANNOT merge
 *  - No human-in-the-loop bypass at any configuration level
 *  - Branch name validation is enforced HERE, not in PtyManager
 */

import { v4 as uuidv4 } from 'uuid'
import { simpleGit, type SimpleGit } from 'simple-git'
import type { SIEngine } from './si-engine.js'
import type { PtyManager } from '../pty/pty-manager.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SIBuildResult {
  id: string
  branch: string
  hypothesisId: string
  hypothesisTitle: string
  success: boolean
  output: string
  duration: number
  timestamp: number
}

export interface SIAgentStatus {
  running: boolean
  currentHypothesis?: string
  currentBranch?: string
  currentBuildId?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum time an SI build cycle is allowed to run (10 minutes). */
const BUILD_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Branch name safety regex — MUST match `mira/si-YYYY-MM-DD-<description>`.
 * This is the primary safety gate. It lives in the SIAgent class so it
 * cannot be bypassed by calling PtyManager or git directly.
 */
const SI_BRANCH_REGEX = /^mira\/si-\d{4}-\d{2}-\d{2}-.+$/

// ---------------------------------------------------------------------------
// SIAgent
// ---------------------------------------------------------------------------

export class SIAgent {
  private siEngine: SIEngine
  private ptyManager: PtyManager
  private projectRoot: string
  private git: SimpleGit

  private _running = false
  private _currentHypothesis: string | undefined
  private _currentBranch: string | undefined
  private _currentBuildId: string | undefined

  /** In-memory store of build results from this session. */
  private buildResults: Map<string, SIBuildResult> = new Map()

  constructor(
    siEngine: SIEngine,
    ptyManager: PtyManager,
    projectRoot: string,
  ) {
    this.siEngine = siEngine
    this.ptyManager = ptyManager
    this.projectRoot = projectRoot
    this.git = simpleGit(projectRoot)
  }

  // -----------------------------------------------------------------------
  // Safety gate
  // -----------------------------------------------------------------------

  /**
   * Validate that a branch name matches the required SI pattern.
   * This is the primary safety enforcement — it prevents the agent from
   * ever writing to main, feature branches, or any other branch.
   */
  validateBranchName(branch: string): boolean {
    return SI_BRANCH_REGEX.test(branch)
  }

  // -----------------------------------------------------------------------
  // Build cycle
  // -----------------------------------------------------------------------

  /**
   * Run a full SI build cycle for the given hypothesis.
   *
   * 1. Load hypothesis from engine
   * 2. Generate and validate branch name
   * 3. Create git branch via simple-git (NOT PtyManager)
   * 4. Spawn PTY session with structured prompt
   * 5. Monitor for completion or timeout (10 min)
   * 6. Record build outcome
   * 7. Return result
   */
  async runCycle(hypothesisId: string): Promise<SIBuildResult> {
    if (this._running) {
      throw new Error('SI Agent is already running a build cycle')
    }

    const buildId = `si-build-${uuidv4()}`
    const startTime = Date.now()

    try {
      this._running = true
      this._currentBuildId = buildId

      // 1. Load hypothesis
      const data = await this.siEngine.getData()
      const hypothesis = data.hypotheses.find((h) => h.id === hypothesisId)
      if (!hypothesis) {
        throw new Error(`Hypothesis not found: ${hypothesisId}`)
      }
      if (hypothesis.status !== 'queued') {
        throw new Error(`Hypothesis is not queued (status: ${hypothesis.status})`)
      }

      this._currentHypothesis = hypothesis.title

      // 2. Generate branch name
      const dateStr = new Date().toISOString().slice(0, 10)
      const slug = hypothesis.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)
      const branch = `mira/si-${dateStr}-${slug}`

      // 3. Validate branch name (SAFETY GATE)
      if (!this.validateBranchName(branch)) {
        throw new Error(
          `SAFETY VIOLATION: Generated branch name "${branch}" does not match required pattern. Aborting.`,
        )
      }

      this._currentBranch = branch

      // 4. Create git branch via simple-git
      await this.git.checkoutLocalBranch(branch)

      // 5. Spawn PTY session with structured prompt
      const prompt = [
        'You are the Mira SI Agent. Your task:',
        `Title: ${hypothesis.title}`,
        `Description: ${hypothesis.description}`,
        `Impact: ${hypothesis.impact}`,
        '',
        `Work on branch: ${branch}`,
        'Run tests when done. Do not merge.',
        'When you are finished, type "exit" to end the session.',
      ].join('\n')

      const sessionId = this.ptyManager.spawn(
        `si-agent-${buildId}`,
        undefined,
        120,
        40,
      )

      // Send the prompt to the terminal
      this.ptyManager.write(sessionId, `echo "${prompt.replace(/"/g, '\\"')}"\n`)

      // 6. Monitor for completion or timeout
      const output = await this.waitForCompletion(sessionId, BUILD_TIMEOUT_MS)
      const duration = Date.now() - startTime

      // Determine success (heuristic: check if session exited cleanly)
      const exitedCleanly = !this.ptyManager.has(sessionId)
      const hasErrors = /error|failed|FAIL/i.test(output)
      const success = exitedCleanly && !hasErrors

      // 7. Record build outcome in SI engine
      await this.siEngine.recordBuild({
        branch,
        hypothesis: hypothesisId,
        outcome: success ? 'Build completed successfully' : 'Build had errors or timed out',
        testResults: output.slice(-2000),
        accepted: false, // Never auto-accept — requires human consent
      })

      // Switch back to original branch
      try {
        await this.git.checkout('main')
      } catch {
        // If main doesn't exist, try to go back to whatever was before
        try {
          await this.git.checkout('-')
        } catch {
          // Best effort — don't crash
        }
      }

      const result: SIBuildResult = {
        id: buildId,
        branch,
        hypothesisId,
        hypothesisTitle: hypothesis.title,
        success,
        output: output.slice(-5000),
        duration,
        timestamp: Date.now(),
      }

      this.buildResults.set(buildId, result)
      return result
    } finally {
      this._running = false
      this._currentHypothesis = undefined
      this._currentBranch = undefined
      this._currentBuildId = undefined
    }
  }

  // -----------------------------------------------------------------------
  // PR proposal (consent-gated)
  // -----------------------------------------------------------------------

  /**
   * Propose a PR for a completed build.
   * This does NOT create the PR automatically — it returns info for the
   * UI to present to the user. Actual PR creation requires explicit
   * user consent via the consent-pr endpoint.
   */
  async proposePR(
    buildId: string,
  ): Promise<{ prUrl?: string, consented: boolean }> {
    const build = this.buildResults.get(buildId)
    if (!build) {
      throw new Error(`Build not found: ${buildId}`)
    }
    // Return the build info — the UI will present it for consent
    return { consented: false }
  }

  /**
   * Create a PR after explicit user consent.
   * Pushes the branch and returns the suggested PR command (no GitHub API
   * usage since that requires auth).
   */
  async createPRWithConsent(
    buildId: string,
  ): Promise<{ branch: string, suggestedCommand: string, pushed: boolean }> {
    const build = this.buildResults.get(buildId)
    if (!build) {
      throw new Error(`Build not found: ${buildId}`)
    }

    // Validate branch name again before pushing (defense in depth)
    if (!this.validateBranchName(build.branch)) {
      throw new Error(
        `SAFETY VIOLATION: Branch "${build.branch}" does not match required pattern. Refusing to push.`,
      )
    }

    let pushed = false
    try {
      await this.git.push('origin', build.branch, ['--set-upstream'])
      pushed = true
    } catch {
      // Push may fail if no remote — that's OK, user can push manually
    }

    const suggestedCommand = `gh pr create --base main --head ${build.branch} --title "SI: ${build.hypothesisTitle}" --body "Autonomous improvement build by Mira SI Agent.\n\nHypothesis: ${build.hypothesisTitle}\nBranch: ${build.branch}\nDuration: ${Math.round(build.duration / 1000)}s\nResult: ${build.success ? 'Success' : 'Needs review'}"`

    return { branch: build.branch, suggestedCommand, pushed }
  }

  // -----------------------------------------------------------------------
  // Status
  // -----------------------------------------------------------------------

  getStatus(): SIAgentStatus {
    return {
      running: this._running,
      currentHypothesis: this._currentHypothesis,
      currentBranch: this._currentBranch,
      currentBuildId: this._currentBuildId,
    }
  }

  /** Get all build results from this session. */
  getAllBuilds(): SIBuildResult[] {
    return Array.from(this.buildResults.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    )
  }

  /** Get a specific build result by ID. */
  getBuild(buildId: string): SIBuildResult | undefined {
    return this.buildResults.get(buildId)
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Wait for a PTY session to complete (exit) or time out.
   * Collects output during the wait.
   */
  private waitForCompletion(
    sessionId: string,
    timeoutMs: number,
  ): Promise<string> {
    return new Promise<string>((resolve) => {
      let output = ''
      let resolved = false

      const onOutput = (id: string, data: string) => {
        if (id === sessionId) {
          output += data
        }
      }

      const onExit = (id: string) => {
        if (id === sessionId && !resolved) {
          resolved = true
          cleanup()
          resolve(output)
        }
      }

      const cleanup = () => {
        this.ptyManager.removeListener('output', onOutput)
        this.ptyManager.removeListener('exit', onExit)
      }

      this.ptyManager.on('output', onOutput)
      this.ptyManager.on('exit', onExit)

      // Timeout: kill the session if it runs too long
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          // Kill the session
          this.ptyManager.kill(sessionId).catch(() => {
            // Best effort
          })
          resolve(output + '\n[SI Agent: Build timed out after 10 minutes]')
        }
      }, timeoutMs)

      // Check if session already exited
      if (!this.ptyManager.has(sessionId)) {
        if (!resolved) {
          resolved = true
          cleanup()
          const buffered = this.ptyManager.getBufferedOutput(sessionId)
          resolve(buffered.join(''))
        }
      }
    })
  }
}
