/**
 * Type-safe selectors with useShallow for Zustand store performance.
 *
 * Re-exports commonly used derived state so consumers don't need to
 * import individual stores or worry about unnecessary re-renders.
 */

import { useShallow } from "zustand/react/shallow";
import { useToggleStore } from "@/store/toggle-store.ts";
import type { ProfileName } from "@/store/toggle-store.ts";
import { useCompanionStore } from "@/store/companion-store.ts";
import type { CompanionMessage } from "@/store/companion-store.ts";
import { useSessionStore } from "@/store/session-store.ts";
import type { AgentSession } from "@/store/session-store.ts";
import { useConfigStore } from "@/store/config-store.ts";
import type { MiraConfig, CompanionConfig } from "@/types/config.ts";

// ---------------------------------------------------------------------------
// Toggle selectors
// ---------------------------------------------------------------------------

/** Current toggle map for the active workspace */
export function useActiveToggles(): Record<string, boolean> {
  return useToggleStore(
    useShallow((s) => s.togglesByWorkspace[s.activeWorkspace] ?? {}),
  );
}

/** Active profile name */
export function useActiveProfile(): ProfileName {
  return useToggleStore((s) => s.activeProfile);
}

/** Active workspace name */
export function useActiveWorkspace(): string {
  return useToggleStore((s) => s.activeWorkspace);
}

/** Whether a specific module is toggled on in the active workspace */
export function useIsModuleEnabled(moduleId: string): boolean {
  return useToggleStore(
    (s) => s.togglesByWorkspace[s.activeWorkspace]?.[moduleId] ?? false,
  );
}

// ---------------------------------------------------------------------------
// Companion selectors
// ---------------------------------------------------------------------------

/** All companion messages */
export function useCompanionMessages(): CompanionMessage[] {
  return useCompanionStore(useShallow((s) => s.messages));
}

/** Whether companion panel is expanded */
export function useCompanionExpanded(): boolean {
  return useCompanionStore((s) => s.isExpanded);
}

/** Companion personality config */
export function useCompanionPersonality(): CompanionConfig | null {
  return useCompanionStore((s) => s.personality);
}

// ---------------------------------------------------------------------------
// Session selectors
// ---------------------------------------------------------------------------

/** All active sessions as an array */
export function useActiveSessions(): AgentSession[] {
  return useSessionStore(
    useShallow((s) => Object.values(s.sessions)),
  );
}

/** Single session by id */
export function useSession(id: string): AgentSession | undefined {
  return useSessionStore((s) => s.sessions[id]);
}

/** Count of currently running sessions */
export function useRunningSessionCount(): number {
  return useSessionStore(
    (s) => Object.values(s.sessions).filter((sess) => sess.status === "running").length,
  );
}

// ---------------------------------------------------------------------------
// Config selectors
// ---------------------------------------------------------------------------

/** Cached MiraConfig from server */
export function useMiraConfig(): MiraConfig | null {
  return useConfigStore((s) => s.config);
}

/** Sync status */
export function useSyncStatus(): {
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: number | null;
} {
  return useConfigStore(
    useShallow((s) => ({
      isSyncing: s.isSyncing,
      syncError: s.syncError,
      lastSyncedAt: s.lastSyncedAt,
    })),
  );
}
