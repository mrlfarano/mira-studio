---
workflowType: 'prd'
workflow: 'edit'
classification:
  domain: 'developer-tooling'
  projectType: 'desktop-web-app'
  complexity: 'high'
inputDocuments: ['PRD.md (v0.2)', 'brainstorming-session-2026-03-11-0042.md']
stepsCompleted: ['step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
lastEdited: '2026-03-11'
editHistory:
  - date: '2026-03-11'
    changes: 'Converted to BMAD format. Added: Five Cornerstones section, Self-Improvement Cornerstone section, Skill Manifest spec, Two-Layer Config Model, Collaboration Pair Mode user stories, Functional Requirements section. Updated: Open Questions (closed 5, added 2), Glossary (added 7 terms), Milestones (added SI to Phase 5).'
---

# Mira Studio — Product Requirements Document

**"Your workflow. Your rules. Your Mira."**

| Field | Value |
|-------|-------|
| Version | 0.3 (BMAD Format) |
| Status | Draft |
| Author | Luis Fernando Arano |
| Last Updated | 2026-03-11 |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Success Criteria](#success-criteria)
3. [Product Scope](#product-scope)
4. [The Five Cornerstones](#the-five-cornerstones)
5. [User Journeys](#user-journeys)
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
18. [Self-Improvement Cornerstone](#self-improvement-cornerstone)
19. [Technical Architecture](#technical-architecture)
20. [Functional Requirements](#functional-requirements)
21. [Non-Functional Requirements](#non-functional-requirements)
22. [Milestones & Roadmap](#milestones--roadmap)
23. [Risk Assessment](#risk-assessment)
24. [Open Questions](#open-questions)
25. [Glossary](#glossary)

---

## Executive Summary

Mira Studio is a local-first vibe coding cockpit for solo developers and indie hackers. It unifies AI agent terminals, planning tools, and developer workflow into a single radically customizable environment — no IDE, no project management suite, no configuration theater.

The product's central differentiation is that the workspace adapts to the developer, not the reverse. Every panel, module, and behavior is toggleable per workspace. All configuration lives in Git. At the center is **Mira** — a persistent AI companion who configures the environment conversationally, monitors agents, and surfaces insight without interrupting flow.

Mira organizes all features around five phases of the builder lifecycle called Cornerstones: Creativity & Ideation, Project & Delivery Planning, Vibe-Code Building, Observability & Reiteration, and Self-Improvement. Every panel, skill, and primitive maps to at least one Cornerstone.

Mira Studio ships as open source. v1 targets solo developers. v1.x extends to small teams.

---

## Success Criteria

### North Star

**Weekly Active Workspaces (WAW):** unique `.mira/` workspaces with at least one agent session in the past 7 days. Measured locally; reported only if the user opts in to anonymous telemetry.

### Launch Targets (6 months post-release)

| Metric | Target | Measurement |
|--------|--------|-------------|
| GitHub Stars | 5,000+ | GitHub API |
| Weekly Active Workspaces | 1,000+ | Opt-in telemetry |
| Skill Marketplace listings | 50+ community skills | Registry count |
| Community configs published | 100+ shared configs | Registry count |
| Community members | 2,000+ | Community platform |
| Onboarding completion rate | 90%+ | Funnel tracking |
| Onboarding duration | < 60 seconds | Timer |
| MCP connection success (first attempt) | 95%+ | Connection logs |
| Agent terminal crash rate | < 0.1% of sessions | Error tracking |
| Day-1 retention | 70%+ | Return within 24 hours |
| Week-1 retention | 50%+ | Active 3+ days in week 1 |
| Month-1 retention | 30%+ | Active 8+ days in month 1 |

---

## Product Scope

### In Scope (v1)

- Modular drag/drop panel layout engine
- Toggle system (per workspace)
- Mira companion panel (conversational config, smart notifications)
- Onboarding wizard (interview-style, under 60 seconds)
- Embedded agent terminals (PTY, Claude Code + Codex)
- Agent status indicators and session persistence
- Quick-prompt bar
- Kanban with Send-to-Agent
- Git-backed `.mira/` config
- MCP connection wizard (conversational, no JSON)
- MCP status panel
- Skill system (install, hot-reload, marketplace browse)
- BMAD, TaskMaster, Claude Superpowers as cornerstone skills
- Workspace Scenes (paired workspaces)
- Command palette + rebindable hotkeys
- Theme marketplace (browse + apply)
- CSS editor
- Snapshot (save/restore workspace state)
- Build Journal (auto-generated session log)

### Deferred to v1.x

- Agent Broadcast
- Context Cleaner
- Screenshot-to-task
- Spark Canvas
- Project Map
- Session Replay
- Vibe Score
- One-click local env bootstrap
- Observability workspace panels
- Deploy Panel (Vercel, Railway, Fly.io)
- Pair Mode
- Community config registry
- Self-Improvement autonomous build agent

### Out of Scope (v1)

- File manager / credentials vault
- Full code editor (Mira is not an IDE)
- Mobile support
- Enterprise SSO / org management
- Billing / paid tiers (open source first)

---

## The Five Cornerstones

Mira Studio organizes around five phases of the builder lifecycle. Every panel, skill, and primitive maps to at least one Cornerstone. Skills declare which Cornerstones they serve.

### 1. Creativity & Ideation

Spark Canvas, PRD conversation, brainstorming facilitation. The phase where ideas become defined problems. Features in this Cornerstone help the developer move from raw concepts to structured, actionable artifacts without leaving Mira.

### 2. Project & Delivery Planning

Kanban, epics and stories, methodology skills. The phase where problems become executable plans. Features here take defined problems and break them into work the agent can act on.

### 3. Vibe-Code Building, Testing & Improvement

Agent Cockpit, Quick-Prompt, Broadcast, testing. The phase where plans become working software. This is the anchor Cornerstone — every other feature exists to serve the agent workflow here.

### 4. Observability & Reiteration

Build Journal, Observability Workspace, Vibe Score. The phase where working software is understood and improved. Features here give the developer visibility into what agents did, what the system is doing, and where to improve.

### 5. Self-Improvement

Project SI, User SI, autonomous build cycles, SI Panel. The phase where the developer, the project, and Mira herself grow continuously. This Cornerstone closes the loop — each build cycle generates learning that seeds the next one.

---

## User Journeys

### Persona: Alex — The Solo Indie Hacker

**Background:** Full-stack developer building a SaaS product alone. Uses Claude Code daily. Maintains 4–5 terminal tabs, a Notion board, and a browser with 20 tabs. Ships fast, breaks things, fixes faster.

**Pain points:**
- Loses track of what Claude Code did across sessions
- Spends 15 minutes per project setting up MCP servers
- Context-switches between Notion, terminal, and browser constantly
- Has no record of "how I built this" for past projects

### Persona: Jordan — The Vibe Coder

**Background:** Non-traditional developer who learned to code with AI assistance. Builds tools and prototypes using natural language prompts. Relies on AI agents for implementation but drives product vision personally.

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
|----|-------|---------------------|
| AC-01 | As Alex, I want to run multiple Claude Code sessions in side-by-side panels so I can parallelize tasks without losing sight of any agent. | Multiple PTY terminals render simultaneously; each shows agent status (idle/thinking/running/error); panels are resizable and rearrangeable. |
| AC-02 | As Jordan, I want a quick-prompt bar so I can send instructions to an agent without switching focus from my planning board. | Keyboard shortcut opens bar; prompt sends to active agent; bar dismisses after send; user returns to previous focus. |
| AC-03 | As Alex, I want agent sessions to persist when I rearrange my layout so I don't lose in-progress work. | Moving, resizing, or swapping panels does not restart agent processes; session output history is preserved. |
| AC-04 | As Alex, I want to broadcast a prompt to all running agents simultaneously so I can coordinate parallel tasks. | Broadcast mode selectable; prompt sent to all or selected agents; confirmation shown per agent. |

#### Mira Companion

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| MC-01 | As Jordan, I want to set up my workspace by talking to Mira instead of editing config files. | Natural language commands modify `.mira/` config; changes reflected in UI immediately; no manual file editing required. |
| MC-02 | As Alex, I want Mira to alert me when an agent finishes a task or hits an error, without interrupting my flow. | Notifications appear as subtle indicators (not modal popups); clicking expands detail; notification history accessible. |
| MC-03 | As Jordan, I want an onboarding wizard that asks me what I'm building and sets up my workspace automatically. | Wizard completes in under 60 seconds; asks 3–5 questions; produces a functional workspace layout with relevant modules enabled. |
| MC-04 | As Alex, I want Mira to remember context from my session so she can connect dots about what I've been building. | Session context stored in `.mira/memory.yml`; Mira references past actions in conversation; memory is deletable by user. |

#### Planning & Context

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| PC-01 | As Alex, I want to send a Kanban card directly to an agent as a prompt with full context. | "Send to Agent" button on card; card title, description, and attached context injected into agent prompt; card status updates to "In Agent". |
| PC-02 | As Jordan, I want to paste a brain dump and have Mira break it into Kanban cards. | Paste or type free-form text; Mira parses into discrete cards with titles and descriptions; cards appear in "Idea" column. |
| PC-03 | As Alex, I want a build journal that auto-logs what happened during my session. | Journal entries generated automatically with timestamps; includes tasks moved, agents run, files changed; stored in `.mira/journals/`. |
| PC-04 | As Jordan, I want to drop a screenshot and have Mira create a task card from it. | Drag-and-drop or paste screenshot; Mira analyzes image; generates card with title, description, and steps; card lands in Kanban. |

#### Configuration & Portability

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| CP-01 | As Sam, I want my workspace config to live in Git so I can version-control and share it. | All config persisted in `.mira/` directory; auto-commit on save; push to any Git remote; clone restores full workspace. |
| CP-02 | As Sam, I want to install a community workspace config with one command. | `mira install <url>` fetches and applies config; Mira walks through credential setup; workspace functional after install. |
| CP-03 | As Alex, I want to switch between workspace profiles instantly. | Named profiles (Minimal/Balanced/Full Send/Custom) toggle-switch all modules; switch takes under 500ms; no restart required. |
| CP-04 | As Sam, I want to create and publish a Mira skill for other developers to use. | Skill manifest format documented; `mira publish` submits to registry; skill installable by others; hot-reload on install. |

#### MCP & Connections

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| MCP-01 | As Jordan, I want to connect my database by saying "connect my Supabase" instead of editing JSON. | Natural language triggers MCP connection flow; Mira asks only for credentials it can't auto-detect; connection test runs; success confirmation shown. |
| MCP-02 | As Alex, I want to see all my MCP connections and their status at a glance. | Status panel shows all connections as cards; each shows name, status, last ping; one-click reconnect available. |
| MCP-03 | As Alex, I want Mira to auto-detect services in my project and suggest connections. | On project open, Mira scans config files (docker-compose, .env, package.json); surfaces suggestions for detected services; suggestions dismissible. |

#### Pair Mode

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| PM-01 | As Alex, I want to share my live workspace with another developer so we can pair on an agent-assisted build. | Pair Mode activated by Owner; Guest joins via shared link; both see real-time panel and Kanban state. |
| PM-02 | As Alex (Owner), I want to retain sole control over autonomous SI builds and PR approvals during a Pair Mode session. | Guest cannot trigger autonomous builds; Guest cannot merge PRs; Owner's workspace scenes are not modifiable by Guest. |
| PM-03 | As Alex, I want to set a win condition at the start of a Pair Mode session so both of us stay focused. | Win condition entered at session start; visible as shared goal indicator throughout session; outcome logged to both `user_SI.yml` files. |

#### Self-Improvement

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| SI-01 | As Alex, I want to configure how often Mira's autonomous agent runs so improvements happen on my schedule. | Cadence setting accepts daily-to-weekly range; agent triggers without user initiation; cadence persists in `project_SI.yml`. |
| SI-02 | As Alex, I want the autonomous agent to always work on a separate branch so my main branch is never touched. | Agent creates branch matching `mira/si-YYYY-MM-DD-[description]` pattern; no writes to main or any active feature branch; enforced at runtime, not configurable away. |
| SI-03 | As Alex, I want to review what the autonomous agent built before any PR is opened. | Agent presents: branch name, test results, localhost preview; PR creation requires explicit user confirmation; no auto-merge path exists. |
| SI-04 | As Alex, I want to see all past improvement cycles, lessons learned, and what's next in one place. | SI Panel shows three columns: What We Built, What We Learned, What's Next; data reflects `project_SI.yml` in real time. |

---

## The Mira Companion Layer

Mira is not a chatbot. She is a persistent AI companion that lives in the corner of the cockpit. She configures the environment, watches agents, and speaks up only when it matters.

### Behaviors

#### Conversational Everything

- Setting up a new MCP connection: *"Mira, connect my GitHub"*
- She asks only what she cannot figure out herself
- Errors are explained like a teammate would, never like a stack trace

#### Persistent Context Awareness

- Mira remembers what happened in the session: what was built, what broke, what agents ran
- She connects dots: *"You've been on this task 40 minutes and the agent keeps hitting the same error — want me to look at it?"*
- Per-project memory stored in `.mira/memory.yml` — portable, deletable

#### Smart Notifications

- Pings only when agents finish or hit blockers
- Never interrupts a flow state with noise
- Nudges surface as subtle indicators, not popups

#### Vibe Score

- Tracks session energy: time on task, agent error rate, context switches
- Nudges toward breaks or signals when to ship
- Entirely opt-in, data stays local

### Companion Panel

- Slim persistent panel — not full-screen, not intrusive
- Collapses to an avatar/indicator during deep work
- Full conversational interface when expanded

### Personality Configuration

- **Tone:** Professional / Casual / Minimal
- **Verbosity:** Chatty collaborator ↔ Silent co-pilot
- Rename her — she's yours
- Stored in `.mira/companion.yml`

### Onboarding Wizard

- Interview-style: *"What are you building?"* → *"How do you like to work?"* → *"What tools do you already use?"*
- Auto-configures first workspace layout from answers
- Suggests which modules and skills to enable
- Completes in under 60 seconds
- Feels like a conversation, not a form

---

## The Toggle System

Every module, panel type, and UI element in Mira has an on/off switch. Toggles are scoped per workspace, not globally.

### Profiles

- **Minimal** — Terminal panels + Mira companion only
- **Balanced** — Agents + Kanban + Companion + Notifications
- **Full Send** — Everything on; maximum cockpit

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

Skills are Mira's extensibility layer. They are personality extensions that compose naturally into the workflow, not traditional plugins that bolt on awkwardly.

### Core Behaviors

#### Contextual Discovery

- Mira watches the active workspace context and surfaces relevant skills inline
- *"You're scaffolding a FastAPI project — the OpenAPI Spec Viewer skill might be useful"*
- Suggestions are subtle nudges, never popups

#### Zero-Friction Install

- One click from suggestion or marketplace
- Wizard-style setup if needed: 2–3 questions max, conversational tone
- Hot-reload — no restarts, no interruption to flow

#### Skills Teach Mira New Behaviors

- A skill's manifest defines what it adds to panels, agent prompts, CLAUDE.md injections, wizard steps, and keyboard shortcuts
- Installing BMAD skill → Mira's wizard now asks BMAD-specific questions and pre-wires agent roles
- Skills compose: BMAD + TaskMaster + Claude Superpowers auto-wire together

### Skill Creation Framework

Users create skills through conversation with Mira — no code required. The skill creation conversation always opens with: "Tell me about your workflow." Mira listens for friction, gaps, and repetition before suggesting what to build.

Three diagnostic lenses guide every skill creation conversation:
- **Delivery** — ship faster, reduce friction
- **Quality** — catch more issues earlier
- **Blind spots** — see what you're currently missing

Mira ships with a canonical Skill Creation Framework: a well-defined system prompt and structured dialogue that guides any underlying AI model to produce valid, composable, safe Mira skills. Users bring their API keys; Mira provides the quality scaffold. A skill created with any compliant model meets Mira's structural standards.

### Skill Manifest Specification

Every skill declares a manifest defining:

- `cornerstones[]` — which of the five Cornerstones this skill serves
- `panels[]` — panel types added or extended
- `agent_injections[]` — what gets injected into agent context
- `claude_md_additions[]` — CLAUDE.md additions contributed
- `wizard_steps[]` — onboarding wizard questions added
- `keybindings[]` — keyboard shortcuts registered
- `permissions[]` — which Mira primitives the skill accesses (panels, kanban, journal, agent_context, build_journal)
- `composes_with[]` — skills this skill enhances when co-installed
- `conflicts_with[]` — skills that cannot be co-installed

Skills access Mira primitives only through declared permissions. Two skills declaring the same panel type compose via namespace isolation — they do not conflict.

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

MCP servers are not infrastructure to configure. They are connections Mira helps the developer make.

### Principles

- No JSON editing. Ever.
- Minimal credential ask — only what Mira cannot figure out herself
- Secrets stored in system keychain, never in `.mira/` config
- Plain English error messages always

### Connection Flow

1. User says or types: *"Connect my Supabase"*
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

The workspace does not live in Mira. It lives in Git. Mira is the renderer.

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

### Two-Layer Config Model

`.mira/` contains two distinct layers:

**Portable layer** (travels with Git, safe to share):
- Workspace layout and toggle states
- Installed skills and versions
- Methodology configuration
- Themes and command palette bindings
- MCP connection placeholders (no secrets)

**Personal memory layer** (gitignored by default, local-only):
- `~/.mira/user_SI.yml` — developer growth profile
- Session history and build journal entries
- Mira's observations about working patterns
- Opt-in to share: explicit user action required, never automatic

Users share *how they work*, not *what Mira knows about them*.

### Sync Model

- Connect any Git remote on setup (GitHub, GitLab, Gitea, self-hosted)
- Auto-commit on workspace save (debounced, silent)
- Manual commit with message: *"switched to minimal mode for deep work"*
- Personal overrides layer on top of shared team baseline

### Team Workflow

- Shared repo = shared baseline config
- Personal overrides do not clobber teammates' layouts or themes
- Branch settings like code — experiment without committing
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

- Designed as the adjacent workspace to the Build workspace in a Scene pair
- Panels: Log streaming (tail, filter, search), Port health, Process list, Agent run history
- Log streaming supports filter by level, service, keyword
- Agent run history: what did each agent do this session, what commands ran, what files changed

### Deploy Panel

- One-click deploys to Vercel, Railway, Fly.io from inside Mira
- Deploy status and logs shown inline
- Connected via MCP skill per provider

---

## Collaboration

### Pair Mode

- Two developers share a live Mira workspace
- Real-time sync of panel state, agent output, Kanban cards
- Each user maintains their own Mira companion instance
- Opt-in — never on by default

### Pair Mode Ownership Model

Pair Mode has a clear Owner/Guest model:

- **Owner:** Controls `project_SI.yml`, autonomous build schedule, and PR approval. The authoritative human in the loop for all consequential actions.
- **Guest:** Can view SI panel, comment on entries, propose changes to `project_SI.yml`. Cannot trigger autonomous builds, approve PRs, or modify Owner's workspace scenes.

### Multiplayer Cornerstones

Each Cornerstone has a defined multiplayer behavior:

- **Creativity & Ideation:** Shared Spark Canvas — both users contribute simultaneously
- **Project & Delivery Planning:** Shared Kanban with card ownership — cards are assigned, not shared
- **Building:** Co-piloting agent terminals with selective Broadcast — both can send prompts to specified agents
- **Observability:** Shared read-only — both see the same build journal and logs
- **Self-Improvement:** Owner-controlled with Guest visibility — Guest sees SI panel but cannot trigger cycles

### Guest Mira

Each participant in Pair Mode has their own Mira companion instance. The Owner's Mira and Guest's Mira communicate within the shared session — surfacing different perspectives, flagging when they reach different conclusions, co-facilitating planning conversations. Both companions contribute to the session's win condition tracking.

### Session Win Condition

At Pair Mode session start, both developers set an explicit win condition: what does a successful session look like? Mira tracks progress and surfaces it as a shared goal indicator. Session outcome (win condition met or not) feeds into both developers' `~/.mira/user_SI.yml`.

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

## Self-Improvement Cornerstone

### Overview

The Self-Improvement Cornerstone operates at three levels simultaneously: the project, Mira's understanding of the user, and the developer's own growth as a builder.

### Two-Layer Self-Improvement Files

- `~/.mira/user_SI.yml` — Global user profile. Lives at home directory level, outside any project. Contains Mira's persistent model of the developer: strengths, blind spots, growth patterns, working style preferences. Travels across all projects. Never committed to any repo.
- `$project/.mira/project_SI.yml` — Project-specific improvement directives. Contains: improvement cadence, value hypotheses to test, quality thresholds, feature ideas ranked by impact, lessons from past build cycles. Three voices contribute: Mira (session monitoring observations), Agent (autonomous build discoveries), User (manual notes and directional input).

### The Autonomous Build Agent

Every X days (user-configured), Mira spins up an autonomous agent that:

1. Reads `project_SI.yml` and selects a high-value improvement hypothesis
2. Creates a fresh local branch: `mira/si-YYYY-MM-DD-[short-description]`
3. Builds the improvement, runs tests
4. Serves result on localhost
5. Presents to user: what was built, why, test results, value delivered, next steps needed

**Safety model (non-negotiable):**
- Agent writes only to its own branch — never main, never active feature branches
- Agent can open a PR but cannot merge
- No human-in-the-loop bypass exists at any configuration level
- Branch naming convention is part of Mira Core spec, not overridable by skills

### The Consent Conversation

When the autonomous agent presents a build:

1. Explains what was built and why
2. Shows test results
3. Opens localhost preview
4. Asks: "Want me to open a PR?"
5. If no: "Want me to learn from this and try a different approach next cycle?" — answer updates `project_SI.yml`

Every cycle outcome (accepted or rejected) appends a learning entry to `project_SI.yml`.

### The SI Panel

Dedicated Mira panel for the Self-Improvement Cornerstone. Three columns:

- **What We Built** — completed autonomous builds, accepted/rejected PRs with outcomes
- **What We Learned** — lessons appended to `project_SI.yml` from each cycle, attributed by voice (Mira/Agent/User)
- **What's Next** — queued improvement hypotheses ranked by Mira, editable by user

Post-cycle review ritual: after each autonomous build, Mira opens a 2-minute structured review in the SI panel. The retrospective generates the next cycle's brief automatically.

SI Health Score: a panel indicator showing improvement cycle activity, PR acceptance rate, `project_SI.yml` freshness, and next scheduled build.

### Developer Self-Improvement

Mira tracks patterns across sessions and surfaces growth insights in `~/.mira/user_SI.yml`:

- Strongest and weakest Cornerstone usage
- Recurring agent errors and stuck patterns
- Win conditions set and achieved in Pair Mode sessions
- Skill creation frequency and category

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
│  ┌──────────────┐                                               │
│  │ SI Agent     │                                               │
│  │ Runtime      │                                               │
│  └──────────────┘                                               │
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

#### SI Agent Data Flow
```
Scheduled Trigger → SI Agent Runtime → Read project_SI.yml
    → Select hypothesis → Create mira/si-* branch
    → Execute build → Run tests → Serve localhost
    → Present to user → Consent conversation
    → Outcome → Append learning to project_SI.yml
```

### Key Architecture Decisions

1. **Local-first, not cloud-first:** Mira runs on the developer's machine. No account required. No data leaves the machine unless the user configures a Git remote or AI provider.

2. **Process architecture:** Single Node.js server process manages all PTY sessions, MCP connections, and config state. The browser connects via localhost WebSocket.

3. **Plugin isolation:** Skills run in a sandboxed context with a defined API surface. They cannot access the filesystem directly — only through Mira's skill API.

4. **Config as source of truth:** The `.mira/` directory is the canonical state. UI state is derived from config, not the other way around. This ensures Git portability.

5. **Provider-agnostic AI:** The Companion AI layer uses an adapter pattern. Swapping Claude for OpenAI or a local Ollama model requires changing one config value.

6. **SI branch safety:** The SI Agent Runtime enforces branch isolation at the runtime layer, not via configuration. No skill, user setting, or config value can override the `mira/si-*` branch constraint.

---

## Functional Requirements

Functional Requirements follow SMART criteria: Specific, Measurable, Attainable, Relevant, Traceable. Requirements specify behavior; they do not specify implementation.

### Agent Cockpit

| ID | Requirement |
|----|-------------|
| FR-AC-01 | Users can run 8 or more simultaneous agent terminal sessions without performance degradation below the 60fps / 50ms latency targets defined in Non-Functional Requirements. |
| FR-AC-02 | Agent sessions persist through panel rearrangement, resize, and workspace profile switches; no session restarts and no output history loss. |
| FR-AC-03 | Users can broadcast a prompt to all active agent sessions simultaneously or to a user-selected subset; each target agent receives the prompt within 500ms of send. |
| FR-AC-04 | Users can send a prompt to the active agent via keyboard shortcut without leaving current panel focus; focus returns to the originating panel after send. |
| FR-AC-05 | Each agent panel displays real-time status: idle, thinking, running, or error; status updates within 1 second of agent state change. |

### Mira Companion

| ID | Requirement |
|----|-------------|
| FR-MC-01 | Users can configure workspace settings via natural language; changes apply to `.mira/` config within 2 seconds and reflect in the UI without page reload. |
| FR-MC-02 | Agent completion and error notifications appear as non-modal indicators; no notification interrupts active typing. |
| FR-MC-03 | Onboarding wizard completes workspace configuration in under 60 seconds via 3–5 natural language questions; workspace is functional immediately after completion. |
| FR-MC-04 | Session context persists in `.mira/memory.yml`; Mira references prior session actions in subsequent conversations within the same project. |

### Planning & Context

| ID | Requirement |
|----|-------------|
| FR-PC-01 | Users can send a Kanban card to the active agent as context; card status updates to "In Agent" within 1 second of send action. |
| FR-PC-02 | Users can paste free-form text; Mira parses it into discrete Kanban cards within 10 seconds; each card has a title and description. |
| FR-PC-03 | Build journal entries generate automatically with timestamps; entries include tasks moved, agents run, and files changed; entries are stored in `.mira/journals/`. |

### Configuration & Portability

| ID | Requirement |
|----|-------------|
| FR-CP-01 | All workspace configuration persists to `.mira/` directory; full workspace restores from a config clone within 30 seconds. |
| FR-CP-02 | Workspace profile switches (Minimal/Balanced/Full Send/Custom) complete in under 500ms without application restart. |
| FR-CP-03 | Skills install and hot-reload without interrupting active agent sessions; reload completes in under 2 seconds. |

### MCP & Connections

| ID | Requirement |
|----|-------------|
| FR-MCP-01 | Users can initiate MCP server connections via natural language; connection establishes without JSON file editing. |
| FR-MCP-02 | MCP connection panel displays all connected servers with status, last ping, and exposed tools. |
| FR-MCP-03 | Mira scans project files on open and surfaces MCP connection suggestions for detected services within 5 seconds. |

### Self-Improvement

| ID | Requirement |
|----|-------------|
| FR-SI-01 | Users can configure autonomous improvement cadence between daily and weekly intervals; the agent runs on schedule without user initiation. |
| FR-SI-02 | The autonomous agent creates all changes exclusively on branches matching the `mira/si-*` naming pattern; no writes occur to main or any active feature branch under any configuration. |
| FR-SI-03 | The autonomous agent presents build results (branch name, test output, localhost preview) before any PR creation action; merge requires explicit user approval; no auto-merge path exists. |
| FR-SI-04 | The SI panel displays improvement cycle history, lessons learned, and queued hypotheses; data reflects `project_SI.yml` in real time. |
| FR-SI-05 | `~/.mira/user_SI.yml` updates automatically after each session; the file is gitignored and never included in shared `.mira/` bundles or exported configs. |

### Skill System

| ID | Requirement |
|----|-------------|
| FR-SK-01 | Users can create a new Mira skill through a natural language conversation with Mira; no manifest file editing is required during creation. |
| FR-SK-02 | Skill manifest declares cornerstones, panels, permissions, and composition rules; the runtime enforces declared permissions and blocks undeclared access. |
| FR-SK-03 | Two co-installed skills declaring the same panel type compose via namespace isolation without conflict or data loss. |

### Collaboration

| ID | Requirement |
|----|-------------|
| FR-CO-01 | Pair Mode sessions have a designated Owner; only the Owner can trigger autonomous SI builds, approve PRs, and modify workspace scenes. |
| FR-CO-02 | Each Pair Mode participant has an independent Mira companion instance; both companions participate in shared session facilitation. |
| FR-CO-03 | Pair Mode session win condition is set at session start; Mira tracks and surfaces progress toward win condition throughout the session. |

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
- **No telemetry by default:** All usage tracking is opt-in; no data leaves the machine unless explicitly configured
- **PTY isolation:** Each agent terminal runs in its own PTY with standard OS-level process isolation
- **SI branch enforcement:** SI agent branch isolation enforced at the runtime layer; not overridable by user configuration or skills
- **Dependency auditing:** Automated audit in CI pipeline; no known critical vulnerabilities in production dependencies

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
- Companion AI works offline if configured with a local model

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
| Skill Manifest Enforcement | Runtime permission checking, namespace isolation | Skill runtime |
| Skill Marketplace | Browse, install, publish | GitHub registry |
| Cornerstone Skills | BMAD, TaskMaster, Claude Superpowers | Skill runtime |

**Exit criteria:** User can connect MCP servers conversationally, install skills from marketplace, and use BMAD/TaskMaster/Claude Superpowers skills.

### Phase 5: Polish, Community & Self-Improvement (Weeks 21–24)

**Goal:** Git sync, themes, workspace scenes, community features, and Self-Improvement Cornerstone foundation.

| Deliverable | Description | Dependencies |
|-------------|-------------|-------------|
| Git Sync Engine | Auto-commit, push, pull `.mira/` config | Git library |
| Two-Layer Config Model | Portable layer + personal memory layer separation | Config engine, gitignore handling |
| Workspace Scenes | Paired workspaces, hot-swap | Toggle system, layout engine |
| Theme Marketplace | Browse, apply, CSS editor | Styling system |
| Command Palette | Searchable actions, rebindable hotkeys | Action registry |
| Snapshot System | Save/restore full workspace state | Config + session state |
| Community Config Registry | Browse, star, fork shared configs | GitHub-based registry |
| SI Agent Runtime (v1 foundation) | Branch-safe autonomous build agent, consent conversation | Git, config engine, Companion AI |
| SI Panel | Three-column SI view, SI Health Score | SI agent runtime, project_SI.yml |
| user_SI.yml + project_SI.yml | Two-layer SI file model, gitignore enforcement | Config engine |

**Exit criteria:** Full v1 feature set complete. User can sync config via Git, use themes, switch scenes, share configs with the community, and run the first Self-Improvement build cycle.

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
    ├── Skill Runtime + Manifest Enforcement
    ├── Marketplace
    └── Cornerstone Skills
                                 │
Phase 5: Polish & SI  ←─────────┘
    ├── Git Sync + Two-Layer Config
    ├── Themes + Scenes
    ├── Community Registry
    └── SI Foundation (Agent, Panel, Files)
```

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
| SI Agent writing outside its branch | Low | Critical | Branch constraint enforced in SI Agent Runtime, not in config; no config path bypasses the constraint; automated tests verify enforcement |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users perceive Mira as "another IDE" | Medium | High | Clear messaging: "not an IDE, no code editor"; marketing focuses on cockpit/workflow metaphor |
| Onboarding too complex despite wizard | Medium | High | User testing with 5+ target persona matches before launch; iterate on wizard flow; provide "start blank" escape hatch |
| Skill marketplace quality control | Medium | Medium | Verified badge system; community ratings; automated security scanning on submission |
| Dependency on third-party AI providers for companion | High | Medium | Provider-agnostic adapter pattern; local model support from day one; companion degrades gracefully without AI |
| Community adoption too slow for marketplace flywheel | Medium | High | Ship strong cornerstone skills; seed marketplace with 10+ official skills; active community engagement |
| SI autonomous builds causing unwanted changes | Low | High | Branch isolation enforced at runtime; consent conversation required before PR; no auto-merge path |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Open source maintenance burden | High | Medium | Clear contribution guidelines; modular architecture enables community PRs; core team focuses on runtime stability |
| Platform-specific bugs (Windows/Linux/macOS) | High | Medium | CI matrix across all platforms; community testers per platform; prioritize macOS + Linux for v1 |
| Breaking changes in agent CLIs (Claude Code, Codex) | Medium | Medium | Agent integration layer abstracted; version detection; graceful fallback for unknown agent output |

---

## Open Questions

Questions resolved in v0.2 and not carried forward:

- Q1 (tech stack) — **Resolved:** React + TypeScript
- Q2 (PTY implementation) — **Resolved:** WebSocket to local Node.js with node-pty
- Q3 (companion AI) — **Resolved:** Configurable, Claude default, local model option
- Q4 (marketplace hosting) — **Resolved:** GitHub-based registry (JSON index + Git repos)
- Q9 (monetization) — **Resolved:** Open source; not applicable to v1

Open questions carried forward:

| ID | Question | Status |
|----|----------|--------|
| Q5 | **Pair Mode transport:** WebRTC peer-to-peer, or relay server? | Deferred to v1.x — needs further research |
| Q6 | **Session Replay storage:** Local only, or optional cloud backup? | v1: Local only. v1.x: Optional export/share |
| Q7 | **Vibe Score data:** Fully local, or optional anonymous aggregate (opt-in)? | Fully local, no aggregation in v1 |
| Q8 | **Tauri vs Electron:** Should Mira ship as a native desktop app? | v1: Browser-based. v2: Evaluate Tauri wrapper for native feel |
| Q10 | **Accessibility audit timing:** When should formal accessibility testing happen? | Phase 5, before public launch |
| Q11 | **SI Panel Architecture:** Dedicated workspace Scene vs. composable panel that lives inside any Scene. | Needs resolution during UX design phase |
| Q12 | **project_SI.yml initial population:** Who seeds the file for a new project — user manually, Mira after first session retrospective, or agent after first build cycle? All three contribute ongoing, but initial seeding flow needs definition. | Open |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Agent** | A CLI-based AI coding assistant (Claude Code, Codex CLI, etc.) that runs in a terminal |
| **Cockpit** | The central Mira workspace where agent terminals, planning tools, and companion live together |
| **Companion** | Mira's persistent AI assistant that configures the workspace, monitors agents, and provides context-aware help |
| **Cornerstone** | One of five phases of the builder lifecycle that organize Mira's features and skills: Creativity & Ideation, Project & Delivery Planning, Vibe-Code Building, Observability & Reiteration, Self-Improvement |
| **MCP** | Model Context Protocol — an open standard for connecting AI models to external tools and data sources |
| **PTY** | Pseudo-terminal — a virtual terminal interface that allows Mira to embed CLI tools in the browser |
| **Scene** | A pair of named workspaces (e.g., Build + Debug) that share project context but have independent layouts |
| **Self-Improvement (SI)** | The fifth Cornerstone: autonomous improvement cycles for project, Mira, and developer growth |
| **SI Panel** | Dedicated Mira panel for the Self-Improvement Cornerstone showing build history, lessons learned, and next improvement queue |
| **Skill** | A Mira extension that adds behaviors, panel types, agent configurations, or integrations — not a traditional plugin |
| **Skill Manifest** | The declaration file that defines a skill's cornerstones, panels, permissions, injections, and composition rules |
| **Skill Scaffold** | Mira's canonical Skill Creation Framework: the system prompt and dialogue structure that ensures any AI model produces structurally valid Mira skills |
| **Toggle** | An on/off switch for any module, panel, or UI element — scoped per workspace |
| **user_SI.yml** | Global developer growth profile stored at `~/.mira/` — tracks strengths, blind spots, and growth patterns across all projects |
| **project_SI.yml** | Project-specific improvement directive file storing autonomous build guidance, value hypotheses, and cycle learnings |
| **Vibe Coding** | A development style where the developer drives product vision and uses AI agents for implementation |
| **Workspace** | A named configuration of panels, toggles, and settings that represents how a developer works on a project |

---

> *This document is the founding spec for Mira Studio. It is intentionally opinionated about philosophy and flexible about implementation. Build something real.*
