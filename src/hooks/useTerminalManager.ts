/**
 * Hook that coordinates session-store, layout-store, and PTY WebSocket
 * to manage multiple terminal sessions.
 */

import { useCallback } from "react";
import { useSessionStore, type TerminalSession } from "@/store/session-store";
import { useLayoutStore } from "@/store/layout-store";
import type { PanelConfig } from "@/types/panel";

let terminalCounter = 0;

export interface UseTerminalManagerReturn {
  /** All active terminal sessions, ordered by creation time. */
  terminalSessions: TerminalSession[];
  /** The currently focused terminal session id. */
  activeTerminalId: string | null;
  /** Create a new terminal: spawns PTY session + adds panel to layout. */
  createTerminal: () => string;
  /** Close a terminal: kills PTY + removes panel + removes session. */
  closeTerminal: (id: string) => void;
  /** Switch focus to a specific terminal session. */
  setActiveTerminal: (id: string) => void;
}

export function useTerminalManager(): UseTerminalManagerReturn {
  const terminalSessionsMap = useSessionStore((s) => s.terminalSessions);
  const activeTerminalId = useSessionStore((s) => s.activeTerminalId);
  const createTerminalSession = useSessionStore(
    (s) => s.createTerminalSession,
  );
  const closeTerminalSession = useSessionStore((s) => s.closeTerminalSession);
  const setActiveTerminalAction = useSessionStore((s) => s.setActiveTerminal);

  const addPanel = useLayoutStore((s) => s.addPanel);
  const removePanel = useLayoutStore((s) => s.removePanel);
  const bringToFront = useLayoutStore((s) => s.bringToFront);

  const terminalSessions = Object.values(terminalSessionsMap).sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  const createTerminal = useCallback(() => {
    terminalCounter += 1;
    const sessionId = `term-${Date.now()}-${terminalCounter}`;
    const panelId = `panel-terminal-${sessionId}`;
    const label = `Terminal ${terminalCounter}`;

    // Add a panel to the layout
    const panel: PanelConfig = {
      id: panelId,
      type: "terminal",
      title: label,
      x: (terminalCounter % 6) * 2,
      y: Infinity, // Place at bottom
      w: 6,
      h: 4,
      props: { sessionId },
    };
    addPanel(panel);

    // Track in session store
    createTerminalSession({
      id: sessionId,
      label,
      panelId,
      createdAt: Date.now(),
    });

    return sessionId;
  }, [addPanel, createTerminalSession]);

  const closeTerminal = useCallback(
    (id: string) => {
      const session = terminalSessionsMap[id];
      if (session) {
        // Remove the panel from layout
        removePanel(session.panelId);
      }
      // Remove from session store (also updates activeTerminalId)
      closeTerminalSession(id);
    },
    [terminalSessionsMap, removePanel, closeTerminalSession],
  );

  const setActiveTerminal = useCallback(
    (id: string) => {
      setActiveTerminalAction(id);
      // Bring the associated panel to front
      const session = terminalSessionsMap[id];
      if (session) {
        bringToFront(session.panelId);
      }
    },
    [setActiveTerminalAction, terminalSessionsMap, bringToFront],
  );

  return {
    terminalSessions,
    activeTerminalId,
    createTerminal,
    closeTerminal,
    setActiveTerminal,
  };
}
