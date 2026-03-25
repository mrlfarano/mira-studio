import { useEffect } from "react";
import { useCommandStore } from "@/store/command-store.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a KeyboardEvent into the same format used by Command.shortcut */
function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.metaKey) parts.push("Meta");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  // Avoid duplicating modifier-only presses
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!["Control", "Meta", "Alt", "Shift"].includes(e.key)) {
    parts.push(key);
  }

  return parts.join("+");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Attaches a single global keydown listener that resolves shortcuts registered
 * in the command store and executes the matching command.
 *
 * Mount this once near the root of the React tree (e.g. in App or a provider).
 */
export function useHotkeys(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const shortcut = eventToShortcut(e);
      const { keybindings, executeCommand } = useCommandStore.getState();
      const commandId = keybindings.get(shortcut);
      if (commandId) {
        e.preventDefault();
        e.stopPropagation();
        executeCommand(commandId);
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);
}
