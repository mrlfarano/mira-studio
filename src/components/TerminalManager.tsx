/**
 * TerminalManager -- manages multiple terminal panels.
 *
 * Provides:
 * - "New Terminal" button to spawn a PTY session and add a terminal panel
 * - Session list showing all active terminals with status indicators
 * - Close terminal action (kills PTY + removes panel)
 * - Tab-style switching between terminal sessions
 */

import React, { useCallback } from "react";
import { useTerminalManager } from "@/hooks/useTerminalManager";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "8px",
  background: "#111827",
  borderRadius: "6px",
  border: "1px solid #1f2937",
  fontSize: "13px",
  color: "#d1d5db",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "4px",
};

const newBtnStyle: React.CSSProperties = {
  background: "#2563eb",
  border: "none",
  borderRadius: "4px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
  padding: "4px 10px",
  lineHeight: "18px",
};

const tabListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  maxHeight: "240px",
  overflowY: "auto",
};

const tabBaseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "5px 8px",
  borderRadius: "4px",
  cursor: "pointer",
  border: "none",
  width: "100%",
  textAlign: "left",
  fontSize: "12px",
  lineHeight: "18px",
  transition: "background 0.15s ease",
};

const closeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#9ca3af",
  cursor: "pointer",
  fontSize: "14px",
  lineHeight: 1,
  padding: "0 2px",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TerminalManager: React.FC = () => {
  const {
    terminalSessions,
    activeTerminalId,
    createTerminal,
    closeTerminal,
    setActiveTerminal,
  } = useTerminalManager();

  const handleNew = useCallback(() => {
    createTerminal();
  }, [createTerminal]);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: "13px" }}>Terminals</span>
        <button
          onClick={handleNew}
          style={newBtnStyle}
          title="Open a new terminal session"
        >
          + New Terminal
        </button>
      </div>

      {/* Session list */}
      {terminalSessions.length === 0 ? (
        <div style={{ color: "#6b7280", fontSize: "12px", padding: "4px 0" }}>
          No active terminals. Click &quot;New Terminal&quot; to start one.
        </div>
      ) : (
        <div style={tabListStyle}>
          {terminalSessions.map((session) => {
            const isActive = session.id === activeTerminalId;
            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveTerminal(session.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActiveTerminal(session.id);
                  }
                }}
                style={{
                  ...tabBaseStyle,
                  background: isActive ? "#1e3a5f" : "#1f2937",
                  color: isActive ? "#93c5fd" : "#d1d5db",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* Status dot */}
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: isActive ? "#22c55e" : "#6b7280",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {session.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(session.id);
                  }}
                  style={closeBtnStyle}
                  title={`Close ${session.label}`}
                  aria-label={`Close ${session.label}`}
                >
                  \u00d7
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default React.memo(TerminalManager);
