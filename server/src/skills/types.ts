/**
 * Skill System type definitions.
 *
 * SkillManifest covers every field from the PRD Skill Manifest Specification:
 *   cornerstones, panels, agent_injections, claude_md_additions,
 *   wizard_steps, keybindings, permissions, composes_with, conflicts_with.
 */

// ---------------------------------------------------------------------------
// Skill Manifest — the complete shape of a skill.yml manifest file
// ---------------------------------------------------------------------------

export interface SkillManifest {
  /** Unique skill identifier (e.g. "bmad-method", "taskmaster-ai") */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Semantic version string */
  version: string;

  /** Short description shown in marketplace and skill list */
  description: string;

  /** Author name or organization */
  author: string;

  /** Optional homepage / repository URL */
  homepage?: string;

  /** Which of the five Cornerstones this skill serves */
  cornerstones: Cornerstone[];

  /** Panel types added or extended by this skill */
  panels: SkillPanel[];

  /** Context injected into agent sessions when this skill is active */
  agent_injections: AgentInjection[];

  /** Additions contributed to CLAUDE.md when skill is installed */
  claude_md_additions: ClaudeMdAddition[];

  /** Onboarding wizard questions added by this skill */
  wizard_steps: WizardStep[];

  /** Keyboard shortcuts registered by this skill */
  keybindings: SkillKeybinding[];

  /** Mira primitives the skill needs access to */
  permissions: SkillPermission[];

  /** Skills this skill enhances when co-installed */
  composes_with: string[];

  /** Skills that cannot be co-installed with this one */
  conflicts_with: string[];
}

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export type Cornerstone =
  | "creativity-ideation"
  | "project-delivery-planning"
  | "vibe-code-building"
  | "observability-reiteration"
  | "self-improvement";

export type SkillPermission =
  | "panels"
  | "kanban"
  | "journal"
  | "agent_context"
  | "build_journal"
  | "companion"
  | "config"
  | "workspace";

export interface SkillPanel {
  /** Panel type identifier */
  type: string;
  /** Human-readable panel title */
  title: string;
  /** Default dimensions (grid units) */
  defaultWidth: number;
  defaultHeight: number;
}

export interface AgentInjection {
  /** When to inject: always, on_start, on_prompt */
  trigger: "always" | "on_start" | "on_prompt";
  /** The content injected into agent context */
  content: string;
}

export interface ClaudeMdAddition {
  /** Section header in CLAUDE.md */
  section: string;
  /** Content to append under that section */
  content: string;
}

export interface WizardStep {
  /** Unique step key */
  id: string;
  /** Question text shown to the user */
  prompt: string;
  /** Input type for the wizard UI */
  inputType: "text" | "select" | "multi-select" | "confirm";
  /** Available choices for select / multi-select */
  options?: string[];
  /** Default value */
  defaultValue?: string;
}

export interface SkillKeybinding {
  /** Action identifier */
  action: string;
  /** Default key combo (e.g. "Ctrl+Shift+B") */
  keys: string;
  /** Human-readable description */
  description: string;
}

// ---------------------------------------------------------------------------
// Runtime state tracked per installed skill
// ---------------------------------------------------------------------------

export interface InstalledSkill {
  /** Matches SkillManifest.id */
  id: string;
  name: string;
  version: string;
  source: string;
  enabled: boolean;
  cornerstones: string[];
  permissions: string[];
  /** Timestamp of installation */
  installedAt: string;
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}
