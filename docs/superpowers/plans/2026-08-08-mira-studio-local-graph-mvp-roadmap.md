# Mira Studio Local Graph MVP Execution Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved local macOS Mira Studio MVP as four reviewable stages that culminate in an interview-to-verified-delivery packaged application.

**Architecture:** Start from the clean `codex/v1-developer-tool` worktree foundation and cherry-pick approved design commit `0c5fb96`. Build the secure packaged runtime first, then the Project Interview/Definition, then the authoritative graph runtime, and finally the graph-first Plan/Run/Review interface. Every stage must pass its own exit criteria before the next begins.

**Tech Stack:** Tauri 2, Rust 2021, React 19, TypeScript 5.9, Vite 8, Zustand 5, Fastify 5, `node-pty`, `simple-git`, `js-yaml`, Vitest 4, Testing Library, Playwright 1.58, macOS application bundles.

## Global Constraints

- Use `superpowers:using-git-worktrees` before execution and create `feat/local-graph-mvp` from `codex/v1-developer-tool`.
- Cherry-pick `0c5fb96` into the execution branch before product work.
- Do not work on `main` or the dirty `chore/builder-os-skills` checkout.
- Obtain explicit dependency approval before adding `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, or `tauri-plugin-dialog`.
- Do not introduce a graph-canvas or schema-validation production dependency.
- Preserve local-first, macOS-only, one-repository-per-window, installed-CLI-only boundaries.
- No account, hosted backend, direct provider API, managed inference, metering, billing, required telemetry, push, PR, deployment, Windows, or Linux work.
- Use TDD, focused commits, reviewer gates, and the exact verification commands in each stage plan.

## Stage Plans

| Stage | Plan | Independently testable outcome |
|---:|---|---|
| 1 | `docs/superpowers/plans/2026-08-08-mira-studio-desktop-foundation.md` | Self-contained macOS app with a supervised authenticated loopback runtime and no system Node dependency |
| 2 | `docs/superpowers/plans/2026-08-08-mira-studio-project-interview.md` | New/existing projects produce a sourced, portable Project Definition through an adaptive local-CLI interview |
| 3 | `docs/superpowers/plans/2026-08-08-mira-studio-executable-graph.md` | Approved graphs deterministically run isolated agents, verify, integrate, recover, and produce an approved local result |
| 4 | `docs/superpowers/plans/2026-08-08-mira-studio-graph-experience.md` | Focused Plan/Run/Review UI and packaged new/existing-project golden paths |

---

### Task 1: Establish the Isolated Execution Branch

**Files:**
- Consume: `docs/superpowers/specs/2026-08-08-mira-studio-local-graph-mvp-design.md`
- Consume: all four stage plans above
- Modify: no product files during branch setup

**Interfaces:**
- Produces: isolated `feat/local-graph-mvp` worktree based on `codex/v1-developer-tool` with design commit `0c5fb96` applied.

- [ ] **Step 1: Invoke the required worktree skill**

Use `superpowers:using-git-worktrees` to select a safe path, verify ignore behavior, and create `feat/local-graph-mvp` from `codex/v1-developer-tool`.

- [ ] **Step 2: Confirm the source worktree is clean and current**

Run: `git status --short --branch && git log -5 --oneline --decorate`

Expected: clean `feat/local-graph-mvp` based on commit `69cba1b` or a reviewed successor of `codex/v1-developer-tool`.

- [ ] **Step 3: Apply the approved design commit**

Run: `git cherry-pick 0c5fb96`

Expected: the approved design specification is present and no unrelated BuilderOS branch changes are introduced.

- [ ] **Step 4: Run the inherited baseline gate**

Run: `npm install --legacy-peer-deps && npm --prefix server install && npm run check`

Expected: exit 0. If the baseline fails, use `superpowers:systematic-debugging` and repair the baseline in a separate focused commit before Stage 1.

### Task 2: Execute and Review Stage 1

**Files:**
- Consume: `docs/superpowers/plans/2026-08-08-mira-studio-desktop-foundation.md`

**Interfaces:**
- Produces: secure self-contained desktop foundation required by every later stage.

- [ ] **Step 1: Execute every Stage 1 task in order**

Use the selected execution skill and stop at each task's focused test and commit.

- [ ] **Step 2: Run Stage 1 exit criteria**

Run the exact aggregate, Cargo, staging, desktop-build, and bundle-verification commands listed in the plan.

- [ ] **Step 3: Invoke `superpowers:requesting-code-review`**

Review runtime lifecycle, token/origin enforcement, capability scope, child cleanup, generated-resource boundaries, and no-system-Node evidence. Resolve findings before Stage 2.

### Task 3: Execute and Review Stage 2

**Files:**
- Consume: `docs/superpowers/plans/2026-08-08-mira-studio-project-interview.md`

**Interfaces:**
- Consumes: Stage 1 runtime descriptor and authenticated transport.
- Produces: confirmed Project Definition required by graph planning.

- [ ] **Step 1: Execute every Stage 2 task in order**

Use deterministic fake structured agents for all automated tests; no live inference belongs in CI.

- [ ] **Step 2: Run Stage 2 exit criteria**

Run the exact server, frontend, accessibility, and interview E2E commands listed in the plan.

- [ ] **Step 3: Invoke `superpowers:requesting-code-review`**

Review source labeling, repository read bounds, YAML concurrency/corruption behavior, CLI permissions, output validation, revision conflicts, and interview UI truthfulness. Resolve findings before Stage 3.

### Task 4: Execute and Review Stage 3

**Files:**
- Consume: `docs/superpowers/plans/2026-08-08-mira-studio-executable-graph.md`

**Interfaces:**
- Consumes: Stage 2 Project Definition and structured-agent service.
- Produces: authoritative graph, graph-run, integration, verification, approval, and delivery APIs.

- [ ] **Step 1: Execute every Stage 3 task in order**

Use temporary Git repositories and fake adapters; preserve attempt artifacts and event logs in every failure test.

- [ ] **Step 2: Run Stage 3 exit criteria**

Run all graph, scheduler, run, PTY, worktree, verification, integration, recovery, route, and aggregate server tests listed in the plan.

- [ ] **Step 3: Invoke `superpowers:requesting-code-review`**

Review graph validation completeness, state transitions, concurrency serialization, scope isolation, worktree registration, retry provenance, stale evidence, approval replay, integration conflict behavior, and active-checkout safety. Resolve findings before Stage 4.

### Task 5: Execute and Review Stage 4

**Files:**
- Consume: `docs/superpowers/plans/2026-08-08-mira-studio-graph-experience.md`

**Interfaces:**
- Consumes: all prior runtime and API contracts.
- Produces: the complete local macOS MVP experience.

- [ ] **Step 1: Execute every Stage 4 task in order**

Keep the graph state server-authoritative and preserve keyboard/accessibility behavior in every UI task.

- [ ] **Step 2: Run the complete release gate**

Run: `npm run check:full`

Run: `cd src-tauri && cargo fmt --check && cargo test && cargo clippy -- -D warnings`

Run: `npm run desktop:build`

Run: `npm run desktop:verify -- "src-tauri/target/release/bundle/macos/Mira Studio.app"`

Run: `npm run desktop:golden-path`

Expected: all automated checks pass; packaged macOS UI controls are driven through the test-only embedded WebDriver, and the normal release bundle contains no WebDriver plugins.

- [ ] **Step 3: Invoke `superpowers:requesting-code-review` and `superpowers:verification-before-completion`**

Review the complete story from project selection through local delivery, then independently verify every completion claim with fresh command output.

### Task 6: Prepare the Branch for User Integration

**Files:**
- Modify: only files required by final review findings

**Interfaces:**
- Produces: reviewed `feat/local-graph-mvp` branch with clean status and release evidence.

- [ ] **Step 1: Review the complete diff and commit history**

Run: `git status --short && git diff --check && git log --oneline --decorate codex/v1-developer-tool..HEAD`

Expected: clean worktree, no whitespace errors, focused Conventional Commits, and no unrelated files or secrets.

- [ ] **Step 2: Scan tracked changes for secrets and generated runtime state**

Run: `git diff --name-only codex/v1-developer-tool..HEAD`

Inspect every `.env`, token, key, database, `.mira/local`, staged sidecar, native module, log, screenshot, and test-result candidate. Generated runtime resources must remain ignored.

- [ ] **Step 3: Use `superpowers:finishing-a-development-branch`**

Present merge/PR/retention options only after every test and review gate is current. Do not merge, push, or publish without the user's explicit instruction at that point.

## MVP Completion Boundary

The roadmap is complete only when a packaged macOS app can open or create a local repository, conduct the Project Interview, persist the approved Project Definition, generate and edit an executable feature graph, run installed Codex/Claude CLIs in isolated worktrees, display live evidence for every feature building block, recover truthfully from interruption, integrate and verify the result, and create an explicitly approved local branch/commit without a Mira account, hosted backend, managed inference, system Node dependency, or unapproved external write.
