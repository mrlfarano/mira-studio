import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { WorkspaceScene } from "@/types/scene.ts";
import type { WorkspaceConfig } from "@/types/config.ts";
import { DEFAULT_SCENES } from "@/types/scene.ts";
import { useConfigStore } from "@/store/config-store.ts";
import { useToggleStore } from "@/store/toggle-store.ts";
import { useLayoutStore } from "@/store/layout-store.ts";
import type { PanelConfig } from "@/types/panel.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneState {
  /** All available scenes */
  scenes: WorkspaceScene[];

  /** Currently active scene id, or null if no scene is active */
  activeScene: string | null;

  // --- actions ---
  createScene: (scene: WorkspaceScene) => void;
  deleteScene: (id: string) => void;
  switchScene: (id: string) => Promise<void>;
  swapWorkspaces: () => void;
  setScenes: (scenes: WorkspaceScene[]) => void;

  /** Bulk-replace state — used by hydration */
  _replace: (partial: Partial<SceneState>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = "/api/config";

async function fetchWorkspace(name: string): Promise<WorkspaceConfig | null> {
  try {
    const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return (await res.json()) as WorkspaceConfig;
  } catch {
    return null;
  }
}

function applyWorkspaceLayout(ws: WorkspaceConfig): void {
  const panels: PanelConfig[] = ws.layout.map((l, i) => ({
    id: l.id,
    type: l.type,
    title: l.type,
    x: l.x,
    y: l.y,
    w: l.w,
    h: l.h,
    minW: 2,
    minH: 2,
    zIndex: i + 1,
    minimized: false,
  }));

  useLayoutStore.getState().setPanels(panels);
}

function persistScenes(scenes: WorkspaceScene[]): void {
  fetch(`${API_BASE}/scenes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenes }),
  }).catch(() => {
    // Silently ignore persist failures in dev
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSceneStore = create<SceneState>()(
  devtools(
    (set, get) => ({
      scenes: DEFAULT_SCENES,
      activeScene: null,

      createScene: (scene) => {
        set(
          (s) => ({ scenes: [...s.scenes, scene] }),
          undefined,
          "scene/create",
        );
        persistScenes(get().scenes);
      },

      deleteScene: (id) => {
        set(
          (s) => ({
            scenes: s.scenes.filter((sc) => sc.id !== id),
            activeScene: s.activeScene === id ? null : s.activeScene,
          }),
          undefined,
          "scene/delete",
        );
        persistScenes(get().scenes);
      },

      switchScene: async (id) => {
        const scene = get().scenes.find((s) => s.id === id);
        if (!scene) return;

        const [primary, secondary] = scene.workspaces;

        // Fetch both workspace configs in parallel
        const [primaryWs, secondaryWs] = await Promise.all([
          fetchWorkspace(primary),
          fetchWorkspace(secondary),
        ]);

        // Apply primary workspace as the active layout
        if (primaryWs) {
          useConfigStore.getState().setWorkspace(primary, primaryWs);
          useToggleStore.getState().setTogglesForWorkspace(primary, primaryWs.toggles);
          applyWorkspaceLayout(primaryWs);
        }

        // Cache secondary workspace config
        if (secondaryWs) {
          useConfigStore.getState().setWorkspace(secondary, secondaryWs);
          useToggleStore.getState().setTogglesForWorkspace(secondary, secondaryWs.toggles);
        }

        // Set active workspace to primary
        useToggleStore.getState().setActiveWorkspace(primary);

        set({ activeScene: id }, undefined, "scene/switch");
      },

      swapWorkspaces: () => {
        const { activeScene, scenes } = get();
        if (!activeScene) return;

        const scene = scenes.find((s) => s.id === activeScene);
        if (!scene) return;

        const currentWorkspace = useToggleStore.getState().activeWorkspace;
        const [primary, secondary] = scene.workspaces;
        const targetWorkspace = currentWorkspace === primary ? secondary : primary;

        // Load the other workspace layout from cache
        const targetWs = useConfigStore.getState().workspaces[targetWorkspace];
        if (targetWs) {
          applyWorkspaceLayout(targetWs);
        }

        useToggleStore.getState().setActiveWorkspace(targetWorkspace);
      },

      setScenes: (scenes) => {
        set({ scenes }, undefined, "scene/setScenes");
      },

      _replace: (partial) => set(partial, undefined, "scene/_replace"),
    }),
    { name: "SceneStore", enabled: import.meta.env.DEV },
  ),
);
