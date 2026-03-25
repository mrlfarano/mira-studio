import React, { useCallback } from "react";
import { useToggleStore } from "@/store/toggle-store.ts";
import {
  ALL_MODULE_IDS,
  MODULE_LABELS,
  type ModuleId,
} from "@/lib/profile-presets.ts";
import { syncWorkspaceToggles } from "@/store/middleware/config-sync.ts";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  padding: "12px",
  background: "#111827",
  borderRadius: "8px",
  minWidth: "220px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 10px",
  borderRadius: "6px",
  background: "#1f2937",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#e5e7eb",
};

const switchOuter = (on: boolean): React.CSSProperties => ({
  position: "relative",
  width: "36px",
  height: "20px",
  borderRadius: "10px",
  background: on ? "#6366f1" : "#4b5563",
  cursor: "pointer",
  transition: "background 0.2s",
  flexShrink: 0,
});

const switchKnob = (on: boolean): React.CSSProperties => ({
  position: "absolute",
  top: "2px",
  left: on ? "18px" : "2px",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: "#fff",
  transition: "left 0.2s",
});

const headingStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TogglePanel: React.FC = () => {
  const activeWorkspace = useToggleStore((s) => s.activeWorkspace);
  const toggles = useToggleStore(
    (s) => s.togglesByWorkspace[s.activeWorkspace] ?? {},
  );
  const setToggle = useToggleStore((s) => s.setToggle);
  const setActiveProfile = useToggleStore((s) => s.setActiveProfile);

  const handleToggle = useCallback(
    (moduleId: ModuleId) => {
      const current = toggles[moduleId] ?? false;
      setToggle(activeWorkspace, moduleId, !current);
      // Switching an individual toggle means we're now in Custom profile
      setActiveProfile("Custom");
      syncWorkspaceToggles(activeWorkspace);
    },
    [toggles, activeWorkspace, setToggle, setActiveProfile],
  );

  return (
    <div style={panelStyle}>
      <div style={headingStyle}>Modules</div>
      {ALL_MODULE_IDS.map((moduleId) => {
        const enabled = toggles[moduleId] ?? false;
        return (
          <div key={moduleId} style={rowStyle}>
            <span style={labelStyle}>{MODULE_LABELS[moduleId]}</span>
            <div
              role="switch"
              aria-checked={enabled}
              aria-label={`Toggle ${MODULE_LABELS[moduleId]}`}
              tabIndex={0}
              style={switchOuter(enabled)}
              onClick={() => handleToggle(moduleId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleToggle(moduleId);
                }
              }}
            >
              <div style={switchKnob(enabled)} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(TogglePanel);
