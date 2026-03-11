# Mira Studio — Product Requirements Document

**"Your workflow. Your rules. Your Mira."**

| Field | Value |
|-------|-------|
| Version | 0.1 (Founding Document) |
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
20. [Open Questions](#open-questions)

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

## Open Questions

1. **Tech stack:** What framework powers the web frontend? (React, Svelte, Vue?)
2. **PTY implementation:** WebSockets to a local relay process, or browser-native?
3. **Mira companion AI:** Which model backs Mira? Configurable by user?
4. **Marketplace hosting:** GitHub-based registry, or self-hosted?
5. **Pair Mode transport:** WebRTC peer-to-peer, or relay server?
6. **Session Replay storage:** Local only, or optional cloud backup?
7. **Vibe Score data:** Fully local, or optional anonymous aggregate (opt-in)?

---

> *This document is the founding spec for Mira Studio. It is intentionally opinionated about philosophy and flexible about implementation. Build something real.*
