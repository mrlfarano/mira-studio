import React, { useEffect, useCallback } from "react";
import { useThemeStore } from "@/store/theme-store.ts";
import type { ThemeConfig } from "@/types/theme.ts";

// ---------------------------------------------------------------------------
// Swatch preview — renders the key palette colors for a theme
// ---------------------------------------------------------------------------

const ThemeSwatch: React.FC<{ theme: ThemeConfig }> = ({ theme }) => {
  const colors = [
    theme.variables["--bg-primary"],
    theme.variables["--bg-secondary"],
    theme.variables["--accent"],
    theme.variables["--text-primary"],
    theme.variables["--success"],
  ];

  return (
    <div className="theme-swatch">
      {colors.map((color, i) => (
        <div
          key={i}
          className="theme-swatch__color"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Theme card — one card per available theme
// ---------------------------------------------------------------------------

interface ThemeCardProps {
  theme: ThemeConfig;
  isActive: boolean;
  onApply: (id: string) => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isActive, onApply }) => {
  const handleApply = useCallback(() => {
    onApply(theme.id);
  }, [onApply, theme.id]);

  return (
    <div
      className={`theme-card ${isActive ? "theme-card--active" : ""}`}
      data-testid={`theme-card-${theme.id}`}
    >
      <ThemeSwatch theme={theme} />
      <div className="theme-card__info">
        <span className="theme-card__name">{theme.name}</span>
        <span className="theme-card__author">by {theme.author}</span>
      </div>
      <button
        className={`theme-card__btn ${isActive ? "theme-card__btn--active" : ""}`}
        onClick={handleApply}
        disabled={isActive}
      >
        {isActive ? "Active" : "Apply"}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ThemeMarketplace — grid of theme cards
// ---------------------------------------------------------------------------

export interface ThemeMarketplaceProps {
  className?: string;
}

const ThemeMarketplace: React.FC<ThemeMarketplaceProps> = ({ className }) => {
  const activeTheme = useThemeStore((s) => s.activeTheme);
  const availableThemes = useThemeStore((s) => s.availableThemes);
  const setTheme = useThemeStore((s) => s.setTheme);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const resetTheme = useThemeStore((s) => s.resetTheme);

  // Fetch user themes from server on mount
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const res = await fetch("/api/themes");
        if (!res.ok) return;
        const themes: ThemeConfig[] = await res.json();
        for (const theme of themes) {
          loadTheme(theme);
        }
      } catch {
        // Server may not be running — built-in themes are always available
      }
    };
    fetchThemes();
  }, [loadTheme]);

  const handleApply = useCallback(
    (themeId: string) => {
      setTheme(themeId);
      // Persist the active theme choice to server config
      fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTheme: themeId }),
      }).catch(() => {
        // Silently ignore if server is unavailable
      });
    },
    [setTheme],
  );

  return (
    <div className={`theme-marketplace ${className ?? ""}`}>
      <div className="theme-marketplace__header">
        <h3 className="theme-marketplace__title">Themes</h3>
        <button className="theme-marketplace__reset" onClick={resetTheme}>
          Reset to Default
        </button>
      </div>

      <div className="theme-marketplace__grid">
        {availableThemes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeTheme.id === theme.id}
            onApply={handleApply}
          />
        ))}
      </div>
    </div>
  );
};

export default ThemeMarketplace;
