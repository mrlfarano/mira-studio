# Mira Studio v1.0 — Ship Design

**Date:** 2026-05-15
**Status:** Approved
**Owner:** @mrluisarano

## 1. Goal

Ship a usable v1.0 of Mira Studio as an `npx`-installable CLI that provides real, novel value on day one to solo developers using Claude Code.

## 2. Value Proposition

Mira Studio is the only local-first cockpit where a solo dev can brain-dump → structure into Kanban → hand to Claude Code → watch it build → and have it all auto-captured to a Git-backed journal, with a companion that adapts the workspace as you go. No JSON editing. No IDE. No cloud.

The differentiator: terminal + kanban + journal + companion fused into a single workflow where dropping a card on an agent is one drag.

## 3. Distribution

- **Channel:** npm, installable via `npx mira-studio`
- **Entry point:** `bin/mira` — boots Fastify server on a free port, opens the user's default browser to `http://localhost:<port>`
- **Bundle:** frontend `dist/` + server `dist/` published as one npm package
- **Native deps:** `node-pty` ships with prebuilds (`@homebridge/node-pty-prebuilt-multiarch` or equivalent) so install never compiles
- **Secrets:** API keys collected during onboarding, persisted in OS keychain via `keytar`. Never written to `.mira/`.
- **Platforms (v1.0):** macOS + Linux. Windows deferred (node-pty fragility).

## 4. MVP Scope

### 4.1 Ship-blocker features (must work end-to-end)

1. **Panel layout engine** — drag, drop, resize, save layout to `.mira/workspaces/`
2. **Embedded PTY terminals** — Claude Code + Codex sessions, multi-terminal management
3. **Kanban board** — brain-dump input → AI-parsed card preview → 4-column board (Idea/Specced/In Agent/Done) → Send-to-Agent with context bundling
4. **`.mira/` config layer** — YAML read/write, file watcher, debounced Git auto-commit
5. **Mira companion chat** — streaming chat, Claude API primary + Ollama no-key fallback (both adapters already exist), context assembly from session + `.mira/memory.yml`
6. **Onboarding wizard** — <60s conversational flow, sets Minimal/Balanced/Full Send profile, optional API key collection to keychain
7. **Build Journal** — auto-captures session activity, daily summaries

### 4.2 Ships-if-works (feature-flag off otherwise)

- Skill system (install/hot-reload/marketplace)
- MCP connection wizard
- Workspace Scenes (Ctrl+Tab swap)
- Command palette (Cmd+K)
- Theme marketplace + CSS editor
- Snapshot system
- SI Panel (read-only view only)

### 4.3 Explicitly out of v1.0

- **SI autonomous build agent** — deferred per PRD
- Agent Broadcast, Spark Canvas, Project Map, Session Replay, Vibe Score
- One-click local env bootstrap, Observability workspace, Deploy Panel, Pair Mode
- Community registry
- Tauri desktop packaging — targeted for v1.1
- Windows support

## 5. Canonical User Journey (the demo)

```text
$ npx mira-studio
  → wizard (60s): profiles dev, captures style + project type
  → workspace opens with default Balanced layout
  → user types into brain-dump:
       "fix the login redirect bug, also clean up the auth
        middleware, and we should probably add 2FA someday"
  → AI parses into 3 Kanban cards; user reviews, keeps 2
  → user drags "fix login redirect bug" → "In Agent"
  → Send-to-Agent bundles context, fires into Claude Code PTY
  → Claude Code works, stdout streams to terminal panel
  → Build Journal entry auto-created
  → Mira companion: "Looks like the login bug is fixed —
     want me to mark that card done?"
  → user confirms → card moves to Done → .mira/ auto-commits
```

Every step is a validation target. The journey end-to-end is the v1.0 ship gate.

## 6. Validation Plan

Three-layer audit, executed via parallel agents.

### Layer 1 — Static audit

For each feature claimed in CHANGELOG v0.0.2, confirm a real implementation file exists (not a stub or placeholder). Cross-reference the v1 task list against `src/` and `server/src/`.

### Layer 2 — Wired-up audit

For each cornerstone feature, trace the complete data flow:
UI event → Zustand store → REST/WebSocket → server module → store mutation → UI render.

Flag any broken wires, missing handlers, or no-op handlers.

### Layer 3 — Live-run audit

Boot the app locally and walk the canonical journey end-to-end. Use the `ui-audit` skill for cornerstone feature shake-out. Anything outside cornerstones: log issue, ignore if it doesn't crash the app.

### Output

Prioritized punch list keyed by severity (see §7).

## 7. Bug Bar & Ship Criteria

| Severity | Definition | v1.0 action |
|----------|------------|-------------|
| P0 | Canonical journey blocked | Must fix |
| P1 | Cornerstone feature broken in non-golden path | Must fix |
| P2 | Non-cornerstone feature broken | Feature-flag off, document |
| P3 | Polish, edge case | Defer to v1.1 |

**Ship gate:**
- Zero open P0 or P1
- Canonical journey completes clean on fresh checkout
- `npx mira-studio` works on a fresh macOS box (verified)
- README updated, CHANGELOG.md updated, `v1.0.0` git tag created

## 8. Execution Plan

| Step | Skill / tool | Output |
|------|--------------|--------|
| 1. Design (this doc) | `superpowers:brainstorming` | This file |
| 2. Validate v1 | `superpowers:dispatching-parallel-agents` (3 layers) | Prioritized punch list |
| 3. Plan fixes + packaging | `superpowers:writing-plans` | Ordered implementation plan |
| 4. Execute | `superpowers:subagent-driven-development` | Code changes |
| 5. Test & ship | `playwright-skill` + manual smoke | E2E pass, v1.0.0 tag |

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `node-pty` install fails on user machines | Ship prebuilds; verify on fresh macOS + Linux boxes before tagging |
| Claimed v1 features are stubs, not real | Static audit (Layer 1) catches this before fix work begins |
| Canonical journey has multi-component coupling issues | Layer 3 live-run is the integration test before we touch unit details |
| `mira-studio` name is taken on npm | Check during validation; fallback options: `@mrluisarano/mira-studio`, `miracockpit` |
| Native dep variance across macOS arch (x64 vs arm64) | Use multi-arch prebuilt package; CI matrix on both |
| API key handling leaks to `.mira/` | Audit `.mira/` writers for any path that touches keychain values; gitignore check |

## 10. Out of Scope (this spec)

- Marketing site, landing page, documentation site
- Public launch / Show HN / outreach
- v1.1 roadmap (separate spec)
- Pricing, license model
