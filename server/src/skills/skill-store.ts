/**
 * SkillStore — manages the enabled/disabled state of installed skills
 * on a per-workspace basis.
 *
 * Workspace-level skill toggles are stored in the workspace config
 * (workspaces/<name>.yml) under `toggles` keyed as "skill:<id>".
 * The global installed/enabled state lives in skills.yml.
 */

import type { ConfigEngine } from "../config/config-engine.js";
import type { SkillsConfig, SkillEntry, WorkspaceConfig } from "../config/types.js";

export class SkillStore {
  private configEngine: ConfigEngine;

  constructor(configEngine: ConfigEngine) {
    this.configEngine = configEngine;
  }

  // -----------------------------------------------------------------------
  // Global skill state (skills.yml)
  // -----------------------------------------------------------------------

  /**
   * Get all installed skills.
   */
  async listAll(): Promise<SkillEntry[]> {
    const cfg = await this.configEngine.loadConfig<SkillsConfig>("skills.yml");
    return cfg.skills ?? [];
  }

  /**
   * Get a single installed skill by ID.
   */
  async getById(id: string): Promise<SkillEntry | undefined> {
    const all = await this.listAll();
    return all.find((s) => s.name === id);
  }

  /**
   * Enable or disable a skill globally.
   */
  async setEnabled(id: string, enabled: boolean): Promise<SkillEntry> {
    const cfg = await this.configEngine.loadConfig<SkillsConfig>("skills.yml");
    const entry = cfg.skills.find((s) => s.name === id);
    if (!entry) {
      throw new Error(`Skill "${id}" is not installed`);
    }

    entry.enabled = enabled;
    await this.configEngine.saveConfig("skills.yml", cfg);
    return entry;
  }

  // -----------------------------------------------------------------------
  // Workspace-scoped skill state
  // -----------------------------------------------------------------------

  /**
   * Check if a skill is enabled for a given workspace.
   * A skill must be globally enabled AND not toggled off in the workspace.
   */
  async isEnabledForWorkspace(
    skillId: string,
    workspaceName: string,
  ): Promise<boolean> {
    // First check global state
    const entry = await this.getById(skillId);
    if (!entry || !entry.enabled) return false;

    // Then check workspace-level toggle
    try {
      const ws = await this.configEngine.loadConfig<WorkspaceConfig>(
        `workspaces/${workspaceName}.yml`,
      );
      const toggleKey = `skill:${skillId}`;
      if (toggleKey in ws.toggles) {
        return ws.toggles[toggleKey];
      }
    } catch {
      // Workspace not found — fall through to global state
    }

    // Default: if globally enabled and no workspace override, it's on
    return true;
  }

  /**
   * Set workspace-level toggle for a skill.
   */
  async setWorkspaceToggle(
    skillId: string,
    workspaceName: string,
    enabled: boolean,
  ): Promise<void> {
    const filePath = `workspaces/${workspaceName}.yml`;
    const ws = await this.configEngine.loadConfig<WorkspaceConfig>(filePath);
    ws.toggles[`skill:${skillId}`] = enabled;
    await this.configEngine.saveConfig(filePath, ws);
  }

  /**
   * Get all skills that are active for a given workspace.
   */
  async getActiveSkillsForWorkspace(
    workspaceName: string,
  ): Promise<SkillEntry[]> {
    const all = await this.listAll();
    const results: SkillEntry[] = [];

    for (const entry of all) {
      const active = await this.isEnabledForWorkspace(
        entry.name,
        workspaceName,
      );
      if (active) {
        results.push(entry);
      }
    }

    return results;
  }
}
