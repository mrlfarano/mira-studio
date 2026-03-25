# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Status

**Mira Studio is pre-code.** The repository currently contains only the PRD (`PRD.md`). No implementation exists yet. When building begins, this file should be updated with build/test/lint commands and any conventions established during scaffolding.

---

## What Mira Studio Is

A local-first vibe coding cockpit for solo developers. It unifies AI agent terminals, planning tools (Kanban, build journal), and developer workflow into a single radically customizable environment. All config lives in `.mira/` and is Git-backed.

The central product differentiator: **the workspace adapts to the developer, not the reverse.**

---

## Intended Tech Stack (from PRD)

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript, Vite |
| UI Layout | `react-grid-layout` or `allotment` (drag/drop panels) |
| Terminal | `xterm.js` (WebGL renderer) |
| State | Zustand (serialized to `.mira/*.yml`) |
| Local Server | Node.js (Express or Fastify) |
| PTY | `node-pty` |
| WebSocket | `ws` (server) + native (client) |
| MCP | `@modelcontextprotocol/sdk` |
| Config files | YAML via `js-yaml` |
| Git ops | `isomorphic-git` or `simple-git` |
| Testing | Vitest + Playwright |
| Desktop (future) | Tauri |

---

## Architecture

### Two-Process Model

- **Browser (React UI):** Panel layout engine, xterm.js agent terminals, Kanban board, Mira companion chat panel — all communicate via WebSocket + REST.
- **Mira Local Server (Node.js):** PTY Manager (`node-pty`), MCP Bridge, Config Engine (`.mira/` ↔ Zustand state), Git Sync, Skill Runtime, Companion AI Engine, SI Agent Runtime.

### Key Data Flows

**Terminal I/O:** `Quick-Prompt Bar → WebSocket → PTY Manager → node-pty → Agent Process → stdout → WebSocket → xterm.js`

**Config changes:** `UI state change → Zustand → Config Serializer → write .mira/*.yml → debounced Git auto-commit`

**Mira companion:** `User message → REST → Companion AI Engine → context assembly (session state + .mira/memory.yml) → LLM API → streaming response → side effects (config changes, skill installs)`

**Kanban → Agent:** `"Send to Agent" → context bundle (title + description + files + URLs) → active PTY terminal → card status = "In Agent"`

### `.mira/` Config Structure

```
.mira/
  config.yml           # Core settings and enabled modules
  companion.yml        # Mira personality and memory preferences
  workspaces/          # Per-workspace layout and toggle states
  skills.yml           # Installed skills and versions
  themes/              # Active theme and overrides
  memory.yml           # Per-project Mira context (gitignored by default)
  journals/            # Build journal entries (auto-generated)
  snapshots/           # Saved workspace state checkpoints
  project_SI.yml       # Self-improvement hypotheses and cycle history
```

`~/.mira/user_SI.yml` — global developer growth profile, never committed to any repo.

### Two-Layer Config Model

- **Portable layer** (Git-committed): workspace layouts, toggle states, installed skills, MCP connection placeholders (no secrets), themes.
- **Personal memory layer** (gitignored): `user_SI.yml`, session history, Mira's observations. Secrets always in system keychain, never in `.mira/`.

---

## Core Concepts

### Five Cornerstones

Every feature maps to at least one:
1. **Creativity & Ideation** — Spark Canvas, PRD conversation, brainstorming
2. **Project & Delivery Planning** — Kanban, epics/stories, methodology skills
3. **Vibe-Code Building** — Agent Cockpit (the anchor module), Quick-Prompt, Broadcast
4. **Observability & Reiteration** — Build Journal, log streaming, Vibe Score
5. **Self-Improvement** — Autonomous build agent, SI Panel, user growth tracking

### Skill System

Skills extend Mira via a manifest declaring: `cornerstones[]`, `panels[]`, `agent_injections[]`, `claude_md_additions[]`, `wizard_steps[]`, `keybindings[]`, `permissions[]`, `composes_with[]`, `conflicts_with[]`. Skills access Mira primitives only through declared permissions. Hot-reloadable — no restarts.

Cornerstone skills shipped with Mira: **BMAD Method**, **TaskMaster AI**, **Claude Superpowers**.

### Self-Improvement (SI) Safety Model — Non-Negotiable

The autonomous SI agent:
- Writes only to `mira/si-YYYY-MM-DD-[description]` branches — never main, never active feature branches
- Can open PRs but cannot merge
- No human-in-the-loop bypass at any configuration level

This is enforced at the Mira Core level and cannot be overridden by skills.

### MCP Principle

No JSON editing, ever. Credentials go to system keychain only. All connection flows are conversational through the Mira companion.

---

## Product Scope Boundaries

**v1 ships:** Panel layout engine, toggle system, Mira companion, onboarding wizard, embedded PTY terminals (Claude Code + Codex), Kanban with Send-to-Agent, `.mira/` Git-backed config, MCP connection wizard, skill system (install/hot-reload/marketplace), Workspace Scenes, command palette, theme marketplace, CSS editor, Snapshot, Build Journal.

**Deferred to v1.x:** Agent Broadcast, Context Cleaner, Screenshot-to-task, Spark Canvas, Project Map, Session Replay, Vibe Score, one-click local env bootstrap, Observability workspace, Deploy Panel, Pair Mode, community registry, SI autonomous build agent.

**Out of scope entirely:** File manager, code editor (Mira is not an IDE), mobile, enterprise SSO, billing.
