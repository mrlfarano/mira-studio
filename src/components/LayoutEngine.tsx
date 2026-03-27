import React, { useCallback, useMemo, useRef } from 'react';
import {
  ResponsiveGridLayout,
  useContainerWidth,
  noCompactor,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

import Panel from '@/panels/Panel';
import { CompanionPanel } from '@/panels/companion/index.ts';
import { TerminalPanel } from '@/panels/terminal/index.ts';
import KanbanBoard from '@/panels/kanban/KanbanBoard.tsx';
import SIPanel from '@/panels/si/SIPanel.tsx';
import { JournalPanel } from '@/panels/journal/index.ts';
import McpStatusPanel from '@/components/McpStatusPanel.tsx';
import { DeployPanel } from '@/panels/deploy/index.ts';
import { ContextCleanerPanel } from '@/panels/context-cleaner/index.ts';
import { VibePanel } from '@/panels/vibe/index.ts';
import { ObservabilityPanel } from '@/panels/observability/index.ts';
import { ReplayPanel } from '@/panels/replay/index.ts';
import { ProjectMapPanel } from '@/panels/project-map/index.ts';
import { RegistryPanel } from '@/panels/registry/index.ts';
import { PairModePanel } from '@/panels/pair/index.ts';
import { SparkCanvas } from '@/panels/spark/index.ts';
import PanelErrorBoundary from '@/components/PanelErrorBoundary.tsx';
import { useLayoutStore, MIN_PANEL_W, MIN_PANEL_H } from '@/store/layout-store';

// ---------------------------------------------------------------------------
// Throttle helper -- keeps onLayoutChange under one call per frame (~16 ms)
// ---------------------------------------------------------------------------

function useThrottledCallback<T extends (...args: never[]) => void>(
  cb: T,
  delayMs = 16,
): T {
  const lastCall = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const throttled = (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = delayMs - (now - lastCall.current);

      if (remaining <= 0) {
        lastCall.current = now;
        cb(...(args as never[]));
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          lastCall.current = Date.now();
          timer.current = null;
          cb(...(args as never[]));
        }, remaining);
      }
    };
    return throttled as unknown as T;
  }, [cb, delayMs]);
}

// ---------------------------------------------------------------------------
// LayoutEngine
// ---------------------------------------------------------------------------

const LayoutEngine: React.FC = () => {
  const panels = useLayoutStore((s) => s.panels);
  const updateLayout = useLayoutStore((s) => s.updateLayout);
  const removePanel = useLayoutStore((s) => s.removePanel);
  const toggleMinimize = useLayoutStore((s) => s.toggleMinimize);
  const setIsDragging = useLayoutStore((s) => s.setIsDragging);

  const { width, containerRef, mounted } = useContainerWidth();

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
    }));
    return { lg };
  }, [panels]);

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
      );
    },
    [updateLayout],
  );

  const throttledLayoutChange = useThrottledCallback(handleLayoutChange, 16);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragStop = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  return (
    <div ref={containerRef} data-testid="layout-engine" style={{ width: '100%', minHeight: '100vh' }}>
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
                </PanelErrorBoundary>
              </Panel>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
};

export default React.memo(LayoutEngine);
