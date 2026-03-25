/**
 * GitSyncEngine — manages git operations for .mira/ config files.
 *
 * Features:
 *  - Detects whether .mira/ lives inside a git repo
 *  - Debounced auto-commit (5s) of .mira/ changes (opt-in via config)
 *  - Manual commit with user-supplied message
 *  - Push to configured remote
 *  - Status and log queries scoped to .mira/
 *  - Gitignore management for personal/secret files
 */

import path from "node:path";
import fs from "node:fs/promises";
import { simpleGit, type SimpleGit, type StatusResult } from "simple-git";
import type { ConfigEngine } from "../config/config-engine.js";

/** Files inside .mira/ that should never be committed (personal / secrets). */
const GITIGNORE_ENTRIES = [".mira/memory.yml", ".mira/.personal/"];

export interface GitSyncStatus {
  isGitRepo: boolean;
  miraFiles: {
    staged: string[];
    modified: string[];
    notAdded: string[];
  };
  branch: string | null;
  remotes: string[];
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export class GitSyncEngine {
  private projectRoot: string;
  private git: SimpleGit;
  private isRepo = false;
  private autoCommitEnabled = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingChangedFiles: Set<string> = new Set();
  private configEngine: ConfigEngine | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.git = simpleGit(projectRoot);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialise the engine: check for git repo, ensure gitignore entries,
   * and optionally wire up auto-commit from ConfigEngine events.
   */
  async init(configEngine?: ConfigEngine): Promise<void> {
    this.isRepo = await this.git.checkIsRepo();

    if (!this.isRepo) return;

    // Ensure .gitignore has the right entries
    await this.ensureGitignore();

    if (configEngine) {
      this.configEngine = configEngine;
      await this.refreshAutoCommitSetting();

      // Listen for config changes to pick up gitSync setting changes
      // and to trigger auto-commits when enabled
      configEngine.on("config:changed", ({ filePath }) => {
        const rel = path.relative(this.projectRoot, filePath);

        // If the main config changed, re-read the autoCommit flag
        if (rel === path.join(".mira", "config.yml")) {
          this.refreshAutoCommitSetting();
        }

        if (this.autoCommitEnabled && rel.startsWith(".mira")) {
          this.scheduleAutoCommit(rel);
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Get the git status of .mira/ files. */
  async getStatus(): Promise<GitSyncStatus> {
    if (!this.isRepo) {
      return {
        isGitRepo: false,
        miraFiles: { staged: [], modified: [], notAdded: [] },
        branch: null,
        remotes: [],
      };
    }

    const status: StatusResult = await this.git.status();
    const remotes = await this.git.getRemotes();

    const filterMira = (files: Array<{ path: string }>) =>
      files.filter((f) => f.path.startsWith(".mira/")).map((f) => f.path);

    return {
      isGitRepo: true,
      miraFiles: {
        staged: filterMira(status.staged.map((p) => ({ path: p }))),
        modified: filterMira(status.modified.map((p) => ({ path: p }))),
        notAdded: filterMira(status.not_added.map((p) => ({ path: p }))),
      },
      branch: status.current ?? null,
      remotes: remotes.map((r) => r.name),
    };
  }

  /** Get recent commits that touched .mira/ files. */
  async getLog(limit = 20): Promise<GitLogEntry[]> {
    if (!this.isRepo) return [];

    try {
      const log = await this.git.log({
        maxCount: limit,
        file: ".mira/",
      });

      return log.all.map((entry) => ({
        hash: entry.hash,
        date: entry.date,
        message: entry.message,
        author: entry.author_name,
      }));
    } catch {
      return [];
    }
  }

  /** Immediate manual commit of all .mira/ changes with a user message. */
  async manualCommit(message: string): Promise<{ hash: string | null }> {
    if (!this.isRepo) {
      throw new Error("Not a git repository");
    }

    // Cancel any pending auto-commit
    this.cancelPendingAutoCommit();

    await this.git.add(".mira/");
    const status = await this.git.status();
    const hasMiraChanges = status.staged.some((f) => f.startsWith(".mira/"));

    if (!hasMiraChanges) {
      return { hash: null };
    }

    const result = await this.git.commit(message, [".mira/"]);
    return { hash: result.commit || null };
  }

  /** Push to the configured remote (defaults to "origin"). */
  async push(remote = "origin"): Promise<{ success: boolean; message: string }> {
    if (!this.isRepo) {
      throw new Error("Not a git repository");
    }

    try {
      const remotes = await this.git.getRemotes();
      if (!remotes.some((r) => r.name === remote)) {
        return { success: false, message: `Remote '${remote}' not configured` };
      }

      await this.git.push(remote);
      return { success: true, message: `Pushed to ${remote}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: msg };
    }
  }

  /** Whether the project root is inside a git repository. */
  get initialized(): boolean {
    return this.isRepo;
  }

  // -------------------------------------------------------------------------
  // Debounced auto-commit (Subtask 20.3)
  // -------------------------------------------------------------------------

  /** Schedule a debounced auto-commit. Batches changes over 5 seconds. */
  private scheduleAutoCommit(changedFile: string): void {
    this.pendingChangedFiles.add(changedFile);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeAutoCommit();
    }, 5000);
  }

  /** Execute the batched auto-commit. */
  private async executeAutoCommit(): Promise<void> {
    this.debounceTimer = null;

    if (this.pendingChangedFiles.size === 0) return;

    const files = Array.from(this.pendingChangedFiles);
    this.pendingChangedFiles.clear();

    try {
      await this.git.add(".mira/");
      const status = await this.git.status();
      const hasMiraChanges = status.staged.some((f) => f.startsWith(".mira/"));

      if (!hasMiraChanges) return;

      const fileList = files.join(", ");
      const message = `mira: auto-save [${fileList}]`;
      await this.git.commit(message, [".mira/"]);
    } catch (err) {
      // Log but don't crash — auto-commit is best-effort
      console.error("[GitSyncEngine] auto-commit failed:", err);
    }
  }

  /** Cancel any pending auto-commit timer. */
  private cancelPendingAutoCommit(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChangedFiles.clear();
  }

  // -------------------------------------------------------------------------
  // Config helpers
  // -------------------------------------------------------------------------

  /** Re-read the autoCommit setting from config.yml. */
  private async refreshAutoCommitSetting(): Promise<void> {
    if (!this.configEngine) return;

    try {
      const config = await this.configEngine.loadConfig<Record<string, unknown>>(
        "config.yml",
      );
      const gitSync = config?.gitSync as Record<string, unknown> | undefined;
      this.autoCommitEnabled = gitSync?.autoCommit === true;
    } catch {
      this.autoCommitEnabled = false;
    }
  }

  // -------------------------------------------------------------------------
  // Gitignore management (Subtask 20.6)
  // -------------------------------------------------------------------------

  /** Ensure .gitignore contains entries for personal/secret .mira/ files. */
  async ensureGitignore(): Promise<void> {
    const gitignorePath = path.join(this.projectRoot, ".gitignore");
    let content: string;

    try {
      content = await fs.readFile(gitignorePath, "utf-8");
    } catch {
      content = "";
    }

    const lines = content.split("\n");
    const missing = GITIGNORE_ENTRIES.filter(
      (entry) => !lines.some((line) => line.trim() === entry),
    );

    if (missing.length === 0) return;

    const additions = [
      "",
      "# Mira Studio personal/secret files (auto-managed)",
      ...missing,
    ].join("\n");

    const newContent = content.endsWith("\n")
      ? content + additions + "\n"
      : content + "\n" + additions + "\n";

    await fs.writeFile(gitignorePath, newContent, "utf-8");
  }
}
