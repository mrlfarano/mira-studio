# Mira Studio

**"Your workflow. Your rules. Your Mira."**

A local-first vibe coding cockpit for solo developers and indie hackers. Mira Studio unifies AI agent terminals, planning tools, and developer workflow into a single radically customizable environment. All configuration lives in Git. At the center is Mira -- a persistent AI companion who configures the environment conversationally, monitors agents, and surfaces insight without interrupting flow.

## Status

**Pre-release** | v0.0.1 | [PRD](PRD.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript, Vite |
| UI Layout | react-grid-layout / allotment |
| Terminal | xterm.js (WebGL) |
| State | Zustand |
| Server | Node.js (Express/Fastify) |
| PTY | node-pty |
| WebSocket | ws + native |
| MCP | @modelcontextprotocol/sdk |
| Config | YAML (js-yaml) |
| Git Ops | isomorphic-git / simple-git |
| Testing | Vitest + Playwright |

## Architecture

Two-process model: a **React browser UI** communicating via WebSocket + REST with a **Node.js local server** managing PTY sessions, MCP connections, config persistence, and the Mira companion AI engine.

```
Browser (React UI)                    Mira Local Server (Node.js)
  Panel Layout Engine                   PTY Manager (node-pty)
  xterm.js Terminals                    MCP Bridge
  Kanban Board                          Config Engine (.mira/)
  Mira Companion Panel                  Git Sync Engine
  Command Palette                       Skill Runtime
       |                                Companion AI Engine
       +--- WebSocket + REST ---+       SI Agent Runtime
```

## The Five Cornerstones

1. **Creativity & Ideation** -- Spark Canvas, PRD conversation, brainstorming
2. **Project & Delivery Planning** -- Kanban, epics/stories, methodology skills
3. **Vibe-Code Building** -- Agent Cockpit (anchor module), Quick-Prompt, Broadcast
4. **Observability & Reiteration** -- Build Journal, log streaming, Vibe Score
5. **Self-Improvement** -- Autonomous build agent, SI Panel, user growth tracking

## Task Progress

| ID | Task | Priority | Status | Deps | Subtasks |
|----|------|----------|--------|------|----------|
| 1 | Initialize Project Scaffolding (Vite + React + TS) | high | pending | None | 4 |
| 2 | Set Up Node.js Local Server (Express/Fastify) | high | pending | 1 | 5 |
| 3 | Implement Config Engine (.mira/) | high | pending | 2 | 6 |
| 4 | Build Panel Layout Engine (Drag-and-Drop) | high | pending | 1, 3 | 7 |
| 5 | Implement PTY Manager (node-pty) | high | pending | 2 | 6 |
| 6 | Create WebSocket Communication Layer | high | pending | 2, 5 | 5 |
| 7 | Build Terminal Panel (xterm.js) | high | pending | 4, 5, 6 | 7 |
| 8 | Implement Toggle System & Workspace Profiles | high | pending | 3, 4 | 5 |
| 9 | Build Zustand State Management (Config Sync) | high | pending | 1, 3 | 6 |
| 10 | Create Quick-Prompt Bar | high | pending | 7, 9 | 4 |
| 11 | Implement Mira Companion Panel UI | high | pending | 4, 9 | 5 |
| 12 | Build Companion AI Engine (Provider Adapters) | high | pending | 2, 11 | 7 |
| 13 | Implement Onboarding Wizard | high | pending | 8, 11, 12 | 6 |
| 14 | Build Kanban Board Panel | medium | pending | 4, 9 | 6 |
| 15 | Implement Send-to-Agent | medium | pending | 7, 14 | 5 |
| 16 | Create Smart Notifications | medium | pending | 5, 9 | 4 |
| 17 | Implement MCP Connection Wizard | medium | pending | 12, 16 | 7 |
| 18 | Build Skill System Runtime | medium | pending | 3, 9 | 8 |
| 19 | Implement Build Journal Auto-Generation | medium | pending | 5, 14, 3 | 5 |
| 20 | Create Git Sync Engine (.mira/) | medium | pending | 3 | 6 |
| 21 | Implement Workspace Scenes | medium | pending | 4, 8, 9 | 6 |
| 22 | Build Command Palette (Rebindable Hotkeys) | medium | pending | 9 | 5 |
| 23 | Implement Theme Marketplace & CSS Editor | low | pending | 3, 9 | 5 |
| 24 | Create Snapshot System | low | pending | 3, 9, 14 | 5 |
| 25 | Implement Auto-Card Generation | low | pending | 12, 14 | 5 |
| 26 | Set Up Testing Infrastructure (Vitest + Playwright) | high | pending | 1, 2 | 4 |
| 27 | Create SI Panel & project_SI.yml | low | pending | 3, 19 | 5 |
| 28 | Implement Agent Status Detection | medium | pending | 5, 7 | 5 |
| 29 | Build Multi-Terminal Session Management | high | pending | 5, 7, 4 | 6 |
| 30 | Create App Shell & Navigation | high | pending | 1, 4 | 5 |

**Total:** 30 tasks, 165 subtasks | **Next:** Task #1 (only unblocked task)

## Development

Task management powered by [TaskMaster AI](https://github.com/eyaltoledano/claude-task-master) with Claude Code as the AI backend.

```bash
# View tasks
task-master list

# See next task
task-master next

# View task details
task-master show <id>

# Mark task complete
task-master set-status --id=<id> --status=done
```

## License

MIT
