/**
 * Processes onboarding wizard answers and maps them to workspace
 * configuration: profile selection, module enables, and initial layout.
 */

import type { OnboardingAnswers } from "@/store/onboarding-store.ts";
import type { PanelLayout } from "@/types/config.ts";
import type { ProfileName } from "@/lib/profile-presets.ts";
import {
  PROFILE_PRESETS,
  ALL_MODULE_IDS,
  type ModuleId,
} from "@/lib/profile-presets.ts";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OnboardingResult {
  /** Recommended profile */
  profile: Exclude<ProfileName, "Custom">;

  /** Module toggle map for the workspace */
  toggles: Record<string, boolean>;

  /** Suggested skills to highlight post-onboarding */
  suggestedSkills: string[];

  /** Initial panel layout for react-grid-layout */
  layout: PanelLayout[];
}

// ---------------------------------------------------------------------------
// Project type detection
// ---------------------------------------------------------------------------

type ProjectCategory = "web" | "api" | "cli" | "data" | "general";

const PROJECT_KEYWORDS: Record<ProjectCategory, string[]> = {
  web: ["web", "frontend", "react", "vue", "angular", "next", "site", "app", "ui"],
  api: ["api", "backend", "server", "rest", "graphql", "microservice", "service"],
  cli: ["cli", "command", "tool", "script", "automation"],
  data: ["data", "ml", "ai", "machine learning", "pipeline", "analytics"],
  general: [],
};

function detectProjectCategory(projectType: string | null): ProjectCategory {
  if (!projectType) return "general";
  const lower = projectType.toLowerCase();
  for (const [category, keywords] of Object.entries(PROJECT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as ProjectCategory;
    }
  }
  return "general";
}

// ---------------------------------------------------------------------------
// Work style -> profile mapping
// ---------------------------------------------------------------------------

type WorkStyleKey = "minimal" | "balanced" | "power";

const WORK_STYLE_KEYWORDS: Record<WorkStyleKey, string[]> = {
  minimal: ["minimal", "simple", "clean", "focused", "quiet", "lean", "less"],
  balanced: ["balanced", "moderate", "default", "standard", "normal"],
  power: ["power", "full", "everything", "all", "max", "advanced", "pro"],
};

function detectWorkStyle(workStyle: string | null): WorkStyleKey {
  if (!workStyle) return "balanced";
  const lower = workStyle.toLowerCase();
  for (const [style, keywords] of Object.entries(WORK_STYLE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return style as WorkStyleKey;
    }
  }
  return "balanced";
}

const STYLE_TO_PROFILE: Record<WorkStyleKey, Exclude<ProfileName, "Custom">> = {
  minimal: "Minimal",
  balanced: "Balanced",
  power: "FullSend",
};

// ---------------------------------------------------------------------------
// Tool -> skill suggestions
// ---------------------------------------------------------------------------

const TOOL_SKILL_MAP: Record<string, string[]> = {
  git: ["git-workflow"],
  github: ["github-integration", "git-workflow"],
  docker: ["docker-management"],
  figma: ["design-sync"],
  jira: ["task-sync"],
  linear: ["task-sync"],
  slack: ["notifications"],
  vscode: ["editor-bridge"],
  vim: ["editor-bridge"],
  neovim: ["editor-bridge"],
  postgres: ["database-tools"],
  mongodb: ["database-tools"],
  redis: ["cache-tools"],
  aws: ["cloud-deploy"],
  vercel: ["cloud-deploy"],
  netlify: ["cloud-deploy"],
};

function suggestSkills(tools: string[]): string[] {
  const skills = new Set<string>();
  for (const tool of tools) {
    const lower = tool.toLowerCase().trim();
    for (const [keyword, suggestions] of Object.entries(TOOL_SKILL_MAP)) {
      if (lower.includes(keyword)) {
        suggestions.forEach((s) => skills.add(s));
      }
    }
  }
  return [...skills];
}

// ---------------------------------------------------------------------------
// Layout generation
// ---------------------------------------------------------------------------

function generateLayout(
  category: ProjectCategory,
  enabledModules: ModuleId[],
): PanelLayout[] {
  const layout: PanelLayout[] = [];

  // Always include terminal
  if (enabledModules.includes("terminal")) {
    layout.push({
      id: "terminal-1",
      type: "terminal",
      x: 0,
      y: 0,
      w: 6,
      h: 4,
    });
  }

  // Always include companion
  if (enabledModules.includes("companion")) {
    layout.push({
      id: "companion-1",
      type: "companion",
      x: 6,
      y: 0,
      w: 4,
      h: 4,
    });
  }

  // Kanban placement varies by project type
  if (enabledModules.includes("kanban")) {
    const kanbanLayout: PanelLayout =
      category === "data"
        ? { id: "kanban-1", type: "kanban", x: 0, y: 4, w: 5, h: 3 }
        : { id: "kanban-1", type: "kanban", x: 0, y: 4, w: 10, h: 3 };
    layout.push(kanbanLayout);
  }

  // Metrics for data projects gets prominent placement
  if (enabledModules.includes("metrics")) {
    layout.push({
      id: "metrics-1",
      type: "metrics",
      x: category === "data" ? 5 : 0,
      y: category === "data" ? 4 : 7,
      w: 5,
      h: 3,
    });
  }

  // Skills manager if enabled
  if (enabledModules.includes("skills")) {
    layout.push({
      id: "skills-1",
      type: "skills",
      x: 5,
      y: 7,
      w: 5,
      h: 3,
    });
  }

  return layout;
}

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

export function processOnboardingAnswers(
  answers: OnboardingAnswers,
): OnboardingResult {
  const category = detectProjectCategory(answers.projectType);
  const workStyle = detectWorkStyle(answers.workStyle);
  const profile = STYLE_TO_PROFILE[workStyle];

  // Start with profile preset toggles
  const toggles = { ...PROFILE_PRESETS[profile] };

  // Boost certain modules based on project type
  if (category === "data") {
    toggles.metrics = true;
  }
  if (category === "web" || category === "api") {
    toggles.kanban = true;
  }

  // Determine enabled modules for layout
  const enabledModules = ALL_MODULE_IDS.filter(
    (id) => toggles[id] === true,
  ) as ModuleId[];

  const suggestedSkills = suggestSkills(answers.existingTools);
  const layout = generateLayout(category, enabledModules);

  return {
    profile,
    toggles,
    suggestedSkills,
    layout,
  };
}
