/**
 * Command Palette types.
 *
 * Every registerable action in the app implements the Command interface.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CommandCategory = "Navigation" | "Panels" | "Agent" | "Config";

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export interface Command {
  /** Unique identifier, e.g. "palette.toggle" */
  id: string;

  /** Human-readable label shown in the palette */
  label: string;

  /** Optional longer description */
  description?: string;

  /** Default keyboard shortcut, e.g. "Ctrl+K" or "Meta+K" */
  shortcut?: string;

  /** Grouping category */
  category: CommandCategory;

  /** Callback executed when the command is invoked */
  action: () => void;
}
