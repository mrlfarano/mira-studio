/**
 * Hook managing Quick-Prompt Bar visibility, target session, and send logic.
 *
 * Uses useTerminalSocket to send input to the active PTY session and
 * session-store for active session tracking.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/store/session-store";
import { useCommandStore } from "@/store/command-store";
import { useTerminalSocket } from "@/hooks/useTerminalSocket";
import type { AgentSession } from "@/store/session-store";

export interface UseQuickPromptReturn {
  /** Whether the prompt bar is visible */
  isVisible: boolean;
  /** Open the prompt bar */
  open: () => void;
  /** Close the prompt bar without sending */
  close: () => void;
  /** Current input value */
  value: string;
  /** Update input value */
  setValue: (v: string) => void;
  /** Send current value to the targeted session */
  send: () => void;
  /** The session currently targeted */
  targetSession: AgentSession | null;
  /** All available sessions for the dropdown */
  allSessions: AgentSession[];
  /** Change the targeted session */
  setTargetSessionId: (id: string) => void;
}

export function useQuickPrompt(): UseQuickPromptReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [value, setValue] = useState("");
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const sessions = useSessionStore((s) => s.sessions);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);

  // Local override for target — falls back to activeSessionId
  const [localTargetId, setLocalTargetId] = useState<string | null>(null);
  const targetId = localTargetId ?? activeSessionId;

  const allSessions = Object.values(sessions);
  const targetSession = targetId ? (sessions[targetId] ?? null) : null;

  const { sendInput } = useTerminalSocket(targetId);

  const open = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setIsVisible(true);
    setValue("");
    setLocalTargetId(null);
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
    setValue("");
    // Restore focus to previous element
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, []);

  const send = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || !targetId) return;
    sendInput(trimmed + "\n");
    setIsVisible(false);
    setValue("");
    // Restore focus
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [value, targetId, sendInput]);

  const setTargetSessionId = useCallback(
    (id: string) => {
      setLocalTargetId(id);
      setActiveSession(id);
    },
    [setActiveSession],
  );

  // Register command for Cmd/Ctrl+Enter shortcut
  useEffect(() => {
    const { registerCommand, unregisterCommand } = useCommandStore.getState();

    registerCommand({
      id: "quickPrompt.toggle.meta",
      label: "Quick Prompt",
      description: "Open the quick prompt bar to send input to an agent",
      shortcut: "Meta+Enter",
      category: "Agent",
      action: () => {
        const current = useSessionStore.getState();
        // Only open if there are sessions
        if (Object.keys(current.sessions).length > 0) {
          // Toggle behavior
          setIsVisible((prev) => {
            if (prev) {
              previousFocusRef.current?.focus();
              previousFocusRef.current = null;
              return false;
            }
            previousFocusRef.current =
              document.activeElement as HTMLElement | null;
            setValue("");
            setLocalTargetId(null);
            return true;
          });
        }
      },
    });

    registerCommand({
      id: "quickPrompt.toggle.ctrl",
      label: "Quick Prompt (Ctrl)",
      shortcut: "Ctrl+Enter",
      category: "Agent",
      action: () => {
        const current = useSessionStore.getState();
        if (Object.keys(current.sessions).length > 0) {
          setIsVisible((prev) => {
            if (prev) {
              previousFocusRef.current?.focus();
              previousFocusRef.current = null;
              return false;
            }
            previousFocusRef.current =
              document.activeElement as HTMLElement | null;
            setValue("");
            setLocalTargetId(null);
            return true;
          });
        }
      },
    });

    return () => {
      unregisterCommand("quickPrompt.toggle.meta");
      unregisterCommand("quickPrompt.toggle.ctrl");
    };
  }, []);

  return {
    isVisible,
    open,
    close,
    value,
    setValue,
    send,
    targetSession,
    allSessions,
    setTargetSessionId,
  };
}
