import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CompanionConfig } from "@/types/config.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanionMessage {
  id: string;
  role: "user" | "companion";
  text: string;
  timestamp: number;
}

export interface CompanionState {
  /** Chat messages with the companion */
  messages: CompanionMessage[];

  /** Whether the companion panel is expanded */
  isExpanded: boolean;

  /** Server-side personality / config mirror */
  personality: CompanionConfig | null;

  // --- actions ---
  addMessage: (msg: CompanionMessage) => void;
  clearMessages: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setPersonality: (config: CompanionConfig) => void;

  /** Bulk-replace state — used by hydration & conflict resolution */
  _replace: (partial: Partial<CompanionState>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCompanionStore = create<CompanionState>()(
  devtools(
    (set) => ({
      messages: [],
      isExpanded: false,
      personality: null,

      addMessage: (msg) =>
        set(
          (s) => ({ messages: [...s.messages, msg] }),
          undefined,
          "companion/addMessage",
        ),

      clearMessages: () =>
        set({ messages: [] }, undefined, "companion/clearMessages"),

      setExpanded: (expanded) =>
        set({ isExpanded: expanded }, undefined, "companion/setExpanded"),

      toggleExpanded: () =>
        set(
          (s) => ({ isExpanded: !s.isExpanded }),
          undefined,
          "companion/toggleExpanded",
        ),

      setPersonality: (config) =>
        set({ personality: config }, undefined, "companion/setPersonality"),

      _replace: (partial) => set(partial, undefined, "companion/_replace"),
    }),
    { name: "CompanionStore", enabled: import.meta.env.DEV },
  ),
);
