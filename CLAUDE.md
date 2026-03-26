# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What Mira Studio Is

A local-first vibe coding cockpit for solo developers. It unifies AI agent terminals, planning tools (Kanban, build journal), and developer workflow into a single radically customizable environment. All config lives in `.mira/` and is Git-backed. The workspace adapts to the developer, not the reverse.

**Not an IDE** — no file manager, no code editor. Mira is a cockpit layer on top of existing tools.

---

## Commands

### Install

```bash
npm install --legacy-peer-deps      # Frontend (--legacy-peer-deps required)
npm --prefix server install          # Server (has native dep: node-pty)
```

### Dev

```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run server       # Fastify server → http://127.0.0.1:3001 (tsx watch)
```

Both must run simultaneously. The Vite frontend proxies nothing — it hits the server directly via CORS (origin `http://localhost:5173`).

### Build

```bash
npm run build            # tsc + vite build → dist/
npm run server:build     # tsc → server/dist/
```

### Lint & Format

```bash
npm run lint             # ESLint (flat config, TS + React)
npm run format           # Prettier (src/**/*.{ts,tsx,css,json})
```

### Test

```bash
npm run test                 # Vitest — frontend unit tests (src/**/*.test.{ts,tsx})
npm run test:watch           # Vitest in watch mode
npm run test:coverage        # Vitest with v8 coverage
npm run test:server          # Vitest — server tests (server/src/)
npm run test:e2e             # Playwright (auto-starts both dev + server)
```

Run a single frontend test file: `npx vitest run src/__tests__/stores.test.ts`
Run a single server test file: `npx vitest run --config server/vitest.config.ts server/src/__tests__/health.test.ts`

### CI

GitHub Actions (`ci.yml`) runs lint, build, frontend tests, and server tests on Node 22. Uses `--legacy-peer-deps`. Deployed to Vercel (frontend only).

---

## Architecture

### Two-Process Model

```
Browser (React/Vite :5173)          Fastify Server (:3001)
┌─────────────────────┐             ┌──────────────────────┐
│ LayoutEngine        │◄──REST───►  │ Config Engine (.mira/)│
│ TerminalPanel       │◄──WS─────►  │ PTY Manager (node-pty)│
│ CompanionPanel      │◄──REST───►  │ Companion AI Engine   │
│ KanbanBoard         │             │ MCP Bridge            │
│ Zustand stores      │             │ Git Sync (simple-git) │
│   ↕ config-sync MW  │             │ Skill Runtime         │
│                     │             │ Journal / Snapshot /SI│
└─────────────────────┘             └──────────────────────┘
```

**Frontend** (`src/`): React + TypeScript, `react-grid-layout` for panels, `xterm.js` for terminals, Zustand for state.

**Server** (`server/`): Fastify, separate `package.json` and `tsconfig.json`. Each domain is a module in `server/src/` (pty, config, git, mcp, companion, skills, journal, snapshot, si) that exports a `register*Routes(server, ...)` function wired up in `server/src/index.ts`.

### Path Aliases (Frontend)

Configured in both `vite.config.ts` and `vitest.config.ts`:

`@/components`, `@/lib`, `@/hooks`, `@/store`, `@/types`, `@/panels`

### State Management Pattern

Zustand stores in `src/store/`. On app boot, `hydrateStores()` (`src/store/hydrate.ts`) fetches config from the server REST API and populates all stores. After hydration, `startConfigSync()` subscribes to store changes and debounces PUTs back to the server (300ms, server-wins on conflict). This is the central data flow for config:

`Server .mira/*.yml → REST GET → Zustand stores → UI renders`
`UI action → Zustand update → config-sync middleware → REST PUT → server writes .mira/*.yml`

### Terminal I/O

`QuickPromptBar → WebSocket (ws://localhost:3001/ws/pty/:id) → PtyManager → node-pty → agent process → stdout → WebSocket → xterm.js`

WebSocket client (`src/lib/ws-client.ts`) has auto-reconnect with exponential backoff.

### Key Data Flows

- **Kanban → Agent:** "Send to Agent" bundles card context → pipes into active PTY terminal → card status = "In Agent"
- **Companion AI:** User message → REST → CompanionEngine → context assembly + LLM API (Claude/Ollama adapters) → streaming response → possible side effects (config changes, skill installs)
- **Config persistence:** `.mira/` directory is Git-backed. Changes trigger debounced auto-commits via GitSyncEngine.

### `.mira/` Config Structure

```
.mira/
  config.yml           # Core settings and enabled modules
  companion.yml        # Mira personality and memory preferences
  workspaces/          # Per-workspace layout and toggle states
  skills.yml           # Installed skills and versions
  themes/              # Active theme and overrides
  memory.yml           # Per-project Mira context (gitignored)
  journals/            # Build journal entries (auto-generated)
  project_SI.yml       # Self-improvement hypotheses and cycle history
```

Two-layer model: **portable** (Git-committed: layouts, toggles, skills, themes) and **personal** (gitignored: `memory.yml`, `~/.mira/user_SI.yml`). Secrets go in system keychain, never in `.mira/`.

---

## Key Conventions

### SI Safety Model — Non-Negotiable

The autonomous SI agent:
- Writes only to `mira/si-YYYY-MM-DD-[description]` branches — never main, never active feature branches
- Can open PRs but cannot merge
- No human-in-the-loop bypass at any configuration level

This is enforced at the Mira Core level and cannot be overridden by skills.

### MCP Principle

No JSON editing, ever. Credentials go to system keychain only. All MCP connection flows are conversational through the Mira companion.

### Skill System

Skills extend Mira via a manifest declaring: `cornerstones[]`, `panels[]`, `agent_injections[]`, `claude_md_additions[]`, `wizard_steps[]`, `keybindings[]`, `permissions[]`, `composes_with[]`, `conflicts_with[]`. Skills access Mira primitives only through declared permissions. Hot-reloadable — no restarts.

### Product Scope

**v1 ships:** Panel layout engine, toggle system, Mira companion, onboarding wizard, embedded PTY terminals, Kanban with Send-to-Agent, `.mira/` Git-backed config, MCP connection wizard, skill system, Workspace Scenes, command palette, theme marketplace, CSS editor, Snapshot, Build Journal.

**Deferred to v1.x:** Agent Broadcast, Context Cleaner, Screenshot-to-task, Spark Canvas, Project Map, Session Replay, Vibe Score, Deploy Panel, Pair Mode, SI autonomous build agent.

**Out of scope:** File manager, code editor, mobile, enterprise SSO, billing.

### Target Platforms

macOS, Windows, Linux. v1 is browser + local server. v2 wraps in Tauri (sidecar model — Tauri launches the Fastify server as a bundled process). No mobile.
