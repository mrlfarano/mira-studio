import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionStatus = "idle" | "running" | "paused" | "error" | "done";

export interface AgentSession {
  id: string;
  agentName: string;
  status: SessionStatus;
  startedAt: number;
  updatedAt: number;
  /** Optional progress 0-100 */
  progress?: number;
  /** Last error message if status === "error" */
  error?: string;
}

/** Lightweight record for a terminal PTY session. */
export interface TerminalSession {
  id: string;
  label: string;
  /** Matching panel id in the layout store */
  panelId: string;
  createdAt: number;
}

export interface SessionState {
  sessions: Record<string, AgentSession>;

  /** Currently focused / active session id */
  activeSessionId: string | null;

  /** Map of active terminal PTY sessions keyed by session id */
  terminalSessions: Record<string, TerminalSession>;
  /** Currently focused / active terminal session id */
  activeTerminalId: string | null;

  // --- actions ---
  upsertSession: (session: AgentSession) => void;
  removeSession: (id: string) => void;
  setSessionStatus: (id: string, status: SessionStatus) => void;
  setActiveSession: (id: string | null) => void;
  clearSessions: () => void;

  /** Create a new terminal session entry. */
  createTerminalSession: (session: TerminalSession) => void;
  /** Remove a terminal session by id. */
  closeTerminalSession: (id: string) => void;
  /** Set the active (focused) terminal session. */
  setActiveTerminal: (id: string | null) => void;

  /** Bulk-replace state — used by hydration */
  _replace: (partial: Partial<SessionState>) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSessionStore = create<SessionState>()(
  devtools(
    (set) => ({
      sessions: {},
      activeSessionId: null,
      terminalSessions: {},
      activeTerminalId: null,

      upsertSession: (session) =>
        set(
          (s) => ({
            sessions: { ...s.sessions, [session.id]: session },
          }),
          undefined,
          "session/upsert",
        ),

      removeSession: (id) =>
        set(
          (s) => {
            const { [id]: _, ...rest } = s.sessions;
            void _;
            return { sessions: rest };
          },
          undefined,
          "session/remove",
        ),

      setActiveSession: (id) =>
        set({ activeSessionId: id }, undefined, "session/setActive"),

      setSessionStatus: (id, status) =>
        set(
          (s) => {
            const existing = s.sessions[id];
            if (!existing) return s;
            return {
              sessions: {
                ...s.sessions,
                [id]: { ...existing, status, updatedAt: Date.now() },
              },
            };
          },
          undefined,
          "session/setStatus",
        ),

      clearSessions: () => set({ sessions: {} }, undefined, "session/clear"),

      createTerminalSession: (session) =>
        set(
          (s) => ({
            terminalSessions: { ...s.terminalSessions, [session.id]: session },
            activeTerminalId: session.id,
          }),
          undefined,
          "session/createTerminal",
        ),

      closeTerminalSession: (id) =>
        set(
          (s) => {
            const { [id]: _, ...rest } = s.terminalSessions;
            void _;
            const remainingIds = Object.keys(rest);
            return {
              terminalSessions: rest,
              activeTerminalId:
                s.activeTerminalId === id
                  ? remainingIds[remainingIds.length - 1] ?? null
                  : s.activeTerminalId,
            };
          },
          undefined,
          "session/closeTerminal",
        ),

      setActiveTerminal: (id) =>
        set({ activeTerminalId: id }, undefined, "session/setActiveTerminal"),

      _replace: (partial) => set(partial, undefined, "session/_replace"),
    }),
    { name: "SessionStore", enabled: import.meta.env.DEV },
  ),
);
