import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  useSparkStore,
  type SparkElement,
  type SparkElementType,
  type ShapeKind,
} from '@/store/spark-store'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRESET_COLORS = ['#facc15', '#f472b6', '#60a5fa', '#4ade80', '#c084fc', '#ffffff']

const TOOLS: { id: SparkElementType | 'select' | 'pan', label: string, icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⇱' },
  { id: 'pan', label: 'Pan', icon: '✋' },
  { id: 'sticky', label: 'Sticky Note', icon: '🗒' },
  { id: 'text', label: 'Text', icon: 'T' },
  { id: 'shape', label: 'Rectangle', icon: '▭' },
]

const SHAPE_TOOLS: { kind: ShapeKind, label: string, icon: string }[] = [
  { kind: 'rect', label: 'Rectangle', icon: '▭' },
  { kind: 'circle', label: 'Circle', icon: '●' },
  { kind: 'arrow', label: 'Arrow', icon: '→' },
]

const CANVAS_BG = '#0f0f1a'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function nextZIndex(elements: SparkElement[]): number {
  if (elements.length === 0) return 1
  return Math.max(...elements.map((e) => e.zIndex)) + 1
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CanvasElementProps {
  el: SparkElement
  selected: boolean
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Omit<SparkElement, 'id'>>) => void
}

const CanvasElement: React.FC<CanvasElementProps> = React.memo(
  ({ el, selected, onSelect, onUpdate }) => {
    const [dragging, setDragging] = useState(false)
    const [editing, setEditing] = useState(false)
    const dragStart = useRef<{ mx: number, my: number, ex: number, ey: number } | null>(null)

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        onSelect(el.id)
        setDragging(true)
        dragStart.current = { mx: e.clientX, my: e.clientY, ex: el.x, ey: el.y }
      },
      [el.id, el.x, el.y, onSelect],
    )

    useEffect(() => {
      if (!dragging) return

      const handleMove = (e: MouseEvent) => {
        if (!dragStart.current) return
        const dx = e.clientX - dragStart.current.mx
        const dy = e.clientY - dragStart.current.my
        onUpdate(el.id, {
          x: dragStart.current.ex + dx,
          y: dragStart.current.ey + dy,
        })
      }

      const handleUp = () => {
        setDragging(false)
        dragStart.current = null
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
    }, [dragging, el.id, onUpdate])

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      if (el.type === 'sticky' || el.type === 'text') {
        setEditing(true)
      }
    }, [el.type])

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setEditing(false)
        onUpdate(el.id, { content: e.target.value })
      },
      [el.id, onUpdate],
    )

    const borderRadius = el.type === 'shape' && el.shapeKind === 'circle' ? '50%' : el.type === 'sticky' ? '6px' : '2px'

    const isArrow = el.type === 'shape' && el.shapeKind === 'arrow'

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      zIndex: el.zIndex,
      background: isArrow ? 'transparent' : el.color,
      borderRadius,
      border: selected ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.15)',
      cursor: dragging ? 'grabbing' : 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
      userSelect: 'none',
    }

    return (
      <div
        style={baseStyle}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {isArrow ? (
          <svg width={el.width} height={el.height} viewBox={`0 0 ${el.width} ${el.height}`}>
            <line
              x1={4}
              y1={el.height / 2}
              x2={el.width - 12}
              y2={el.height / 2}
              stroke={el.color}
              strokeWidth={3}
            />
            <polygon
              points={`${el.width - 4},${el.height / 2} ${el.width - 16},${el.height / 2 - 8} ${el.width - 16},${el.height / 2 + 8}`}
              fill={el.color}
            />
          </svg>
        ) : editing ? (
          <textarea
            autoFocus
            defaultValue={el.content}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
            }}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: el.type === 'sticky' ? '#1a1a2e' : '#ffffffde',
              fontFamily: 'inherit',
              fontSize: el.type === 'text' ? 16 : 14,
              padding: 8,
              resize: 'none',
              outline: 'none',
            }}
          />
        ) : (
          <span
            style={{
              color: el.type === 'sticky' ? '#1a1a2e' : '#ffffffde',
              fontSize: el.type === 'text' ? 16 : 14,
              padding: 8,
              wordBreak: 'break-word',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {el.content}
          </span>
        )}
      </div>
    )
  },
)

CanvasElement.displayName = 'CanvasElement'

// ---------------------------------------------------------------------------
// Mira Response Modal
// ---------------------------------------------------------------------------

interface MiraModalProps {
  content: string
  onClose: () => void
}

const MiraModal: React.FC<MiraModalProps> = ({ content, onClose }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: '#1e1e2e',
        border: '1px solid #3a3a4a',
        borderRadius: 8,
        padding: 24,
        maxWidth: 560,
        maxHeight: '60vh',
        overflow: 'auto',
        color: '#ffffffde',
        fontSize: 14,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, marginBottom: 12, color: '#c084fc' }}>
        Mira says:
      </div>
      {content}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button
          onClick={onClose}
          style={{
            background: '#3a3a4a',
            border: 'none',
            color: '#ffffffde',
            padding: '6px 16px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Save/Load Modal
// ---------------------------------------------------------------------------

interface LoadModalProps {
  canvases: string[]
  onSelect: (name: string) => void
  onClose: () => void
}

const LoadModal: React.FC<LoadModalProps> = ({ canvases, onSelect, onClose }) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}
    onClick={onClose}
  >
    <div
      style={{
        background: '#1e1e2e',
        border: '1px solid #3a3a4a',
        borderRadius: 8,
        padding: 24,
        minWidth: 280,
        maxHeight: '50vh',
        overflow: 'auto',
        color: '#ffffffde',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Load Canvas</div>
      {canvases.length === 0 && (
        <div style={{ color: '#888', fontSize: 14 }}>No saved canvases found.</div>
      )}
      {canvases.map((name) => (
        <div
          key={name}
          onClick={() => onSelect(name)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: 4,
            fontSize: 14,
            marginBottom: 4,
            background: '#2a2a3a',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = '#3a3a5a'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = '#2a2a3a'
          }}
        >
          {name}
        </div>
      ))}
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button
          onClick={onClose}
          style={{
            background: '#3a3a4a',
            border: 'none',
            color: '#ffffffde',
            padding: '6px 16px',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// SparkCanvas (main panel)
// ---------------------------------------------------------------------------

const SparkCanvas: React.FC = () => {
  const elements = useSparkStore((s) => s.elements)
  const selectedId = useSparkStore((s) => s.selectedId)
  const activeTool = useSparkStore((s) => s.activeTool)
  const canvasName = useSparkStore((s) => s.canvasName)
  const addElement = useSparkStore((s) => s.addElement)
  const updateElement = useSparkStore((s) => s.updateElement)
  const deleteElement = useSparkStore((s) => s.deleteElement)
  const setSelected = useSparkStore((s) => s.setSelected)
  const setActiveTool = useSparkStore((s) => s.setActiveTool)
  const setCanvasName = useSparkStore((s) => s.setCanvasName)
  const clearCanvas = useSparkStore((s) => s.clearCanvas)
  const _replace = useSparkStore((s) => s._replace)

  const [activeColor, setActiveColor] = useState(PRESET_COLORS[0])
  const [activeShape, setActiveShape] = useState<ShapeKind>('rect')
  const [miraResponse, setMiraResponse] = useState<string | null>(null)
  const [miraLoading, setMiraLoading] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const [canvasList, setCanvasList] = useState<string[]>([])

  // Pan state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const panStart = useRef<{ mx: number, my: number, ox: number, oy: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Keyboard: delete selected element
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        // Don't delete if user is typing in an input/textarea
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        deleteElement(selectedId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, deleteElement])

  // --- Canvas mouse handlers ---

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks directly on the canvas, not on elements
      if (e.target !== canvasRef.current) return

      if (activeTool === 'pan') {
        setPanning(true)
        panStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
        return
      }

      // Click on empty space with select tool: deselect
      if (activeTool === 'select') {
        setSelected(null)
      }
    },
    [activeTool, offset, setSelected],
  )

  useEffect(() => {
    if (!panning) return

    const handleMove = (e: MouseEvent) => {
      if (!panStart.current) return
      const dx = e.clientX - panStart.current.mx
      const dy = e.clientY - panStart.current.my
      setOffset({
        x: panStart.current.ox + dx,
        y: panStart.current.oy + dy,
      })
    }

    const handleUp = () => {
      setPanning(false)
      panStart.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [panning])

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== canvasRef.current) return
      if (activeTool === 'select' || activeTool === 'pan') return

      const rect = canvasRef.current!.getBoundingClientRect()
      const x = e.clientX - rect.left - offset.x
      const y = e.clientY - rect.top - offset.y

      const base: SparkElement = {
        id: makeId(),
        type: activeTool,
        x,
        y,
        width: activeTool === 'sticky' ? 200 : activeTool === 'text' ? 180 : activeTool === 'shape' && activeShape === 'arrow' ? 160 : 120,
        height: activeTool === 'sticky' ? 160 : activeTool === 'text' ? 40 : activeTool === 'shape' && activeShape === 'arrow' ? 40 : 120,
        content: activeTool === 'sticky' ? 'New note' : activeTool === 'text' ? 'Text' : '',
        color: activeColor,
        zIndex: nextZIndex(elements),
        ...(activeTool === 'shape' ? { shapeKind: activeShape } : {}),
      }

      addElement(base)
    },
    [activeTool, activeColor, activeShape, offset, elements, addElement],
  )

  // --- Ask Mira ---

  const handleAskMira = useCallback(async () => {
    if (elements.length === 0) return
    setMiraLoading(true)

    const textContent = elements
      .map((el) => el.content)
      .filter(Boolean)
      .join('\n- ')

    const message = `Analyze my Spark Canvas notes and suggest next steps:\n- ${textContent}`

    try {
      const res = await fetch('http://127.0.0.1:3001/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!res.ok) {
        setMiraResponse(`Error: ${res.status} ${res.statusText}`)
      } else {
        const data = await res.json() as { reply?: string, message?: string }
        setMiraResponse(data.reply ?? data.message ?? JSON.stringify(data))
      }
    } catch (err) {
      setMiraResponse(`Failed to reach Mira: ${(err as Error).message}`)
    } finally {
      setMiraLoading(false)
    }
  }, [elements])

  // --- Save ---

  const handleSave = useCallback(async () => {
    try {
      await fetch('http://127.0.0.1:3001/api/canvas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: canvasName, elements }),
      })
    } catch {
      // silent — server may not be running
    }
  }, [canvasName, elements])

  // --- Load ---

  const handleLoadOpen = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/api/canvas')
      if (res.ok) {
        const data = await res.json() as { canvases: string[] }
        setCanvasList(data.canvases ?? [])
      }
    } catch {
      setCanvasList([])
    }
    setLoadModalOpen(true)
  }, [])

  const handleLoadSelect = useCallback(
    async (name: string) => {
      setLoadModalOpen(false)
      try {
        const res = await fetch(`http://127.0.0.1:3001/api/canvas/${encodeURIComponent(name)}`)
        if (res.ok) {
          const data = await res.json() as { name: string, elements: SparkElement[] }
          _replace(data.elements ?? [], data.name ?? name)
        }
      } catch {
        // silent
      }
    },
    [_replace],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: CANVAS_BG }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderBottom: '1px solid #2a2a3a',
          flexWrap: 'wrap',
          background: '#1a1a2e',
        }}
      >
        {/* Canvas name */}
        <input
          value={canvasName}
          onChange={(e) => setCanvasName(e.target.value)}
          style={{
            background: 'transparent',
            border: '1px solid #3a3a4a',
            borderRadius: 4,
            color: '#ffffffde',
            padding: '3px 8px',
            fontSize: 13,
            width: 120,
            outline: 'none',
          }}
          title="Canvas name"
        />

        <div style={{ width: 1, height: 20, background: '#3a3a4a', margin: '0 4px' }} />

        {/* Tools */}
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            style={{
              background: activeTool === tool.id ? '#3a3a5a' : 'transparent',
              border: activeTool === tool.id ? '1px solid #60a5fa' : '1px solid transparent',
              borderRadius: 4,
              color: '#ffffffde',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {tool.icon}
          </button>
        ))}

        {/* Shape sub-tools */}
        {activeTool === 'shape' && (
          <>
            <div style={{ width: 1, height: 20, background: '#3a3a4a', margin: '0 2px' }} />
            {SHAPE_TOOLS.map((st) => (
              <button
                key={st.kind}
                onClick={() => setActiveShape(st.kind)}
                title={st.label}
                style={{
                  background: activeShape === st.kind ? '#3a3a5a' : 'transparent',
                  border: activeShape === st.kind ? '1px solid #c084fc' : '1px solid transparent',
                  borderRadius: 4,
                  color: '#ffffffde',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {st.icon}
              </button>
            ))}
          </>
        )}

        <div style={{ width: 1, height: 20, background: '#3a3a4a', margin: '0 4px' }} />

        {/* Color picker */}
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setActiveColor(c)}
            title={c}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c,
              border: activeColor === c ? '2px solid #60a5fa' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <button
          onClick={() => { void handleAskMira() }}
          disabled={miraLoading || elements.length === 0}
          style={{
            background: '#7c3aed',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            padding: '4px 12px',
            cursor: miraLoading ? 'wait' : 'pointer',
            fontSize: 13,
            opacity: miraLoading || elements.length === 0 ? 0.5 : 1,
          }}
        >
          {miraLoading ? 'Thinking...' : 'Ask Mira'}
        </button>

        <button
          onClick={clearCanvas}
          style={{
            background: '#4a1a1a',
            border: 'none',
            borderRadius: 4,
            color: '#f87171',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Clear
        </button>

        <button
          onClick={() => { void handleSave() }}
          style={{
            background: '#1e3a2e',
            border: 'none',
            borderRadius: 4,
            color: '#4ade80',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Save
        </button>

        <button
          onClick={() => { void handleLoadOpen() }}
          style={{
            background: '#1e2a3e',
            border: 'none',
            borderRadius: 4,
            color: '#60a5fa',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Load
        </button>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onDoubleClick={handleCanvasDoubleClick}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: activeTool === 'pan' ? (panning ? 'grabbing' : 'grab') : 'crosshair',
        }}
      >
        {/* Transformed layer with pan offset */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto', position: 'relative', width: '100%', height: '100%' }}>
            {elements.map((el) => (
              <CanvasElement
                key={el.id}
                el={el}
                selected={el.id === selectedId}
                onSelect={setSelected}
                onUpdate={updateElement}
              />
            ))}
          </div>
        </div>

        {/* Hint when empty */}
        {elements.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#555',
              fontSize: 15,
              pointerEvents: 'none',
            }}
          >
            Double-click to add elements. Select a tool from the toolbar above.
          </div>
        )}
      </div>

      {/* Modals */}
      {miraResponse !== null && (
        <MiraModal content={miraResponse} onClose={() => setMiraResponse(null)} />
      )}
      {loadModalOpen && (
        <LoadModal
          canvases={canvasList}
          onSelect={(name) => { void handleLoadSelect(name) }}
          onClose={() => setLoadModalOpen(false)}
        />
      )}
    </div>
  )
}

export default React.memo(SparkCanvas)
