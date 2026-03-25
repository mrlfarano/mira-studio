import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ThemeConfig } from "@/types/theme.ts";
import { BUILTIN_THEMES } from "@/types/theme.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeState {
  /** Currently active theme */
  activeTheme: ThemeConfig;

  /** All available themes (built-in + user-installed) */
  availableThemes: ThemeConfig[];

  /** Custom CSS overrides edited via the CSS editor */
  customCss: string;

  /** Whether the CSS editor has unsaved changes */
  cssEditorDirty: boolean;

  // --- actions ---
  setTheme: (themeId: string) => void;
  loadTheme: (theme: ThemeConfig) => void;
  resetTheme: () => void;
  setAvailableThemes: (themes: ThemeConfig[]) => void;
  setCustomCss: (css: string) => void;
  setCssEditorDirty: (dirty: boolean) => void;

  /** Bulk-replace state — used by hydration */
  _replace: (partial: Partial<ThemeState>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_THEME = BUILTIN_THEMES[0]; // Dark

/** Remove the injected custom CSS <style> element */
function removeCustomStyleElement(): void {
  const existing = document.getElementById("mira-custom-css");
  if (existing) existing.remove();
}

/** Apply theme CSS variables to document.documentElement */
function applyThemeToDOM(theme: ThemeConfig, customCss?: string): void {
  const root = document.documentElement;

  // Set CSS custom properties
  for (const [prop, value] of Object.entries(theme.variables)) {
    root.style.setProperty(prop, value);
  }

  // Apply theme-level CSS if present
  removeCustomStyleElement();
  const cssContent = [theme.css ?? "", customCss ?? ""]
    .filter(Boolean)
    .join("\n");
  if (cssContent) {
    const style = document.createElement("style");
    style.id = "mira-custom-css";
    style.textContent = cssContent;
    document.head.appendChild(style);
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useThemeStore = create<ThemeState>()(
  devtools(
    (set, get) => ({
      activeTheme: DEFAULT_THEME,
      availableThemes: [...BUILTIN_THEMES],
      customCss: "",
      cssEditorDirty: false,

      setTheme: (themeId) => {
        const theme = get().availableThemes.find((t) => t.id === themeId);
        if (!theme) return;
        applyThemeToDOM(theme, get().customCss);
        set({ activeTheme: theme }, undefined, "theme/setTheme");
      },

      loadTheme: (theme) => {
        set(
          (s) => {
            const exists = s.availableThemes.some((t) => t.id === theme.id);
            const themes = exists
              ? s.availableThemes.map((t) => (t.id === theme.id ? theme : t))
              : [...s.availableThemes, theme];
            return { availableThemes: themes };
          },
          undefined,
          "theme/loadTheme",
        );
      },

      resetTheme: () => {
        applyThemeToDOM(DEFAULT_THEME, "");
        set(
          { activeTheme: DEFAULT_THEME, customCss: "", cssEditorDirty: false },
          undefined,
          "theme/resetTheme",
        );
      },

      setAvailableThemes: (themes) =>
        set({ availableThemes: themes }, undefined, "theme/setAvailableThemes"),

      setCustomCss: (css) => {
        set({ customCss: css, cssEditorDirty: true }, undefined, "theme/setCustomCss");
        // Live preview: re-apply current theme with new CSS
        applyThemeToDOM(get().activeTheme, css);
      },

      setCssEditorDirty: (dirty) =>
        set({ cssEditorDirty: dirty }, undefined, "theme/setCssEditorDirty"),

      _replace: (partial) => set(partial, undefined, "theme/_replace"),
    }),
    { name: "ThemeStore", enabled: import.meta.env.DEV },
  ),
);
