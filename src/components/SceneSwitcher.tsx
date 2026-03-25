import React, { useCallback, useEffect, useState } from "react";
import { useSceneStore } from "@/store/scene-store.ts";
import { useToggleStore } from "@/store/toggle-store.ts";

// ---------------------------------------------------------------------------
// SceneSwitcher — dropdown + keyboard shortcuts for workspace scene switching
// ---------------------------------------------------------------------------

const SceneSwitcher: React.FC = () => {
  const scenes = useSceneStore((s) => s.scenes);
  const activeScene = useSceneStore((s) => s.activeScene);
  const switchScene = useSceneStore((s) => s.switchScene);
  const swapWorkspaces = useSceneStore((s) => s.swapWorkspaces);
  const activeWorkspace = useToggleStore((s) => s.activeWorkspace);

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // --- Keyboard shortcuts ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+Tab: swap workspaces within active scene
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        swapWorkspaces();
        return;
      }

      // Scene-specific shortcuts (e.g. Ctrl+1, Ctrl+2)
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const matched = scenes.find((s) => {
          if (!s.shortcut) return false;
          const parts = s.shortcut.toLowerCase().split("+");
          const key = parts[parts.length - 1];
          return key === e.key;
        });
        if (matched) {
          e.preventDefault();
          void handleSwitch(matched.id);
        }
      }
    },
    [scenes, swapWorkspaces],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // --- Scene switching with loading state ---
  const handleSwitch = async (id: string) => {
    setIsSwitching(true);
    try {
      await switchScene(id);
    } finally {
      setIsSwitching(false);
      setIsOpen(false);
    }
  };

  // --- Derive active scene info ---
  const currentScene = scenes.find((s) => s.id === activeScene);

  return (
    <div className="scene-switcher">
      <button
        className="scene-switcher__trigger"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isSwitching}
        title="Switch workspace scene (Ctrl+Tab to swap)"
      >
        <span className="scene-switcher__icon" aria-hidden="true">
          {"[S]"}
        </span>
        <span className="scene-switcher__label">
          {isSwitching
            ? "Switching..."
            : currentScene
              ? currentScene.name
              : "No Scene"}
        </span>
        {currentScene && (
          <span className="scene-switcher__workspace-indicator">
            {activeWorkspace}
          </span>
        )}
      </button>

      {isOpen && (
        <ul className="scene-switcher__menu" role="listbox">
          {scenes.map((scene) => {
            const isActive = scene.id === activeScene;
            return (
              <li key={scene.id} role="option" aria-selected={isActive}>
                <button
                  className={`scene-switcher__item ${isActive ? "scene-switcher__item--active" : ""}`}
                  onClick={() => void handleSwitch(scene.id)}
                  disabled={isSwitching}
                >
                  <span className="scene-switcher__item-name">
                    {scene.name}
                  </span>
                  {scene.description && (
                    <span className="scene-switcher__item-desc">
                      {scene.description}
                    </span>
                  )}
                  {scene.shortcut && (
                    <kbd className="scene-switcher__shortcut">
                      {scene.shortcut}
                    </kbd>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default React.memo(SceneSwitcher);
