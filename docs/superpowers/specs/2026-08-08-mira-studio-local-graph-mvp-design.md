# Mira Studio Local Graph MVP Design

**Status:** Approved design

**Date:** 2026-08-08

**Product:** Mira Studio

**Initial platform:** macOS only
**Delivery model:** Local application; no Mira SaaS

## Decision Summary

Mira Studio will become a self-contained macOS application for indie developers who use coding agents to build new applications and features in existing repositories. Its primary interaction is **graph engineering**: the developer describes an outcome, completes an adaptive project interview, approves a structured Project Definition, and receives an editable graph whose nodes are real specifications, agent actions, artifacts, checks, approvals, and delivery steps.

The graph is the authoritative execution model. It is not a diagram layered over terminals or a task board. Changing a dependency changes what can run; verification evidence changes what can be accepted; an approval node prevents consequential work until the developer acts.

The implementation will build on the execution foundations in `codex/v1-developer-tool`: project context, durable work items and runs, agent adapters, Git worktree isolation, verification, review, and explicit delivery. It will not rebuild those capabilities or promote the current Spark Canvas into the runtime model.

Mira will orchestrate locally installed and already-authenticated Codex and Claude Code CLIs. It will not provide accounts, hosted persistence, managed inference, direct provider API keys, metering, or billing during validation.

## Product Thesis

An indie developer can prompt-engineer effectively but still spends too much time decomposing work, coordinating sessions, reconstructing context, resolving dependencies, and proving that the combined result is ready. Mira turns those activities into a small, visible, executable delivery graph.

The product promise is:

> Turn product intent into an editable execution graph, run it through local coding agents, and deliver a verified result the developer can inspect and own.

The graph earns its place only when it changes execution or a delivery decision. It must show why a building block is ready or blocked, what an agent may change, which artifact or check supports its state, and what must still become true before delivery.

## Primary User

The initial user is an indie developer building a real SaaS or client product who:

- Already uses Codex, Claude Code, or both.
- Can write effective prompts but finds repeated planning and coordination slow.
- Works alone rather than coordinating real-world teammates.
- Wants to move quickly without surrendering control of their repository.
- Needs visible dependencies, reviewable changes, and evidence that an MVP or feature works.

Enterprise-specific architecture, integration, process, and ITSM guidance may later inform optional workflows, but enterprise ceremony is not part of the indie MVP.

## Goals

The MVP must:

1. Support both new local applications and existing local Git repositories.
2. Turn an outcome into a structured Project Definition through an adaptive interview.
3. Generate an editable, validated, executable feature graph.
4. Run independent graph nodes through installed coding-agent CLIs.
5. Isolate agent changes in Git worktrees.
6. Make node state, terminal output, artifacts, diffs, checks, and approvals visible.
7. Preserve provenance and execution history across retries and restarts.
8. Require explicit developer approval for execution, integration, and delivery.
9. Package as a local macOS application that does not require a system Node.js installation.
10. Keep all project and run data local and user-owned.

## Non-Goals

The MVP will not include:

- Mira user accounts or authentication.
- A hosted control plane or cloud persistence.
- Mira-managed inference, provider API keys, usage metering, or billing.
- Required telemetry or cloud analytics.
- Real-world team collaboration or Pair Mode.
- A community marketplace or remote registry as a primary surface.
- Autonomous self-improvement.
- One-click cloud deployment.
- A file manager or source-code editor.
- Windows, Linux, mobile, or browser-only release targets.
- A knowledge graph or GraphRAG feature without a separate measured need.

## Golden Paths

### New application

1. The developer chooses **New Project** and selects an empty local directory.
2. Mira checks Git and agent prerequisites and offers an explicit Git initialization action if needed.
3. The developer describes the product outcome in plain language.
4. Mira conducts the Project Interview and builds the Project Definition live.
5. The developer confirms the definition, including MVP scope and delivery criteria.
6. Mira generates an editable executable graph.
7. The developer reviews the graph's nodes, edges, agent assignments, commands, scopes, and approval gates.
8. Approval creates an immutable run snapshot.
9. Mira executes ready nodes in isolated worktrees, integrates them through an explicit integration node, and runs verification.
10. The developer reviews the combined diff and evidence before choosing a local delivery action.

### Existing repository

1. The developer selects an existing local repository.
2. Mira performs a read-only inspection of its stack, scripts, architecture signals, Git state, Mira configuration, and available agent CLIs.
3. Mira presents detected facts separately from inferences and asks only about unresolved product or architecture decisions.
4. The developer confirms or corrects the Project Definition.
5. The graph, execution, verification, review, and delivery flow proceeds as above.

### One repository per window

Each Mira project window owns one active repository and one isolated runtime session. Additional repositories open in separate windows. This keeps permissions, process ownership, recovery, and graph state unambiguous.

## Project Interview

The Project Interview is a core Plan-mode capability, not a chat add-on. Its purpose is to reduce the time spent manufacturing a perfect prompt while preserving developer intent.

### Entry modes

- **Quick interview:** Ask only the minimum questions required to generate a useful draft.
- **Guided interview:** Explore product, workflow, architecture, constraints, integrations, and delivery expectations more deeply.
- **Import existing definition:** Ingest a local PRD, README, issue export, or pasted notes, then ask only about gaps or contradictions.

All three paths produce the same structured Project Definition. The developer may skip questions, edit the definition directly, pause and resume, or return to an earlier decision.

### Adaptive behavior

Mira asks one high-value question at a time. The next question is chosen from the current definition, repository facts, missing required fields, contradictions, and the expected effect on the graph. Questions that do not affect scope, architecture, verification, or delivery should not be asked.

For existing repositories, repository inspection precedes the interview. Mira must not ask for information it can reliably detect, and it must not present a repository inference as a confirmed fact.

### Project Definition

The live Project Definition contains:

- Product vision and target user.
- User problem and desired outcome.
- Core workflows.
- MVP features and explicit non-goals.
- Stack choices and architectural constraints.
- External integrations.
- Repository-detected facts.
- Developer-confirmed decisions.
- Mira recommendations.
- Assumptions and unresolved questions.
- Acceptance criteria.
- Delivery criteria.

Every meaningful entry carries a source: `developer`, `repository`, `import`, or `mira`. Mira-authored recommendations and inferences remain visually distinct until confirmed.

The canonical portable artifact is `.mira/project-definition.yml`. Feature-specific interviews extend the project definition for one graph without silently changing project-level decisions.

Changing a confirmed foundational decision marks affected draft graphs as needing regeneration and affected executed graphs as historically valid but based on an older definition version.

## Executable Graph Domain

Each MVP or feature is a versioned directed acyclic graph. A graph contains typed nodes and typed edges; arbitrary shapes and arrows are not executable graph state.

### Node types

| Node | Purpose | Executable behavior |
|---|---|---|
| Goal | Defines the observable outcome | Provides scope and terminal criteria |
| Feature | Groups a collapsible subgraph | Summarizes child readiness and evidence |
| Specification | Defines requirements and constraints | Gates work until required fields are complete |
| Agent action | Delegates bounded implementation work | Launches an installed CLI in an isolated worktree |
| Artifact | Identifies a required output | Captures files, diffs, decisions, or generated deliverables |
| Verification | Proves a condition | Runs deterministic checks and stores evidence |
| Approval | Requires a human decision | Blocks downstream nodes until explicitly resolved |
| Integration | Combines isolated changes | Applies approved outputs into an integration worktree |
| Delivery | Produces the developer-owned result | Creates or updates a local branch or commit after approval |

### Edge types

- `depends_on`: the target cannot become ready before the source succeeds.
- `produces`: the source supplies an artifact consumed by the target.
- `verifies`: the target evaluates the source's declared outcome.
- `requires_approval`: the target is gated by a human decision.
- `integrates`: the target incorporates the source's isolated changes.

Edges may carry finite readiness conditions and a declared failure fallback. Mira rejects cycles, unknown nodes, missing required inputs, ambiguous integration routes, and delivery paths without approval.

### Node contract

Each executable node declares:

- Stable identifier, type, title, and observable outcome.
- Inputs and upstream dependencies.
- Allowed repository scope.
- Assigned agent adapter or deterministic runner.
- Structured command and arguments where applicable.
- Expected artifacts.
- Required verification.
- Retry and timeout policy.
- Approval policy.
- Terminal success, failure, and cancellation states.

### State model

The canonical node states are:

`draft`, `invalid`, `ready`, `waiting`, `waiting_approval`, `running`, `blocked`, `failed`, `succeeded`, `cancelled`, `interrupted`, and `stale`.

The runtime, not the model, owns state transitions. An agent's statement that work is complete cannot transition a node to `succeeded` without the declared exit and evidence policy.

### Versioning

The editable graph is a draft. Approving execution creates an immutable graph snapshot tied to the run and Project Definition version. Editing during a run creates a new draft; it does not rewrite the active snapshot.

Retrying creates a new attempt with its own events and evidence. It never overwrites a prior attempt. Revising a completed upstream node marks affected downstream results `stale` until they are rerun or explicitly accepted through a recorded developer decision.

## Graph Execution

### Planning

The selected installed agent CLI may propose a graph in a strict schema. Deterministic validation owns identifiers, node and edge types, cycles, required fields, path policy, command shape, and delivery gates. Invalid model output is repaired through bounded retries or presented for manual editing; it is never executed directly.

### Scheduling

The scheduler computes readiness from the approved snapshot and event log. It may run independent nodes concurrently only when their declared scopes and worktrees are isolated. Agent count is not a success metric; a linear graph remains linear when parallel execution adds risk without value.

### Agent execution

Each agent action launches Codex or Claude Code through a provider-neutral adapter with:

- A validated executable and argument array.
- The node's worktree as its working directory.
- Bounded instructions derived from the Project Definition, graph snapshot, and upstream artifacts.
- No access to another node's terminal stream or runtime token.
- Explicit cancellation and process-tree cleanup.

Mira records the adapter, executable path, CLI version, process identity, timing, exit status, changed files, diff identity, and produced artifacts. It does not claim to know provider-side model details the CLI does not expose.

### Integration

Parallel agent outputs converge through an explicit integration node in an integration worktree. Integration detects conflicting files and failed prerequisites before applying changes. A conflict becomes visible graph state and requires bounded resolution; it never spills into the developer's active working tree.

### Verification

Verification nodes run explicit repository checks such as tests, lint, type checks, builds, or artifact inspections. Commands and working directories are visible before approval. Evidence includes command identity, exit status, timestamps, relevant output, and the diff or commit it verifies.

### Delivery

Delivery is always developer-approved. The MVP supports:

- Leaving the result as a reviewable local integration branch.
- Creating an approved local commit.
- Explicitly applying or merging the reviewed result when the target working tree is safe.

Pushes, pull requests, deployments, destructive resets, and automatic merges are not performed by the MVP.

## Local macOS Architecture

Mira uses a hybrid desktop architecture:

```text
Tauri macOS host
  -> React WebView
  -> one bundled local runtime per project window
       -> graph engine and scheduler
       -> durable run/event stores
       -> PTY and CLI adapters
       -> Git worktrees and verification
       -> selected repository and .mira state
```

### Tauri host

The Tauri process owns:

- Native project and file selection.
- Window-to-project identity.
- Sidecar startup, health monitoring, and shutdown.
- Per-launch runtime credentials.
- Application lifecycle and packaged resources.
- macOS bundle, signing, and eventual notarization configuration.

### React interface

The React application owns:

- Project Interview presentation.
- Project Definition editing and source labels.
- Graph layout, editing, selection, and validation presentation.
- Run, terminal, artifact, diff, check, and approval presentation.
- Review and local delivery interactions.

It does not spawn processes, access arbitrary files, manipulate Git, or communicate directly with model providers.

### Bundled local runtime

The existing TypeScript/Fastify runtime becomes an application-owned sidecar. Production packaging must include its JavaScript runtime and native modules so the installed app does not depend on a system `node` executable or the source checkout.

The runtime preserves the existing internal transport division:

- REST for request-response operations.
- WebSocket for PTY and live run events where bidirectional interaction is required.
- SSE for one-way streamed planning or companion output where appropriate.

No additional real-time transport is introduced without a demonstrated need.

### Session isolation

Each project window gets:

- One canonical project root.
- One supervised runtime process.
- One ephemeral loopback port.
- One high-entropy per-launch capability token.
- An independent PTY and run namespace.

The runtime binds only to `127.0.0.1`. REST, WebSocket, and SSE connections require the capability token and validate their origin. The token is transferred through the Tauri-owned bootstrap boundary, is not written to project files, and is never logged.

## Data Model and Persistence

### Portable project state

Portable state is user-owned, schema-versioned, and suitable for Git when the developer chooses:

```text
.mira/
  project-definition.yml
  graphs/
    <graph-id>.yml
  workspaces/
  config.yml
```

Portable files contain no secrets, machine paths that are not explicitly marked local, terminal logs, provider credentials, or ephemeral run state.

### Local project runtime state

Machine-specific project state is ignored by Git:

```text
.mira/local/
  runs/<run-id>/
    graph.yml
    project-definition.yml
    events.jsonl
    attempts/
    artifacts/
    worktrees.yml
  cache/
```

The run's graph and Project Definition files are immutable snapshots. `events.jsonl` is append-only and sequence-numbered. Derived summaries may be rebuilt from it.

### Personal application state

`~/Library/Application Support/Mira Studio/` stores recent project references, window preferences, and other personal application settings. It does not store provider credentials. Installed CLI authentication remains owned by each CLI.

### Persistence guarantees

- Writes use validation and atomic replacement where appropriate.
- Event append and state projection are serialized per run.
- Unknown portable fields are preserved when practical.
- Corrupt files produce a recoverable error and retain the original bytes.
- Schema changes require explicit migrations and round-trip tests.
- Runtime state never auto-commits itself to the user's repository.

## User Experience

### Application shell

The macOS project window contains:

- A title bar showing project, branch, local status, and run health.
- A left rail for graphs and recent runs.
- A central executable feature graph.
- A right inspector for the selected node.
- A bottom evidence drawer for terminal, diff, checks, and events.

### Modes

- **Plan:** interview, define, generate, edit, validate, and approve.
- **Run:** observe execution, inspect evidence, intervene, retry, or cancel.
- **Review:** inspect the integrated diff and verification evidence, then choose a local delivery action.

### Graph presentation

Feature nodes are collapsible building blocks. Collapsing shows their outcome, aggregate status, blocked reason, owner, and verification state. Expanding reveals the implementation subgraph.

Selecting any node exposes its inputs, instructions, assigned adapter, allowed scope, terminal, artifacts, diff, checks, attempts, decisions, and controls. Status is represented through text and shape as well as color. The graph's core navigation and actions must be keyboard accessible.

### Product focus

Pair Mode, marketplace, autonomous SI, deployment, and disconnected generic dashboards are absent from MVP navigation and command registration. Useful code may remain temporarily while migration is underway, but the release presents one coherent graph-to-delivery workflow.

## Failure and Recovery

- Missing Git or supported CLIs produces specific setup guidance.
- A dirty repository is never modified as a side effect of starting work.
- Closing a project terminates its runtime and descendant PTYs.
- A crash reconstructs run state from the immutable snapshots and append-only event log.
- A node active at the last durable event returns as `interrupted`, never `succeeded`.
- Failed nodes retain terminal output, artifacts, and partial diffs.
- Retrying creates a new attempt and reuses only explicitly valid upstream artifacts.
- Orphaned PTYs and worktrees are detected and offered for safe, scoped cleanup.
- An integration failure leaves the developer's active branch unchanged.
- Recovery never assumes an external command succeeded merely because its process disappeared.

## Security and Consent

Mira follows least privilege at the project and node levels:

- Project paths come from a native user selection and are canonicalized before use.
- Runtime filesystem access is confined to the selected repository, Mira-owned worktrees, application state, and explicit user-selected import paths.
- Client-provided paths, identifiers, graph documents, and commands are validated at the runtime boundary.
- Executables and arguments are passed as structured arrays; untrusted values are not interpolated into shell commands.
- Agent environments exclude the runtime capability token and avoid broad secret forwarding.
- Terminal output, tokens, authorization headers, and environment variables are not logged indiscriminately.
- One project session cannot observe or control another project's PTYs or runs.
- Execution, integration, and delivery have separate recorded approval boundaries.
- Destructive Git operations, force pushes, history rewrites, and unapproved writes to the active branch are prohibited.

## Existing-Code Reuse and Migration

The implementation should continue the `codex/v1-developer-tool` branch rather than retrofit the broad prototype or start over.

Reuse:

- Project context and unified local transport.
- Agent adapter registry.
- Durable run/event storage and recovery foundations.
- Work-item linkage.
- Git workspace isolation.
- Verification service.
- Run navigation, review surfaces, and diff handling.

Replace or reshape:

- Replace Spark Canvas persistence with a validated graph domain; do not treat arbitrary canvas elements as graph state.
- Make graph nodes the owner of agent runs rather than maintaining parallel terminal, Kanban, and graph state.
- Fold useful Kanban concepts into graph list and feature summaries instead of retaining a second workflow authority.
- Package and secure the runtime sidecar instead of assuming an external development server or system Node.js.
- Hide deferred prototype modules from the product shell.

The migration must preserve useful tests and user-authored `.mira/` data. Any incompatible portable schema change requires a documented migration and backup behavior.

## MVP Scope

The MVP includes:

- macOS Tauri packaging.
- Native recent-project, new-project, and open-project flows.
- One repository per project window.
- Prerequisite diagnostics for Git, Codex, and Claude Code.
- Read-only repository inspection.
- Quick, guided, and import-based Project Interviews.
- Editable, sourced Project Definition.
- Prompt-to-graph generation and deterministic validation.
- Typed, collapsible feature graphs.
- Dependency-aware local execution.
- Codex and Claude Code adapters.
- Isolated worktrees and explicit integration.
- Live node state, terminals, events, artifacts, diffs, and checks.
- Pause, cancellation, retry, and restart recovery.
- Human approval gates.
- Review and explicit local delivery.
- Durable local run history.

## Release Gates

The MVP is not complete until all of the following are demonstrated:

### Packaging

- A packaged macOS application installs and launches on a clean test account.
- The production application does not require system Node.js or a source checkout.
- The bundled runtime starts, authenticates the WebView session, and shuts down with the window.
- Packaged native modules and CLI discovery work from the application bundle.

### Golden paths

- A developer can create a new project, complete the interview, approve a graph, execute it, verify it, and produce a reviewable local result.
- A developer can open an existing repository and complete the same flow without modifying pre-existing uncommitted work.
- Both Codex and Claude Code paths work when each CLI is already authenticated.

### Correctness and recovery

- Unit tests cover graph schema validation, cycle detection, readiness, invalidation, retries, approvals, and scheduling.
- Integration tests use temporary Git repositories and deterministic fake-agent adapters.
- Parallel nodes stay isolated and converge only through integration.
- Killing the runtime during planning, execution, verification, and integration restores truthful state.
- Failed and cancelled work leaves inspectable evidence and no orphan processes.

### Security

- Capability-token, origin-validation, path-traversal, command-injection, cross-project isolation, and secret-redaction tests pass.
- No runtime token or CLI credential is persisted or logged.
- No test or product flow stages unrelated repository changes.

### Product quality

- The complete interview-to-reviewed-delivery workflow passes packaged-app end-to-end testing.
- Status and graph meaning do not depend on color alone.
- Core graph selection, navigation, inspection, and approval are keyboard accessible.
- Runtime errors are visible and actionable; the UI does not report success when checks or communication fail.

## Local Validation Signals

Mira will not require telemetry. During product validation, the developer may explicitly export a local run summary containing no source code or credentials. Useful signals are:

- Time from goal entry to an approved graph.
- Number of interview questions answered, skipped, or corrected.
- Time from graph approval to reviewed delivery.
- Nodes retried, cancelled, or manually revised.
- Stale results caused by upstream changes.
- Verification failures caught before delivery.
- Whether graph state changed the next action or ship decision.

These signals inform customer interviews; they do not substitute for them.

## Acceptance Statement

The design succeeds when a solo developer can open or create a local repository on macOS, explain the intended MVP through an adaptive interview, approve a small executable feature graph, direct installed coding agents through isolated work, understand why every building block is ready or blocked, inspect the combined evidence, and explicitly produce a safe local result—without creating a Mira account or relying on a Mira-hosted service.
