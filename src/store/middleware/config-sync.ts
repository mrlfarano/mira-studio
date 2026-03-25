/**
 * Config-sync middleware for Zustand stores.
 *
 * Debounces state changes (300 ms) and PUTs the relevant slice to the
 * server config endpoints. On failure the store is reverted to server
 * state (server-wins conflict resolution).
 */

import type { MiraConfig, CompanionConfig, WorkspaceConfig } from "@/types/config.ts";
import { useConfigStore } from "@/store/config-store.ts";
import { useCompanionStore } from "@/store/companion-store.ts";
import { useToggleStore } from "@/store/toggle-store.ts";

const API_BASE = "/api/config";
const DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type TimerMap = Record<string, ReturnType<typeof setTimeout>>;
const timers: TimerMap = {};

function debounce(key: string, fn: () => void): void {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, DEBOUNCE_MS);
}

async function putJson<T>(url: string, body: T): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PUT ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public sync functions — called by subscribers or action wrappers
// ---------------------------------------------------------------------------

/**
 * Sync the core MiraConfig to the server.
 * Optimistic: the store is already updated; on failure we revert.
 */
export function syncConfig(): void {
  debounce("config", async () => {
    const { config } = useConfigStore.getState();
    if (!config) return;

    useConfigStore.getState().setSyncing(true);
    try {
      const server = await putJson<MiraConfig>(API_BASE, config);
      // Apply server-canonical response
      useConfigStore.getState().setConfig(server);
      useConfigStore.getState().markSynced();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      useConfigStore.getState().setSyncError(message);
      // Server-wins: revert to server state
      try {
        const server = await getJson<MiraConfig>(API_BASE);
        useConfigStore.getState().setConfig(server);
      } catch {
        // If we can't even GET, leave error state for UI to handle
      }
    } finally {
      useConfigStore.getState().setSyncing(false);
    }
  });
}

/**
 * Sync companion config to the server.
 */
export function syncCompanion(): void {
  debounce("companion", async () => {
    const { personality } = useCompanionStore.getState();
    if (!personality) return;

    useConfigStore.getState().setSyncing(true);
    try {
      const server = await putJson<CompanionConfig>(
        `${API_BASE}/companion`,
        personality,
      );
      useCompanionStore.getState().setPersonality(server);
      useConfigStore.getState().markSynced();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      useConfigStore.getState().setSyncError(message);
      try {
        const server = await getJson<CompanionConfig>(`${API_BASE}/companion`);
        useCompanionStore.getState().setPersonality(server);
      } catch {
        // leave error state
      }
    } finally {
      useConfigStore.getState().setSyncing(false);
    }
  });
}

/**
 * Sync a workspace's toggle state to the server.
 */
export function syncWorkspaceToggles(workspaceName: string): void {
  debounce(`workspace:${workspaceName}`, async () => {
    const toggles =
      useToggleStore.getState().togglesByWorkspace[workspaceName];
    if (!toggles) return;

    useConfigStore.getState().setSyncing(true);
    try {
      const server = await putJson<WorkspaceConfig>(
        `${API_BASE}/workspaces/${encodeURIComponent(workspaceName)}`,
        { toggles } as unknown as WorkspaceConfig,
      );
      useConfigStore.getState().setWorkspace(workspaceName, server);
      useToggleStore.getState().setTogglesForWorkspace(
        workspaceName,
        server.toggles,
      );
      useConfigStore.getState().markSynced();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      useConfigStore.getState().setSyncError(message);
      try {
        const server = await getJson<WorkspaceConfig>(
          `${API_BASE}/workspaces/${encodeURIComponent(workspaceName)}`,
        );
        useToggleStore.getState().setTogglesForWorkspace(
          workspaceName,
          server.toggles,
        );
      } catch {
        // leave error state
      }
    } finally {
      useConfigStore.getState().setSyncing(false);
    }
  });
}

// ---------------------------------------------------------------------------
// Store subscribers — wire up automatic sync on state changes
// ---------------------------------------------------------------------------

let _unsubscribers: (() => void)[] = [];

/**
 * Start watching stores for changes and auto-syncing to the server.
 * Call once after hydration. Returns an unsubscribe function.
 */
export function startConfigSync(): () => void {
  // Prevent double-subscription
  stopConfigSync();

  const unsubConfig = useConfigStore.subscribe(
    (state, prev) => {
      if (state.config && state.config !== prev.config && !state.isSyncing) {
        syncConfig();
      }
    },
  );

  const unsubCompanion = useCompanionStore.subscribe(
    (state, prev) => {
      if (
        state.personality &&
        state.personality !== prev.personality
      ) {
        syncCompanion();
      }
    },
  );

  const unsubToggles = useToggleStore.subscribe(
    (state, prev) => {
      if (state.togglesByWorkspace !== prev.togglesByWorkspace) {
        // Find which workspace(s) changed and sync them
        for (const ws of Object.keys(state.togglesByWorkspace)) {
          if (
            state.togglesByWorkspace[ws] !== prev.togglesByWorkspace[ws]
          ) {
            syncWorkspaceToggles(ws);
          }
        }
      }
    },
  );

  _unsubscribers = [unsubConfig, unsubCompanion, unsubToggles];

  return stopConfigSync;
}

/**
 * Stop all config-sync subscriptions.
 */
export function stopConfigSync(): void {
  for (const unsub of _unsubscribers) {
    unsub();
  }
  _unsubscribers = [];
  // Clear pending debounce timers
  for (const key of Object.keys(timers)) {
    clearTimeout(timers[key]);
    delete timers[key];
  }
}
