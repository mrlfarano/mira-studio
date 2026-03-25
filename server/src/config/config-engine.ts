/**
 * ConfigEngine — reads, writes, watches, and scaffolds .mira/ config.
 *
 * Features:
 *  - loadConfig / saveConfig with YAML serialization (js-yaml)
 *  - File watcher via chokidar (EventEmitter pattern)
 *  - Debounced auto-save (300ms) to prevent rapid writes
 *  - Directory scaffold with sensible defaults on first load
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import chokidar from "chokidar";
import type {
  MiraConfig,
  CompanionConfig,
  WorkspaceConfig,
  SkillsConfig,
} from "./types.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_MIRA_CONFIG: MiraConfig = {
  version: "0.1.0",
  projectName: "My Mira Project",
  activeProfile: "Balanced",
  activeWorkspace: "default",
  enabledModules: [
    "agent-cockpit",
    "companion",
    "kanban",
    "notifications",
  ],
  mcpConnections: [],
  telemetryOptIn: false,
  activeTheme: "default",
};

export const DEFAULT_COMPANION_CONFIG: CompanionConfig = {
  name: "Mira",
  tone: "Casual",
  verbosity: 3,
  notifications: {
    agentFinish: true,
    agentError: true,
    nudges: true,
  },
  memory: {
    enabled: true,
    maxEntries: 500,
  },
  vibeScoreEnabled: true,
};

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  name: "default",
  profile: "Balanced",
  layout: [
    { id: "agent-1", type: "agent-terminal", x: 0, y: 0, w: 6, h: 4 },
    { id: "companion-1", type: "companion", x: 6, y: 0, w: 3, h: 4 },
    { id: "kanban-1", type: "kanban", x: 0, y: 4, w: 9, h: 4 },
  ],
  toggles: {
    "agent-cockpit": true,
    companion: true,
    kanban: true,
    notifications: true,
    "build-journal": false,
    "vibe-score": true,
  },
  keybindings: {},
};

export const DEFAULT_SKILLS_CONFIG: SkillsConfig = {
  skills: [],
};

// ---------------------------------------------------------------------------
// ConfigEngine
// ---------------------------------------------------------------------------

export class ConfigEngine extends EventEmitter {
  private projectRoot: string;
  private watcher: ReturnType<typeof chokidar.watch> | null = null;

  /** Tracks pending debounced writes keyed by absolute file path */
  private pendingWrites: Map<string, NodeJS.Timeout> = new Map();

  /** In-memory cache for fast reads after initial load */
  private cache: Map<string, unknown> = new Map();

  /** Suppress watcher events for files we just wrote ourselves */
  private selfWritePaths: Set<string> = new Set();

  constructor(projectRoot: string) {
    super();
    this.projectRoot = projectRoot;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Absolute path to the .mira/ directory */
  getConfigDir(): string {
    return path.join(this.projectRoot, ".mira");
  }

  /**
   * Ensure the .mira/ directory tree exists with default YAML files.
   * Safe to call multiple times — only writes files that are missing.
   */
  async ensureConfigDir(): Promise<void> {
    const dir = this.getConfigDir();

    // Create directories
    await fs.mkdir(path.join(dir, "workspaces"), { recursive: true });
    await fs.mkdir(path.join(dir, "themes"), { recursive: true });

    // Write default files only if they are missing or empty
    await this.writeDefaultIfMissing(
      path.join(dir, "config.yml"),
      DEFAULT_MIRA_CONFIG,
    );
    await this.writeDefaultIfMissing(
      path.join(dir, "companion.yml"),
      DEFAULT_COMPANION_CONFIG,
    );
    await this.writeDefaultIfMissing(
      path.join(dir, "skills.yml"),
      DEFAULT_SKILLS_CONFIG,
    );
    await this.writeDefaultIfMissing(
      path.join(dir, "workspaces", "default.yml"),
      DEFAULT_WORKSPACE_CONFIG,
    );
  }

  /**
   * Load and parse a YAML config file.
   * Returns the cached value when available.
   */
  async loadConfig<T>(filePath: string): Promise<T> {
    const abs = this.resolve(filePath);

    const cached = this.cache.get(abs);
    if (cached !== undefined) return cached as T;

    const raw = await fs.readFile(abs, "utf-8");
    const data = (yaml.load(raw) ?? {}) as T;
    this.cache.set(abs, data);
    return data;
  }

  /**
   * Serialize data to YAML and write to disk.
   * Updates the in-memory cache immediately.
   */
  async saveConfig<T>(filePath: string, data: T): Promise<void> {
    const abs = this.resolve(filePath);
    this.cache.set(abs, data);

    const content = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    // Mark as self-write so the watcher ignores it
    this.selfWritePaths.add(abs);

    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf-8");

    // Clear self-write flag after a short delay so chokidar event has time to fire
    setTimeout(() => this.selfWritePaths.delete(abs), 500);
  }

  /**
   * Debounced save — coalesces rapid writes into one disk write after 300ms.
   */
  saveConfigDebounced<T>(filePath: string, data: T): void {
    const abs = this.resolve(filePath);

    // Update cache immediately for fast reads
    this.cache.set(abs, data);

    const existing = this.pendingWrites.get(abs);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.pendingWrites.delete(abs);
      try {
        await this.saveConfig(filePath, data);
      } catch (err) {
        this.emit("error", err);
      }
    }, 300);

    this.pendingWrites.set(abs, timer);
  }

  /**
   * Start watching .mira/ for external changes.
   * Emits "config:changed" with { filePath, config } when a YAML file changes.
   */
  startWatching(): void {
    if (this.watcher) return;

    const dir = this.getConfigDir();
    this.watcher = chokidar.watch(dir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });

    this.watcher.on("change", async (changedPath: string) => {
      // Ignore our own writes
      if (this.selfWritePaths.has(changedPath)) return;

      if (!changedPath.endsWith(".yml") && !changedPath.endsWith(".yaml")) {
        return;
      }

      try {
        // Invalidate cache and reload
        this.cache.delete(changedPath);
        const raw = await fs.readFile(changedPath, "utf-8");
        const config = yaml.load(raw);
        this.cache.set(changedPath, config);
        this.emit("config:changed", { filePath: changedPath, config });
      } catch (err) {
        this.emit("error", err);
      }
    });

    this.watcher.on("error", (err: unknown) => this.emit("error", err));
  }

  /** Stop watching and flush pending writes. */
  async stop(): Promise<void> {
    // Flush pending debounced writes
    for (const [abs, timer] of this.pendingWrites) {
      clearTimeout(timer);
      const data = this.cache.get(abs);
      if (data) {
        const content = yaml.dump(data, {
          indent: 2,
          lineWidth: 120,
          noRefs: true,
        });
        await fs.writeFile(abs, content, "utf-8");
      }
    }
    this.pendingWrites.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /** Invalidate a specific cache entry (or all if no path given). */
  invalidateCache(filePath?: string): void {
    if (filePath) {
      this.cache.delete(this.resolve(filePath));
    } else {
      this.cache.clear();
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private resolve(filePath: string): string {
    return path.isAbsolute(filePath)
      ? filePath
      : path.join(this.getConfigDir(), filePath);
  }

  private async writeDefaultIfMissing(
    absPath: string,
    defaultData: unknown,
  ): Promise<void> {
    try {
      const stat = await fs.stat(absPath);
      // File exists — check if it is just a comment placeholder
      if (stat.size <= 50) {
        const content = await fs.readFile(absPath, "utf-8");
        if (content.trim().startsWith("#") && content.trim().split("\n").length <= 2) {
          // Placeholder file — overwrite with defaults
          await this.saveConfig(absPath, defaultData);
        }
      }
    } catch {
      // File does not exist — write defaults
      await this.saveConfig(absPath, defaultData);
    }
  }
}
