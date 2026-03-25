/**
 * QuickPromptBar -- keyboard-first prompt bar for sending input to agent terminals.
 *
 * Activated by Cmd+Enter / Ctrl+Enter. Shows a text input that sends to the
 * active agent terminal, with an agent selector dropdown when multiple sessions
 * are active. Auto-dismisses after send and returns focus to the previous element.
 */

import { useEffect, useRef, useCallback } from "react";
import { useQuickPrompt } from "@/hooks/useQuickPrompt";

// ---------------------------------------------------------------------------
// Styles (inline, matching CommandPalette pattern)
// ---------------------------------------------------------------------------

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.35)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "12vh",
    zIndex: 10000,
  },
  container: {
    width: "min(520px, 90vw)",
    background: "var(--bg-elevated, #242b35)",
    border: "1px solid var(--border-default, #30363d)",
    borderRadius: 8,
    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderBottom: "1px solid var(--border-muted, #21262d)",
    fontSize: 12,
    color: "var(--text-muted, #6e7681)",
  },
  targetLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  agentDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--success, #3fb950)",
    flexShrink: 0,
  },
  agentName: {
    fontWeight: 600,
    color: "var(--text-secondary, #8b949e)",
    fontSize: 12,
  },
  select: {
    background: "var(--bg-surface, #1c2128)",
    border: "1px solid var(--border-muted, #21262d)",
    borderRadius: 4,
    color: "var(--text-secondary, #8b949e)",
    fontSize: 12,
    padding: "2px 6px",
    outline: "none",
    cursor: "pointer",
  },
  shortcutHint: {
    fontSize: 11,
    color: "var(--text-muted, #6e7681)",
    fontFamily: "monospace",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 0,
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    fontSize: 14,
    background: "transparent",
    border: "none",
    color: "var(--text-primary, #e6edf3)",
    outline: "none",
    fontFamily: "inherit",
  },
  sendButton: {
    padding: "6px 14px",
    marginRight: 8,
    fontSize: 12,
    fontWeight: 600,
    background: "var(--accent, #6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.4,
    cursor: "default",
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickPromptBar() {
  const {
    isVisible,
    close,
    value,
    setValue,
    send,
    targetSession,
    allSessions,
    setTargetSessionId,
  } = useQuickPrompt();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when visible
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isVisible]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [send, close],
  );

  const handleOverlayClick = useCallback(() => {
    close();
  }, [close]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    [],
  );

  if (!isVisible) return null;

  const canSend = value.trim().length > 0 && targetSession !== null;
  const showDropdown = allSessions.length > 1;

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-label="Quick Prompt Bar"
    >
      <div style={styles.container} onClick={handleContainerClick}>
        {/* Header: target agent + shortcut hint */}
        <div style={styles.header}>
          <div style={styles.targetLabel}>
            {targetSession ? (
              <>
                <span style={styles.agentDot} />
                {showDropdown ? (
                  <select
                    style={styles.select}
                    value={targetSession.id}
                    onChange={(e) => setTargetSessionId(e.target.value)}
                  >
                    {allSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.agentName} ({s.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={styles.agentName}>
                    {targetSession.agentName}
                  </span>
                )}
              </>
            ) : (
              <span>No active session</span>
            )}
          </div>
          <span style={styles.shortcutHint}>Esc to dismiss</span>
        </div>

        {/* Input row */}
        <div style={styles.inputRow}>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder={
              targetSession
                ? `Send to ${targetSession.agentName}...`
                : "No session available"
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!targetSession}
          />
          <button
            style={{
              ...styles.sendButton,
              ...(canSend ? {} : styles.sendButtonDisabled),
            }}
            onClick={canSend ? send : undefined}
            disabled={!canSend}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
