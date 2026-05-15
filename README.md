# Mira Studio

**Your workflow. Your rules. Your Mira.**

Local-first vibe coding cockpit for solo developers. Brain-dump → kanban → agent → journal, all in one browser-based workspace, with `.mira/` config that lives next to your project in Git.

## Quick start

```bash
npx mira-studio
```

That's it. The server picks a free port, the browser opens, and the onboarding wizard takes about 60 seconds.

### Requirements

- Node.js 20+
- macOS or Linux (Windows support coming in v1.1)
- An Anthropic API key for the companion + card parsing, **or** a running Ollama instance (no key needed)

## What you get

- **Embedded terminals** for Claude Code, Codex, and any shell agent
- **Kanban board** that turns brain dumps into structured cards (drag → In Agent → Claude Code builds it)
- **Mira companion chat** that knows your project and adapts your workspace
- **Build Journal** that auto-captures every session
- **`.mira/` config layer** that lives in your repo and survives clones
- **OS keychain integration** — API keys never touch your filesystem

## The canonical journey

```text
$ npx mira-studio
  → onboarding wizard (60s): profiles your style + project type
  → workspace opens with the Balanced layout
  → brain-dump: "fix the login redirect bug, clean up auth middleware, maybe add 2FA"
  → AI parses into 3 Kanban cards; keep what you want
  → drag "fix login redirect" → In Agent column
  → Send-to-Agent fires the card into Claude Code in your terminal panel
  → Build Journal entry auto-created
  → Companion: "Looks like the login bug is fixed — mark that card done?"
  → .mira/ auto-commits the session journal
```

## CLI

```bash
npx mira-studio                # boot the cockpit
PORT=4000 npx mira-studio      # override port preference
```

The server emits a `__MIRA_READY__ <url>` line on stdout once it's listening — the launcher reads it and opens your browser to the right URL.

## Configuration

Mira Studio writes a `.mira/` directory to your current project:

```text
.mira/
  config.yml           # core settings (Git-committed)
  companion.yml        # companion personality (Git-committed)
  workspaces/          # panel layouts per workspace (Git-committed)
  skills.yml           # installed skills (Git-committed)
  themes/              # active theme + overrides (Git-committed)
  journals/            # auto-captured session logs (gitignored by default)
  memory.yml           # local-only project notes (gitignored)
  snapshots/           # saved workspace state (gitignored)
```

`gitSync.autoCommit: true` is the default in `config.yml` — every change in `.mira/` is committed automatically (5s debounce).

## Five Cornerstones

Every feature ladders to at least one of these:

1. **Creativity & Ideation** — brain-dump, PRD conversation, brainstorming
2. **Project & Delivery Planning** — Kanban, methodology skills
3. **Vibe-Code Building** — embedded agent terminals, Quick-Prompt
4. **Observability & Reiteration** — Build Journal, log streaming
5. **Self-Improvement** — SI Panel, growth tracking (autonomous build agent: v1.1+)

## What's in v1.0

Cornerstone-tight scope (see `docs/superpowers/specs/2026-05-15-mira-studio-v1-ship-design.md`):

- Panel layout engine with drag/drop/resize, saved to `.mira/workspaces/`
- Embedded PTY terminals (Claude Code + Codex) with WebGL rendering
- Brain-dump → AI-parsed cards → 4-column Kanban → Send-to-Agent
- `.mira/` YAML config with chokidar watching and debounced Git auto-commit
- Mira companion chat with Claude + Ollama adapters (SSE streaming)
- Onboarding wizard, Build Journal UI, OS keychain for API keys
- `npx mira-studio` one-command boot with port discovery + browser open

Ships-if-works (feature-flagged off otherwise): skill system, MCP wizard, scenes, command palette, theme marketplace, snapshot system, SI panel (read-only).

Deferred to v1.1: SI autonomous build agent, Agent Broadcast, Spark Canvas, Project Map, Session Replay, Vibe Score, Tauri desktop, Windows support.

## Development

```bash
git clone https://github.com/mrlfarano/mira-studio
cd mira-studio
npm install --legacy-peer-deps
npm --prefix server install
npm run server         # terminal A: Fastify on port 3001
npm run dev            # terminal B: Vite on http://localhost:5173
```

Run tests:

```bash
npm test               # frontend Vitest (25 tests)
npm --prefix server test   # server Vitest (67 tests)
npm run test:e2e       # Playwright canonical journey
```

Production build:

```bash
npm run build
npm --prefix server run build
node bin/mira          # local equivalent of `npx mira-studio`
```

## Architecture

Two-process model:

- **Browser (React UI):** panel layout engine, xterm.js terminals, Kanban board, companion chat — all communicate with the server via WebSocket + REST
- **Mira Local Server (Fastify):** PTY Manager, Config Engine, Git Sync, Skill Runtime, Companion AI Engine, Build Journal, MCP Bridge, Snapshot Engine, SI Engine

In `npx` mode both processes are bundled and served from a single port — the browser hits one origin and Vite's dev proxy isn't needed. In dev mode, Vite proxies `/api` and `/ws` to the Fastify server on port 3001.

## License

MIT
