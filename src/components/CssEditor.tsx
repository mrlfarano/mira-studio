import React, { useState, useCallback, useRef, useEffect } from "react";
import { useThemeStore } from "@/store/theme-store.ts";

// ---------------------------------------------------------------------------
// CSS syntax hint shown above the editor
// ---------------------------------------------------------------------------

const CSS_HINT = `/* Custom CSS overrides — uses the same CSS custom properties as themes.
 *
 * Available variables:
 *   --bg-primary, --bg-secondary, --bg-surface, --bg-elevated
 *   --border-default, --border-muted
 *   --text-primary, --text-secondary, --text-muted
 *   --accent, --accent-hover
 *   --success, --warning, --error
 *
 * Example:
 *   .sidebar { border-right: 2px solid var(--accent); }
 */`;

// ---------------------------------------------------------------------------
// CssEditor — simple textarea with live preview and save
// ---------------------------------------------------------------------------

export interface CssEditorProps {
  className?: string;
}

const CssEditor: React.FC<CssEditorProps> = ({ className }) => {
  const customCss = useThemeStore((s) => s.customCss);
  const setCustomCss = useThemeStore((s) => s.setCustomCss);
  const cssEditorDirty = useThemeStore((s) => s.cssEditorDirty);
  const setCssEditorDirty = useThemeStore((s) => s.setCssEditorDirty);
  const activeTheme = useThemeStore((s) => s.activeTheme);

  const [localCss, setLocalCss] = useState(customCss);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state when store changes externally
  useEffect(() => {
    setLocalCss(customCss);
  }, [customCss]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalCss(value);
      // Live preview — updates DOM immediately
      setCustomCss(value);
    },
    [setCustomCss],
  );

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/themes/${activeTheme.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ css: localCss }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCssEditorDirty(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [localCss, activeTheme.id, setCssEditorDirty]);

  const handleReset = useCallback(() => {
    setLocalCss("");
    setCustomCss("");
  }, [setCustomCss]);

  // Handle Tab key for basic indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.substring(0, start) + "  " + value.substring(end);

        setLocalCss(newValue);
        setCustomCss(newValue);

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      }

      // Cmd/Ctrl+S to save
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [setCustomCss, handleSave],
  );

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Error"
          : "Save";

  return (
    <div className={`css-editor ${className ?? ""}`}>
      <div className="css-editor__header">
        <h3 className="css-editor__title">CSS Editor</h3>
        <div className="css-editor__actions">
          <button
            className="css-editor__btn css-editor__btn--reset"
            onClick={handleReset}
          >
            Clear
          </button>
          <button
            className="css-editor__btn css-editor__btn--save"
            onClick={handleSave}
            disabled={!cssEditorDirty || saveStatus === "saving"}
          >
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="css-editor__hint">
        <pre>{CSS_HINT}</pre>
      </div>

      <textarea
        ref={textareaRef}
        className="css-editor__textarea"
        value={localCss}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Enter custom CSS overrides..."
        spellCheck={false}
        data-testid="css-editor-textarea"
      />

      <div className="css-editor__footer">
        <span className="css-editor__status">
          {cssEditorDirty ? "Unsaved changes" : "No changes"}
        </span>
        <span className="css-editor__shortcut">Cmd+S to save</span>
      </div>
    </div>
  );
};

export default CssEditor;
