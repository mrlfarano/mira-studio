/**
 * Workspace Scene — a named pair of workspaces that can be
 * hot-swapped as a unit (e.g. "Build + Debug", "Ideate + Spec").
 */

export interface WorkspaceScene {
  /** Unique scene identifier */
  id: string;

  /** Human-readable name (e.g. "Build + Debug") */
  name: string;

  /** Ordered pair of workspace names: [primary, secondary] */
  workspaces: [string, string];

  /** Optional description shown in the scene switcher */
  description?: string;

  /** Optional keyboard shortcut for instant activation (e.g. "Ctrl+1") */
  shortcut?: string;
}

/** Default scenes shipped with every new project */
export const DEFAULT_SCENES: WorkspaceScene[] = [
  {
    id: "scene-build-debug",
    name: "Build + Debug",
    workspaces: ["build", "debug"],
    description: "Code editing paired with debugger and logs",
    shortcut: "Ctrl+1",
  },
  {
    id: "scene-ideate-spec",
    name: "Ideate + Spec",
    workspaces: ["ideate", "spec"],
    description: "Brainstorming paired with specification writing",
    shortcut: "Ctrl+2",
  },
];
