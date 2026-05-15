# Changelog

All notable changes to Mira Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-15

First shippable release. Distribution: `npx mira-studio`.

### Added

- **`npx mira-studio` distribution**: `bin/mira` launcher boots the bundled server, captures the `__MIRA_READY__` stdout line, opens the browser, forwards signals
- **Port discovery**: server picks a free port via `get-port` (preferred → 3001 → 3002 → 3003 → any free)
- **Production static-mount**: `@fastify/static` serves the built frontend from the same port as the API; SPA fallback handles client-side routes
- **Build Journal UI panel**: renders today's auto-captured events from `/api/journal/today` with refresh, loading, and empty states
- **`/api/config/scenes` endpoint**: backed by `.mira/scenes.yml`; resolves the hydration gap that left scenes on client defaults
- **`.mira/memory.yml` integration**: `CompanionEngine.buildSystemPrompt` reads project memory on each request and appends it as a `Project memory` section
- **OS keychain integration**: `keytar`-backed `/api/keychain/:provider` endpoints (PUT/GET/DELETE) with provider allowlist (`anthropic`, `openai`, `ollama`); GET returns `{ present }`, never the secret
- **Vite dev proxy**: `/api` and `/ws` proxy to the server, removing CORS friction during local development
- **LAN access mode**: server binds `0.0.0.0`; CORS allows `localhost` + `192.168.50.x` (tablet-as-second-screen)
- **Playwright E2E**: canonical journey test as the v1.0 ship gate

### Changed

- **Companion chat** now uses the real SSE endpoint (`/api/companion/chat`) — replaces the hardcoded `setTimeout('Got it!')` mock
- **PTY `spawned` message** now registers the session in `useSessionStore` so Send-to-Agent has a target session
- **`.mira/` Git auto-commit** enabled by default (`gitSync.autoCommit: true`, 5s debounce)
- **Layout persist failures** surface via the notification store instead of `.catch(() => {})`
- **Card-generator degradation** surfaces a user-visible reason via `degraded`/`degradationReason` fields instead of silently substituting "Review notes"
- **Client WebSocket/REST URLs** now derive from `window.location.host` so they follow the dynamic server port; previously hardcoded `3001`
- **Default workspace layout** includes a Build Journal panel
- **MiraConfig** now has a `gitSync` block with `autoCommit` and `debounceMs`

### Fixed

- Send-to-Agent silently no-opped because the session store stayed empty after PTY spawn
- Send-to-Agent now shows a notification when zero sessions exist (previously click was a silent no-op for users)
- Companion chat returned a hardcoded `"Got it!"` regardless of input
- Dev frontend CORS-failed against the server on every REST call
- TerminalPanel `fitAddon.fit()` crash with "Cannot read properties of undefined (reading 'dimensions')" when mounted into a not-yet-measured container
- KanbanBoard component was defined but never rendered (`LayoutEngine` had a placeholder div)
- Production `tsc -b` build failed on stale `stores.test.ts` (missing `id`, wrong `NotificationType`)

### Security

- Keychain routes validate `:provider` against a strict allowlist to prevent arbitrary credential-store pollution
- API keys never written to `.mira/` — keychain only
- Bundle keys via `keytar`'s native OS credential store (macOS Keychain on Darwin)

### Migration

- Existing `.mira/config.yml` users: a `gitSync` block will be merged on first boot
- API keys previously stored anywhere outside the OS keychain must be re-entered (UI for this lands in v1.1)

### Known issues (deferred to v1.1)

- xterm.js dimensions error logged when terminal mounts in a not-yet-measured layout (cosmetic, doesn't crash)
- `eslint@9` vs `@eslint/js@^10` peer-dep mismatch requires `--legacy-peer-deps` on install
- OnboardingWizard doesn't yet have an API-key step (server-side keychain endpoints ready)
- Companion SSE final-frame `actions` array is discarded by the client
- LAN CORS regex hardcoded to `192.168.50.x`
- Windows support
- Tauri desktop packaging

## [0.0.2] - 2026-03-25

### Added

- **Frontend scaffolding**: Vite + React 19 + TypeScript 5.9, path aliases, ESLint, Prettier
- **Local server**: Fastify on 127.0.0.1:3001 with WebSocket, CORS, health endpoint
- **Config Engine**: .mira/ YAML read/write, chokidar file watcher, debounced auto-save, REST CRUD
- **Panel Layout Engine**: react-grid-layout, drag-and-drop, z-index management, min-size enforcement
- **PTY Manager**: node-pty sessions, output ring buffer (5000 lines), status detection, graceful shutdown
- **WebSocket Layer**: auto-reconnect client, useTerminalSocket hook, connection store
- **Zustand State Management**: 6 stores (layout, toggle, session, companion, config, connection), config sync middleware, hydration, devtools
- **Terminal Panel**: xterm.js with WebGL renderer, addon integration, session persistence
- **Mira Companion Panel**: chat UI, collapse/expand, personality display, streaming indicators
- **Kanban Board**: 4-column board (Idea/Specced/In Agent/Done), native drag-and-drop, brain dump input
- **Send-to-Agent**: context bundling from kanban cards, session picker, auto-card-sync
- **Companion AI Engine**: Claude + Ollama adapters, SSE streaming, action parsing, provider-agnostic interface
- **Onboarding Wizard**: conversational flow (<60s), profile mapping, project type detection
- **Toggle System**: Minimal/Balanced/Full Send profiles, per-workspace module switches
- **Quick-Prompt Bar**: Cmd+Enter activation, session targeting, auto-dismiss
- **Command Palette**: Cmd+K, fuzzy search, keyboard navigation, rebindable hotkeys
- **Smart Notifications**: non-modal indicators, notification store, mark read/dismiss
- **MCP Connection Wizard**: MCP bridge with SDK, auto-discovery scanner, status panel
- **Skill System Runtime**: manifest validation, install/uninstall/hot-reload, permission middleware
- **Git Sync Engine**: simple-git, debounced auto-commit, gitignore management
- **Build Journal**: auto-generated session logs, daily summaries, REST endpoints
- **Workspace Scenes**: paired workspaces, Ctrl+Tab swap, scene switcher in top bar
- **Theme Marketplace**: 4 built-in themes, CSS editor with live preview
- **Snapshot System**: capture/restore workspace state, REST CRUD
- **SI Panel**: three-column view (Built/Learned/Next), health score, project_SI.yml
- **Multi-Terminal Management**: session creation/switching/closing, sidebar integration
- **App Shell**: dark theme, top bar, collapsible sidebar, status bar
- **Agent Status Detection**: refined heuristics (48 unit tests), configurable thresholds
- **Auto-Card Generation**: AI-powered brain dump parsing, preview & select flow
- **Testing Infrastructure**: Vitest (frontend + server), Playwright E2E, 72 passing tests

## [0.0.1] - 2026-03-24

### Added

- Founding PRD (v0.3, BMAD format) with Five Cornerstones architecture
- TaskMaster AI integration with Claude Code (Opus) as AI backend
- 30 implementation tasks with 165 subtasks generated from PRD
- Complexity analysis and research-backed task expansion
- CLAUDE.md for Claude Code guidance
- README.md with project overview and task progress
- Initial project structure with `.taskmaster/` configuration
