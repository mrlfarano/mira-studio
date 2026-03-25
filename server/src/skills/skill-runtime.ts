/**
 * SkillRuntime — loads, validates, installs, uninstalls, and hot-reloads skills.
 *
 * Works with the ConfigEngine to persist skill state in .mira/skills.yml
 * and stores skill manifests in .mira/skills/<id>/skill.yml.
 */

import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import type { ConfigEngine } from "../config/config-engine.js";
import type {
  SkillManifest,
  InstalledSkill,
  ManifestValidationResult,
} from "./types.js";
import type { SkillsConfig, SkillEntry } from "../config/types.js";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_CORNERSTONES = new Set([
  "creativity-ideation",
  "project-delivery-planning",
  "vibe-code-building",
  "observability-reiteration",
  "self-improvement",
]);

const VALID_PERMISSIONS = new Set([
  "panels",
  "kanban",
  "journal",
  "agent_context",
  "build_journal",
  "companion",
  "config",
  "workspace",
]);

export function validateManifest(data: unknown): ManifestValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Manifest must be a YAML object"] };
  }

  const m = data as Record<string, unknown>;

  // Required string fields
  for (const field of ["id", "name", "version", "description", "author"]) {
    if (typeof m[field] !== "string" || (m[field] as string).trim() === "") {
      errors.push(`"${field}" is required and must be a non-empty string`);
    }
  }

  // ID format: lowercase alphanumeric + hyphens
  if (typeof m.id === "string" && !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) {
    errors.push('"id" must be lowercase alphanumeric with hyphens');
  }

  // Required arrays (may be empty)
  for (const field of [
    "cornerstones",
    "panels",
    "agent_injections",
    "claude_md_additions",
    "wizard_steps",
    "keybindings",
    "permissions",
    "composes_with",
    "conflicts_with",
  ]) {
    if (!Array.isArray(m[field])) {
      errors.push(`"${field}" must be an array`);
    }
  }

  // Validate cornerstone values
  if (Array.isArray(m.cornerstones)) {
    for (const c of m.cornerstones) {
      if (!VALID_CORNERSTONES.has(c as string)) {
        errors.push(`Invalid cornerstone: "${c}"`);
      }
    }
  }

  // Validate permission values
  if (Array.isArray(m.permissions)) {
    for (const p of m.permissions) {
      if (!VALID_PERMISSIONS.has(p as string)) {
        errors.push(`Invalid permission: "${p}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// SkillRuntime
// ---------------------------------------------------------------------------

export class SkillRuntime extends EventEmitter {
  private configEngine: ConfigEngine;
  private projectRoot: string;

  /** In-memory cache of loaded manifests keyed by skill ID */
  private manifests: Map<string, SkillManifest> = new Map();

  constructor(projectRoot: string, configEngine: ConfigEngine) {
    super();
    this.projectRoot = projectRoot;
    this.configEngine = configEngine;
  }

  // -----------------------------------------------------------------------
  // Directory helpers
  // -----------------------------------------------------------------------

  /** Absolute path to .mira/skills/ directory (where skill folders live) */
  private get skillsDir(): string {
    return path.join(this.configEngine.getConfigDir(), "skills");
  }

  /** Absolute path to a specific skill's directory */
  private skillDir(id: string): string {
    return path.join(this.skillsDir, id);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Initialise runtime: ensure directories exist and warm up the manifest cache
   * for all installed skills.
   */
  async init(): Promise<void> {
    await fs.mkdir(this.skillsDir, { recursive: true });

    const installed = await this.getInstalledSkills();
    for (const entry of installed) {
      try {
        await this.loadSkill(
          path.join(this.skillDir(entry.name), "skill.yml"),
        );
      } catch {
        // Skill directory may be missing — skip silently
      }
    }
  }

  /**
   * Parse and validate a skill manifest from disk.
   * Caches the result in memory for fast access.
   */
  async loadSkill(manifestPath: string): Promise<SkillManifest> {
    const abs = path.isAbsolute(manifestPath)
      ? manifestPath
      : path.resolve(this.projectRoot, manifestPath);

    const raw = await fs.readFile(abs, "utf-8");
    const data = yaml.load(raw);

    const result = validateManifest(data);
    if (!result.valid) {
      throw new Error(
        `Invalid skill manifest at ${abs}: ${result.errors.join("; ")}`,
      );
    }

    const manifest = data as SkillManifest;
    this.manifests.set(manifest.id, manifest);
    this.emit("skill:loaded", manifest);
    return manifest;
  }

  /**
   * Install a skill from a local directory path (or URL placeholder).
   *
   * For v1 this copies from a local source path. The source directory must
   * contain a skill.yml manifest.
   */
  async installSkill(source: string): Promise<InstalledSkill> {
    // Resolve source — must be an absolute or project-relative directory
    const srcDir = path.isAbsolute(source)
      ? source
      : path.resolve(this.projectRoot, source);

    const manifestPath = path.join(srcDir, "skill.yml");
    const manifest = await this.loadSkill(manifestPath);

    // Check for conflicts with already-installed skills
    const installed = await this.getInstalledSkills();
    for (const existing of installed) {
      if (existing.name === manifest.id) {
        throw new Error(`Skill "${manifest.id}" is already installed`);
      }
    }

    // Check conflicts_with
    for (const conflict of manifest.conflicts_with) {
      if (installed.some((s) => s.name === conflict)) {
        throw new Error(
          `Skill "${manifest.id}" conflicts with installed skill "${conflict}"`,
        );
      }
    }

    // Copy skill directory into .mira/skills/<id>/
    const destDir = this.skillDir(manifest.id);
    await fs.mkdir(destDir, { recursive: true });
    await this.copyDirectory(srcDir, destDir);

    // Register in skills.yml
    const skillsConfig =
      await this.configEngine.loadConfig<SkillsConfig>("skills.yml");

    const entry: SkillEntry = {
      name: manifest.id,
      version: manifest.version,
      source,
      enabled: true,
      cornerstones: manifest.cornerstones,
      permissions: manifest.permissions,
    };

    skillsConfig.skills.push(entry);
    await this.configEngine.saveConfig("skills.yml", skillsConfig);

    const result: InstalledSkill = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      source,
      enabled: true,
      cornerstones: manifest.cornerstones,
      permissions: manifest.permissions,
      installedAt: new Date().toISOString(),
    };

    this.emit("skill:installed", result);
    return result;
  }

  /**
   * Uninstall a skill by ID: remove files and deregister from skills.yml.
   */
  async uninstallSkill(id: string): Promise<void> {
    // Remove from skills.yml
    const skillsConfig =
      await this.configEngine.loadConfig<SkillsConfig>("skills.yml");

    const idx = skillsConfig.skills.findIndex((s) => s.name === id);
    if (idx === -1) {
      throw new Error(`Skill "${id}" is not installed`);
    }

    skillsConfig.skills.splice(idx, 1);
    await this.configEngine.saveConfig("skills.yml", skillsConfig);

    // Remove skill directory
    const destDir = this.skillDir(id);
    try {
      await fs.rm(destDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist — that's fine
    }

    // Clear from in-memory cache
    this.manifests.delete(id);

    this.emit("skill:uninstalled", id);
  }

  /**
   * List all installed skills from .mira/skills.yml.
   */
  async getInstalledSkills(): Promise<SkillEntry[]> {
    try {
      const skillsConfig =
        await this.configEngine.loadConfig<SkillsConfig>("skills.yml");
      return skillsConfig.skills ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Hot-reload a skill: re-read its manifest and update the in-memory cache
   * without restarting the server.
   */
  async hotReload(id: string): Promise<SkillManifest> {
    const manifestPath = path.join(this.skillDir(id), "skill.yml");

    // Clear old cache entry
    this.manifests.delete(id);
    this.configEngine.invalidateCache("skills.yml");

    const manifest = await this.loadSkill(manifestPath);

    // Update version in skills.yml if it changed
    const skillsConfig =
      await this.configEngine.loadConfig<SkillsConfig>("skills.yml");
    const entry = skillsConfig.skills.find((s) => s.name === id);
    if (entry) {
      entry.version = manifest.version;
      entry.cornerstones = manifest.cornerstones;
      entry.permissions = manifest.permissions;
      await this.configEngine.saveConfig("skills.yml", skillsConfig);
    }

    this.emit("skill:reloaded", manifest);
    return manifest;
  }

  /**
   * Get a cached manifest by skill ID (or undefined if not loaded).
   */
  getManifest(id: string): SkillManifest | undefined {
    return this.manifests.get(id);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Recursively copy a directory tree. */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}
