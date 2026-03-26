import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SparkElementType = 'sticky' | 'text' | 'shape'
export type ShapeKind = 'rect' | 'circle' | 'arrow'

export interface SparkElement {
  id: string
  type: SparkElementType
  x: number
  y: number
  width: number
  height: number
  content: string
  color: string
  shapeKind?: ShapeKind
  zIndex: number
}

export interface SparkCanvasState {
  elements: SparkElement[]
  selectedId: string | null
  activeTool: SparkElementType | 'select' | 'pan'
  canvasName: string

  // --- actions ---
  addElement: (el: SparkElement) => void
  updateElement: (id: string, patch: Partial<Omit<SparkElement, 'id'>>) => void
  deleteElement: (id: string) => void
  setSelected: (id: string | null) => void
  setActiveTool: (tool: SparkCanvasState['activeTool']) => void
  setCanvasName: (name: string) => void
  clearCanvas: () => void
  _replace: (elements: SparkElement[], name: string) => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSparkStore = create<SparkCanvasState>()(
  devtools(
    (set) => ({
      elements: [],
      selectedId: null,
      activeTool: 'select',
      canvasName: 'untitled',

      addElement: (el) =>
        set(
          (s) => ({ elements: [...s.elements, el] }),
          undefined,
          'spark/addElement',
        ),

      updateElement: (id, patch) =>
        set(
          (s) => ({
            elements: s.elements.map((el) =>
              el.id === id ? { ...el, ...patch } : el,
            ),
          }),
          undefined,
          'spark/updateElement',
        ),

      deleteElement: (id) =>
        set(
          (s) => ({
            elements: s.elements.filter((el) => el.id !== id),
            selectedId: s.selectedId === id ? null : s.selectedId,
          }),
          undefined,
          'spark/deleteElement',
        ),

      setSelected: (id) =>
        set(
          { selectedId: id },
          undefined,
          'spark/setSelected',
        ),

      setActiveTool: (tool) =>
        set(
          { activeTool: tool },
          undefined,
          'spark/setActiveTool',
        ),

      setCanvasName: (name) =>
        set(
          { canvasName: name },
          undefined,
          'spark/setCanvasName',
        ),

      clearCanvas: () =>
        set(
          { elements: [], selectedId: null },
          undefined,
          'spark/clearCanvas',
        ),

      _replace: (elements, name) =>
        set(
          { elements, selectedId: null, canvasName: name },
          undefined,
          'spark/_replace',
        ),
    }),
    { name: 'SparkStore', enabled: import.meta.env.DEV },
  ),
)
