import React, { useCallback } from "react";
import { useToggleStore } from "@/store/toggle-store.ts";
import {
  PROFILE_PRESETS,
  PROFILE_DESCRIPTIONS,
  getTogglesForProfile,
  type ProfileName,
} from "@/lib/profile-presets.ts";
import { syncWorkspaceToggles } from "@/store/middleware/config-sync.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESET_NAMES = Object.keys(PROFILE_PRESETS) as Exclude<
  ProfileName,
  "Custom"
>[];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px",
  background: "#111827",
  borderRadius: "8px",
  minWidth: "220px",
};

const headingStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "2px",
};

const buttonBase: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  padding: "10px 14px",
  border: "2px solid transparent",
  borderRadius: "8px",
  background: "#1f2937",
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
  textAlign: "left",
  width: "100%",
};

const activeIndicator: React.CSSProperties = {
  borderColor: "#6366f1",
  background: "#1e1b4b",
};

const nameStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#e5e7eb",
};

const descStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
  marginTop: "2px",
};

const customBadge: React.CSSProperties = {
  fontSize: "11px",
  color: "#a78bfa",
  fontStyle: "italic",
  padding: "4px 0",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProfileSwitcher: React.FC = () => {
  const activeProfile = useToggleStore((s) => s.activeProfile);
  const activeWorkspace = useToggleStore((s) => s.activeWorkspace);
  const setActiveProfile = useToggleStore((s) => s.setActiveProfile);
  const setTogglesForWorkspace = useToggleStore(
    (s) => s.setTogglesForWorkspace,
  );

  const handleSelect = useCallback(
    (profile: ProfileName) => {
      if (profile === activeProfile) return;

      setActiveProfile(profile);
      const newToggles = getTogglesForProfile(profile);
      setTogglesForWorkspace(activeWorkspace, newToggles);
      syncWorkspaceToggles(activeWorkspace);
    },
    [activeProfile, activeWorkspace, setActiveProfile, setTogglesForWorkspace],
  );

  return (
    <div style={containerStyle}>
      <div style={headingStyle}>Workspace Profile</div>

      {PRESET_NAMES.map((name) => {
        const isActive = activeProfile === name;
        return (
          <button
            key={name}
            type="button"
            style={{
              ...buttonBase,
              ...(isActive ? activeIndicator : {}),
            }}
            aria-pressed={isActive}
            onClick={() => handleSelect(name)}
          >
            <span style={nameStyle}>{name}</span>
            <span style={descStyle}>{PROFILE_DESCRIPTIONS[name]}</span>
          </button>
        );
      })}

      {activeProfile === "Custom" && (
        <div style={customBadge}>Custom -- toggle modules individually</div>
      )}
    </div>
  );
};

export default React.memo(ProfileSwitcher);
