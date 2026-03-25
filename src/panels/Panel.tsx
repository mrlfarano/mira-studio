import React, { useCallback, type ReactNode } from 'react';
import { useLayoutStore } from '@/store/layout-store';

export interface PanelProps {
  id: string;
  title: string;
  type: string;
  children?: ReactNode;
  onClose?: (id: string) => void;
  onMinimize?: (id: string) => void;
  zIndex?: number;
  minimized?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  id,
  title,
  children,
  onClose,
  onMinimize,
  zIndex = 1,
  minimized = false,
}) => {
  const bringToFront = useLayoutStore((s) => s.bringToFront);

  const handleMouseDown = useCallback(() => {
    bringToFront(id);
  }, [bringToFront, id]);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose?.(id);
    },
    [onClose, id],
  );

  const handleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMinimize?.(id);
    },
    [onMinimize, id],
  );

  return (
    <div
      className="panel"
      style={{ zIndex, display: 'flex', flexDirection: 'column', height: '100%' }}
      onMouseDown={handleMouseDown}
    >
      {/* Header — also the drag handle (className used by react-grid-layout) */}
      <div
        className="panel-header drag-handle"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: '#1a1a2e',
          borderBottom: '1px solid #333',
          cursor: 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{title}</span>
        <span style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleMinimize}
            aria-label="Minimize panel"
            style={btnStyle}
          >
            {minimized ? '+' : '\u2013'}
          </button>
          <button
            onClick={handleClose}
            aria-label="Close panel"
            style={btnStyle}
          >
            \u00d7
          </button>
        </span>
      </div>

      {/* Content */}
      {!minimized && (
        <div
          className="panel-content"
          style={{ flex: 1, overflow: 'auto', padding: '8px' }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: '16px',
  lineHeight: 1,
  padding: '0 2px',
};

export default React.memo(Panel);
