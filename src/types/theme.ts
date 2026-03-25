/**
 * Theme configuration types for the Mira Studio theme system.
 *
 * Themes are stored as YAML files in .mira/themes/ and define CSS custom
 * property overrides that get applied to document.documentElement.
 */

// ---------------------------------------------------------------------------
// ThemeConfig — a single theme definition
// ---------------------------------------------------------------------------

export interface ThemeConfig {
  /** Unique theme identifier (used as filename in .mira/themes/) */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Theme author */
  author: string;

  /** CSS custom property overrides, e.g. { "--bg-primary": "#0d1117" } */
  variables: Record<string, string>;

  /** Optional raw CSS overrides appended after variable application */
  css?: string;
}

// ---------------------------------------------------------------------------
// Built-in themes
// ---------------------------------------------------------------------------

export const BUILTIN_THEMES: ThemeConfig[] = [
  {
    id: "dark",
    name: "Dark",
    author: "Mira Studio",
    variables: {
      "--bg-primary": "#0d1117",
      "--bg-secondary": "#161b22",
      "--bg-surface": "#1c2128",
      "--bg-elevated": "#242b35",
      "--border-default": "#30363d",
      "--border-muted": "#21262d",
      "--text-primary": "#e6edf3",
      "--text-secondary": "#8b949e",
      "--text-muted": "#6e7681",
      "--accent": "#6366f1",
      "--accent-hover": "#818cf8",
      "--success": "#3fb950",
      "--warning": "#d29922",
      "--error": "#f85149",
    },
  },
  {
    id: "light",
    name: "Light",
    author: "Mira Studio",
    variables: {
      "--bg-primary": "#ffffff",
      "--bg-secondary": "#f6f8fa",
      "--bg-surface": "#eef1f5",
      "--bg-elevated": "#dfe3e8",
      "--border-default": "#d0d7de",
      "--border-muted": "#e1e4e8",
      "--text-primary": "#1f2328",
      "--text-secondary": "#656d76",
      "--text-muted": "#8b949e",
      "--accent": "#6366f1",
      "--accent-hover": "#4f46e5",
      "--success": "#1a7f37",
      "--warning": "#9a6700",
      "--error": "#cf222e",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    author: "Mira Studio",
    variables: {
      "--bg-primary": "#020617",
      "--bg-secondary": "#0f172a",
      "--bg-surface": "#1e293b",
      "--bg-elevated": "#334155",
      "--border-default": "#475569",
      "--border-muted": "#1e293b",
      "--text-primary": "#f1f5f9",
      "--text-secondary": "#94a3b8",
      "--text-muted": "#64748b",
      "--accent": "#8b5cf6",
      "--accent-hover": "#a78bfa",
      "--success": "#22c55e",
      "--warning": "#eab308",
      "--error": "#ef4444",
    },
  },
  {
    id: "forest",
    name: "Forest",
    author: "Mira Studio",
    variables: {
      "--bg-primary": "#0c1a0e",
      "--bg-secondary": "#132016",
      "--bg-surface": "#1a2e1e",
      "--bg-elevated": "#243828",
      "--border-default": "#2d5a33",
      "--border-muted": "#1a3a1f",
      "--text-primary": "#d4edda",
      "--text-secondary": "#8fbc94",
      "--text-muted": "#5a8a60",
      "--accent": "#34d399",
      "--accent-hover": "#6ee7b7",
      "--success": "#22c55e",
      "--warning": "#fbbf24",
      "--error": "#f87171",
    },
  },
];
