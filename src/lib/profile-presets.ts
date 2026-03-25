/**
 * Profile preset definitions.
 *
 * Each profile maps to a set of module IDs and their default toggle state.
 * Module IDs must match the keys used in toggle-store's togglesByWorkspace.
 */

import type { MiraConfig } from "@/types/config.ts";

export type ProfileName = MiraConfig["activeProfile"];

// ---------------------------------------------------------------------------
// All known module IDs
// ---------------------------------------------------------------------------

export const ALL_MODULE_IDS = [
  "terminal",
  "companion",
  "kanban",
  "notifications",
  "skills",
  "metrics",
  "settings",
] as const;

export type ModuleId = (typeof ALL_MODULE_IDS)[number];

/** Human-readable labels for each module. */
export const MODULE_LABELS: Record<ModuleId, string> = {
  terminal: "Terminal",
  companion: "Mira Companion",
  kanban: "Kanban Board",
  notifications: "Notifications",
  skills: "Skills Manager",
  metrics: "Metrics Dashboard",
  settings: "Settings",
};

// ---------------------------------------------------------------------------
// Preset toggle maps
// ---------------------------------------------------------------------------

export const PROFILE_PRESETS: Record<
  Exclude<ProfileName, "Custom">,
  Record<string, boolean>
> = {
  Minimal: {
    terminal: true,
    companion: true,
    kanban: false,
    notifications: false,
    skills: false,
    metrics: false,
    settings: false,
  },
  Balanced: {
    terminal: true,
    companion: true,
    kanban: true,
    notifications: true,
    skills: false,
    metrics: false,
    settings: false,
  },
  FullSend: {
    terminal: true,
    companion: true,
    kanban: true,
    notifications: true,
    skills: true,
    metrics: true,
    settings: true,
  },
};

/** Short description shown below each profile name. */
export const PROFILE_DESCRIPTIONS: Record<
  Exclude<ProfileName, "Custom">,
  string
> = {
  Minimal: "Terminal + Companion only",
  Balanced: "Terminal, Kanban, Companion, Notifications",
  FullSend: "Everything enabled",
};

/**
 * Returns the toggle map for a given profile.
 * For "Custom" the caller should supply current toggles unchanged.
 */
export function getTogglesForProfile(
  profile: ProfileName,
  currentToggles?: Record<string, boolean>,
): Record<string, boolean> {
  if (profile === "Custom") {
    return currentToggles ?? PROFILE_PRESETS.Balanced;
  }
  return { ...PROFILE_PRESETS[profile] };
}
