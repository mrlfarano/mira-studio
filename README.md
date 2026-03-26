<p align="center">
  <strong>Mira Studio</strong>
</p>

<p align="center">
  A local-first vibe coding cockpit for solo developers.<br/>
  Your workflow. Your rules. Your Mira.
</p>

<p align="center">
  <a href="https://github.com/mrlfarano/mira-studio/actions/workflows/ci.yml"><img src="https://github.com/mrlfarano/mira-studio/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node 22+">
</p>

---

Mira Studio unifies AI agent terminals, planning tools (Kanban, build journal), and developer workflow into a single radically customizable environment. All configuration lives in `.mira/` and is Git-backed. At the center is **Mira** — a persistent AI companion who configures the environment conversationally, monitors agents, and surfaces insight without interrupting flow.

Mira is not an IDE. It's a cockpit layer on top of your existing tools.

## Getting Started

### Prerequisites

- **Node.js 22+**
- **npm 10+**
- A supported AI provider key (Anthropic, OpenAI, Ollama, etc.) — see `.env.example`

### Install

```bash
# Frontend
npm install --legacy-peer-deps

# Server (includes native dep: node-pty)
npm --prefix server install
```

### Run

Start both processes — the frontend and the local server:

```bash
# Terminal 1: Fastify server (http://127.0.0.1:3001)
npm run server

# Terminal 2: Vite dev server (http://localhost:5173)
npm run dev
```

On first launch, Mira walks you through an onboarding wizard (<60 seconds) to configure your profile and workspace.

### Environment Variables

Copy `.env.example` to `.env` and add your provider keys. At minimum, `ANTHROPIC_API_KEY` is required for the Mira companion.

## Architecture

Two-process model: a **React browser UI** communicating via WebSocket + REST with a **Node.js local server**.

```
Browser (:5173)                       Fastify Server (:3001)
┌──────────────────────┐              ┌───────────────────────┐
│ Panel Layout Engine   │◄── REST ──► │ Config Engine (.mira/) │
│ xterm.js Terminals    │◄── WS ───► │ PTY Manager (node-pty)  │
│ Companion Panel       │◄── SSE ──► │ Companion AI Engine     │
│ Kanban Board          │              │ MCP Bridge              │
│ Command Palette       │              │ Git Sync · Skills       │
│ Zustand State         │              │ Journal · Snapshot · SI │
└──────────────────────┘              └───────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 8 |
| Layout | react-grid-layout |
| Terminal | xterm.js (WebGL) |
| State | Zustand (auto-synced to server) |
| Server | Fastify, node-pty, simple-git |
| AI | Anthropic SDK, Ollama adapter |
| MCP | @modelcontextprotocol/sdk |
| Config | YAML (js-yaml) → `.mira/` |
| Testing | Vitest, Playwright |

## Features

### Core

- **Agent Cockpit** — Embedded PTY terminals running Claude Code, Codex, or any CLI agent. Multi-session with status detection.
- **Mira Companion** — Persistent AI chat panel. Configures your environment conversationally, generates kanban cards from brain dumps, and streams responses via SSE.
- **Kanban Board** — Four-column board (Idea → Specced → In Agent → Done) with native drag-and-drop and Send-to-Agent context bundling.
- **Config Engine** — All state persisted to `.mira/*.yml`, Git-backed with debounced auto-commits. Two-layer model: portable (committed) and personal (gitignored).

### Workspace

- **Panel Layout** — Drag-and-drop panels with z-index management and min-size enforcement.
- **Workspace Scenes** — Paired workspace configurations with Ctrl+Tab swap.
- **Toggle Profiles** — Minimal / Balanced / Full Send — control which modules are active per workspace.
- **Snapshots** — Capture and restore full workspace state.
- **Command Palette** — Cmd+K, fuzzy search, rebindable hotkeys.
- **Quick-Prompt Bar** — Cmd+Enter to fire a prompt at any active agent session.

### Extensibility

- **Skill System** — Install, uninstall, and hot-reload skills via manifests. Permission-gated access to Mira primitives.
- **MCP Connections** — Auto-discovery scanner, conversational setup (no JSON editing), credentials in system keychain.
- **Theme Marketplace** — Built-in themes + CSS editor with live preview.
- **Build Journal** — Auto-generated session logs and daily summaries.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run server` | Start Fastify dev server (tsx watch) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Frontend unit tests (Vitest) |
| `npm run test:server` | Server unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run test:coverage` | Coverage report (v8) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, commit conventions, and PR workflow.

## License

MIT
