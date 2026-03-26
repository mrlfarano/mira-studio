/**
 * RegistryClient — fetches, caches, and installs workspace configs from
 * a GitHub-hosted community registry (JSON index).
 *
 * The index is a flat array of RegistryEntry objects hosted at a known URL.
 * Results are cached in-memory for 5 minutes to avoid repeated fetches.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGISTRY_INDEX_URL =
  'https://raw.githubusercontent.com/mrlfarano/mira-registry/main/index.json'

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  id: string
  name: string
  description: string
  author: string
  category: 'stack' | 'workflow' | 'minimal' | 'theme' | 'skill'
  stars: number
  configUrl: string
  version: string
  tags: string[]
}

// ---------------------------------------------------------------------------
// Sample data — used when the remote index is unreachable
// ---------------------------------------------------------------------------

const SAMPLE_ENTRIES: RegistryEntry[] = [
  {
    id: 'nextjs-starter',
    name: 'Next.js Starter',
    description:
      'Full-stack Next.js workspace with terminal, Kanban, and deploy panel pre-configured.',
    author: 'mira-team',
    category: 'stack',
    stars: 128,
    configUrl:
      'https://raw.githubusercontent.com/mrlfarano/mira-registry/main/configs/nextjs-starter.json',
    version: '1.0.0',
    tags: ['nextjs', 'react', 'fullstack', 'typescript'],
  },
  {
    id: 'bmad-workflow',
    name: 'BMAD Workflow',
    description:
      'Opinionated BMAD Method layout with companion, journal, and SI panel for iterative delivery.',
    author: 'bmad-contrib',
    category: 'workflow',
    stars: 87,
    configUrl:
      'https://raw.githubusercontent.com/mrlfarano/mira-registry/main/configs/bmad-workflow.json',
    version: '1.2.0',
    tags: ['bmad', 'agile', 'methodology', 'planning'],
  },
  {
    id: 'minimal-terminal',
    name: 'Minimal Terminal',
    description:
      'Single full-width terminal with nothing else — zero distractions.',
    author: 'mira-team',
    category: 'minimal',
    stars: 214,
    configUrl:
      'https://raw.githubusercontent.com/mrlfarano/mira-registry/main/configs/minimal-terminal.json',
    version: '1.0.0',
    tags: ['minimal', 'terminal', 'focus'],
  },
  {
    id: 'dark-ocean-theme',
    name: 'Dark Ocean Theme',
    description:
      'Deep blue-green palette inspired by ocean depths. Easy on the eyes during long sessions.',
    author: 'theme-studio',
    category: 'theme',
    stars: 156,
    configUrl:
      'https://raw.githubusercontent.com/mrlfarano/mira-registry/main/configs/dark-ocean-theme.json',
    version: '2.0.1',
    tags: ['theme', 'dark', 'ocean', 'blue'],
  },
  {
    id: 'fastapi-stack',
    name: 'FastAPI Stack',
    description:
      'Python FastAPI workspace with dual terminals, observability panel, and deploy target pre-wired.',
    author: 'py-contrib',
    category: 'stack',
    stars: 93,
    configUrl:
      'https://raw.githubusercontent.com/mrlfarano/mira-registry/main/configs/fastapi-stack.json',
    version: '1.1.0',
    tags: ['python', 'fastapi', 'backend', 'api'],
  },
]

// ---------------------------------------------------------------------------
// RegistryClient
// ---------------------------------------------------------------------------

export class RegistryClient {
  private cachedEntries: RegistryEntry[] | null = null
  private cacheTimestamp = 0

  /**
   * Browse the registry with optional full-text query and category filter.
   * Falls back to sample entries when the remote index is unreachable.
   */
  async browse(query?: string, category?: string): Promise<RegistryEntry[]> {
    const entries = await this.fetchIndex()

    return entries.filter((entry) => {
      if (category && entry.category !== category) return false
      if (query) {
        const q = query.toLowerCase()
        const haystack = [
          entry.name,
          entry.description,
          entry.author,
          ...entry.tags,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }

  /**
   * Return a single registry entry by ID, or undefined if not found.
   */
  async getEntry(id: string): Promise<RegistryEntry | undefined> {
    const entries = await this.fetchIndex()
    return entries.find((e) => e.id === id)
  }

  /**
   * Install a registry entry into the local .mira/ directory.
   *
   * Fetches the JSON config bundle from the entry's `configUrl` and writes
   * each file into `configDir` (the project's `.mira/` folder).
   *
   * The config bundle is expected to be a JSON object whose keys are
   * relative file paths (e.g. "workspaces/default.yml") and values are
   * the file contents as strings.
   */
  async install(id: string, configDir: string): Promise<{ ok: true; id: string }> {
    const entry = await this.getEntry(id)
    if (!entry) {
      throw new Error(`Registry entry "${id}" not found`)
    }

    let bundle: Record<string, string>

    try {
      const res = await fetch(entry.configUrl)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      bundle = (await res.json()) as Record<string, string>
    } catch {
      throw new Error(
        `Failed to download config bundle for "${id}" from ${entry.configUrl}`,
      )
    }

    // Write each file into .mira/
    for (const [relativePath, content] of Object.entries(bundle)) {
      const absPath = path.join(configDir, relativePath)
      await fs.mkdir(path.dirname(absPath), { recursive: true })
      await fs.writeFile(absPath, content, 'utf-8')
    }

    return { ok: true, id }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Fetch the remote index, using a 5-minute in-memory cache.
   * Falls back to hardcoded sample data on failure.
   */
  private async fetchIndex(): Promise<RegistryEntry[]> {
    const now = Date.now()
    if (this.cachedEntries && now - this.cacheTimestamp < CACHE_TTL_MS) {
      return this.cachedEntries
    }

    try {
      const res = await fetch(REGISTRY_INDEX_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as RegistryEntry[]
      this.cachedEntries = data
      this.cacheTimestamp = now
      return data
    } catch {
      // Remote unavailable — fall back to sample entries
      this.cachedEntries = SAMPLE_ENTRIES
      this.cacheTimestamp = now
      return SAMPLE_ENTRIES
    }
  }
}
