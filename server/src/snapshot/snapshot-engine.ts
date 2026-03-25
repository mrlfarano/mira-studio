/**
 * SnapshotEngine -- captures, restores, lists, and deletes full workspace
 * state snapshots stored as JSON in .mira/snapshots/.
 *
 * A snapshot includes:
 *   - config.yml   (MiraConfig)
 *   - companion.yml (CompanionConfig)
 *   - workspaces/  (all WorkspaceConfig files -- layout + toggles)
 *   - skills.yml   (SkillsConfig)
 *   - kanban       (kanban cards & columns from workspace config)
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { ConfigEngine } from "../config/config-engine.js";
import type {
  MiraConfig,
  CompanionConfig,
  WorkspaceConfig,
  SkillsConfig,
} from "../config/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotData {
  /** ISO-8601 timestamp of when the snapshot was taken */
  capturedAt: string;
  /** Human-readable name */
  name: string;
  /** Core config */
  config: MiraConfig;
  /** Companion personality config */
  companion: CompanionConfig;
  /** All workspace configs keyed by workspace name */
  workspaces: Record<string, WorkspaceConfig>;
  /** Installed skills */
  skills: SkillsConfig;
}

export interface SnapshotMeta {
  name: string;
  capturedAt: string;
  /** File size in bytes */
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class SnapshotEngine {
  private configEngine: ConfigEngine;
  private snapshotDir: string;

  constructor(configEngine: ConfigEngine) {
    this.configEngine = configEngine;
    this.snapshotDir = path.join(configEngine.getConfigDir(), "snapshots");
  }

  /** Ensure the snapshots directory exists. */
  async init(): Promise<void> {
    await fs.mkdir(this.snapshotDir, { recursive: true });
  }

  // -----------------------------------------------------------------------
  // capture
  // -----------------------------------------------------------------------

  /**
   * Serialize current workspace state to .mira/snapshots/{name}.json
   */
  async capture(name: string): Promise<SnapshotData> {
    const sanitized = this.sanitizeName(name);

    // Load all current configs
    const config = await this.configEngine.loadConfig<MiraConfig>("config.yml");
    const companion = await this.configEngine.loadConfig<CompanionConfig>(
      "companion.yml",
    );
    const skills = await this.configEngine.loadConfig<SkillsConfig>(
      "skills.yml",
    );

    // Load all workspace configs
    const workspaces = await this.loadAllWorkspaces();

    const snapshot: SnapshotData = {
      capturedAt: new Date().toISOString(),
      name: sanitized,
      config,
      companion,
      workspaces,
      skills,
    };

    const filePath = path.join(this.snapshotDir, `${sanitized}.json`);
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

    return snapshot;
  }

  // -----------------------------------------------------------------------
  // restore
  // -----------------------------------------------------------------------

  /**
   * Load a snapshot and apply it to all configs via ConfigEngine.
   */
  async restore(name: string): Promise<SnapshotData> {
    const sanitized = this.sanitizeName(name);
    const filePath = path.join(this.snapshotDir, `${sanitized}.json`);

    const raw = await fs.readFile(filePath, "utf-8");
    const snapshot: SnapshotData = JSON.parse(raw);

    // Apply core config
    await this.configEngine.saveConfig("config.yml", snapshot.config);

    // Apply companion config
    await this.configEngine.saveConfig("companion.yml", snapshot.companion);

    // Apply skills config
    await this.configEngine.saveConfig("skills.yml", snapshot.skills);

    // Apply each workspace config
    for (const [wsName, wsConfig] of Object.entries(snapshot.workspaces)) {
      await this.configEngine.saveConfig(
        path.join("workspaces", `${wsName}.yml`),
        wsConfig,
      );
    }

    // Invalidate the ConfigEngine cache so subsequent reads pick up new data
    this.configEngine.invalidateCache();

    return snapshot;
  }

  // -----------------------------------------------------------------------
  // list
  // -----------------------------------------------------------------------

  /**
   * Return metadata for all available snapshots.
   */
  async list(): Promise<SnapshotMeta[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.snapshotDir);
    } catch {
      return [];
    }

    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const metas: SnapshotMeta[] = [];

    for (const file of jsonFiles) {
      const abs = path.join(this.snapshotDir, file);
      try {
        const stat = await fs.stat(abs);
        const raw = await fs.readFile(abs, "utf-8");
        const data: SnapshotData = JSON.parse(raw);
        metas.push({
          name: data.name,
          capturedAt: data.capturedAt,
          sizeBytes: stat.size,
        });
      } catch {
        // Skip corrupt snapshot files
      }
    }

    // Sort newest first
    metas.sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );

    return metas;
  }

  // -----------------------------------------------------------------------
  // delete
  // -----------------------------------------------------------------------

  /**
   * Remove a snapshot file.
   */
  async delete(name: string): Promise<void> {
    const sanitized = this.sanitizeName(name);
    const filePath = path.join(this.snapshotDir, `${sanitized}.json`);
    await fs.unlink(filePath);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Load all workspace YAML files from .mira/workspaces/ into a record.
   */
  private async loadAllWorkspaces(): Promise<Record<string, WorkspaceConfig>> {
    const wsDir = path.join(this.configEngine.getConfigDir(), "workspaces");
    const workspaces: Record<string, WorkspaceConfig> = {};

    try {
      const files = await fs.readdir(wsDir);
      const ymls = files.filter(
        (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
      );

      for (const file of ymls) {
        const ws = await this.configEngine.loadConfig<WorkspaceConfig>(
          path.join("workspaces", file),
        );
        const wsName = path.basename(file, path.extname(file));
        workspaces[wsName] = ws;
      }
    } catch {
      // workspaces directory might not exist yet
    }

    return workspaces;
  }

  /**
   * Sanitize a snapshot name to be filesystem-safe.
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "snapshot";
  }
}
