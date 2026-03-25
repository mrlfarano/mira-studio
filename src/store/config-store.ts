import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { MiraConfig, WorkspaceConfig } from "@/types/config.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfigState {
  /** Cached server MiraConfig */
  config: MiraConfig | null;

  /** Cached workspace configs keyed by workspace name */
  workspaces: Record<string, WorkspaceConfig>;

  /** Timestamp of last successful sync from server */
  lastSyncedAt: number | null;

  /** Whether we are currently syncing */
  isSyncing: boolean;

  /** Last sync error message, if any */
  syncError: string | null;

  // --- actions ---
  setConfig: (config: MiraConfig) => void;
  patchConfig: (partial: Partial<MiraConfig>) => void;
  setWorkspace: (name: string, ws: WorkspaceConfig) => void;
  patchWorkspace: (name: string, partial: Partial<WorkspaceConfig>) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  markSynced: () => void;

  /** Bulk-replace state — used by hydration & conflict resolution */
  _replace: (partial: Partial<ConfigState>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useConfigStore = create<ConfigState>()(
  devtools(
    (set) => ({
      config: null,
      workspaces: {},
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,

      setConfig: (config) =>
        set({ config, syncError: null }, undefined, "config/setConfig"),

      patchConfig: (partial) =>
        set(
          (s) => ({
            config: s.config ? { ...s.config, ...partial } : null,
          }),
          undefined,
          "config/patchConfig",
        ),

      setWorkspace: (name, ws) =>
        set(
          (s) => ({ workspaces: { ...s.workspaces, [name]: ws } }),
          undefined,
          "config/setWorkspace",
        ),

      patchWorkspace: (name, partial) =>
        set(
          (s) => {
            const existing = s.workspaces[name];
            if (!existing) return s;
            return {
              workspaces: {
                ...s.workspaces,
                [name]: { ...existing, ...partial },
              },
            };
          },
          undefined,
          "config/patchWorkspace",
        ),

      setSyncing: (syncing) =>
        set({ isSyncing: syncing }, undefined, "config/setSyncing"),

      setSyncError: (error) =>
        set({ syncError: error }, undefined, "config/setSyncError"),

      markSynced: () =>
        set({ lastSyncedAt: Date.now() }, undefined, "config/markSynced"),

      _replace: (partial) => set(partial, undefined, "config/_replace"),
    }),
    { name: "ConfigStore", enabled: import.meta.env.DEV },
  ),
);
