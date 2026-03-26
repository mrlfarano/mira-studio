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
import { broadcastToAgents } from "@/lib/broadcast";
import type { AgentSession } from "@/store/session-store";

const HISTORY_KEY = "mira:quickPrompt:history";
const MAX_HISTORY = 50;

export const QUICK_PROMPT_PRESETS = [
  "Continue from where you left off",
  "Run tests",
  "Fix the failing test",
  "Explain this error",
  "Summarize what you just did",
] as const;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore
  }
  return [];
}

function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}

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
  /** Command history */
  history: string[];
  /** Navigate history: -1 = older, +1 = newer */
  navigateHistory: (direction: -1 | 1) => void;
  /** Preset quick prompts */
  presets: readonly string[];
  /** Apply a preset value */
  applyPreset: (text: string) => void;
  /** Whether broadcast mode is active */
  isBroadcast: boolean;
  /** Toggle broadcast mode */
  toggleBroadcast: () => void;
  /** Send to all sessions (broadcast) */
  broadcast: () => void;
}

export function useQuickPrompt(): UseQuickPromptReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>(loadHistory);
  const historyIndexRef = useRef(-1);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const savedInputRef = useRef("");

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

    // Push to history (deduplicate the most recent entry)
    setHistory((prev) => {
      const next = prev[0] === trimmed ? prev : [trimmed, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
    historyIndexRef.current = -1;

    setIsVisible(false);
    setValue("");
    // Restore focus
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [value, targetId, sendInput]);

  const navigateHistory = useCallback(
    (direction: -1 | 1) => {
      if (history.length === 0) return;

      const prev = historyIndexRef.current;

      // Save current input when first entering history
      if (prev === -1 && direction === -1) {
        savedInputRef.current = value;
      }

      const next = prev + (direction === -1 ? 1 : -1);

      if (next < -1 || next >= history.length) return;

      historyIndexRef.current = next;
      if (next === -1) {
        setValue(savedInputRef.current);
      } else {
        setValue(history[next]);
      }
    },
    [history, value],
  );

  const applyPreset = useCallback((text: string) => {
    setValue(text);
    historyIndexRef.current = -1;
  }, []);

  const [isBroadcast, setIsBroadcast] = useState(false);
  const toggleBroadcast = useCallback(() => setIsBroadcast((b) => !b), []);

  const broadcast = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || allSessions.length < 2) return;
    const ids = allSessions.map((s) => s.id);
    void broadcastToAgents(trimmed + "\n", ids);

    setHistory((prev) => {
      const next = prev[0] === trimmed ? prev : [trimmed, ...prev].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
    historyIndexRef.current = -1;

    setIsVisible(false);
    setValue("");
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [value, allSessions]);

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
    history,
    navigateHistory,
    presets: QUICK_PROMPT_PRESETS,
    applyPreset,
    isBroadcast,
    toggleBroadcast,
    broadcast,
  };
}
