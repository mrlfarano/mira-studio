import React, { Suspense, useCallback, useMemo, useRef } from 'react'
import {
  ResponsiveGridLayout,
  useContainerWidth,
  noCompactor,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

import Panel from '@/panels/Panel'
import McpStatusPanel from '@/components/McpStatusPanel.tsx'
import PanelErrorBoundary from '@/components/PanelErrorBoundary.tsx'
import { useLayoutStore, MIN_PANEL_W, MIN_PANEL_H } from '@/store/layout-store'

// ---------------------------------------------------------------------------
// Lazy panels — xterm, the canvas, and other panel-heavy dependencies load
// on demand instead of bloating the initial bundle.
// ---------------------------------------------------------------------------

const TerminalPanel = React.lazy(() =>
  import('@/panels/terminal/index.ts').then((m) => ({
    default: m.TerminalPanel,
  })),
)
const CompanionPanel = React.lazy(() =>
  import('@/panels/companion/index.ts').then((m) => ({
    default: m.CompanionPanel,
  })),
)
const KanbanBoard = React.lazy(() => import('@/panels/kanban/KanbanBoard.tsx'))
const SIPanel = React.lazy(() => import('@/panels/si/SIPanel.tsx'))
const JournalPanel = React.lazy(() =>
  import('@/panels/journal/index.ts').then((m) => ({
    default: m.JournalPanel,
  })),
)
const DeployPanel = React.lazy(() =>
  import('@/panels/deploy/index.ts').then((m) => ({ default: m.DeployPanel })),
)
const ContextCleanerPanel = React.lazy(() =>
  import('@/panels/context-cleaner/index.ts').then((m) => ({
    default: m.ContextCleanerPanel,
  })),
)
const VibePanel = React.lazy(() =>
  import('@/panels/vibe/index.ts').then((m) => ({ default: m.VibePanel })),
)
const ObservabilityPanel = React.lazy(() =>
  import('@/panels/observability/index.ts').then((m) => ({
    default: m.ObservabilityPanel,
  })),
)
const ReplayPanel = React.lazy(() =>
  import('@/panels/replay/index.ts').then((m) => ({ default: m.ReplayPanel })),
)
const ProjectMapPanel = React.lazy(() =>
  import('@/panels/project-map/index.ts').then((m) => ({
    default: m.ProjectMapPanel,
  })),
)
const RegistryPanel = React.lazy(() =>
  import('@/panels/registry/index.ts').then((m) => ({
    default: m.RegistryPanel,
  })),
)
const PairModePanel = React.lazy(() =>
  import('@/panels/pair/index.ts').then((m) => ({ default: m.PairModePanel })),
)
const SparkCanvas = React.lazy(() =>
  import('@/panels/spark/index.ts').then((m) => ({ default: m.SparkCanvas })),
)

function PanelLoading() {
  return (
    <div
      data-testid="panel-loading"
      style={{
        display: 'grid',
        placeItems: 'center',
        height: '100%',
        color: '#8892b0',
      }}
    >
      Loading panel…
    </div>
  )
}

// ---------------------------------------------------------------------------
// Throttle helper -- keeps onLayoutChange under one call per frame (~16 ms)
// ---------------------------------------------------------------------------

function useThrottledCallback<T extends (...args: never[]) => void>(
  cb: T,
  delayMs = 16,
): T {
  const lastCall = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useMemo(() => {
    const throttled = (...args: Parameters<T>) => {
      const now = Date.now()
      const remaining = delayMs - (now - lastCall.current)

      if (remaining <= 0) {
        lastCall.current = now
        cb(...(args as never[]))
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          lastCall.current = Date.now()
          timer.current = null
          cb(...(args as never[]))
        }, remaining)
      }
    }
    return throttled as unknown as T
  }, [cb, delayMs])
}

// ---------------------------------------------------------------------------
// LayoutEngine
// ---------------------------------------------------------------------------

const LayoutEngine: React.FC = () => {
  const panels = useLayoutStore((s) => s.panels)
  const updateLayout = useLayoutStore((s) => s.updateLayout)
  const removePanel = useLayoutStore((s) => s.removePanel)
  const toggleMinimize = useLayoutStore((s) => s.toggleMinimize)
  const setIsDragging = useLayoutStore((s) => s.setIsDragging)

  const { width, containerRef, mounted } = useContainerWidth()

  // Convert PanelConfig[] -> react-grid-layout ResponsiveLayouts
  const gridLayouts: ResponsiveLayouts = useMemo(() => {
    const lg: Layout = panels.map((p) => ({
      i: p.id,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      minW: p.minW ?? MIN_PANEL_W,
      minH: p.minH ?? MIN_PANEL_H,
    }))
    return { lg }
  }, [panels])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      updateLayout(
        layout.map((l: LayoutItem) => ({
          i: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        })),
      )
    },
    [updateLayout],
  )

  const throttledLayoutChange = useThrottledCallback(handleLayoutChange, 16)

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [setIsDragging])

  const handleDragStop = useCallback(() => {
    setIsDragging(false)
  }, [setIsDragging])

  return (
    <div
      ref={containerRef}
      data-testid="layout-engine"
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {mounted && (
        <ResponsiveGridLayout
          className="layout-engine"
          width={width}
          layouts={gridLayouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={90}
          dragConfig={{ enabled: true, handle: '.drag-handle', bounded: false }}
          onLayoutChange={throttledLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          onResizeStart={handleDragStart}
          onResizeStop={handleDragStop}
          compactor={noCompactor}
        >
          {panels.map((p) => (
            <div
              key={p.id}
              style={{
                zIndex: p.zIndex ?? 1,
                background: '#16213e',
                borderRadius: '6px',
                border: '1px solid #333',
                overflow: 'hidden',
              }}
            >
              <Panel
                id={p.id}
                title={p.title}
                type={p.type}
                onClose={removePanel}
                onMinimize={toggleMinimize}
                zIndex={p.zIndex}
                minimized={p.minimized}
              >
                <PanelErrorBoundary panelId={p.id} panelType={p.type}>
                  <Suspense fallback={<PanelLoading />}>
                    {p.type === 'terminal' && (
                      <TerminalPanel
                        sessionId={(p.props?.sessionId as string) ?? p.id}
                      />
                    )}
                    {p.type === 'companion' && <CompanionPanel />}
                    {p.type === 'kanban' && <KanbanBoard />}
                    {p.type === 'si' && <SIPanel />}
                    {p.type === 'journal' && <JournalPanel />}
                    {p.type === 'mcp' && <McpStatusPanel />}
                    {p.type === 'deploy' && <DeployPanel />}
                    {p.type === 'context-cleaner' && <ContextCleanerPanel />}
                    {p.type === 'vibe' && <VibePanel />}
                    {p.type === 'observability' && <ObservabilityPanel />}
                    {p.type === 'replay' && <ReplayPanel />}
                    {p.type === 'project-map' && <ProjectMapPanel />}
                    {p.type === 'registry' && <RegistryPanel />}
                    {p.type === 'pair' && <PairModePanel />}
                    {p.type === 'spark' && <SparkCanvas />}
                  </Suspense>
                </PanelErrorBoundary>
              </Panel>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  )
}

export default React.memo(LayoutEngine)
