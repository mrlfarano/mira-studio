# Mira Studio — Product Requirements Document

**"Your workflow. Your rules. Your Mira."**

| Field | Value |
|-------|-------|
| Version | 0.2 (Expanded) |
| Status | Draft |
| Author | Luis Fernando Arano |
| Last Updated | 2026-03-11 |

---

## Table of Contents

1. [Vision](#vision)
2. [Problem Statement](#problem-statement)
3. [Target User](#target-user)
4. [Core Philosophy](#core-philosophy)
5. [Feature Map](#feature-map)
6. [The Mira Companion Layer](#the-mira-companion-layer)
7. [The Toggle System](#the-toggle-system)
8. [The Skill System](#the-skill-system)
9. [MCP & Connections](#mcp--connections)
10. [Git-Backed Configuration](#git-backed-configuration)
11. [Agent Cockpit](#agent-cockpit)
12. [Planning & Context Layer](#planning--context-layer)
13. [Local Env & Observability](#local-env--observability)
14. [Collaboration](#collaboration)
15. [Session Management](#session-management)
16. [Customization](#customization)
17. [Cornerstone Integrations](#cornerstone-integrations)
18. [v1 Scope](#v1-scope)
19. [Out of Scope (v1)](#out-of-scope-v1)
20. [Technical Architecture](#technical-architecture)
21. [User Stories & Personas](#user-stories--personas)
22. [Milestones & Roadmap](#milestones--roadmap)
23. [Success Metrics & KPIs](#success-metrics--kpis)
24. [Non-Functional Requirements](#non-functional-requirements)
25. [Risk Assessment](#risk-assessment)
26. [Open Questions](#open-questions)
27. [Glossary](#glossary)

---

## Vision

Mira Studio is a centralized vibe coding cockpit for solo developers and indie hackers. It is not an IDE. It is not a project manager. It is the creative war room where AI agents, planning tools, and developer workflows live together in a single, radically customizable environment.

Where traditional tools force you to adapt to their structure, Mira adapts to yours. Every module, panel, and behavior can be toggled on or off. Your workspace is a reflection of how you build — and it travels with you via Git.

At the center of everything is **Mira** — a persistent AI companion who configures your environment conversationally, watches your agents, and speaks up only when it matters.

---

## Problem Statement

Modern vibe coders operate across too many tools simultaneously: a terminal for Claude Code, a browser for Notion, another window for their Kanban, a separate config file for MCP servers, and a mental model holding it all together. The context-switching is brutal and the setup friction is real.

Existing tools either:

- **Do too little** (terminals, raw CLI agents)
- **Do too much in the wrong direction** (full IDEs, heavy project management suites)
- **Require sysadmin-level configuration** to get AI tooling working (MCP setup, agent orchestration)

Mira solves this by making the cockpit the product. One environment. Every tool you actually use. Zero configuration theater.

---

## Target User

**Primary:** Solo vibe coders and indie hackers who build AI-assisted projects.

**Profile:**

- Comfortable with CLI tools and AI coding agents (Claude Code, Codex, etc.)
- Values customization and workflow autonomy over opinionated structure
- Frustrated by fragmented tooling and manual MCP/agent configuration
- Open source contributor mindset — shares configs, builds plugins, forks setups
- Works fast, iterates constantly, wants the environment to keep up

**Secondary (future):** Small dev teams (2–5) who want to share workspace configs and collaborate on agent-assisted builds.

---

## Core Philosophy

1. **Mira bends to you.** No two Mira setups look the same. The tool reflects the builder.
2. **Your workspace lives in Git.** Not in a cloud vendor's database. Yours, portable, version-controlled.
3. **Config is a conversation.** No JSON editing. No form-filling. Talk to Mira.
4. **Agents are first-class citizens.** Every other feature exists to serve the agent workflow.
5. **Zero lock-in by design.** Open source, open config format, open plugin system.
6. **Skills, not plugins.** Extensions feel like personality — they compose naturally, not bolt on awkwardly.

---

## Feature Map

| Icon | Feature | Description |
|------|---------|-------------|
| 🤖 | **Agent Cockpit** | Core anchor of the product. Everything else orbits this. |
| 🧠 | **Mira Companion Layer** | Persistent AI presence. Conversational config, context awareness, smart nudges. |
| 🎛️ | **Toggle System** | Every module and UI element has an on/off per workspace. |
| 🧩 | **Mira Skills** | Contextually-suggested, zero-friction extensibility. Community marketplace. |
| 🔌 | **MCP & Connections** | Conversational MCP setup. No JSON. Ever. |
| 🗃️ | **Git-Backed Config** | `.mira/` repo. Settings travel wherever you go. |
| 📋 | **Planning & Context Layer** | Kanban as prompt context. Canvas for ideation. Screenshot-to-task. |
| 🧪 | **Local Env & Observability** | One-click environment bootstrap. Adjacent debug workspace. |
| 🤝 | **Collaboration** | Pair Mode. Team config sync. Community config registry. |
| ⏱️ | **Session Management** | Snapshots. Session Replay. Build Journal. |
| 🎨 | **Customization** | Theme marketplace. CSS editor. Command palette. Profiles. |

---

## The Mira Companion Layer

Mira is not a chatbot. She is a persistent AI companion that lives in the corner of your cockpit. She configures your environment, watches your agents, and speaks up only when it matters.

### Behaviors

#### Conversational Everything

- Setting up a new MCP connection? Just say: *"Mira, connect my GitHub"*
- She asks only what she cannot figure out herself
- Errors are explained like a teammate would explain them, never like a stack trace

#### Persistent Context Awareness

- Mira remembers what happened in your session: what you built, what broke, what agents ran
- She connects dots: *"You've been on this task 40 minutes and the agent keeps hitting the same error — want me to look at it?"*
- Per-project memory stored in `.mira/memory.yml` — yours, portable, deletable

#### Smart Notifications

- Pings you only when agents finish or hit blockers
- Never interrupts a flow state with noise
- Nudges surface as subtle indicators, not popups

#### Vibe Score

- Tracks session energy: time on task, agent error rate, context switches
- Nudges you to take breaks or tells you when you're in the zone and should ship
- Entirely opt-in, data stays local

### Companion Panel

- Slim persistent panel — not full-screen, not intrusive
- Collapses to an avatar/indicator during deep work
- Full conversational interface when expanded

### Personality Configuration

- **Tone:** Professional / Casual / Minimal
- **Verbosity:** Chatty collaborator ↔ Silent co-pilot
- Rename her if you want — she's yours
- Stored in `.mira/companion.yml`

### Onboarding Wizard

- Interview-style: *"What are you building?"* → *"How do you like to work?"* → *"What tools do you already use?"*
- Auto-configures first workspace layout from answers
- Suggests which modules and skills to enable
- Takes under 60 seconds
- Feels like a conversation, not a form

---

## The Toggle System

Every module, panel type, and UI element in Mira has an on/off switch. Toggles are scoped per workspace, not globally.

### Profiles

- **Minimal** — Terminal panels + Mira companion only. Nothing else.
- **Balanced** — Agents + Kanban + Companion + Notifications
- **Full Send** — Everything on. Maximum cockpit.

### Workspace Scenes

- Named, paired workspaces sharing project context but with independent layouts
- Example pairs: Build + Debug, Ideate + Spec, Ship + Monitor
- Adjacent workspaces share the active project but have separate toggle states
- Hot-swap between paired workspaces via keyboard shortcut

### Config Portability

- All toggle states serialized into `.mira/workspace-[name].yml`
- Export/import as a shareable `.mira` bundle
- Community configs: *"Here's my FastAPI + Claude Code minimal setup"*

---

## The Skill System

Skills are Mira's extensibility layer. They are not plugins — they are personality extensions that compose naturally into your workflow.

### Core Behaviors

#### Contextual Discovery

- Mira watches your active workspace context and surfaces relevant skills inline
- *"You're scaffolding a FastAPI project — the OpenAPI Spec Viewer skill might be useful"*
- Suggestions are subtle nudges, never popups

#### Zero-Friction Install

- One click from suggestion or marketplace
- Wizard-style setup if needed: 2–3 questions max, conversational tone
- Hot-reload — no restarts, no interruption to flow

#### Skills Teach Mira New Behaviors

- A skill's manifest defines: what it adds to panels, agent prompts, CLAUDE.md injections, wizard steps, keyboard shortcuts
- Installing BMAD skill → Mira's wizard now asks BMAD-specific questions and pre-wires agent roles
- Skills compose: BMAD + TaskMaster + Claude Superpowers auto-wire together

### Marketplace

- Open to any developer — submit via GitHub PR to the registry
- Categories: AI Agents, Observability, Frameworks, Workflows, Themes
- Verified badge for skills audited by core maintainers (community-driven, not gatekept)
- Install by URL: `mira install github.com/username/my-skill`
- Skills sync via `.mira/skills.yml` in Git config

### Cornerstone Skills (Ship with Mira)

- **BMAD Method**
- **TaskMaster AI**
- **Claude Superpowers** (CLAUDE.md management, extended thinking, MCP orchestration)

---

## MCP & Connections

MCP servers are not infrastructure you configure. They are connections Mira helps you make.

### Principles

- No JSON editing. Ever.
- Minimal credential ask — only what Mira cannot figure out herself
- Secrets stored in system keychain, never in `.mira/` config
- Plain English error messages always

### Connection Flow

1. User says (or types): *"Connect my Supabase"*
2. Mira identifies the right MCP skill, installs if needed
3. Mira asks only the minimum: *"What's your Supabase project URL?"*
4. Live connection test runs silently in background
5. *"Connected. Here's what I can do with it now."* — browsable tool list shown

### Auto-Discovery

- Mira scans project files on open: `docker-compose.yml`, `.env`, `package.json`
- Surfaces suggestions: *"I see a Postgres container on 5432 — want to connect it?"*
- Detects popular MCP-compatible services automatically

### MCP Status Panel

- Every connected server shown as a card: name, status, last ping, tools exposed
- Toggle on/off per workspace
- One-click reconnect
- Tool explorer: browse and search what each server exposes

### Team Credential Handling

- Shared `.mira/` config contains placeholders, not secrets
- New team member opens config → Mira walks them through filling in only their own credentials
- No secrets ever committed to Git

---

## Git-Backed Configuration

Your workspace is not stored in Mira. It lives in Git. Mira is the renderer.

### Structure

```
.mira/
  config.yml           # Core settings and enabled modules
  companion.yml        # Mira personality and memory preferences
  workspaces/          # Per-workspace layout and toggle states
  skills.yml           # Installed skills and versions
  themes/              # Active theme and overrides
  memory.yml           # Mira's per-project context (opt-in)
```

### Sync Model

- Connect any Git remote on setup (GitHub, GitLab, Gitea, self-hosted)
- Auto-commit on workspace save (debounced, silent)
- Manual commit with message: *"switched to minimal mode for deep work"*
- Personal overrides layer on top of shared team baseline

### Team Workflow

- Shared repo = shared baseline config
- Personal overrides do not clobber teammates' layouts or themes
- Branch your settings like code — experiment without committing
- Conflict resolution UI when team settings diverge

### Community Registry

- `mira install github.com/username/setup-name`
- Browse and star community configs in marketplace
- Fork and modify any public config

---

## Agent Cockpit

The anchor module. Every other feature in Mira exists to serve this.

### Core Features

#### Embedded Agent Terminals

- PTY-based terminal panels running Claude Code, Codex CLI, and any CLI agent
- Per-agent status indicators: idle / thinking / running / error
- Agent session persistence — sessions survive panel rearrangement
- Streaming output with syntax highlighting

#### Agent Broadcast

- Send one prompt simultaneously to all active agent panels
- Selective broadcast: choose which agents receive the prompt
- Useful for parallelizing tasks across multiple agent sessions

#### Quick-Prompt Bar

- Send context or instructions to the active agent without switching focus
- Keyboard-first: invoke with a shortcut, type, send, back to flow

#### Context Cleaner

- Mira monitors agent context size and proactively summarizes when approaching limits
- *"Your agent context is getting heavy — want me to prune and summarize?"*
- Manual trigger available at any time

#### Project Map

- Live visual graph of the codebase updated as agents make changes
- Shows file relationships, recent modifications, agent activity zones
- Read-only reference panel — not an editor

---

## Planning & Context Layer

### Kanban — Prompt-Native

Cards in Mira's Kanban are not just tasks — they are prompt + context bundles that feed directly into agents.

- **Card anatomy:** Title, Description, Context (files, URLs, notes), Agent Target
- **"Send to Agent"** action on any card pushes card context into the active agent session
- **Auto-card generation:** paste a spec or brain dump, Mira breaks it into cards
- **Statuses:** Idea → Specced → In Agent → Done

### Spark Canvas

- Freeform whiteboard for raw ideation
- AI actions: *"Turn this into a PRD"* / *"Break into Kanban cards"* / *"Generate BMAD artifacts"*
- Sticky notes, arrows, rough diagrams
- Output feeds directly into Kanban or agent context

### Screenshot-to-Task

- Drop any screenshot into Mira
- Mira analyzes it and generates a task or bug report card automatically
- Populates: title, description, reproduction steps (for bugs), acceptance criteria
- Card lands in Kanban ready for agent handoff

### Build Journal

- Auto-generated session log: what tasks moved, what agents ran, what changed, what broke
- Timestamped, searchable, exportable
- Lives in `.mira/journals/[date].md`
- Optional: Mira generates a daily summary at session end

---

## Local Env & Observability

### One-Click Local Environment

- Mira reads project files and auto-detects environment needs
- Bootstraps: Docker containers, database seed, local server startup
- "Start environment" button — one click, everything up
- Status shown in the Observability workspace

### Observability Workspace

- Designed to be the adjacent workspace to your Build workspace in a Scene pair
- Panels: Log streaming (tail, filter, search), Port health, Process list, Agent run history
- Log streaming supports filter by level, service, keyword
- Agent run history: what did each agent do this session, what commands ran, what files changed

### Deploy Panel

- One-click deploys to Vercel, Railway, Fly.io from inside Mira
- Shows deploy status and logs inline
- Connected via MCP skill per provider

---

## Collaboration

### Pair Mode

- Two developers share a live Mira workspace
- Real-time sync of panel state, agent output, Kanban cards
- Like Google Docs but for your entire coding cockpit
- Each user maintains their own Mira companion instance
- Opt-in — never on by default

### Team Config Sync

- Shared `.mira/` Git repo is the source of truth
- Personal override layer preserves individual preferences
- Team members clone repo → Mira walks through credential setup → instantly in sync

### Community Config Registry

- Browse, star, fork workspace configurations from the community
- Categories: Stack-specific (FastAPI, Next.js), Workflow (BMAD, solo sprint), Minimal setups
- Submit your own via GitHub PR

---

## Session Management

### Snapshot

- Save the entire workspace state as a named checkpoint
- Includes: layout, panel positions, agent session state, Kanban state, active tasks
- Restore any snapshot instantly
- Snapshots stored in `.mira/snapshots/`

### Session Replay

- Record a full vibe coding session: agent outputs, panel activity, task progression
- Replay as a scrubable timeline
- Use cases: retrospectives, sharing how you built something, debugging a past session
- Export as shareable replay file

---

## Customization

### Theme Marketplace

- Community-submitted CSS themes, full Mira reskins
- Install from marketplace or via URL
- Live preview before applying
- Built-in CSS editor for custom overrides
- Theme config lives in `.mira/themes/`

### Command Palette

- Every action in Mira is accessible via keyboard shortcut
- Vim-style command palette: invoke, type, execute
- Fully rebindable
- Searchable action registry

### Profiles

- **Minimal:** Maximum focus, minimum UI
- **Balanced:** Core cockpit with context tools
- **Full Send:** Everything enabled
- Custom profiles: save any toggle state as a named profile
- Switch profiles per workspace or globally

---

## Cornerstone Integrations

These ship as first-class Skills, deeply integrated with Mira's companion layer and workspace system.

### BMAD Method

- Full agent role support: Analyst, Architect, Dev, QA
- BMAD document artifacts generated and stored: PRD, Architecture Doc, Stories
- BMAD workflow sequence wired into Kanban: Analyst → Architect → Dev loop
- Mira's onboarding wizard gains BMAD-specific questions when skill is installed
- Agent panels pre-configured with BMAD role context

### TaskMaster AI

- Mira serves as the visual UI for TaskMaster — replaces the CLI for task management
- Reads and writes `tasks.json` natively
- Kanban synced with TaskMaster task state
- Mira companion surfaces TaskMaster blockers and completions as smart notifications

### Claude Superpowers

- CLAUDE.md management: create, edit, and inject per-project custom instructions
- MCP server orchestration through Mira's connection layer
- Extended thinking toggle per agent session
- Multi-agent chain configuration via Mira's Broadcast system

---

## v1 Scope

The following features are targeted for the initial release:

### Must Have (v1)

- [ ] Modular drag/drop panel layout engine
- [ ] Toggle system (per workspace)
- [ ] Mira companion panel (conversational config, smart notifications)
- [ ] Onboarding wizard (interview-style, 60 seconds)
- [ ] Embedded agent terminals (PTY, Claude Code + Codex)
- [ ] Agent status indicators and session persistence
- [ ] Quick-prompt bar
- [ ] Kanban with Send-to-Agent
- [ ] Git-backed `.mira/` config
- [ ] MCP connection wizard (conversational, no JSON)
- [ ] MCP status panel
- [ ] Skill system (install, hot-reload, marketplace browse)
- [ ] BMAD, TaskMaster, Claude Superpowers as cornerstone skills
- [ ] Workspace Scenes (paired workspaces)
- [ ] Command palette + rebindable hotkeys
- [ ] Theme marketplace (browse + apply)
- [ ] CSS editor
- [ ] Snapshot (save/restore workspace state)
- [ ] Build Journal (auto-generated session log)

### Nice to Have (v1.x)

- [ ] Agent Broadcast
- [ ] Context Cleaner
- [ ] Screenshot-to-task
- [ ] Spark Canvas
- [ ] Project Map
- [ ] Session Replay
- [ ] Vibe Score
- [ ] One-click local env bootstrap
- [ ] Observability workspace panels
- [ ] Deploy Panel (Vercel, Railway, Fly.io)
- [ ] Pair Mode
- [ ] Community config registry

---

## Out of Scope (v1)

- File manager / credentials vault (Termix territory)
- Full code editor (not an IDE)
- Mobile support
- Enterprise SSO / org management
- Billing / paid tiers (open source first)

---

## Technical Architecture

### High-Level System Overview

Mira Studio is a desktop-class web application built on a local-first architecture. It runs as a local process on the developer's machine, serving a web UI in the browser while maintaining direct filesystem access and PTY control.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Mira UI)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Panel    │ │  Agent   │ │  Kanban  │ │  Mira Companion  │   │
│  │  Layout   │ │ Terminals│ │  Board   │ │  Chat Panel      │   │
│  │  Engine   │ │  (xterm) │ │          │ │                  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │             │            │                 │             │
│  ─────┴─────────────┴────────────┴─────────────────┴──────────  │
│                     WebSocket + REST API                        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────┐
│                     Mira Local Server                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │  PTY Manager │ │  MCP Bridge  │ │  Config Engine        │    │
│  │  (node-pty)  │ │              │ │  (.mira/ ↔ state)     │    │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬────────────┘    │
│         │                │                     │                │
│  ┌──────┴───────┐ ┌──────┴───────┐ ┌──────────┴────────────┐   │
│  │ Agent        │ │ MCP Server   │ │ Git Sync              │   │
│  │ Sessions     │ │ Connections  │ │ (.mira/ auto-commit)   │   │
│  └──────────────┘ └──────────────┘ └───────────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐   │
│  │ Skill        │ │ Companion    │ │ Session & Snapshot     │   │
│  │ Runtime      │ │ AI Engine    │ │ Manager                │   │
│  └──────────────┘ └──────────────┘ └───────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────┐
│                     Local Filesystem                            │
│  ┌──────────┐ ┌──────────────┐ ┌───────────────────────────┐   │
│  │ .mira/   │ │ Project Files│ │ System Keychain (secrets)  │   │
│  │ config   │ │              │ │                            │   │
│  └──────────┘ └──────────────┘ └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend Framework** | React + TypeScript | Largest ecosystem, best tooling for complex panel layouts, strong xterm.js integration |
| **UI Layout Engine** | Custom panel system built on `react-grid-layout` or `allotment` | Drag/drop panels, resizable, serializable to `.mira/` config |
| **Terminal Emulation** | xterm.js | Industry standard, WebGL renderer for performance, addons ecosystem |
| **State Management** | Zustand | Lightweight, TypeScript-first, easy to serialize workspace state |
| **Local Server** | Node.js (Express or Fastify) | Native PTY support via `node-pty`, MCP SDK compatibility, WebSocket support |
| **PTY Management** | `node-pty` | Proven pseudo-terminal library, used by VS Code's terminal |
| **WebSocket Transport** | `ws` (server) + native WebSocket (client) | Low overhead, bidirectional streaming for terminal I/O |
| **MCP Integration** | `@modelcontextprotocol/sdk` | Official MCP SDK, first-class server/client support |
| **Companion AI** | Configurable — Claude (default), OpenAI, Ollama (local) | User choice, provider-agnostic interface via adapter pattern |
| **Config Persistence** | YAML (via `js-yaml`) | Human-readable, Git-friendly diffs, familiar to target users |
| **Git Operations** | `isomorphic-git` or `simple-git` | Programmatic `.mira/` commits without shelling out |
| **Build Tooling** | Vite | Fast dev server, optimized production builds |
| **Desktop Wrapper** | Tauri (future) | Lightweight alternative to Electron, Rust backend for native perf |
| **Testing** | Vitest + Playwright | Unit + E2E coverage, fast, Vite-native |

### Data Flow Architecture

#### Agent Terminal Data Flow
```
User Input → Quick-Prompt Bar → WebSocket → PTY Manager → node-pty
    → Agent Process (Claude Code / Codex) → stdout/stderr
    → PTY Manager → WebSocket → xterm.js → Rendered Output
```

#### Mira Companion Data Flow
```
User Message → Companion Panel → REST API → Companion AI Engine
    → Context Assembly (session state + .mira/memory.yml + active project)
    → LLM API Call (Claude / OpenAI / Ollama)
    → Response → Companion Panel (streaming)
    → Side Effects (config changes, skill installs, MCP connections)
```

#### Config Sync Flow
```
UI State Change → State Manager (Zustand) → Config Serializer
    → Write .mira/*.yml → Git Sync Engine
    → Debounced auto-commit → Push to remote (if configured)
```

#### Kanban → Agent Flow
```
Card "Send to Agent" → Context Bundle Assembly
    (title + description + attached files + URLs + notes)
    → Active Agent Terminal → Injected as prompt context
    → Card status → "In Agent"
    → Agent completion signal → Card status → "Done"
```

### Key Architecture Decisions

1. **Local-first, not cloud-first:** Mira runs on the developer's machine. No account required. No data leaves the machine unless the user configures a Git remote or AI provider.

2. **Process architecture:** Single Node.js server process manages all PTY sessions, MCP connections, and config state. The browser connects via localhost WebSocket.

3. **Plugin isolation:** Skills run in a sandboxed context with a defined API surface. They cannot access the filesystem directly — only through Mira's skill API.

4. **Config as source of truth:** The `.mira/` directory is the canonical state. UI state is derived from config, not the other way around. This ensures Git portability.

5. **Provider-agnostic AI:** The Companion AI layer uses an adapter pattern. Swapping Claude for OpenAI or a local Ollama model requires changing one config value.

---

## User Stories & Personas

### Persona: Alex — The Solo Indie Hacker

**Background:** Full-stack developer building a SaaS product alone. Uses Claude Code daily. Has 4-5 terminal tabs, a Notion board, and a browser with 20 tabs open at all times. Ships fast, breaks things, fixes them faster.

**Pain points:**
- Loses track of what Claude Code did across sessions
- Spends 15 minutes per project setting up MCP servers
- Context-switches between Notion, terminal, and browser constantly
- Has no record of "how I built this" for past projects

### Persona: Jordan — The Vibe Coder

**Background:** Non-traditional developer who learned to code with AI assistance. Builds tools and prototypes using natural language prompts. Relies heavily on AI agents for implementation but drives product vision personally.

**Pain points:**
- Finds IDE configuration intimidating
- Wants a visual workspace that "just works"
- Struggles with MCP/agent configuration (too many JSON files)
- Needs guidance on workflow structure (when to plan vs. when to build)

### Persona: Sam — The Open Source Builder

**Background:** Maintains 3 open source projects, contributes to others. Values portable, shareable configurations. Builds tools for other developers. Active in developer communities.

**Pain points:**
- Recreates workspace setup for every new project
- Can't share "how I work" with collaborators easily
- Wants to contribute workspace configs and skills to a community
- Needs consistency across machines (laptop, desktop, cloud dev env)

### User Stories

#### Agent Cockpit

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| AC-01 | As Alex, I want to run multiple Claude Code sessions in side-by-side panels so I can parallelize tasks without losing sight of any agent. | Multiple PTY terminals render simultaneously; each shows agent status (idle/thinking/running/error); panels are resizable and rearrangeable. |
| AC-02 | As Jordan, I want a quick-prompt bar so I can send instructions to an agent without switching focus from my planning board. | Keyboard shortcut opens bar; prompt sends to active agent; bar dismisses after send; user returns to previous focus. |
| AC-03 | As Alex, I want agent sessions to persist when I rearrange my layout so I don't lose in-progress work. | Moving, resizing, or swapping panels does not restart agent processes; session output history is preserved. |
| AC-04 | As Alex, I want to broadcast a prompt to all running agents simultaneously so I can coordinate parallel tasks. | Broadcast mode selectable; prompt sent to all or selected agents; confirmation shown per agent. |

#### Mira Companion

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| MC-01 | As Jordan, I want to set up my workspace by talking to Mira instead of editing config files. | Natural language commands modify `.mira/` config; changes reflected in UI immediately; no manual file editing required. |
| MC-02 | As Alex, I want Mira to alert me when an agent finishes a task or hits an error, without interrupting my flow. | Notifications appear as subtle indicators (not modal popups); clicking expands detail; notification history accessible. |
| MC-03 | As Jordan, I want an onboarding wizard that asks me what I'm building and sets up my workspace automatically. | Wizard completes in under 60 seconds; asks 3-5 questions; produces a functional workspace layout with relevant modules enabled. |
| MC-04 | As Alex, I want Mira to remember context from my session so she can connect dots about what I've been building. | Session context stored in `.mira/memory.yml`; Mira references past actions in conversation; memory is deletable by user. |

#### Planning & Context

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| PC-01 | As Alex, I want to send a Kanban card directly to an agent as a prompt with full context. | "Send to Agent" button on card; card title, description, and attached context injected into agent prompt; card status updates to "In Agent". |
| PC-02 | As Jordan, I want to paste a brain dump and have Mira break it into Kanban cards. | Paste or type free-form text; Mira parses into discrete cards with titles and descriptions; cards appear in "Idea" column. |
| PC-03 | As Alex, I want a build journal that auto-logs what happened during my session. | Journal entries generated automatically with timestamps; includes tasks moved, agents run, files changed; stored in `.mira/journals/`. |
| PC-04 | As Jordan, I want to drop a screenshot and have Mira create a task card from it. | Drag-and-drop or paste screenshot; Mira analyzes image; generates card with title, description, and steps; card lands in Kanban. |

#### Configuration & Portability

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| CP-01 | As Sam, I want my workspace config to live in Git so I can version-control and share it. | All config persisted in `.mira/` directory; auto-commit on save; push to any Git remote; clone restores full workspace. |
| CP-02 | As Sam, I want to install a community workspace config with one command. | `mira install <url>` fetches and applies config; Mira walks through credential setup; workspace functional after install. |
| CP-03 | As Alex, I want to switch between workspace profiles instantly. | Named profiles (Minimal/Balanced/Full Send/Custom) toggle-switch all modules; switch takes under 1 second; no restart required. |
| CP-04 | As Sam, I want to create and publish a Mira skill for other developers to use. | Skill manifest format documented; `mira publish` submits to registry; skill installable by others; hot-reload on install. |

#### MCP & Connections

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| MCP-01 | As Jordan, I want to connect my database by saying "connect my Supabase" instead of editing JSON. | Natural language triggers MCP connection flow; Mira asks only for credentials it can't auto-detect; connection test runs; success confirmation shown. |
| MCP-02 | As Alex, I want to see all my MCP connections and their status at a glance. | Status panel shows all connections as cards; each shows name, status, last ping; one-click reconnect available. |
| MCP-03 | As Alex, I want Mira to auto-detect services in my project and suggest connections. | On project open, Mira scans config files (docker-compose, .env, package.json); surfaces suggestions for detected services; suggestions dismissible. |

---

## Milestones & Roadmap

### Phase 0: Foundation (Weeks 1–4)

**Goal:** Core shell with panel layout, terminal embedding, and config persistence.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| Panel Layout Engine | Drag/drop, resize, serialize panel positions | React + layout library |
| Single Agent Terminal | One PTY-based terminal running Claude Code | node-pty + xterm.js + WebSocket |
| `.mira/` Config Scaffold | Config read/write, YAML serialization | js-yaml, file watcher |
| Basic UI Shell | App chrome, sidebar, panel container | React + Vite |
| Dev Tooling | Build pipeline, testing setup, CI | Vite + Vitest + Playwright |

**Exit criteria:** User can open Mira, see a panel layout, run Claude Code in an embedded terminal, and have layout state persist to `.mira/config.yml`.

### Phase 1: Cockpit Core (Weeks 5–8)

**Goal:** Multi-agent terminals, toggle system, and quick-prompt bar.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| Multi-Terminal Support | Multiple PTY panels, independent sessions | Phase 0 terminal |
| Agent Status Indicators | Idle/thinking/running/error per terminal | PTY output parsing |
| Toggle System | Per-workspace module on/off | Config engine |
| Quick-Prompt Bar | Keyboard-invoked prompt to active agent | Agent terminal API |
| Workspace Profiles | Minimal / Balanced / Full Send presets | Toggle system |

**Exit criteria:** User can run 3+ agent terminals side-by-side, toggle modules on/off, send prompts via keyboard shortcut, and switch profiles.

### Phase 2: Mira Companion (Weeks 9–12)

**Goal:** AI companion with conversational config and smart notifications.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| Companion Panel UI | Persistent chat panel, collapse/expand | Panel layout engine |
| Conversational Config | Natural language → `.mira/` config changes | LLM adapter, config engine |
| Smart Notifications | Agent finish/error alerts, subtle indicators | Agent status system |
| Session Memory | `.mira/memory.yml` read/write, context assembly | Config engine |
| Onboarding Wizard | Interview-style setup flow | Companion AI, config engine |

**Exit criteria:** User can talk to Mira to configure their workspace, receive agent notifications, and complete onboarding in under 60 seconds.

### Phase 3: Planning Layer (Weeks 13–16)

**Goal:** Kanban with agent integration and build journal.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| Kanban Board | Columns, cards, drag/drop | Panel system |
| Card → Agent Context | "Send to Agent" pushes card context to terminal | Agent terminal API |
| Auto-Card Generation | Brain dump → parsed cards | Companion AI |
| Build Journal | Auto-generated session log | Session state tracking |
| Screenshot-to-Task | Image drop → analyzed → card created | Companion AI + image input |

**Exit criteria:** User can manage tasks in Kanban, send cards to agents as context, generate cards from text/screenshots, and review auto-generated build journals.

### Phase 4: MCP & Skills (Weeks 17–20)

**Goal:** Conversational MCP setup and skill system with marketplace.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| MCP Connection Wizard | Conversational setup, no JSON | Companion AI, MCP SDK |
| MCP Status Panel | Connection cards, status, reconnect | MCP bridge |
| Auto-Discovery | Scan project files, suggest connections | File system scanner |
| Skill Runtime | Install, hot-reload, sandboxed execution | Plugin architecture |
| Skill Marketplace | Browse, install, publish | GitHub registry |
| Cornerstone Skills | BMAD, TaskMaster, Claude Superpowers | Skill runtime |

**Exit criteria:** User can connect MCP servers conversationally, install skills from marketplace, and use BMAD/TaskMaster/Claude Superpowers skills.

### Phase 5: Polish & Community (Weeks 21–24)

**Goal:** Git sync, themes, workspace scenes, community features.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| Git Sync Engine | Auto-commit, push, pull `.mira/` config | Git library |
| Workspace Scenes | Paired workspaces, hot-swap | Toggle system, layout engine |
| Theme Marketplace | Browse, apply, CSS editor | Styling system |
| Command Palette | Searchable actions, rebindable hotkeys | Action registry |
| Snapshot System | Save/restore full workspace state | Config + session state |
| Community Config Registry | Browse, star, fork shared configs | GitHub-based registry |

**Exit criteria:** Full v1 feature set complete. User can sync config via Git, use themes, switch scenes, and share configs with the community.

### Dependency Graph

```
Phase 0: Foundation
    ├── Panel Layout Engine ──────────────────────┐
    ├── Single Agent Terminal ────────┐           │
    ├── .mira/ Config Scaffold ──┐    │           │
    └── Basic UI Shell           │    │           │
                                 │    │           │
Phase 1: Cockpit Core           │    │           │
    ├── Multi-Terminal ──────────┼────┘           │
    ├── Agent Status ────────────┤                │
    ├── Toggle System ───────────┤                │
    ├── Quick-Prompt Bar ────────┤                │
    └── Profiles ────────────────┘                │
                                 │                │
Phase 2: Companion              │                │
    ├── Companion Panel UI ──────┼────────────────┘
    ├── Conversational Config ───┤
    ├── Smart Notifications ─────┤
    ├── Session Memory ──────────┤
    └── Onboarding Wizard ───────┘
                                 │
Phase 3: Planning     ←─────────┘
    ├── Kanban Board
    ├── Card → Agent Context
    ├── Auto-Card Generation
    ├── Build Journal
    └── Screenshot-to-Task
                                 │
Phase 4: MCP & Skills ←─────────┘
    ├── MCP Connection Wizard
    ├── Skill Runtime
    ├── Marketplace
    └── Cornerstone Skills
                                 │
Phase 5: Polish       ←─────────┘
    ├── Git Sync
    ├── Themes
    ├── Scenes
    └── Community Registry
```

---

## Success Metrics & KPIs

### North Star Metric

**Weekly Active Workspaces (WAW):** Number of unique `.mira/` workspaces that had at least one agent session in the past 7 days. Measured locally, reported only if user opts in to anonymous telemetry.

### Adoption Metrics

| Metric | Target (6 months post-launch) | Measurement |
|--------|-------------------------------|-------------|
| GitHub Stars | 5,000+ | GitHub API |
| Weekly Active Workspaces | 1,000+ | Opt-in telemetry |
| Skill Marketplace Listings | 50+ community skills | Registry count |
| Community Configs Published | 100+ shared configs | Registry count |
| Discord / Community Members | 2,000+ | Community platform |

### Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Avg. session duration | 90+ minutes | Local session tracking |
| Agent sessions per workspace per week | 15+ | Local session tracking |
| Kanban cards sent to agents per week | 10+ per active user | Local tracking |
| MCP connections per workspace | 2+ | Config analysis |
| Skills installed per workspace | 3+ (including cornerstones) | Config analysis |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion rate | 90%+ | Funnel tracking |
| Onboarding time | < 60 seconds | Timer |
| MCP connection success rate | 95%+ first attempt | Connection logs |
| Agent terminal crash rate | < 0.1% of sessions | Error tracking |
| Config sync conflict rate | < 1% of sync operations | Git sync logs |

### Retention Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Day 1 retention | 70%+ | Return within 24 hours |
| Week 1 retention | 50%+ | Active 3+ days in first week |
| Month 1 retention | 30%+ | Active 8+ days in first month |

---

## Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| App startup to interactive | < 3 seconds |
| Panel drag/resize responsiveness | < 16ms frame time (60fps) |
| Terminal input-to-render latency | < 50ms |
| Config save to disk | < 100ms |
| Profile switch (toggle all modules) | < 500ms |
| Skill hot-reload | < 2 seconds |
| MCP connection establishment | < 5 seconds |
| Companion AI response (first token) | < 1 second (dependent on provider) |

### Scalability

| Dimension | Target |
|-----------|--------|
| Concurrent agent terminals | 8+ without degradation |
| Kanban cards per board | 500+ without UI lag |
| MCP connections per workspace | 10+ simultaneously |
| `.mira/` config file size | < 1MB total |
| Session history retention | 30 days of build journals |

### Security

- **No secrets in `.mira/`:** All credentials stored in system keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- **Localhost only by default:** Mira server binds to `127.0.0.1`, not `0.0.0.0`
- **Skill sandboxing:** Skills execute in a restricted context with no direct filesystem or network access outside their declared permissions
- **No telemetry by default:** All usage tracking is opt-in. No data leaves the machine unless explicitly configured
- **PTY isolation:** Each agent terminal runs in its own PTY with standard OS-level process isolation
- **Dependency auditing:** Automated `npm audit` in CI pipeline; no known critical vulnerabilities in production dependencies

### Accessibility

- Keyboard-navigable: every action reachable without mouse
- Screen reader compatible panel labels and status indicators
- Minimum contrast ratio: WCAG 2.1 AA (4.5:1 for normal text)
- Respects OS-level reduced motion preferences
- Scalable font sizes (user configurable)

### Compatibility

| Platform | Support Level |
|----------|--------------|
| macOS (Apple Silicon + Intel) | Primary |
| Linux (Ubuntu 22.04+, Fedora 38+) | Primary |
| Windows 10/11 (WSL2) | Secondary |
| Browser: Chrome / Edge (latest 2 versions) | Primary |
| Browser: Firefox (latest 2 versions) | Secondary |
| Browser: Safari (latest) | Best effort |

### Offline Capability

- Full functionality without internet (agents require their own API keys)
- `.mira/` config works entirely offline
- Git sync queues commits when offline, pushes on reconnect
- Skill marketplace requires internet; installed skills work offline
- Companion AI works offline if configured with local model (Ollama)

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PTY performance with 8+ concurrent terminals | Medium | High | Benchmark early; implement virtualized rendering (only render visible terminals); lazy-load background terminals |
| xterm.js WebGL renderer compatibility issues | Low | Medium | Fallback to canvas renderer; test across target browsers in CI |
| MCP protocol breaking changes | Medium | High | Pin MCP SDK version; abstract behind adapter layer; monitor MCP spec repo |
| Companion AI latency impacting conversational feel | Medium | Medium | Implement streaming responses; show typing indicators; cache common config operations locally |
| `.mira/` Git sync merge conflicts | Medium | Medium | Use CRDT-inspired merge strategy for YAML; provide visual conflict resolution UI; auto-resolve non-conflicting changes |
| Skill sandboxing escape | Low | Critical | Strict CSP; no `eval`; skills run in Web Workers with message-passing API; security audit before marketplace launch |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users perceive Mira as "another IDE" | Medium | High | Clear messaging: "not an IDE, no code editor"; marketing focuses on cockpit/workflow metaphor |
| Onboarding too complex despite wizard | Medium | High | User testing with 5+ target persona matches before launch; iterate on wizard flow; provide "start blank" escape hatch |
| Skill marketplace quality control | Medium | Medium | Verified badge system; community ratings; automated security scanning on submission |
| Dependency on third-party AI providers for companion | High | Medium | Provider-agnostic adapter pattern; local model (Ollama) support from day one; companion degrades gracefully without AI |
| Community adoption too slow for marketplace flywheel | Medium | High | Ship strong cornerstone skills; seed marketplace with 10+ official skills; active community engagement |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Open source maintenance burden | High | Medium | Clear contribution guidelines; modular architecture enables community PRs; core team focuses on runtime stability |
| Platform-specific bugs (Windows/Linux/macOS) | High | Medium | CI matrix across all platforms; community testers per platform; prioritize macOS + Linux for v1 |
| Breaking changes in agent CLIs (Claude Code, Codex) | Medium | Medium | Agent integration layer abstracted; version detection; graceful fallback for unknown agent output |

---

## Open Questions

1. **Tech stack:** What framework powers the web frontend? (React, Svelte, Vue?) → **Recommendation: React + TypeScript** (see Technical Architecture)
2. **PTY implementation:** WebSockets to a local relay process, or browser-native? → **Recommendation: WebSocket to local Node.js server with node-pty**
3. **Mira companion AI:** Which model backs Mira? Configurable by user? → **Recommendation: Configurable, Claude default, Ollama for local**
4. **Marketplace hosting:** GitHub-based registry, or self-hosted? → **Recommendation: GitHub-based registry (JSON index + Git repos)**
5. **Pair Mode transport:** WebRTC peer-to-peer, or relay server? → **Deferred to v1.x — needs further research**
6. **Session Replay storage:** Local only, or optional cloud backup? → **v1: Local only. v1.x: Optional export/share**
7. **Vibe Score data:** Fully local, or optional anonymous aggregate (opt-in)? → **Fully local, no aggregation in v1**
8. **Tauri vs Electron:** Should Mira ship as a native desktop app? → **v1: Browser-based. v2: Evaluate Tauri wrapper for native feel**
9. **Monetization model:** How does Mira sustain development long-term? → **Open source core. Potential: hosted team sync, premium skills, support tiers**
10. **Accessibility audit:** When should formal accessibility testing happen? → **Phase 5, before public launch**

---

## Glossary

| Term | Definition |
|------|-----------|
| **Agent** | A CLI-based AI coding assistant (Claude Code, Codex CLI, etc.) that runs in a terminal |
| **Cockpit** | The central Mira workspace where agent terminals, planning tools, and companion live together |
| **Companion** | Mira's persistent AI assistant that configures the workspace, monitors agents, and provides context-aware help |
| **MCP** | Model Context Protocol — an open standard for connecting AI models to external tools and data sources |
| **PTY** | Pseudo-terminal — a virtual terminal interface that allows Mira to embed CLI tools in the browser |
| **Scene** | A pair of named workspaces (e.g., Build + Debug) that share project context but have independent layouts |
| **Skill** | A Mira extension that adds behaviors, panel types, agent configurations, or integrations — not a traditional plugin |
| **Toggle** | An on/off switch for any module, panel, or UI element — scoped per workspace |
| **Vibe Coding** | A development style where the developer drives product vision and uses AI agents for implementation |
| **Workspace** | A named configuration of panels, toggles, and settings that represents how a developer works on a project |

---

> *This document is the founding spec for Mira Studio. It is intentionally opinionated about philosophy and flexible about implementation. Build something real.*
