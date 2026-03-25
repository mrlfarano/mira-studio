/**
 * TypeScript interfaces for .mira/ configuration schemas.
 *
 * Two-layer model:
 *   Portable layer  – travels with Git, safe to share
 *   Personal layer  – gitignored, local-only (~/.mira/)
 */

// ---------------------------------------------------------------------------
// config.yml — Core settings and enabled modules
// ---------------------------------------------------------------------------

export interface MiraConfig {
  version: string;
  projectName: string;

  /** Active workspace profile: Minimal | Balanced | FullSend | Custom */
  activeProfile: "Minimal" | "Balanced" | "FullSend" | "Custom";

  /** Active workspace name (references a file in workspaces/) */
  activeWorkspace: string;

  /** Globally enabled module keys */
  enabledModules: string[];

  /** MCP connection placeholders (no secrets) */
  mcpConnections: McpConnectionPlaceholder[];

  /** Telemetry opt-in flag */
  telemetryOptIn: boolean;

  /** Theme reference */
  activeTheme: string;
}

export interface McpConnectionPlaceholder {
  name: string;
  type: string;
  /** Placeholder keys — actual secrets live in system keychain */
  credentialKeys: string[];
}

// ---------------------------------------------------------------------------
// companion.yml — Mira personality and memory preferences
// ---------------------------------------------------------------------------

export interface CompanionConfig {
  /** Display name for the companion */
  name: string;

  /** Tone: Professional | Casual | Minimal */
  tone: "Professional" | "Casual" | "Minimal";

  /** Verbosity: from silent co-pilot (1) to chatty collaborator (5) */
  verbosity: number;

  /** Smart notification preferences */
  notifications: NotificationPrefs;

  /** Memory / context preferences */
  memory: MemoryPrefs;

  /** Vibe Score opt-in */
  vibeScoreEnabled: boolean;
}

export interface NotificationPrefs {
  agentFinish: boolean;
  agentError: boolean;
  nudges: boolean;
}

export interface MemoryPrefs {
  enabled: boolean;
  /** Maximum entries kept in memory.yml */
  maxEntries: number;
}

// ---------------------------------------------------------------------------
// workspaces/<name>.yml — Per-workspace layout and toggle states
// ---------------------------------------------------------------------------

export interface WorkspaceConfig {
  name: string;

  /** Profile this workspace derives from */
  profile: "Minimal" | "Balanced" | "FullSend" | "Custom";

  /** Panel layout definition (serializable for react-grid-layout / allotment) */
  layout: PanelLayout[];

  /** Per-module toggle states for this workspace */
  toggles: Record<string, boolean>;

  /** Optional paired workspace for Workspace Scenes */
  pairedWorkspace?: string;

  /** Keyboard shortcut overrides */
  keybindings: Record<string, string>;
}

export interface PanelLayout {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// skills.yml — Installed skills and versions
// ---------------------------------------------------------------------------

export interface SkillsConfig {
  /** Installed skills */
  skills: SkillEntry[];
}

export interface SkillEntry {
  name: string;
  version: string;
  source: string;
  enabled: boolean;
  cornerstones: string[];
  permissions: string[];
}

// ---------------------------------------------------------------------------
// Utility: union of all top-level config types
// ---------------------------------------------------------------------------

export type AnyConfig =
  | MiraConfig
  | CompanionConfig
  | WorkspaceConfig
  | SkillsConfig;
