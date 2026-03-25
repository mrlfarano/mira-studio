# Changelog

All notable changes to Mira Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
