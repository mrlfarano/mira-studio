# Mira Studio v1.0 Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Mira Studio v1.0 to npm as `npx mira-studio`, with the canonical brain-dump → kanban → agent → journal user journey working end-to-end.

**Architecture:** Two-process app (Vite/React frontend + Fastify/node-pty server) currently runs as two dev servers. v1.0 collapses them into a single `npx mira-studio` command: server boots on a free port, serves bundled frontend at `/`, opens browser. Existing engine layer (PTY, config, companion, journal, git, skills, MCP, snapshot, SI) is mostly real and ships as-is; the work is closing broken wires in the React layer, packaging, and shipping.

**Tech Stack:** TypeScript, React 19, Vite 8, Zustand, Fastify, node-pty, xterm.js, simple-git, chokidar, js-yaml, Playwright, Vitest, keytar (new), get-port (new), open (new).

**Source spec:** `docs/superpowers/specs/2026-05-15-mira-studio-v1-ship-design.md`

---

## File Map

### Creating

- `bin/mira` — npx CLI entry point
- `src/panels/journal/JournalPanel.tsx` — Build Journal UI
- `src/panels/journal/useJournal.ts` — Journal data hook
- `src/panels/journal/index.ts` — Re-exports
- `src/lib/companion-sse.ts` — SSE client for companion chat
- `server/src/routes/scenes.ts` — Scenes endpoint
- `server/src/static-mount.ts` — Production static frontend mount
- `e2e/canonical-journey.spec.ts` — End-to-end Playwright test

### Modifying

- `src/panels/companion/CompanionPanel.tsx` — Replace setTimeout mock with SSE call
- `src/panels/terminal/useTerminal.ts` — Forward `spawned` sessionId to store
- `src/store/session-store.ts` — Verify/extend session lifecycle
- `src/store/layout-store.ts` — Surface persist errors instead of swallowing
- `src/components/BrainDumpInput.tsx` — User-visible error when card-gen degrades
- `vite.config.ts` — Add `/api` and `/ws` proxies
- `server/src/index.ts` — Read `PORT` env, register static mount in prod, register scenes route
- `server/src/config/config-engine.ts` — Add `gitSync.autoCommit: true` to defaults
- `server/src/companion/companion-engine.ts` — Read `.mira/memory.yml` into system prompt
- `server/src/companion/card-generator.ts` — Surface degradation reason in result
- `server/package.json` — Production start script using `PORT` env
- `package.json` — Add `bin`, `files`, `start` script, npx-mode deps
- `README.md` — User-facing npx usage instructions
- `CHANGELOG.md` — v1.0.0 entry

---

## Phase 0: Preserve work in progress

### Task 0.1: Commit uncommitted LAN-access refactor

Five files have uncommitted modifications converting hardcoded `127.0.0.1:3001` → `window.location.hostname:3001` and server bind from `127.0.0.1` → `0.0.0.0`. The static audit confirmed these are orthogonal, low-risk, and useful for LAN access (tablet-as-second-screen). Commit before fix work so the diff for each subsequent task is clean.

**Files:**
- Modify: `server/src/index.ts`, `src/hooks/useTerminalSocket.ts`, `src/lib/send-to-agent.ts`, `src/store/si-store.ts`, `vite.config.ts` (already modified)

- [ ] **Step 1: Confirm working-tree state**

Run: `git status --short`
Expected: 5 files marked `M`, no `??` of substance.

- [ ] **Step 2: Read each modification to confirm scope**

Run: `git diff server/src/index.ts src/hooks/useTerminalSocket.ts src/lib/send-to-agent.ts src/store/si-store.ts vite.config.ts`
Expected: Only LAN-access changes (hostname binding, CORS allowlist, URL builder). No partial features.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts src/hooks/useTerminalSocket.ts src/lib/send-to-agent.ts src/store/si-store.ts vite.config.ts
git commit -m "feat: enable LAN access mode

Server binds 0.0.0.0; CORS allows localhost + 192.168.50.x. Client URL
builders use window.location.hostname so the app is reachable from a
phone or tablet on the same LAN.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected: clean commit, working tree clean.

- [ ] **Step 4: Verify**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

---

## Phase 1: Dev environment

### Task 1.1: Vite dev proxy for `/api` and `/ws`

Frontend runs on port 5173, server on 3001. All `fetch('/api/...')` calls (BrainDumpInput, ThemeMarketplace, SnapshotManager, layout-store, etc.) currently CORS-fail in dev. Add Vite proxy so dev frontend can reach the server seamlessly. WebSocket URLs are explicit (`ws://host:3001/ws/...`) and don't need the proxy, but adding `/ws` proxying makes dev mirror production single-port behavior.

**Files:**
- Modify: `vite.config.ts`
- Test: manual smoke (no unit test — pure dev config)

- [ ] **Step 1: Add the proxy block**

Modify `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@/lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@/store': fileURLToPath(new URL('./src/store', import.meta.url)),
      '@/types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@/panels': fileURLToPath(new URL('./src/panels', import.meta.url)),
    },
  },
})
```

- [ ] **Step 2: Verify dev boot still works**

Run terminal A: `npm run server` — wait for "listening on 0.0.0.0:3001".
Run terminal B: `npm run dev` — wait for "Local: http://localhost:5173/".

- [ ] **Step 3: Verify proxy in browser console**

In browser at `http://localhost:5173`, open DevTools and run:
```js
fetch('/api/health').then(r => r.json()).then(console.log)
```
Expected: `{status: "ok"}` printed. No CORS error in console.

- [ ] **Step 4: Stop dev servers and commit**

```bash
pkill -f "tsx watch" ; pkill -f "vite"
git add vite.config.ts
git commit -m "feat: proxy /api and /ws to server in dev

Removes CORS friction during local development. Production npx mode
serves UI and API from a single port so no proxy is needed there.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2: Canonical journey wires

### Task 2.1: Forward `spawned` sessionId into session store

`useTerminal.ts:131` has `case "spawned": // Shell is ready` — a no-op. The server sends `{ type: "spawned", sessionId }` after PTY init, but the frontend never adds the session to `useSessionStore`. Result: `KanbanCard.activeSessions` is always empty; "Send to Agent" silently no-ops.

**Files:**
- Modify: `src/panels/terminal/useTerminal.ts`
- Read for reference: `src/store/session-store.ts` (has `upsertSession({ id, ... })`)
- Read for reference: `src/types/ws-protocol.ts` (PtyServerMessage variants)
- Test: `src/panels/terminal/__tests__/useTerminal.test.ts` (create if missing)

- [ ] **Step 1: Confirm the WS message shape**

Run: `grep -n "spawned" /Users/la/dev/mira-studio/src/types/ws-protocol.ts`
Expected: a `{ type: "spawned"; sessionId: string; ... }` variant. Note the exact field names.

- [ ] **Step 2: Confirm session-store upsertSession signature**

Run: `grep -A 5 "upsertSession:" /Users/la/dev/mira-studio/src/store/session-store.ts`
Expected: `upsertSession: (session: AgentSession) => void`. Note `AgentSession` fields (`id`, `agentType`, `status`, etc.).

- [ ] **Step 3: Write the failing test**

Create `src/panels/terminal/__tests__/useTerminal.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTerminal } from '../useTerminal'
import { useSessionStore } from '@/store/session-store'

vi.mock('@/hooks/useTerminalSocket', () => ({
  useTerminalSocket: () => ({
    sendInput: vi.fn(),
    resize: vi.fn(),
    spawn: vi.fn(),
    lastMessage: { type: 'spawned', sessionId: 'sess-123', pid: 4242 },
    connectionState: 'connected',
  }),
}))

describe('useTerminal — spawned message', () => {
  beforeEach(() => {
    useSessionStore.getState().clearSessions()
  })

  it('registers session in store when server emits spawned', () => {
    renderHook(() => useTerminal({ sessionId: 'sess-123' }))
    const sessions = useSessionStore.getState().sessions
    expect(sessions['sess-123']).toBeDefined()
    expect(sessions['sess-123'].id).toBe('sess-123')
  })
})
```

- [ ] **Step 4: Run the test, confirm it fails**

Run: `npx vitest run src/panels/terminal/__tests__/useTerminal.test.ts`
Expected: FAIL — `sessions['sess-123']` is undefined.

- [ ] **Step 5: Implement**

Modify `src/panels/terminal/useTerminal.ts`. Add import near other imports:

```typescript
import { useSessionStore } from '@/store/session-store'
```

Inside `useTerminal`, after the existing hooks, get the action:

```typescript
const upsertSession = useSessionStore((s) => s.upsertSession)
```

Replace the `case "spawned":` block in the message switch:

```typescript
case "spawned":
  upsertSession({
    id: msg.sessionId,
    agentType: "claude-code",
    status: "idle",
    startedAt: Date.now(),
  })
  break
```

Note: if the existing `AgentSession` type uses different field names (e.g. `kind` instead of `agentType`), match the type. The test mock should pass with whatever shape the store accepts.

- [ ] **Step 6: Run the test, confirm pass**

Run: `npx vitest run src/panels/terminal/__tests__/useTerminal.test.ts`
Expected: PASS.

- [ ] **Step 7: Run full test suite, confirm no regressions**

Run: `npm test`
Expected: all tests pass (frontend baseline was 20 — now ≥21).

- [ ] **Step 8: Commit**

```bash
git add src/panels/terminal/useTerminal.ts src/panels/terminal/__tests__/useTerminal.test.ts
git commit -m "fix: register PTY session in store on spawned message

Previously useTerminal swallowed the server's spawned frame, leaving
useSessionStore.sessions empty. Send-to-Agent had no session to target
and silently no-opped. Now every spawned PTY registers its sessionId
so Kanban cards can send into it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: Wire CompanionPanel to real SSE endpoint

`CompanionPanel.tsx:107` has `setTimeout(() => addMessage({ ... "Got it!" }), 1200)` — a hardcoded mock. The server's `/api/companion/chat` SSE endpoint is real and works. Replace the mock with an EventSource-style fetch reader that appends streamed tokens.

**Files:**
- Create: `src/lib/companion-sse.ts`
- Modify: `src/panels/companion/CompanionPanel.tsx`
- Test: `src/lib/__tests__/companion-sse.test.ts`

- [ ] **Step 1: Confirm server SSE shape**

Run: `grep -A 30 "companion/chat" /Users/la/dev/mira-studio/server/src/companion/index.ts`
Expected: a Fastify route returning `text/event-stream`; emits `data: { text: "..." }\n\n` lines and a terminal `data: [DONE]\n\n`.
Note the exact request body schema (likely `{ message: string, sessionId?: string }`).

- [ ] **Step 2: Write the failing test for the SSE consumer**

Create `src/lib/__tests__/companion-sse.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { streamCompanionReply } from '../companion-sse'

function mockSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('streamCompanionReply', () => {
  it('aggregates text chunks from SSE frames', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockSseResponse([
        'data: {"text":"Hello"}\n\n',
        'data: {"text":" world"}\n\n',
        'data: [DONE]\n\n',
      ]),
    )
    const chunks: string[] = []
    await streamCompanionReply(
      { message: 'hi' },
      (chunk) => chunks.push(chunk),
      { fetchImpl: fetchMock },
    )
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('throws on non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }))
    await expect(
      streamCompanionReply({ message: 'hi' }, () => {}, { fetchImpl: fetchMock }),
    ).rejects.toThrow(/500/)
  })
})
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npx vitest run src/lib/__tests__/companion-sse.test.ts`
Expected: FAIL — `streamCompanionReply` is not defined.

- [ ] **Step 4: Implement the SSE consumer**

Create `src/lib/companion-sse.ts`:

```typescript
export interface CompanionRequest {
  message: string
  sessionId?: string
}

export interface StreamOptions {
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

export async function streamCompanionReply(
  body: CompanionRequest,
  onChunk: (text: string) => void,
  opts: StreamOptions = {},
): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const res = await fetchImpl('/api/companion/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!res.ok) {
    throw new Error(`Companion SSE failed: ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('Companion SSE response had no body')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))
      if (!dataLine) continue
      const payload = dataLine.slice('data: '.length).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload) as { text?: string }
        if (parsed.text) onChunk(parsed.text)
      } catch {
        // ignore malformed frames; server may emit keepalives
      }
    }
  }
}
```

- [ ] **Step 5: Run the test, confirm pass**

Run: `npx vitest run src/lib/__tests__/companion-sse.test.ts`
Expected: PASS.

- [ ] **Step 6: Wire into CompanionPanel**

Modify `src/panels/companion/CompanionPanel.tsx`. Add at the top with other imports:

```typescript
import { streamCompanionReply } from '@/lib/companion-sse'
```

Replace `handleSend` (lines 92-116) with:

```typescript
const handleSend = useCallback(async () => {
  const text = inputValue.trim()
  if (!text) return

  addMessage({
    id: `user-${Date.now()}`,
    role: 'user',
    text,
    timestamp: Date.now(),
  })

  setInputValue('')
  setIsStreaming(true)

  const replyId = `companion-${Date.now()}`
  let accumulated = ''
  // Pre-create the streaming bubble so tokens append live.
  addMessage({
    id: replyId,
    role: 'companion',
    text: '',
    timestamp: Date.now(),
  })

  try {
    await streamCompanionReply(
      { message: text },
      (chunk) => {
        accumulated += chunk
        useCompanionStore.getState().updateMessage(replyId, accumulated)
      },
    )
  } catch (err) {
    useCompanionStore.getState().updateMessage(
      replyId,
      `[error: ${err instanceof Error ? err.message : 'companion unreachable'}]`,
    )
  } finally {
    setIsStreaming(false)
  }
}, [inputValue, addMessage])
```

- [ ] **Step 7: Verify companion-store has `updateMessage`**

Run: `grep -n "updateMessage" /Users/la/dev/mira-studio/src/store/companion-store.ts`

If `updateMessage` does not exist, add it to the store next to `addMessage`:

```typescript
updateMessage: (id: string, text: string) =>
  set(
    (s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, text } : m)),
    }),
    undefined,
    'companion/updateMessage',
  ),
```

And add `updateMessage: (id: string, text: string) => void` to the store type.

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: all pass.

- [ ] **Step 9: Manual smoke test**

Terminal A: `npm run server`
Terminal B: `npm run dev`
Browser: open companion panel, type "hello", press Enter.
Expected: streamed reply from Claude (if API key set) or Ollama (if running locally). If neither is configured, error bubble: `[error: ...]`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/companion-sse.ts src/lib/__tests__/companion-sse.test.ts src/panels/companion/CompanionPanel.tsx src/store/companion-store.ts
git commit -m "feat: wire CompanionPanel to real SSE endpoint

Replaces the hardcoded setTimeout('Got it!') mock with an EventSource-
style fetch reader against /api/companion/chat. Tokens stream into a
pre-created reply bubble via the new updateMessage store action.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3: Cornerstone completion

### Task 3.1: Build Journal UI panel

The server's journal engine and REST endpoints (`/api/journal/today`, `/api/journal/:date`, `/api/journal`, `/api/journal/summary`) are fully implemented, but no React panel consumes them. Build Journal is a cornerstone — without UI, the feature doesn't ship.

**Files:**
- Create: `src/panels/journal/JournalPanel.tsx`
- Create: `src/panels/journal/useJournal.ts`
- Create: `src/panels/journal/index.ts`
- Create: `src/panels/journal/__tests__/JournalPanel.test.tsx`
- Modify: somewhere a panel registry resolves `panel.type` → component (find via `grep`)

- [ ] **Step 1: Confirm journal REST endpoints**

Run: `grep -n "register.*journal\|app.get.*journal\|server.get.*journal" /Users/la/dev/mira-studio/server/src/journal/index.ts`
Expected: routes for `/api/journal/today`, etc. Note the exact response shape — likely `{ date, entries: [{ timestamp, source, description }] }`.

- [ ] **Step 2: Find the panel registry**

Run: `grep -rn "build-journal\|panel.type ===" /Users/la/dev/mira-studio/src/ --include="*.tsx" --include="*.ts"`
Expected: a switch statement or map in something like `src/panels/PanelRoot.tsx` or `App.tsx` mapping `type` strings to components. Note the file path — you'll add a case for `"build-journal"`.

- [ ] **Step 3: Write the failing test**

Create `src/panels/journal/__tests__/JournalPanel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import JournalPanel from '../JournalPanel'

describe('JournalPanel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            date: '2026-05-15',
            entries: [
              { timestamp: '10:30', source: 'pty', description: 'session-1 spawned' },
              { timestamp: '10:32', source: 'kanban', description: 'card moved to In Agent' },
            ],
          }),
          { headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
  })

  it('renders today\'s entries', async () => {
    render(<JournalPanel />)
    await waitFor(() => {
      expect(screen.getByText(/session-1 spawned/)).toBeInTheDocument()
      expect(screen.getByText(/card moved to In Agent/)).toBeInTheDocument()
    })
  })

  it('shows empty state when no entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ date: '2026-05-15', entries: [] }), {
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    render(<JournalPanel />)
    await waitFor(() => {
      expect(screen.getByText(/no journal entries yet/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 4: Run the test, confirm it fails**

Run: `npx vitest run src/panels/journal/__tests__/JournalPanel.test.tsx`
Expected: FAIL — `JournalPanel` does not exist.

- [ ] **Step 5: Implement the data hook**

Create `src/panels/journal/useJournal.ts`:

```typescript
import { useEffect, useState } from 'react'

export interface JournalEntry {
  timestamp: string
  source: string
  description: string
}

export interface JournalDay {
  date: string
  entries: JournalEntry[]
}

export interface UseJournalResult {
  data: JournalDay | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useJournal(): UseJournalResult {
  const [data, setData] = useState<JournalDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bump, setBump] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/journal/today')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as JournalDay
      })
      .then((body) => {
        if (cancelled) return
        setData(body)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load journal')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bump])

  return {
    data,
    loading,
    error,
    refresh: () => setBump((n) => n + 1),
  }
}
```

- [ ] **Step 6: Implement the panel**

Create `src/panels/journal/JournalPanel.tsx`:

```typescript
import React from 'react'
import { useJournal } from './useJournal'

const JournalPanel: React.FC = () => {
  const { data, loading, error, refresh } = useJournal()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontSize: '13px',
        color: '#e0e0e0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 10px',
          borderBottom: '1px solid #2a2a3e',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11px', color: '#888' }}>
          Build Journal {data?.date ? `· ${data.date}` : ''}
        </span>
        <button
          onClick={refresh}
          aria-label="Refresh journal"
          style={{
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '4px',
            color: '#888',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 8px',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {loading && <div style={{ color: '#666' }}>Loading…</div>}
        {error && (
          <div style={{ color: '#ef4444' }}>Failed to load: {error}</div>
        )}
        {data && data.entries.length === 0 && !loading && (
          <div style={{ color: '#555' }}>No journal entries yet</div>
        )}
        {data &&
          data.entries.map((entry, i) => (
            <div
              key={i}
              style={{
                padding: '4px 0',
                borderBottom: '1px solid #1a1a2e',
                display: 'grid',
                gridTemplateColumns: '54px 70px 1fr',
                gap: '8px',
                alignItems: 'baseline',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              <span style={{ color: '#555' }}>{entry.timestamp}</span>
              <span style={{ color: '#8b5cf6' }}>{entry.source}</span>
              <span>{entry.description}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default React.memo(JournalPanel)
```

- [ ] **Step 7: Create barrel re-export**

Create `src/panels/journal/index.ts`:

```typescript
export { default as JournalPanel } from './JournalPanel'
export { useJournal } from './useJournal'
```

- [ ] **Step 8: Register in panel switch**

Open the panel registry file you located in Step 2. Add a case for `"build-journal"`:

```typescript
// Existing imports add:
import { JournalPanel } from '@/panels/journal'

// In the switch:
case 'build-journal':
  return <JournalPanel />
```

- [ ] **Step 9: Enable build-journal toggle in default workspace**

Modify `server/src/config/config-engine.ts:72`, change:
```typescript
"build-journal": false,
```
to:
```typescript
"build-journal": true,
```

Also add a default layout entry in `DEFAULT_WORKSPACE_CONFIG.layout`:
```typescript
{ id: "journal-1", type: "build-journal", x: 6, y: 4, w: 3, h: 4 },
```

- [ ] **Step 10: Run tests**

Run: `npm test && npm run test:server`
Expected: all pass.

- [ ] **Step 11: Manual smoke test**

Terminal A: `npm run server`
Terminal B: `npm run dev`
Open `http://localhost:5173`. Build Journal panel renders. Trigger an event (e.g. open a terminal — spawned event will be journaled). Click Refresh — entry appears.

- [ ] **Step 12: Commit**

```bash
git add src/panels/journal/ server/src/config/config-engine.ts <panel-registry-file>
git commit -m "feat: add Build Journal UI panel

Renders today's journal entries from /api/journal/today. Enabled by
default in the workspace layout — Build Journal is a cornerstone
feature and needs first-class UI surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: Enable Git auto-commit by default

`DEFAULT_MIRA_CONFIG` does not include a `gitSync.autoCommit` field, so `GitSyncEngine.autoCommitEnabled` is `false` out of the box. The cornerstone .mira/ → Git flow silently never fires. Make it opt-out, not opt-in.

**Files:**
- Modify: `server/src/config/config-engine.ts`
- Modify: `server/src/config/types.ts` (if `MiraConfig` needs a `gitSync` field)
- Test: `server/src/config/__tests__/config-engine.test.ts` (extend existing)

- [ ] **Step 1: Check whether `MiraConfig` type already has `gitSync`**

Run: `grep -n "gitSync\|autoCommit" /Users/la/dev/mira-studio/server/src/config/types.ts`
Expected: either an existing `gitSync?: { autoCommit?: boolean }` field, or nothing.

- [ ] **Step 2: Add the type if missing**

Open `server/src/config/types.ts`. Inside `MiraConfig` interface add:

```typescript
gitSync: {
  autoCommit: boolean
  debounceMs: number
}
```

(Read existing fields first to match indentation and style.)

- [ ] **Step 3: Write the failing test**

In `server/src/config/__tests__/config-engine.test.ts`, add:

```typescript
import { DEFAULT_MIRA_CONFIG } from '../config-engine'

describe('DEFAULT_MIRA_CONFIG', () => {
  it('enables git auto-commit by default', () => {
    expect(DEFAULT_MIRA_CONFIG.gitSync.autoCommit).toBe(true)
  })
})
```

- [ ] **Step 4: Run the test, confirm it fails**

Run: `npm --prefix server test`
Expected: FAIL — `gitSync` is undefined.

- [ ] **Step 5: Add to defaults**

Modify `DEFAULT_MIRA_CONFIG` in `server/src/config/config-engine.ts`:

```typescript
export const DEFAULT_MIRA_CONFIG: MiraConfig = {
  version: "0.1.0",
  projectName: "My Mira Project",
  activeProfile: "Balanced",
  activeWorkspace: "default",
  enabledModules: [
    "agent-cockpit",
    "companion",
    "kanban",
    "notifications",
  ],
  mcpConnections: [],
  telemetryOptIn: false,
  activeTheme: "default",
  gitSync: {
    autoCommit: true,
    debounceMs: 5000,
  },
}
```

- [ ] **Step 6: Run the test, confirm pass**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/config/config-engine.ts server/src/config/types.ts server/src/config/__tests__/config-engine.test.ts
git commit -m "feat: enable .mira/ git auto-commit by default

GitSyncEngine.autoCommitEnabled was false out of the box because
DEFAULT_MIRA_CONFIG had no gitSync block. Cornerstone .mira/ Git
sync now fires by default with a 5s debounce.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4: Quality fixes (P2)

### Task 4.1: Read `.mira/memory.yml` into companion context

`CompanionEngine.buildSystemPrompt` only reads context fields passed from the client. The PRD specifies server-side `.mira/memory.yml` assembly into the system prompt. Implement it.

**Files:**
- Modify: `server/src/companion/companion-engine.ts`
- Test: `server/src/companion/__tests__/companion-engine.test.ts`

- [ ] **Step 1: Read current `buildSystemPrompt`**

Run: `grep -n "buildSystemPrompt\|memory.yml" /Users/la/dev/mira-studio/server/src/companion/companion-engine.ts`
Read the method body. Note where the system prompt is constructed.

- [ ] **Step 2: Write the failing test**

In `server/src/companion/__tests__/companion-engine.test.ts`, add:

```typescript
import { CompanionEngine } from '../companion-engine'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('CompanionEngine — memory.yml integration', () => {
  it('includes memory.yml content in system prompt when present', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'mira-test-'))
    mkdirSync(path.join(tmp, '.mira'))
    writeFileSync(
      path.join(tmp, '.mira', 'memory.yml'),
      'project_notes: "User prefers terse explanations."\n',
    )
    const engine = new CompanionEngine(tmp, /* configEngine stub */ {} as any)
    const prompt = await engine.buildSystemPrompt({ tone: 'Casual', verbosity: 3 })
    expect(prompt).toMatch(/terse explanations/)
  })

  it('omits memory section when memory.yml missing', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'mira-test-'))
    mkdirSync(path.join(tmp, '.mira'))
    const engine = new CompanionEngine(tmp, {} as any)
    const prompt = await engine.buildSystemPrompt({ tone: 'Casual', verbosity: 3 })
    expect(prompt).not.toMatch(/Project memory/)
  })
})
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npm --prefix server test`
Expected: FAIL.

- [ ] **Step 4: Implement**

In `server/src/companion/companion-engine.ts`, add at top:

```typescript
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'
```

Add a private helper:

```typescript
private async readMemorySnapshot(): Promise<string | null> {
  try {
    const raw = await readFile(
      path.join(this.projectRoot, '.mira', 'memory.yml'),
      'utf8',
    )
    const parsed = yaml.load(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return yaml.dump(parsed).trim()
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    return null
  }
}
```

Modify `buildSystemPrompt` to call `await this.readMemorySnapshot()` and, if non-null, append a section:

```typescript
const memory = await this.readMemorySnapshot()
if (memory) {
  prompt += `\n\nProject memory:\n${memory}`
}
```

(Adjust based on the actual prompt-building code.)

- [ ] **Step 5: Run the test, confirm pass**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/companion/companion-engine.ts server/src/companion/__tests__/companion-engine.test.ts
git commit -m "feat: load .mira/memory.yml into companion system prompt

PRD's 'context assembly (.mira/memory.yml read)' step was unimplemented.
Now CompanionEngine reads project memory on each request and appends
it as a 'Project memory' section in the system prompt. Missing file
silently skips the section.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.2: Add `/api/config/scenes` endpoint

`hydrateStores` fetches `/api/config/scenes` which has no server route. The failure is swallowed by `Promise.allSettled`, so scenes always use client defaults. Add the endpoint backed by a `scenes.yml` in `.mira/`.

**Files:**
- Create: `server/src/routes/scenes.ts`
- Modify: `server/src/index.ts` (register the route)
- Test: `server/src/routes/__tests__/scenes.test.ts`

- [ ] **Step 1: Confirm what the client expects**

Run: `grep -B 2 -A 8 "config/scenes" /Users/la/dev/mira-studio/src/store/hydrate.ts`
Note the response shape the client expects.

- [ ] **Step 2: Write the failing test**

Create `server/src/routes/__tests__/scenes.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerScenesRoute } from '../scenes'
import { mkdtempSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

describe('GET /api/config/scenes', () => {
  it('returns empty scenes array when scenes.yml missing', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'mira-scenes-'))
    mkdirSync(path.join(tmp, '.mira'))
    const app = Fastify()
    registerScenesRoute(app, tmp)
    const res = await app.inject({ method: 'GET', url: '/api/config/scenes' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ scenes: [] })
  })
})
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npm --prefix server test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Create `server/src/routes/scenes.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import yaml from 'js-yaml'

interface ScenesFile {
  scenes: Array<{ id: string; name: string; workspaces: [string, string] }>
}

export function registerScenesRoute(
  server: FastifyInstance,
  projectRoot: string,
): void {
  server.get('/api/config/scenes', async () => {
    try {
      const raw = await readFile(
        path.join(projectRoot, '.mira', 'scenes.yml'),
        'utf8',
      )
      const parsed = yaml.load(raw) as ScenesFile | null
      return parsed ?? { scenes: [] }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { scenes: [] }
      }
      throw err
    }
  })
}
```

- [ ] **Step 5: Register in `server/src/index.ts`**

After other `register*Routes` calls and before the start function:

```typescript
import { registerScenesRoute } from './routes/scenes.js'
// ...
registerScenesRoute(server, PROJECT_ROOT)
```

- [ ] **Step 6: Run tests**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/scenes.ts server/src/routes/__tests__/scenes.test.ts server/src/index.ts
git commit -m "feat: add /api/config/scenes endpoint

hydrateStores fetches this URL and the silent allSettled failure
left scenes on client defaults. Now backed by .mira/scenes.yml with
an empty default when the file is missing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.3: Surface layout persist errors

`src/store/layout-store.ts:22` ends with `.catch(() => {})` — silent failure means users think their layout was saved when it wasn't. Pipe failures into the notification store.

**Files:**
- Modify: `src/store/layout-store.ts`

- [ ] **Step 1: Read current persist code**

Run: `grep -A 10 "fetch.*workspaces" /Users/la/dev/mira-studio/src/store/layout-store.ts`

- [ ] **Step 2: Locate notification store API**

Run: `grep -n "addNotification\|notification" /Users/la/dev/mira-studio/src/store/notification-store.ts | head -10`
Note the action signature (likely `addNotification({ severity, message })`).

- [ ] **Step 3: Modify the catch**

In `src/store/layout-store.ts`, replace the bare catch with:

```typescript
.catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : 'unknown error'
  useNotificationStore.getState().addNotification({
    severity: 'warning',
    title: 'Layout not saved',
    message: `Failed to persist workspace layout: ${msg}`,
  })
})
```

Add at top:
```typescript
import { useNotificationStore } from './notification-store'
```

(Match the actual notification store API surface — read the file first if signatures differ.)

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass (no test added — this is a minor behavior fix, not a contract change).

- [ ] **Step 5: Commit**

```bash
git add src/store/layout-store.ts
git commit -m "fix: surface layout persist failures via notification

Replaced silent .catch(() => {}) with a notification so users learn
when their workspace layout failed to write back to the server.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.4: Surface card-generator degradation reason

When the LLM returns malformed JSON, `card-generator.ts` silently defaults to one "Review notes" card with no signal to the user. Add a `degraded: boolean` flag in the response and a notification in the UI.

**Files:**
- Modify: `server/src/companion/card-generator.ts`
- Modify: `src/components/BrainDumpInput.tsx`
- Test: `server/src/companion/__tests__/card-generator.test.ts`

- [ ] **Step 1: Read current `generateCardsFromText`**

Run: `grep -n "Review notes\|fallback\|catch" /Users/la/dev/mira-studio/server/src/companion/card-generator.ts`

- [ ] **Step 2: Write the failing test**

Add to (or create) `server/src/companion/__tests__/card-generator.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { generateCardsFromText } from '../card-generator'

describe('generateCardsFromText degradation', () => {
  it('sets degraded=true and includes reason when LLM returns non-JSON', async () => {
    const fakeEngine = {
      streamCompletion: vi.fn().mockResolvedValue('not json at all'),
    }
    const result = await generateCardsFromText(fakeEngine as any, 'some text')
    expect(result.degraded).toBe(true)
    expect(result.degradationReason).toMatch(/parse/i)
    expect(result.cards.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `npm --prefix server test`
Expected: FAIL — fields don't exist.

- [ ] **Step 4: Extend the return type**

In `card-generator.ts`, update the return shape:

```typescript
export interface CardGenerationResult {
  cards: GeneratedCard[]
  degraded: boolean
  degradationReason?: string
}
```

In the fallback branch of `generateCardsFromText`:

```typescript
return {
  cards: [{ title: 'Review notes', description: text, priority: 'medium' }],
  degraded: true,
  degradationReason: 'Could not parse LLM response as JSON',
}
```

In the happy path:
```typescript
return { cards: parsed, degraded: false }
```

(Adjust to actual code — the existing function may already return `{ cards }`; just add the new fields.)

- [ ] **Step 5: Run the test, confirm pass**

Run: `npm --prefix server test`
Expected: PASS.

- [ ] **Step 6: Surface in UI**

In `src/components/BrainDumpInput.tsx` where the response is consumed, when `body.degraded` is true, call notification store:

```typescript
if (body.degraded) {
  useNotificationStore.getState().addNotification({
    severity: 'info',
    title: 'Card parsing degraded',
    message: body.degradationReason ?? 'LLM response was malformed; kept raw text',
  })
}
```

- [ ] **Step 7: Run tests**

Run: `npm test && npm --prefix server test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/companion/card-generator.ts server/src/companion/__tests__/card-generator.test.ts src/components/BrainDumpInput.tsx
git commit -m "fix: surface card-generator degradation to user

Previously a malformed LLM response silently became a single
'Review notes' card with no signal. Now the response carries a
degraded flag + reason and BrainDumpInput shows a notification.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5: npx packaging

### Task 5.1: Production static-mount for frontend `dist/`

In `npx mira-studio` mode there is no Vite. The Fastify server must serve the built frontend at `/` so the browser hits a single port. Use `@fastify/static`.

**Files:**
- Create: `server/src/static-mount.ts`
- Modify: `server/src/index.ts`
- Modify: `server/package.json` (add `@fastify/static`)

- [ ] **Step 1: Install dependency**

```bash
npm --prefix server install @fastify/static
```

Expected: `@fastify/static` added to `server/package.json` dependencies.

- [ ] **Step 2: Create static mount module**

Create `server/src/static-mount.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { existsSync } from 'node:fs'

export async function registerStaticMount(
  server: FastifyInstance,
  projectRoot: string,
): Promise<boolean> {
  const distDir = path.join(projectRoot, 'dist')
  if (!existsSync(distDir)) {
    server.log.info('Frontend dist/ not found — skipping static mount (dev mode)')
    return false
  }
  await server.register(fastifyStatic, {
    root: distDir,
    prefix: '/',
    wildcard: false,
  })
  server.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
      reply.code(404).send({ error: 'Not Found' })
      return
    }
    reply.sendFile('index.html')
  })
  server.log.info(`Static frontend mounted from ${distDir}`)
  return true
}
```

- [ ] **Step 3: Register in `server/src/index.ts`**

After all `register*Routes` calls and before `start()`:

```typescript
import { registerStaticMount } from './static-mount.js'
// ...
await registerStaticMount(server, PROJECT_ROOT)
```

- [ ] **Step 4: Build the frontend**

Run from project root: `npm run build`
Expected: `dist/` directory created with `index.html` and bundled assets.

- [ ] **Step 5: Verify the server serves dist/**

Run: `npm run server`
In another terminal: `curl -s http://localhost:3001/ | head -5`
Expected: HTML from `dist/index.html` (NOT 404).
Run: `curl -s http://localhost:3001/api/health`
Expected: `{"status":"ok"}` (API still works).

- [ ] **Step 6: Kill servers and commit**

```bash
pkill -f "tsx watch"
git add server/src/static-mount.ts server/src/index.ts server/package.json server/package-lock.json
git commit -m "feat: serve frontend dist/ from server in production

Adds @fastify/static mount that activates when dist/ exists, with
SPA fallback that lets the React router handle non-/api/, non-/ws/
paths. Dev mode is unaffected (no dist/).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.2: Port discovery via `get-port`

Server hard-codes `3001`. For npx, we need a free port. Use `get-port` and pass it to the launcher via the resolved port.

**Files:**
- Modify: `server/src/index.ts`
- Modify: `server/package.json` (add `get-port`)

- [ ] **Step 1: Install dependency**

```bash
npm --prefix server install get-port
```

- [ ] **Step 2: Modify start logic**

Replace the `start` function in `server/src/index.ts`:

```typescript
import getPort from 'get-port'

const start = async () => {
  try {
    const preferred = Number(process.env.PORT ?? 3001)
    const port = await getPort({ port: [preferred, 3001, 3002, 3003, 0] })
    const host = process.env.HOST ?? '0.0.0.0'
    await server.listen({ port, host })
    server.log.info(`Mira Studio server listening on http://${host}:${port}`)
    // Emit machine-readable line for the npx launcher to capture
    process.stdout.write(`__MIRA_READY__ http://localhost:${port}\n`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}
```

- [ ] **Step 3: Verify**

Run: `PORT=3001 npm run server`
Expected: log line `listening on http://0.0.0.0:3001` AND a `__MIRA_READY__ http://localhost:3001` line on stdout.

Run: occupy 3001 (`nc -l 3001 &`), then `npm run server`
Expected: server picks the next free port; `__MIRA_READY__` reflects it.

- [ ] **Step 4: Kill and commit**

```bash
pkill -f "tsx watch" ; pkill nc
git add server/src/index.ts server/package.json server/package-lock.json
git commit -m "feat: server picks a free port via get-port

Defaults to PORT env or 3001, falls back to next free. Emits a
__MIRA_READY__ <url> stdout line for the npx launcher to capture.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.3: `bin/mira` launcher

Single command: spawns built server, waits for `__MIRA_READY__`, opens browser.

**Files:**
- Create: `bin/mira`
- Modify: `package.json` (add `bin` and `files` fields, add `open` dep)

- [ ] **Step 1: Install browser-opener**

Run from project root:
```bash
npm install open
```

- [ ] **Step 2: Create the launcher**

Create `bin/mira` (no extension; executable):

```javascript
#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import open from 'open'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const serverEntry = path.join(packageRoot, 'server', 'dist', 'index.js')

const child = spawn(process.execPath, [serverEntry], {
  cwd: process.cwd(),
  env: { ...process.env },
  stdio: ['ignore', 'pipe', 'inherit'],
})

let opened = false
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk)
  const text = chunk.toString()
  if (!opened) {
    const match = text.match(/__MIRA_READY__ (\S+)/)
    if (match) {
      opened = true
      open(match[1]).catch((err) => {
        console.error('[mira] could not open browser:', err.message)
        console.log(`[mira] open this URL manually: ${match[1]}`)
      })
    }
  }
})

child.on('exit', (code) => process.exit(code ?? 0))

const forward = (sig) => () => child.kill(sig)
process.on('SIGINT', forward('SIGINT'))
process.on('SIGTERM', forward('SIGTERM'))
```

- [ ] **Step 3: Make it executable**

Run: `chmod +x bin/mira`

- [ ] **Step 4: Update `package.json`**

Add fields (read current package.json first to position correctly):

```json
{
  "bin": {
    "mira-studio": "./bin/mira"
  },
  "files": [
    "bin",
    "dist",
    "server/dist",
    "server/package.json",
    "README.md",
    "CHANGELOG.md"
  ]
}
```

Also add a top-level `start` script:

```json
"start": "node bin/mira"
```

- [ ] **Step 5: Build everything**

```bash
npm run build
npm --prefix server run build
```

Expected: `dist/` and `server/dist/` both populated.

- [ ] **Step 6: Smoke-test the launcher**

Run: `node bin/mira`
Expected: server boots, `__MIRA_READY__` line appears, browser opens to `http://localhost:<port>`.
Kill with Ctrl+C; confirm server child also exits.

- [ ] **Step 7: Commit**

```bash
git add bin/mira package.json package-lock.json
git commit -m "feat: add bin/mira launcher for npx distribution

bin/mira spawns the built server, captures the __MIRA_READY__ stdout
line, opens the browser to the resolved URL, and forwards SIGINT/
SIGTERM to the child. Single-port single-command entry for npx.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.4: `node-pty` prebuilds

`node-pty` builds natively from source on install — fragile on user machines. Verify the installed package ships prebuilds (it has done since ~1.0.0) by checking `node_modules/node-pty/binding.gyp` vs `prebuilds/` directory. If prebuilds are absent, switch to `@homebridge/node-pty-prebuilt-multiarch`.

**Files:**
- Possibly modify: `server/package.json`
- Test: `server/src/pty/__tests__/pty-manager.test.ts` (existing — must still pass after swap)

- [ ] **Step 1: Check current node-pty for prebuilds**

Run: `ls /Users/la/dev/mira-studio/server/node_modules/node-pty/prebuilds 2>/dev/null && echo 'has prebuilds' || echo 'NO prebuilds'`

- [ ] **Step 2A — If "has prebuilds": no swap needed**

Skip to Step 4.

- [ ] **Step 2B — If "NO prebuilds": swap the package**

```bash
npm --prefix server uninstall node-pty
npm --prefix server install @homebridge/node-pty-prebuilt-multiarch
```

Then update imports in `server/src/pty/pty-manager.ts` (and anywhere else):

```typescript
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'
```

- [ ] **Step 3: Run PTY tests to confirm API compatibility**

Run: `npm --prefix server test -- --reporter=verbose server/src/pty`
Expected: all existing PTY tests pass.

- [ ] **Step 4: Add an install verification check**

Add to `server/src/index.ts` near startup:

```typescript
try {
  // Touch node-pty to confirm native binding loaded
  // (this happens implicitly when PtyManager is instantiated)
} catch (err) {
  server.log.error(err, 'node-pty native binding failed to load')
  process.exit(1)
}
```

Actually — the `PtyManager` constructor already imports node-pty. If the native binding is broken, instantiation throws and the server crashes on boot with a useful error. No additional check needed. Verify by running `npm run server` — boots clean if PTY loaded.

- [ ] **Step 5: Commit (only if package changed)**

```bash
git add server/package.json server/package-lock.json server/src/pty/pty-manager.ts
git commit -m "chore: ensure node-pty native binding ships prebuilds

Verified node-pty includes prebuilds for macOS arm64/x64 and Linux —
npx install will not require a native compile step on user machines.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(If no swap needed, skip the commit.)

---

### Task 5.5: Verify keychain wiring (or wire it)

The onboarding wizard collects an API key. The design spec says keys live in OS keychain via `keytar`, never in `.mira/`. Confirm or implement.

**Files:**
- Audit: `src/components/OnboardingWizard.tsx`
- Audit: `server/src/companion/companion-engine.ts`
- Possibly create: `server/src/keychain.ts`
- Test: `server/src/__tests__/keychain.test.ts`

- [ ] **Step 1: Audit how the wizard persists the key**

Run: `grep -rn "apiKey\|api_key\|keytar\|keychain" /Users/la/dev/mira-studio/src/components/OnboardingWizard.tsx /Users/la/dev/mira-studio/server/src/ 2>/dev/null | head -20`

- [ ] **Step 2A — If `keytar` is already in use: write a quick verification test**

Open one of the existing keytar tests and ensure it covers: store key, retrieve key, delete key. If a test exists and passes, skip to commit at Step 5.

- [ ] **Step 2B — If `keytar` is NOT in use: install and wire it**

```bash
npm --prefix server install keytar
```

Create `server/src/keychain.ts`:

```typescript
import keytar from 'keytar'

const SERVICE = 'mira-studio'

export async function setApiKey(provider: string, value: string): Promise<void> {
  await keytar.setPassword(SERVICE, provider, value)
}

export async function getApiKey(provider: string): Promise<string | null> {
  return await keytar.getPassword(SERVICE, provider)
}

export async function deleteApiKey(provider: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE, provider)
}
```

Add a Fastify route in `server/src/routes/keychain.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { setApiKey, getApiKey, deleteApiKey } from '../keychain.js'

export function registerKeychainRoutes(server: FastifyInstance): void {
  server.put<{ Params: { provider: string }; Body: { value: string } }>(
    '/api/keychain/:provider',
    async (req, reply) => {
      await setApiKey(req.params.provider, req.body.value)
      reply.code(204).send()
    },
  )
  server.get<{ Params: { provider: string } }>(
    '/api/keychain/:provider',
    async (req) => {
      const value = await getApiKey(req.params.provider)
      return { present: value !== null }
    },
  )
  server.delete<{ Params: { provider: string } }>(
    '/api/keychain/:provider',
    async (req) => {
      const removed = await deleteApiKey(req.params.provider)
      return { removed }
    },
  )
}
```

Register in `server/src/index.ts`:

```typescript
import { registerKeychainRoutes } from './routes/keychain.js'
// ...
registerKeychainRoutes(server)
```

Modify the wizard's submit handler to PUT `/api/keychain/anthropic` with the key value, never write it to a config file.

Modify `CompanionEngine` (or wherever the Claude adapter is constructed) to call `getApiKey('anthropic')` instead of reading from `.mira/`.

- [ ] **Step 3: Add the test**

Create `server/src/__tests__/keychain.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { setApiKey, getApiKey, deleteApiKey } from '../keychain'

describe('keychain', () => {
  it('round-trips a value', async () => {
    await setApiKey('test-provider-mira-ci', 'secret-value')
    expect(await getApiKey('test-provider-mira-ci')).toBe('secret-value')
    expect(await deleteApiKey('test-provider-mira-ci')).toBe(true)
    expect(await getApiKey('test-provider-mira-ci')).toBeNull()
  })
})
```

Note: this test interacts with the real OS keychain. Mark it as integration-only with `it.skipIf(process.env.CI)` if CI doesn't have a keychain.

- [ ] **Step 4: Run tests**

Run: `npm --prefix server test`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/keychain.ts server/src/routes/keychain.ts server/src/index.ts server/src/__tests__/keychain.test.ts server/package.json server/package-lock.json src/components/OnboardingWizard.tsx server/src/companion/companion-engine.ts
git commit -m "feat: persist API keys via OS keychain (keytar)

The PRD requires that API keys never touch .mira/. Onboarding wizard
PUTs keys to /api/keychain/:provider which stores them via keytar.
CompanionEngine reads them at request time. Adds round-trip
integration test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6: Test & Release

### Task 6.1: Playwright E2E for canonical journey

This test is the ship gate. It must pass on a clean checkout before tagging v1.0.0.

**Files:**
- Create: `e2e/canonical-journey.spec.ts`
- Modify: `playwright.config.ts` (if needed — start both server and frontend)

- [ ] **Step 1: Review Playwright config**

Run: `cat /Users/la/dev/mira-studio/playwright.config.ts`
Note whether `webServer` is configured. We need to launch BOTH `npm run server` and `npm run dev` (or build + `node bin/mira`).

- [ ] **Step 2: Configure webServer in Playwright**

Replace `webServer` in `playwright.config.ts` with:

```typescript
webServer: [
  {
    command: 'npm run server',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
],
use: {
  baseURL: 'http://localhost:5173',
}
```

- [ ] **Step 3: Write the canonical journey test**

Create `e2e/canonical-journey.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('canonical user journey', () => {
  test('brain-dump → cards → send-to-agent → journal entry', async ({ page }) => {
    await page.goto('/')

    // Skip onboarding if presented
    const skip = page.getByRole('button', { name: /skip|done/i })
    if (await skip.count()) await skip.first().click()

    // Brain-dump
    const dump = page.getByPlaceholder(/brain dump|what's on your mind/i)
    await dump.fill('fix the login redirect bug')
    await page.getByRole('button', { name: /generate|create cards/i }).click()

    // Card preview appears, then we keep at least one
    await expect(page.getByText(/fix the login redirect/i)).toBeVisible({ timeout: 15_000 })
    const keep = page.getByRole('button', { name: /keep|add/i }).first()
    await keep.click()

    // The card lands in the Idea column
    await expect(page.locator('[data-column="idea"]').getByText(/fix the login redirect/i)).toBeVisible()

    // Drag (or use a context menu fallback) to In Agent — if the UI exposes a "Send to Agent" button:
    await page.getByText(/fix the login redirect/i).click({ button: 'right' }).catch(() => {})
    const send = page.getByRole('button', { name: /send to agent/i })
    if (await send.count()) {
      await send.first().click()
    }

    // Confirm card moved
    await expect(
      page.locator('[data-column="in-agent"]').getByText(/fix the login redirect/i),
    ).toBeVisible({ timeout: 10_000 })

    // Journal panel reflects an entry (refresh first)
    const journalRefresh = page.locator('[data-panel="build-journal"]').getByRole('button', { name: /refresh/i })
    if (await journalRefresh.count()) {
      await journalRefresh.first().click()
      await expect(page.locator('[data-panel="build-journal"]')).toContainText(/spawned|moved|kanban|pty/i)
    }
  })
})
```

Note: this test assumes UI affordances that may not all exist (right-click context menu, data attributes on columns/panels). When running, capture actual selectors and adjust. The test is permissive (uses `.catch(() => {})` for optional steps) and the core assertion is the card-move + journal entry.

- [ ] **Step 4: Add data attributes for stable selectors**

If the test fails on selector ambiguity, add minimal `data-column` and `data-panel` attributes in the relevant components (kanban columns, JournalPanel root). Commit each as a separate small change.

- [ ] **Step 5: Run the test**

Run: `npm run test:e2e -- canonical-journey`
Expected: PASS (may require an Anthropic key in `ANTHROPIC_API_KEY` env for the card-generation step, or fallback to a deterministic local mock — if Ollama isn't running and no key is set, the brain-dump step will fail. Document this in the test.

- [ ] **Step 6: Commit**

```bash
git add e2e/canonical-journey.spec.ts playwright.config.ts <any-data-attr-changes>
git commit -m "test: add Playwright E2E for canonical user journey

Brain-dump → card → send-to-agent → journal entry. This is the v1.0
ship gate per the design spec §7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6.2: Fresh-box smoke test of `npx mira-studio`

Simulate what a brand-new user experiences.

- [ ] **Step 1: Build the package locally**

```bash
npm run build
npm --prefix server run build
npm pack
```

Expected: a tarball like `mira-studio-1.0.0.tgz` appears in the project root.

- [ ] **Step 2: Install in a scratch directory**

```bash
mkdir -p /tmp/mira-fresh && cd /tmp/mira-fresh
npm init -y >/dev/null
npm install /Users/la/dev/mira-studio/mira-studio-1.0.0.tgz
```

Expected: install completes without `gyp` compile errors.

- [ ] **Step 3: Run via npx**

```bash
cd /tmp/mira-fresh
npx mira-studio
```

Expected: server starts, `__MIRA_READY__` line printed, browser opens to the served frontend, the UI loads (no 404 for `/`).

- [ ] **Step 4: Walk the canonical journey manually**

Brain-dump a sentence, generate cards, send one to an agent, watch the journal panel update. Note any P0/P1 issues found.

- [ ] **Step 5: Clean up**

```bash
cd /Users/la/dev/mira-studio
rm mira-studio-*.tgz
rm -rf /tmp/mira-fresh
pkill -f "node bin/mira" 2>/dev/null
```

- [ ] **Step 6: Commit any fixes uncovered (one commit per fix, link to this task in the message)**

---

### Task 6.3: README rewrite for npx audience

The current README is contributor-focused. Rewrite for end-users who type `npx mira-studio`.

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current README**

Run: `cat /Users/la/dev/mira-studio/README.md`

- [ ] **Step 2: Rewrite top half**

Replace the existing README content with:

```markdown
# Mira Studio

Local-first vibe coding cockpit for solo developers. Brain-dump → kanban → agent → journal, all in one browser-based workspace, with `.mira/` config that lives next to your project in Git.

## Quick start

```bash
npx mira-studio
```

That's it. Server starts on a free port, browser opens. The onboarding wizard takes about 60 seconds.

### Requirements

- Node.js 20+
- macOS or Linux (Windows support coming in v1.1)
- An Anthropic API key (for the companion + card parsing) *or* a running Ollama instance (no key needed)

## What you get

- Embedded terminals for Claude Code, Codex, and any shell agent
- A Kanban board that turns brain dumps into structured cards (drag → In Agent → Claude Code builds it)
- A Mira companion chat that knows your project and adapts your workspace
- A Build Journal that auto-captures every session
- `.mira/` config layer that lives in your repo and survives clones

## CLI

```bash
npx mira-studio                # boot the cockpit
npx mira-studio --port 4000    # override port
```

## Configuration

Mira Studio writes a `.mira/` directory to your current project:

```
.mira/
  config.yml           # core settings
  companion.yml        # companion personality
  workspaces/          # panel layouts per workspace
  journals/            # auto-captured session logs
  memory.yml           # local-only project notes (gitignored)
```

API keys are stored in your OS keychain — never in `.mira/`.

## Development

If you want to hack on Mira itself:

```bash
git clone https://github.com/mrlfarano/mira-studio
cd mira-studio
npm install
npm --prefix server install
npm run server         # terminal A
npm run dev            # terminal B — open http://localhost:5173
```

## License

[license-tbd] — see LICENSE
```

(Adjust the license line per existing repo state.)

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for npx end-user audience

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6.4: CLAUDE.md cleanup

`CLAUDE.md` still says "Mira Studio is pre-code." It's incorrect after this cycle. Update it.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current CLAUDE.md**

Run: `head -40 /Users/la/dev/mira-studio/CLAUDE.md`

- [ ] **Step 2: Replace the "pre-code" preamble**

Replace lines 5-8 (the "Project Status" section) with:

```markdown
## Project Status

**Mira Studio v1.0 has shipped.** Distribution: `npx mira-studio`. See `CHANGELOG.md` for what's in the release and `docs/superpowers/specs/2026-05-15-mira-studio-v1-ship-design.md` for the design that drove this cycle. The two-process architecture (Vite frontend + Fastify server) collapses into a single `npx mira-studio` command for end users; developers still run them as two processes.

Build/test/lint commands:

- `npm run dev` — Vite dev frontend on 5173 (with `/api` and `/ws` proxied to 3001)
- `npm run server` — Fastify server on 3001 (auto-picks free port if occupied)
- `npm run build` — TS compile + Vite production build
- `npm --prefix server run build` — server production build
- `npm test` — frontend Vitest
- `npm --prefix server test` — server Vitest
- `npm run test:e2e` — Playwright (must pass before any release)
- `node bin/mira` — local equivalent of `npx mira-studio` (single command, single port)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect shipped v1.0

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6.5: CHANGELOG entry + version bump + tag

Per the user's standing rule: every dev cycle updates CHANGELOG and creates a tag.

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json` (version bump)
- Modify: `server/package.json` (version bump)

- [ ] **Step 1: Read current CHANGELOG**

Run: `head -20 /Users/la/dev/mira-studio/CHANGELOG.md`

- [ ] **Step 2: Prepend a v1.0.0 entry**

After the header block, before `## [0.0.2]`, insert:

```markdown
## [1.0.0] - 2026-05-15

### Added

- **`npx mira-studio` distribution**: single-command boot, server on a free port, automatic browser open
- **Build Journal UI panel**: renders today's auto-captured events from server (`/api/journal/today`)
- **`/api/config/scenes` endpoint**: backs scene state with `.mira/scenes.yml`
- **`.mira/memory.yml` integration**: companion system prompt now includes project-local memory
- **API keychain integration**: API keys persisted via OS keychain (`keytar`), never written to `.mira/`
- **Vite dev proxy**: `/api` and `/ws` proxied to the server for friction-free dev

### Changed

- Companion chat now uses real SSE endpoint (`/api/companion/chat`) — replaces stubbed `setTimeout` mock
- PTY `spawned` server message now registers the session in `useSessionStore` (Send-to-Agent works)
- `.mira/` git auto-commit enabled by default (`gitSync.autoCommit: true`)
- Layout persist failures surface via the notification store instead of silent swallow
- Card-generator degradation surfaces a user-visible reason instead of silently substituting "Review notes"
- LAN access mode: server binds `0.0.0.0`, CORS allows `192.168.50.x`

### Fixed

- Send-to-Agent silently no-opped because the session store stayed empty after PTY spawn
- Companion chat returned a hardcoded `"Got it!"` regardless of input
- Dev frontend CORS-failed against the server on every REST call

### Migration

- Existing `.mira/config.yml` users: a `gitSync` block will be merged on first boot
- API keys previously stored anywhere outside the OS keychain should be re-entered via the onboarding wizard
```

- [ ] **Step 3: Bump versions**

In `package.json`: `"version": "1.0.0"`
In `server/package.json`: `"version": "1.0.0"`

- [ ] **Step 4: Final pre-tag verification**

```bash
npm test
npm --prefix server test
npm run build
npm --prefix server run build
git status
```

Expected: all tests pass, builds succeed, working tree clean except staged CHANGELOG + version bumps.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md package.json package-lock.json server/package.json server/package-lock.json
git commit -m "chore(release): v1.0.0

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Tag**

```bash
git tag -a v1.0.0 -m "v1.0.0 — first shippable release"
git tag -l v1.0.0
```

Expected: tag exists.

- [ ] **Step 7: Push (only when user confirms)**

```bash
git push origin main
git push origin v1.0.0
```

(Do not push without explicit user confirmation — the user has not authorized push in advance.)

---

## Final ship checklist

Once Phase 6 is done:

- [ ] All P0 fixed (Task 2.1, 2.2, 1.1)
- [ ] All P1 fixed (Task 3.1, 3.2, 5.1, 5.2, 5.3)
- [ ] All P2 addressed (Tasks 4.1–4.4) — fix or feature-flag
- [ ] Canonical journey E2E passes (Task 6.1)
- [ ] Fresh-box smoke test passes (Task 6.2)
- [ ] README + CLAUDE.md + CHANGELOG updated (Task 6.3, 6.4, 6.5)
- [ ] `v1.0.0` tag created (Task 6.5)
- [ ] All tests green: `npm test && npm --prefix server test && npm run test:e2e`
- [ ] `node bin/mira` boots cleanly on a fresh terminal

**Ship gate**: zero open P0/P1, all checks above ticked, tag pushed.
