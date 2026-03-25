import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Command } from "@/types/command.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommandState {
  /** All registered commands */
  commands: Command[];

  /** shortcut string -> command id */
  keybindings: Map<string, string>;

  /** Whether the command palette overlay is open */
  isOpen: boolean;

  // --- actions ---
  registerCommand: (cmd: Command) => void;
  unregisterCommand: (id: string) => void;
  rebindKey: (shortcut: string, commandId: string) => void;
  executeCommand: (id: string) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addBinding(
  map: Map<string, string>,
  cmd: Command,
): Map<string, string> {
  if (!cmd.shortcut) return map;
  const next = new Map(map);
  next.set(cmd.shortcut, cmd.id);
  return next;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCommandStore = create<CommandState>()(
  devtools(
    (set, get) => ({
      commands: [],
      keybindings: new Map<string, string>(),
      isOpen: false,

      registerCommand: (cmd) =>
        set(
          (s) => {
            // Avoid duplicate registrations
            if (s.commands.some((c) => c.id === cmd.id)) return s;
            return {
              commands: [...s.commands, cmd],
              keybindings: addBinding(s.keybindings, cmd),
            };
          },
          undefined,
          "command/register",
        ),

      unregisterCommand: (id) =>
        set(
          (s) => {
            const cmd = s.commands.find((c) => c.id === id);
            const next = s.commands.filter((c) => c.id !== id);
            const kb = new Map(s.keybindings);
            if (cmd?.shortcut) kb.delete(cmd.shortcut);
            return { commands: next, keybindings: kb };
          },
          undefined,
          "command/unregister",
        ),

      rebindKey: (shortcut, commandId) =>
        set(
          (s) => {
            const kb = new Map(s.keybindings);
            // Remove any existing binding for this shortcut
            kb.set(shortcut, commandId);
            return { keybindings: kb };
          },
          undefined,
          "command/rebindKey",
        ),

      executeCommand: (id) => {
        const cmd = get().commands.find((c) => c.id === id);
        cmd?.action();
      },

      setOpen: (open) => set({ isOpen: open }, undefined, "command/setOpen"),

      toggle: () =>
        set((s) => ({ isOpen: !s.isOpen }), undefined, "command/toggle"),
    }),
    { name: "CommandStore", enabled: import.meta.env.DEV },
  ),
);
