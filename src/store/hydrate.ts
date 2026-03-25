/**
 * Store hydration — fetches server config on app load and populates
 * all Zustand stores. Call `hydrateStores()` once during app bootstrap.
 */

import type { MiraConfig, CompanionConfig, WorkspaceConfig } from "@/types/config.ts";
import type { WorkspaceScene } from "@/types/scene.ts";
import { useConfigStore } from "@/store/config-store.ts";
import { useCompanionStore } from "@/store/companion-store.ts";
import { useToggleStore } from "@/store/toggle-store.ts";
import { useSceneStore } from "@/store/scene-store.ts";
import { startConfigSync } from "@/store/middleware/config-sync.ts";

const API_BASE = "/api/config";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Fetch server configs and hydrate all stores.
 * Safe to call multiple times — later calls overwrite previous state.
 *
 * After hydration, starts the config-sync subscriptions so future
 * local changes are pushed to the server automatically.
 */
export async function hydrateStores(): Promise<void> {
  const [config, companion, workspace, scenes] = await Promise.allSettled([
    fetchJson<MiraConfig>(API_BASE),
    fetchJson<CompanionConfig>(`${API_BASE}/companion`),
    fetchJson<WorkspaceConfig>(`${API_BASE}/workspaces/default`),
    fetchJson<{ scenes: WorkspaceScene[] }>(`${API_BASE}/scenes`),
  ]);

  // --- MiraConfig ---
  if (config.status === "fulfilled") {
    const c = config.value;
    useConfigStore.getState().setConfig(c);
    useToggleStore.getState().setActiveProfile(c.activeProfile);
    useToggleStore.getState().setActiveWorkspace(c.activeWorkspace);
  } else {
    console.warn("[hydrate] Failed to load MiraConfig:", config.reason);
  }

  // --- CompanionConfig ---
  if (companion.status === "fulfilled") {
    useCompanionStore.getState().setPersonality(companion.value);
  } else {
    console.warn(
      "[hydrate] Failed to load CompanionConfig:",
      companion.reason,
    );
  }

  // --- Default workspace ---
  if (workspace.status === "fulfilled") {
    const ws = workspace.value;
    useConfigStore.getState().setWorkspace(ws.name, ws);
    useToggleStore
      .getState()
      .setTogglesForWorkspace(ws.name, ws.toggles);
  } else {
    console.warn(
      "[hydrate] Failed to load default workspace:",
      workspace.reason,
    );
  }

  // --- Scenes ---
  if (scenes.status === "fulfilled") {
    useSceneStore.getState().setScenes(scenes.value.scenes);
  } else {
    // Scenes endpoint may not exist yet — defaults are loaded by the store
    console.info("[hydrate] Scenes not available, using defaults");
  }

  // Mark synced timestamp
  useConfigStore.getState().markSynced();

  // Start auto-sync subscriptions
  startConfigSync();
}
