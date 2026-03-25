import { create } from 'zustand';
import type { PanelConfig } from '@/types/panel';

// ---------------------------------------------------------------------------
// Debounced persist helper
// ---------------------------------------------------------------------------

let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DELAY_MS = 500;

function persistToBackend(panels: PanelConfig[]): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const layout = panels.map(({ id, type, x, y, w, h }) => ({
      id,
      type,
      x,
      y,
      w,
      h,
    }));
    fetch('/api/config/workspaces/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout }),
    }).catch(() => {
      // Silently ignore persist failures in dev
    });
  }, PERSIST_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

interface LayoutState {
  panels: PanelConfig[];
  isDragging: boolean;
  /** Monotonically increasing counter used for z-index assignment */
  topZ: number;

  // Actions
  addPanel: (panel: PanelConfig) => void;
  removePanel: (id: string) => void;
  updateLayout: (
    updates: Array<{ i: string; x: number; y: number; w: number; h: number }>,
  ) => void;
  movePanel: (id: string, x: number, y: number) => void;
  resizePanel: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
  toggleMinimize: (id: string) => void;
  setIsDragging: (v: boolean) => void;
  /** Replace all panels at once — used by scene switching */
  setPanels: (panels: PanelConfig[]) => void;
}

// ---------------------------------------------------------------------------
// Minimum panel dimensions (in grid units)
// ---------------------------------------------------------------------------

export const MIN_PANEL_W = 2; // ~240 px at 120 px column
export const MIN_PANEL_H = 2; // ~180 px at 90 px row height

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLayoutStore = create<LayoutState>()((set, get) => ({
  panels: [],
  isDragging: false,
  topZ: 1,

  addPanel: (panel) => {
    const enriched: PanelConfig = {
      ...panel,
      minW: panel.minW ?? MIN_PANEL_W,
      minH: panel.minH ?? MIN_PANEL_H,
      zIndex: get().topZ,
    };
    set((s) => ({
      panels: [...s.panels, enriched],
      topZ: s.topZ + 1,
    }));
    persistToBackend(get().panels);
  },

  removePanel: (id) => {
    set((s) => ({
      panels: s.panels.filter((p) => p.id !== id),
    }));
    persistToBackend(get().panels);
  },

  updateLayout: (updates) => {
    set((s) => {
      const map = new Map(updates.map((u) => [u.i, u]));
      const panels = s.panels.map((p) => {
        const u = map.get(p.id);
        if (!u) return p;
        return { ...p, x: u.x, y: u.y, w: u.w, h: u.h };
      });
      return { panels };
    });
    persistToBackend(get().panels);
  },

  movePanel: (id, x, y) => {
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, x, y } : p)),
    }));
    persistToBackend(get().panels);
  },

  resizePanel: (id, w, h) => {
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, w, h } : p)),
    }));
    persistToBackend(get().panels);
  },

  bringToFront: (id) => {
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === id ? { ...p, zIndex: s.topZ } : p,
      ),
      topZ: s.topZ + 1,
    }));
  },

  toggleMinimize: (id) => {
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === id ? { ...p, minimized: !p.minimized } : p,
      ),
    }));
  },

  setIsDragging: (v) => set({ isDragging: v }),

  setPanels: (panels) => {
    set({ panels, topZ: panels.length + 1 });
    persistToBackend(panels);
  },
}));
