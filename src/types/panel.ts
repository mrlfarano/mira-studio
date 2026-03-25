/**
 * Panel configuration types for the layout engine.
 */

export type PanelType = 'terminal' | 'kanban' | 'companion' | 'mira' | (string & {});

export interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  /** Z-index for stacking order */
  zIndex?: number;
  /** Whether the panel is minimized */
  minimized?: boolean;
  /** Arbitrary props passed to the panel content component */
  props?: Record<string, unknown>;
}

export type PanelLayout = PanelConfig[];
