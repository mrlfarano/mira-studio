/**
 * ProjectMapEngine — builds a file tree annotated with git change frequency.
 *
 * Uses simple-git to read recent commit history and count how often each file
 * has been touched. The result is a nested tree structure suitable for treemap
 * visualisation on the client.
 */

import { simpleGit, type SimpleGit } from 'simple-git'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  changes: number
  children?: TreeNode[]
}

export interface RecentChange {
  path: string
  lastChanged: string
  author: string
  message: string
}

// Directories to exclude from the tree
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  '.turbo',
  'coverage',
  '.mira',
])

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class ProjectMapEngine {
  private projectRoot: string
  private git: SimpleGit

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.git = simpleGit(projectRoot)
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Build a nested file tree with change-frequency annotations derived from
   * the last 100 commits.
   */
  async getFileTree(): Promise<TreeNode> {
    const frequencyMap = await this.buildFrequencyMap()
    return this.buildTree(frequencyMap)
  }

  /**
   * Return the most recently changed files with commit metadata.
   */
  async getRecentChanges(limit = 10): Promise<RecentChange[]> {
    try {
      const log = await this.git.log({ maxCount: limit })

      const changes: RecentChange[] = []
      const seen = new Set<string>()

      for (const entry of log.all) {
        // Get the files changed in this commit
        const diff = await this.git.diff([
          '--name-only',
          `${entry.hash}~1`,
          entry.hash,
        ]).catch(() => '')

        const files = diff
          .split('\n')
          .map((f) => f.trim())
          .filter((f) => f.length > 0 && !this.isIgnored(f))

        for (const filePath of files) {
          if (seen.has(filePath)) continue
          seen.add(filePath)

          changes.push({
            path: filePath,
            lastChanged: entry.date,
            author: entry.author_name,
            message: entry.message,
          })

          if (changes.length >= limit) return changes
        }
      }

      return changes
    } catch {
      return []
    }
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Parse `git log --name-only` output from the last 100 commits to build a
   * map of file path -> number of commits that touched it.
   */
  private async buildFrequencyMap(): Promise<Map<string, number>> {
    const map = new Map<string, number>()

    try {
      const raw = await this.git.raw([
        'log',
        '--name-only',
        '--pretty=format:',
        '-n',
        '100',
      ])

      const lines = raw.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.length === 0) continue
        if (this.isIgnored(trimmed)) continue
        map.set(trimmed, (map.get(trimmed) ?? 0) + 1)
      }
    } catch {
      // Repo may have no commits yet — return empty map
    }

    return map
  }

  /**
   * Convert a flat frequency map into a nested tree structure, grouped by
   * directory.
   */
  private buildTree(frequencyMap: Map<string, number>): TreeNode {
    const root: TreeNode = {
      name: '.',
      path: '',
      type: 'dir',
      changes: 0,
      children: [],
    }

    for (const [filePath, changes] of frequencyMap) {
      const parts = filePath.split('/')
      let current = root

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isLast = i === parts.length - 1
        const currentPath = parts.slice(0, i + 1).join('/')

        if (isLast) {
          // Leaf file node
          if (!current.children) current.children = []
          const existing = current.children.find((c) => c.name === part)
          if (existing) {
            existing.changes += changes
          } else {
            current.children.push({
              name: part,
              path: currentPath,
              type: 'file',
              changes,
            })
          }
          current.changes += changes
        } else {
          // Intermediate directory node
          if (!current.children) current.children = []
          let dir = current.children.find(
            (c) => c.name === part && c.type === 'dir',
          )
          if (!dir) {
            dir = {
              name: part,
              path: currentPath,
              type: 'dir',
              changes: 0,
              children: [],
            }
            current.children.push(dir)
          }
          dir.changes += changes
          current = dir
        }
      }
    }

    // Sort children: directories first, then by change frequency descending
    this.sortTree(root)

    return root
  }

  /** Recursively sort tree nodes — dirs first, then by changes desc. */
  private sortTree(node: TreeNode): void {
    if (!node.children) return

    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return b.changes - a.changes
    })

    for (const child of node.children) {
      if (child.type === 'dir') this.sortTree(child)
    }
  }

  /** Check whether a file path starts with an ignored directory. */
  private isIgnored(filePath: string): boolean {
    const firstSegment = filePath.split('/')[0]
    return IGNORED_DIRS.has(firstSegment)
  }
}
