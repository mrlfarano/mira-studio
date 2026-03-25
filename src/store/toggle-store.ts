import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { MiraConfig } from "@/types/config.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfileName = MiraConfig["activeProfile"];

export interface ToggleState {
  /** Per-module on/off keyed by module id, per workspace */
  togglesByWorkspace: Record<string, Record<string, boolean>>;

  /** Currently active workspace name */
  activeWorkspace: string;

  /** Currently active profile */
  activeProfile: ProfileName;

  // --- actions ---
  setToggle: (workspace: string, moduleId: string, enabled: boolean) => void;
  setActiveWorkspace: (workspace: string) => void;
  setActiveProfile: (profile: ProfileName) => void;
  setTogglesForWorkspace: (
    workspace: string,
    toggles: Record<string, boolean>,
  ) => void;

  /** Bulk-replace state — used by hydration & conflict resolution */
  _replace: (partial: Partial<ToggleState>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useToggleStore = create<ToggleState>()(
  devtools(
    (set) => ({
      togglesByWorkspace: {},
      activeWorkspace: "default",
      activeProfile: "Balanced",

      setToggle: (workspace, moduleId, enabled) =>
        set(
          (s) => ({
            togglesByWorkspace: {
              ...s.togglesByWorkspace,
              [workspace]: {
                ...s.togglesByWorkspace[workspace],
                [moduleId]: enabled,
              },
            },
          }),
          undefined,
          "toggle/setToggle",
        ),

      setActiveWorkspace: (workspace) =>
        set({ activeWorkspace: workspace }, undefined, "toggle/setWorkspace"),

      setActiveProfile: (profile) =>
        set({ activeProfile: profile }, undefined, "toggle/setProfile"),

      setTogglesForWorkspace: (workspace, toggles) =>
        set(
          (s) => ({
            togglesByWorkspace: {
              ...s.togglesByWorkspace,
              [workspace]: toggles,
            },
          }),
          undefined,
          "toggle/setTogglesForWorkspace",
        ),

      _replace: (partial) => set(partial, undefined, "toggle/_replace"),
    }),
    { name: "ToggleStore", enabled: import.meta.env.DEV },
  ),
);
