import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useCommandStore } from "@/store/command-store.ts";
import { useCompanionStore } from "@/store/companion-store.ts";
import { useConfigStore } from "@/store/config-store.ts";
import { useLayoutStore } from "@/store/layout-store.ts";
import { useSessionStore } from "@/store/session-store.ts";
import { useHotkeys } from "@/hooks/useHotkeys.ts";
import type { Command, CommandCategory } from "@/types/command.ts";

// ---------------------------------------------------------------------------
// Fuzzy match helper
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, text: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ---------------------------------------------------------------------------
// Default commands — registered once on mount
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: CommandCategory[] = [
  "Navigation",
  "Panels",
  "Agent",
  "Config",
];

function useDefaultCommands() {
  const registerCommand = useCommandStore((s) => s.registerCommand);
  const toggle = useCommandStore((s) => s.toggle);

  useEffect(() => {
    const defaults: Command[] = [
      {
        id: "palette.toggle",
        label: "Toggle Command Palette",
        description: "Open or close the command palette",
        shortcut: "Meta+K",
        category: "Navigation",
        action: () => useCommandStore.getState().toggle(),
      },
      {
        id: "palette.toggle.ctrl",
        label: "Toggle Command Palette (Ctrl)",
        shortcut: "Ctrl+K",
        category: "Navigation",
        action: () => useCommandStore.getState().toggle(),
      },
      {
        id: "companion.toggle",
        label: "Toggle Companion",
        description: "Show or hide the Mira companion panel",
        shortcut: "Meta+Shift+C",
        category: "Panels",
        action: () => {
          useCompanionStore.getState().toggleExpanded();
        },
      },
      {
        id: "terminal.new",
        label: "Open New Terminal",
        description: "Launch a new terminal instance",
        shortcut: "Meta+Shift+T",
        category: "Panels",
        action: () => {
          const id = `terminal-${Date.now()}`;
          useLayoutStore.getState().addPanel({
            id,
            type: "terminal",
            title: "Terminal",
            x: 0,
            y: 0,
            w: 6,
            h: 4,
            props: { sessionId: id },
          });
        },
      },
      {
        id: "kanban.open",
        label: "Open Kanban Board",
        description: "Add a Kanban board panel",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `kanban-${Date.now()}`,
            type: "kanban",
            title: "Kanban Board",
            x: 0,
            y: 4,
            w: 10,
            h: 3,
          });
        },
      },
      {
        id: "si.open",
        label: "Open SI Panel",
        description: "Show the Self-Improvement panel",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `si-${Date.now()}`,
            type: "si",
            title: "Self-Improvement",
            x: 6,
            y: 0,
            w: 6,
            h: 4,
          });
        },
      },
      {
        id: "journal.open",
        label: "Open Build Journal",
        description: "Show the build journal timeline",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `journal-${Date.now()}`,
            type: "journal",
            title: "Build Journal",
            x: 0,
            y: 4,
            w: 6,
            h: 3,
          });
        },
      },
      {
        id: "deploy.open",
        label: "Open Deploy Panel",
        description: "One-click deploy via MCP tool invocation",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `deploy-${Date.now()}`,
            type: "deploy",
            title: "Deploy",
            x: 0,
            y: 4,
            w: 6,
            h: 3,
          });
        },
      },
      {
        id: "observability.open",
        label: "Open Observability",
        description: "Show process list, port health, and agent history",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `observability-${Date.now()}`,
            type: "observability",
            title: "Observability",
            x: 0,
            y: 4,
            w: 8,
            h: 4,
          });
        },
      },
      {
        id: "replay.open",
        label: "Open Session Replay",
        description: "Browse and replay recorded terminal sessions",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `replay-${Date.now()}`,
            type: "replay",
            title: "Session Replay",
            x: 0,
            y: 4,
            w: 8,
            h: 4,
          });
        },
      },
      {
        id: "project-map.open",
        label: "Open Project Map",
        description: "Visualise codebase file tree with git change frequency",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `project-map-${Date.now()}`,
            type: "project-map",
            title: "Project Map",
            x: 0,
            y: 4,
            w: 8,
            h: 4,
          });
        },
      },
      {
        id: "registry.open",
        label: "Open Community Registry",
        description: "Browse and install community workspace configs",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `registry-${Date.now()}`,
            type: "registry",
            title: "Community Registry",
            x: 0,
            y: 4,
            w: 8,
            h: 4,
          });
        },
      },
      {
        id: "pair.open",
        label: "Open Pair Mode",
        description: "Real-time shared workspace with another developer",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `pair-${Date.now()}`,
            type: "pair",
            title: "Pair Mode",
            x: 0,
            y: 4,
            w: 6,
            h: 5,
          });
        },
      },
      {
        id: "spark.open",
        label: "Open Spark Canvas",
        description: "Freeform whiteboard for brainstorming and ideation",
        category: "Panels",
        action: () => {
          useLayoutStore.getState().addPanel({
            id: `spark-${Date.now()}`,
            type: "spark",
            title: "Spark Canvas",
            x: 0,
            y: 4,
            w: 8,
            h: 5,
          });
        },
      },
      {
        id: "agent.broadcast",
        label: "Broadcast to All Agents",
        description: "Open Quick Prompt in broadcast mode",
        category: "Agent",
        action: () => {
          // Open quick prompt — broadcast mode will be toggled by user
          const current = useSessionStore.getState();
          if (Object.keys(current.sessions).length >= 2) {
            useCommandStore.getState().setOpen(false);
            // Trigger the quick prompt toggle via its command
            const qp = useCommandStore.getState().commands.find(
              (c) => c.id === "quickPrompt.toggle.meta",
            );
            qp?.action();
          }
        },
      },
      {
        id: "profile.switch",
        label: "Switch Profile",
        description: "Cycle between Minimal / Balanced / FullSend profiles",
        shortcut: "Meta+Shift+P",
        category: "Config",
        action: () => {
          const profiles = ["Minimal", "Balanced", "FullSend"] as const;
          const current = useConfigStore.getState().config?.activeProfile;
          const idx = profiles.indexOf(current as typeof profiles[number]);
          const next = profiles[(idx + 1) % profiles.length];
          useConfigStore.getState().patchConfig({ activeProfile: next });
        },
      },
    ];

    for (const cmd of defaults) {
      registerCommand(cmd);
    }
    // Only register once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep toggle reference stable for the Ctrl/Meta shortcut
  void toggle;
}

// ---------------------------------------------------------------------------
// Styles (inline to stay self-contained)
// ---------------------------------------------------------------------------

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.55)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "15vh",
    zIndex: 9999,
  },
  container: {
    width: "min(560px, 90vw)",
    background: "#1e1e1e",
    border: "1px solid #3a3a3a",
    borderRadius: 8,
    boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
    maxHeight: "60vh",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 15,
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #3a3a3a",
    color: "#ffffffde",
    outline: "none",
    fontFamily: "inherit",
  },
  list: {
    overflowY: "auto" as const,
    flex: 1,
  },
  categoryHeader: {
    padding: "8px 16px 4px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    color: "#888",
    letterSpacing: "0.05em",
  },
  item: (active: boolean) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    cursor: "pointer",
    background: active ? "#2a2d35" : "transparent",
    color: "#ffffffde",
    fontSize: 14,
  }),
  shortcut: {
    fontSize: 12,
    color: "#888",
    background: "#2a2a2a",
    padding: "2px 6px",
    borderRadius: 4,
    fontFamily: "monospace",
  },
  empty: {
    padding: "24px 16px",
    textAlign: "center" as const,
    color: "#666",
    fontSize: 14,
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  useHotkeys();
  useDefaultCommands();

  const isOpen = useCommandStore((s) => s.isOpen);
  const commands = useCommandStore((s) => s.commands);
  const setOpen = useCommandStore((s) => s.setOpen);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter out the duplicate Ctrl palette toggle from the visible list
  const visibleCommands = useMemo(
    () => commands.filter((c) => c.id !== "palette.toggle.ctrl"),
    [commands],
  );

  // Filtered + grouped
  const filtered = useMemo(() => {
    const matched = query
      ? visibleCommands.filter(
          (c) =>
            fuzzyMatch(query, c.label) ||
            fuzzyMatch(query, c.description ?? "") ||
            fuzzyMatch(query, c.category),
        )
      : visibleCommands;

    // Group by category in a stable order
    const grouped: { category: CommandCategory; items: Command[] }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = matched.filter((c) => c.category === cat);
      if (items.length > 0) grouped.push({ category: cat, items });
    }
    return grouped;
  }, [query, visibleCommands]);

  const flatItems = useMemo(
    () => filtered.flatMap((g) => g.items),
    [filtered],
  );

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      // Focus after paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Clamp active index
  useEffect(() => {
    if (activeIndex >= flatItems.length) {
      setActiveIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const runCommand = useCallback(
    (cmd: Command) => {
      setOpen(false);
      cmd.action();
    },
    [setOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter": {
          e.preventDefault();
          const cmd = flatItems[activeIndex];
          if (cmd) runCommand(cmd);
          break;
        }
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [flatItems, activeIndex, runCommand, setOpen],
  );

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div
      style={styles.overlay}
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Command Palette"
    >
      <div
        style={styles.container}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          style={styles.input}
          placeholder="Type a command..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
        />
        <div ref={listRef} style={styles.list}>
          {flatItems.length === 0 && (
            <div style={styles.empty}>No matching commands</div>
          )}
          {filtered.map((group) => (
            <div key={group.category}>
              <div style={styles.categoryHeader}>{group.category}</div>
              {group.items.map((cmd) => {
                const idx = flatIndex++;
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={cmd.id}
                    data-active={isActive}
                    style={styles.item(isActive)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => runCommand(cmd)}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd style={styles.shortcut}>
                        {cmd.shortcut.replace("Meta", "\u2318")}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
