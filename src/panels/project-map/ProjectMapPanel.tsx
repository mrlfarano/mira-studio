import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types (mirrors server-side TreeNode / RecentChange)
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  changes: number
  children?: TreeNode[]
}

interface RecentChange {
  path: string
  lastChanged: string
  author: string
  message: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://127.0.0.1:3001'

/** Map a change count to a warm/cool colour. */
function heatColour(changes: number, maxChanges: number): string {
  if (maxChanges === 0) return '#334155'
  const ratio = Math.min(changes / maxChanges, 1)

  // Interpolate from cool (slate blue) to warm (orange-red)
  // Low: hsl(220, 40%, 28%)  →  High: hsl(15, 80%, 50%)
  const h = 220 - ratio * 205
  const s = 40 + ratio * 40
  const l = 28 + ratio * 22

  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
}

/** Flatten all file nodes to compute the global max change count. */
function getMaxChanges(node: TreeNode): number {
  if (node.type === 'file') return node.changes
  let max = 0
  for (const child of node.children ?? []) {
    const childMax = getMaxChanges(child)
    if (childMax > max) max = childMax
  }
  return max
}

/** Get all top-level directories (or files) for the treemap layout. */
function getTopLevelGroups(root: TreeNode): TreeNode[] {
  return root.children ?? []
}

/** Flatten files from a subtree. */
function flattenFiles(node: TreeNode): TreeNode[] {
  if (node.type === 'file') return [node]
  const files: TreeNode[] = []
  for (const child of node.children ?? []) {
    files.push(...flattenFiles(child))
  }
  return files
}

/** Relative time string (e.g., "3 hours ago"). */
function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ---------------------------------------------------------------------------
// Treemap layout algorithm — simple squarified slicing
// ---------------------------------------------------------------------------

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface LayoutRect extends Rect {
  node: TreeNode
}

/**
 * Lay out an array of nodes into a rectangle using a simple slice-and-dice
 * algorithm, alternating horizontal/vertical splits.
 */
function layoutTreemap(
  nodes: TreeNode[],
  bounds: Rect,
  horizontal = true,
): LayoutRect[] {
  if (nodes.length === 0) return []
  if (nodes.length === 1) {
    return [{ ...bounds, node: nodes[0] }]
  }

  const totalChanges = nodes.reduce((sum, n) => sum + Math.max(n.changes, 1), 0)
  const results: LayoutRect[] = []
  let offset = 0

  for (const node of nodes) {
    const ratio = Math.max(node.changes, 1) / totalChanges

    const rect: Rect = horizontal
      ? {
          x: bounds.x + offset,
          y: bounds.y,
          w: bounds.w * ratio,
          h: bounds.h,
        }
      : {
          x: bounds.x,
          y: bounds.y + offset,
          w: bounds.w,
          h: bounds.h * ratio,
        }

    offset += horizontal ? bounds.w * ratio : bounds.h * ratio

    results.push({ ...rect, node })
  }

  return results
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TreemapCell: React.FC<{
  rect: LayoutRect
  maxChanges: number
}> = React.memo(({ rect, maxChanges }) => {
  const [hovered, setHovered] = useState(false)

  const bg = heatColour(rect.node.changes, maxChanges)
  const fontSize = Math.max(9, Math.min(13, Math.floor(Math.min(rect.w, rect.h) / 6)))
  const showLabel = rect.w > 30 && rect.h > 18

  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: bg,
        border: '1px solid #1e1e2f',
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'filter 0.15s',
        filter: hovered ? 'brightness(1.3)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${rect.node.path}\n${rect.node.changes} change${rect.node.changes === 1 ? '' : 's'}`}
    >
      {showLabel && (
        <span
          style={{
            display: 'block',
            padding: '2px 4px',
            fontSize,
            fontFamily: 'monospace',
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {rect.node.name}
        </span>
      )}

      {/* Tooltip on hover */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            background: '#0f0f1a',
            border: '1px solid #444',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{rect.node.path}</div>
          <div style={{ color: '#94a3b8' }}>
            {rect.node.changes} change{rect.node.changes === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  )
})
TreemapCell.displayName = 'TreemapCell'

// ---------------------------------------------------------------------------
// Directory group — renders a labelled group with its files as a sub-treemap
// ---------------------------------------------------------------------------

const DirectoryGroup: React.FC<{
  rect: LayoutRect
  maxChanges: number
}> = React.memo(({ rect, maxChanges }) => {
  const files = useMemo(() => flattenFiles(rect.node), [rect.node])
  const HEADER_H = 18
  const innerBounds = useMemo<Rect>(() => ({
    x: 0,
    y: HEADER_H,
    w: rect.w,
    h: Math.max(rect.h - HEADER_H, 0),
  }), [rect.w, rect.h])

  const cellRects = useMemo(
    () => layoutTreemap(files, innerBounds, innerBounds.w >= innerBounds.h),
    [files, innerBounds],
  )

  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        border: '1px solid #333',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Directory label */}
      <div
        style={{
          height: HEADER_H,
          padding: '0 6px',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'monospace',
          color: '#94a3b8',
          background: '#1a1a2e',
          lineHeight: `${HEADER_H}px`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderBottom: '1px solid #333',
        }}
        title={`${rect.node.path || rect.node.name} — ${rect.node.changes} changes`}
      >
        {rect.node.name}/
      </div>

      {/* File cells */}
      <div style={{ position: 'relative', width: '100%', height: innerBounds.h }}>
        {cellRects.map((cr) => (
          <TreemapCell key={cr.node.path} rect={cr} maxChanges={maxChanges} />
        ))}
      </div>
    </div>
  )
})
DirectoryGroup.displayName = 'DirectoryGroup'

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const ProjectMapPanel: React.FC = () => {
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [recent, setRecent] = useState<RecentChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 600, h: 300 })

  // -----------------------------------------------------------------------
  // Fetch data
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [treeRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/api/project-map/tree`),
        fetch(`${API_BASE}/api/project-map/recent`),
      ])

      if (!treeRes.ok) throw new Error(`Tree fetch failed: ${treeRes.status}`)
      if (!recentRes.ok) throw new Error(`Recent fetch failed: ${recentRes.status}`)

      const treeData = (await treeRes.json()) as TreeNode
      const recentData = (await recentRes.json()) as { changes: RecentChange[] }

      setTree(treeData)
      setRecent(recentData.changes)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      await fetchData()
    }

    void poll()
    return () => { cancelled = true }
  }, [fetchData])

  // -----------------------------------------------------------------------
  // Observe container size for responsive treemap
  // -----------------------------------------------------------------------

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerSize({ w: width, h: height })
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // -----------------------------------------------------------------------
  // Compute treemap layout
  // -----------------------------------------------------------------------

  const maxChanges = useMemo(() => (tree ? getMaxChanges(tree) : 0), [tree])

  const topGroups = useMemo(() => (tree ? getTopLevelGroups(tree) : []), [tree])

  const groupRects = useMemo(() => {
    const treemapH = Math.max(containerSize.h - 20, 100)
    const bounds: Rect = { x: 0, y: 0, w: containerSize.w, h: treemapH }
    return layoutTreemap(topGroups, bounds, containerSize.w >= treemapH)
  }, [topGroups, containerSize])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading && !tree) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>Loading project map...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <span style={{ color: '#f87171' }}>Error: {error}</span>
          <button onClick={fetchData} style={styles.refreshBtn}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Project Map</span>
        <div style={styles.legend}>
          <span style={styles.legendLabel}>stable</span>
          <div style={styles.legendGradient} />
          <span style={styles.legendLabel}>hot</span>
        </div>
        <button
          onClick={fetchData}
          style={styles.refreshBtn}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Treemap */}
      <div ref={containerRef} style={styles.treemapContainer}>
        {groupRects.map((gr) =>
          gr.node.type === 'dir' ? (
            <DirectoryGroup
              key={gr.node.path || gr.node.name}
              rect={gr}
              maxChanges={maxChanges}
            />
          ) : (
            <TreemapCell
              key={gr.node.path}
              rect={gr}
              maxChanges={maxChanges}
            />
          ),
        )}

        {topGroups.length === 0 && (
          <div style={styles.centered}>No files found in git history</div>
        )}
      </div>

      {/* Recent changes */}
      {recent.length > 0 && (
        <div style={styles.recentSection}>
          <div style={styles.recentHeader}>Recent Changes</div>
          <div style={styles.recentList}>
            {recent.map((change, i) => (
              <div key={`${change.path}-${i}`} style={styles.recentItem}>
                <div style={styles.recentPath}>{change.path}</div>
                <div style={styles.recentMeta}>
                  <span style={styles.recentAuthor}>{change.author}</span>
                  <span style={styles.recentMessage}>
                    {change.message.length > 60
                      ? change.message.slice(0, 60) + '...'
                      : change.message}
                  </span>
                  <span style={styles.recentTime}>
                    {relativeTime(change.lastChanged)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    background: '#1e1e2f',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  legendGradient: {
    width: 60,
    height: 8,
    borderRadius: 4,
    background: 'linear-gradient(to right, #334155, #c2410c, #dc2626)',
  },
  refreshBtn: {
    padding: '4px 10px',
    fontSize: 12,
    background: '#2a2d35',
    color: '#94a3b8',
    border: '1px solid #444',
    borderRadius: 4,
    cursor: 'pointer',
  },
  treemapContainer: {
    position: 'relative' as const,
    flex: 1,
    minHeight: 100,
    overflow: 'hidden',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 12,
    color: '#64748b',
    fontSize: 14,
  },
  recentSection: {
    flexShrink: 0,
    maxHeight: 180,
    borderTop: '1px solid #333',
    overflow: 'auto',
  },
  recentHeader: {
    padding: '8px 12px 4px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#64748b',
    letterSpacing: '0.05em',
    position: 'sticky' as const,
    top: 0,
    background: '#1e1e2f',
  },
  recentList: {
    padding: '0 12px 8px',
  },
  recentItem: {
    padding: '6px 0',
    borderBottom: '1px solid #282838',
  },
  recentPath: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#e2e8f0',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  recentMeta: {
    display: 'flex',
    gap: 8,
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recentAuthor: {
    color: '#818cf8',
    flexShrink: 0,
  },
  recentMessage: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  recentTime: {
    flexShrink: 0,
    color: '#475569',
  },
} as const

export default React.memo(ProjectMapPanel)
