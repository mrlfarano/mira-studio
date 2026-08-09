# Mira Studio Executable Graph Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a typed, versioned feature graph the authoritative owner of local agent execution, verification, integration, approvals, and delivery.

**Architecture:** Add a validated graph domain and portable YAML store above the v1 run infrastructure. An approved graph produces an immutable graph-run snapshot; a deterministic scheduler launches existing `RunOrchestrator` instances per agent node, records append-only graph events, and computes readiness from evidence rather than agent claims. Parallel node worktrees converge only through an explicit integration worktree, and delivery remains local and approval-gated.

**Tech Stack:** TypeScript 5.9, Fastify 5, `js-yaml`, `simple-git`, `node-pty`, React-shared types, Vitest 4, temporary Git repositories, deterministic fake-agent adapters.

## Global Constraints

- Complete the secure desktop foundation and Project Interview plans first.
- The graph is the authoritative execution model; Kanban, terminal, and review surfaces must project graph state.
- Graphs are directed and acyclic; reject invalid or ambiguous execution paths.
- Deterministic code owns validation, readiness, state transitions, retries, cancellation, approval, and delivery.
- Agent actions always use worktree isolation in graph execution.
- Register a created worktree with `PtyManager` before spawning its agent process.
- Retrying creates a new attempt and never overwrites prior evidence.
- Upstream revision marks affected downstream evidence stale.
- Push, PR, deployment, automatic merge, hard reset, and history rewriting are out of scope.
- Do not add a graph or schema production dependency; use focused local types and validators.
- Preserve legacy v1 run history through an explicit migration to `.mira/local/runs`.

## File Ownership Map

| Boundary | Files | Responsibility |
|---|---|---|
| Graph contract | `server/src/graph/types.ts`, `validation.ts`, `state-machine.ts` | Node/edge schemas, validation, and legal state changes |
| Portable graphs | `server/src/graph/graph-store.ts` | Draft YAML, revisions, atomic mutation, and definition linkage |
| Graph runs | `server/src/graph-run/store.ts`, `types.ts` | Immutable snapshots, attempts, append-only events, and recovery |
| Planning | `server/src/graph/graph-planner.ts` | Structured agent proposal and deterministic repair boundary |
| Scheduling | `server/src/graph-run/scheduler.ts` | Readiness, parallelism, staleness, and bounded dispatch |
| Execution | `server/src/graph-run/orchestrator.ts` | Bridge graph nodes to v1 runs, PTYs, worktrees, and checks |
| Integration/delivery | `server/src/graph-run/integration-service.ts`, `delivery-service.ts` | Safe convergence and local result creation |
| HTTP/events | `server/src/graph/index.ts`, `server/src/graph-run/index.ts` | Validated graph and graph-run APIs plus replayable WebSocket events |

---

### Task 1: Define the Typed Graph Contract and State Machine

**Files:**
- Create: `server/src/graph/types.ts`
- Create: `server/src/graph/validation.ts`
- Create: `server/src/graph/validation.test.ts`
- Create: `server/src/graph/state-machine.ts`
- Create: `server/src/graph/state-machine.test.ts`
- Create: `src/types/graph.ts`

**Interfaces:**
- Produces: `FeatureGraph`, `GraphNode`, `GraphEdge`, `GraphNodeType`, `GraphEdgeType`, `GraphNodeState`, and node-specific contracts.
- Produces: `validateFeatureGraph(value: unknown): FeatureGraph`.
- Produces: `topologicalOrder(graph): string[]` and `downstreamNodeIds(graph, nodeId): Set<string>`.
- Produces: `transitionNode(current, event): GraphNodeState`.

- [ ] **Step 1: Write failing graph validation tests**

```ts
it('rejects a cycle with the exact participating node ids', () => {
  const graph = graphWithEdges([depends('a', 'b'), depends('b', 'a')])
  expect(() => validateFeatureGraph(graph)).toThrow('Cycle detected: a -> b -> a')
})

it('rejects delivery without an upstream approval', () => {
  const graph = graphWithNodes([deliveryNode('ship')])
  expect(() => validateFeatureGraph(graph)).toThrow(
    'Delivery node ship requires an approval path',
  )
})

it('rejects an agent node without bounded scope and evidence', () => {
  expect(() => validateFeatureGraph(graphWithNodes([agentNode({ scope: [] })])))
    .toThrow('Agent action scope must not be empty')
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm --prefix server test -- graph/validation.test.ts graph/state-machine.test.ts`

Expected: FAIL because the graph domain does not exist.

- [ ] **Step 3: Implement discriminated node and edge types**

```ts
export type GraphNodeType =
  | 'goal' | 'feature' | 'specification' | 'agent-action'
  | 'artifact' | 'verification' | 'approval' | 'integration' | 'delivery'

export type GraphEdgeType =
  | 'depends_on' | 'produces' | 'verifies' | 'requires_approval' | 'integrates'

export type GraphNodeState =
  | 'draft' | 'invalid' | 'ready' | 'waiting' | 'waiting_approval'
  | 'running' | 'blocked' | 'failed' | 'succeeded' | 'cancelled'
  | 'interrupted' | 'stale'

export interface FeatureGraph {
  schemaVersion: 1
  id: string
  revision: number
  projectDefinitionRevision: number
  title: string
  outcome: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  createdAt: string
  updatedAt: string
}
```

Agent nodes declare `adapterId`, `instructions`, `allowedScope`, `expectedArtifacts`, `verificationNodeIds`, `timeoutMs`, and `retryPolicy`. Verification nodes declare a known `commandId`. Approval, integration, and delivery nodes carry explicit policy fields rather than arbitrary prompts.

- [ ] **Step 4: Implement whole-graph validation and legal transitions**

Validate safe IDs, unique IDs, edge references, edge-type compatibility, cycles, reachability from a goal, finite readiness conditions, approval paths, integration of parallel agent branches, known node types, size limits, and delivery terminality. State transitions must use an explicit lookup table and reject terminal-to-running transitions.

- [ ] **Step 5: Mirror public graph types and run checks**

Run: `npm --prefix server test -- graph/validation.test.ts graph/state-machine.test.ts && npm run server:build && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/graph/types.ts server/src/graph/validation.ts server/src/graph/validation.test.ts server/src/graph/state-machine.ts server/src/graph/state-machine.test.ts src/types/graph.ts
git commit -m "feat(graph): define executable graph contracts"
```

### Task 2: Persist Portable Graph Drafts and Immutable Run Snapshots

**Files:**
- Create: `server/src/graph/graph-store.ts`
- Create: `server/src/graph/graph-store.test.ts`
- Create: `server/src/graph-run/types.ts`
- Create: `server/src/graph-run/store.ts`
- Create: `server/src/graph-run/store.test.ts`
- Modify: `server/src/runs/run-store.ts`
- Modify: `server/src/runs/run-store.test.ts`

**Interfaces:**
- Consumes: graph validators from Task 1 and Project Definition revisions.
- Produces: `GraphStore.list/get/create/replace/remove` with revision conflicts.
- Produces: `GraphRunStore.create/get/list/append/events/updateNodeAttempt/recover`.
- Produces: `GraphRun`, `GraphRunEvent`, and `GraphNodeAttempt`.

- [ ] **Step 1: Write failing portable graph-store tests**

```ts
it('stores the editable graph at .mira/graphs/<id>.yml', async () => {
  await store.create(graph)
  expect(await readYaml(join(root, '.mira/graphs/checkout.yml'))).toMatchObject({ id: 'checkout' })
})

it('rejects replacing a stale graph revision', async () => {
  await store.create(graph)
  await expect(store.replace({ ...graph, revision: 0 })).rejects.toThrow(
    'Graph revision conflict',
  )
})
```

- [ ] **Step 2: Write failing immutable snapshot and append tests**

```ts
it('copies the exact graph and definition revisions into the run directory', async () => {
  const run = await store.create({ graph, definition, approvedBy: 'developer' })
  expect(await readYaml(join(run.path, 'graph.yml'))).toEqual(graph)
  expect(await readYaml(join(run.path, 'project-definition.yml'))).toEqual(definition)
})

it('serializes concurrent graph events with monotonic sequence numbers', async () => {
  const events = await Promise.all(Array.from({ length: 20 }, () => store.append(runId, event())))
  expect(events.map((value) => value.sequence).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 20 }, (_, index) => index + 1),
  )
})
```

- [ ] **Step 3: Implement atomic graph drafts**

Use `.mira/graphs/<safe-id>.yml`, validate before write, preserve unknown top-level extension fields, and serialize per-file mutation. Delete requires `expectedRevision` and moves the previous bytes into `.mira/local/recovery/graphs/` before removal.

- [ ] **Step 4: Implement graph-run storage**

```ts
export interface GraphRun {
  id: string
  graphId: string
  graphRevision: number
  projectDefinitionRevision: number
  status: 'queued' | 'running' | 'waiting_approval' | 'blocked' | 'failed' | 'succeeded' | 'cancelled' | 'interrupted'
  nodeStates: Record<string, GraphNodeState>
  attempts: Record<string, GraphNodeAttempt[]>
  createdAt: string
  updatedAt: string
}
```

Store each run beneath `.mira/local/runs/<run-id>/` with immutable `graph.yml` and `project-definition.yml`, append-only `events.jsonl`, and separate attempt/artifact directories. Use file sync and per-run serialization as in the hardened v1 `RunStore`.

- [ ] **Step 5: Migrate legacy local v1 runs safely**

On first access, detect `.mira/.personal/runs`. If `.mira/local/runs` is absent, move only the exact runs directory after validating its index and event files; otherwise leave legacy data untouched and emit a migration warning. Add tests for migration, collision, corrupt legacy state, and repeat invocation.

- [ ] **Step 6: Run persistence tests**

Run: `npm --prefix server test -- graph/graph-store.test.ts graph-run/store.test.ts runs/run-store.test.ts`

Expected: PASS including concurrency, truncated-event recovery, and migration cases.

- [ ] **Step 7: Commit**

```bash
git add server/src/graph/graph-store.ts server/src/graph/graph-store.test.ts server/src/graph-run/types.ts server/src/graph-run/store.ts server/src/graph-run/store.test.ts server/src/runs/run-store.ts server/src/runs/run-store.test.ts
git commit -m "feat(graph): persist drafts and immutable graph runs"
```

### Task 3: Generate Graph Drafts from the Project Definition

**Files:**
- Create: `server/src/graph/graph-schema.ts`
- Create: `server/src/graph/graph-planner.ts`
- Create: `server/src/graph/graph-planner.test.ts`
- Modify: `server/src/agents/structured-agent.ts`

**Interfaces:**
- Consumes: `StructuredAgent`, confirmed `ProjectDefinition`, `RepositorySnapshot`, and `validateFeatureGraph`.
- Produces: `GraphPlanner.propose(input): Promise<GraphProposal>`.
- Produces: `GraphProposal` containing `graph`, `warnings`, `assumptions`, and `repairAttempts`.

- [ ] **Step 1: Write failing proposal and repair tests**

```ts
it('produces a small validated graph linked to the current definition revision', async () => {
  const proposal = await planner.propose(input)
  expect(proposal.graph.projectDefinitionRevision).toBe(7)
  expect(proposal.graph.nodes.length).toBeGreaterThanOrEqual(3)
  expect(() => validateFeatureGraph(proposal.graph)).not.toThrow()
})

it('repairs invalid structured output at most twice', async () => {
  agent.responses = [cycleGraph, missingApprovalGraph, validGraph]
  expect((await planner.propose(input)).repairAttempts).toBe(2)
})
```

- [ ] **Step 2: Define the exact JSON schema and planner prompt contract**

The schema permits only documented node and edge types. The system instructions require the smallest graph that satisfies the outcome, default sequential execution, parallel work only for disjoint scopes, deterministic verification where available, and an approval before integration/delivery. The prompt includes only the confirmed definition, bounded repository snapshot, and known verification commands.

- [ ] **Step 3: Implement bounded repair**

Validate structured output locally. On failure, send the exact validation errors and invalid graph back for at most two repair attempts. If still invalid, return a typed `GraphPlanningError` with the last invalid proposal for manual editing; never persist or execute it as valid.

- [ ] **Step 4: Run planner tests**

Run: `npm --prefix server test -- graph/graph-planner.test.ts agents/structured-agent.test.ts`

Expected: PASS using fake structured-agent responses only.

- [ ] **Step 5: Commit**

```bash
git add server/src/graph/graph-schema.ts server/src/graph/graph-planner.ts server/src/graph/graph-planner.test.ts server/src/agents/structured-agent.ts
git commit -m "feat(graph): generate validated feature graphs"
```

### Task 4: Compute Readiness, Parallelism, and Staleness

**Files:**
- Create: `server/src/graph-run/scheduler.ts`
- Create: `server/src/graph-run/scheduler.test.ts`
- Modify: `server/src/graph/state-machine.ts`

**Interfaces:**
- Consumes: immutable `FeatureGraph`, `GraphRun`, and recorded evidence.
- Produces: `GraphScheduler.evaluate(run): ScheduleDecision`.
- Produces: `GraphScheduler.invalidate(run, changedNodeId): InvalidationResult`.

- [ ] **Step 1: Write failing scheduler tests**

```ts
it('marks independent agent nodes ready and a dependent verifier waiting', () => {
  const decision = scheduler.evaluate(runFor(parallelGraph))
  expect(decision.readyNodeIds).toEqual(['api', 'ui'])
  expect(decision.waitingNodeIds).toContain('acceptance-tests')
})

it('prevents parallel dispatch when allowed scopes overlap', () => {
  const decision = scheduler.evaluate(runFor(overlappingScopeGraph))
  expect(decision.dispatchGroups).toEqual([['api'], ['ui']])
  expect(decision.warnings[0]).toContain('overlapping scope')
})

it('marks every affected downstream success stale after upstream revision', () => {
  expect(scheduler.invalidate(run, 'spec').staleNodeIds).toEqual(['api', 'ui', 'tests', 'ship'])
})
```

- [ ] **Step 2: Implement deterministic readiness**

A node is ready only when all `depends_on` sources succeeded, required artifacts exist, required approvals are approved, its inputs are not stale, and its retry budget remains. Goal, feature, specification, and artifact nodes may derive state from their children or evidence but never self-execute.

- [ ] **Step 3: Implement scope-aware dispatch groups**

Normalize POSIX-style project-relative scopes and detect ancestor/descendant overlap. Nodes with overlapping scopes are serialized even if the DAG permits parallel execution. A wildcard scope conflicts with every other scope.

- [ ] **Step 4: Implement staleness propagation**

Changing or retrying an upstream node appends an invalidation event and marks previously successful downstream nodes `stale`. The original evidence remains addressable and is labeled with the graph/node attempt version that produced it.

- [ ] **Step 5: Run scheduler tests**

Run: `npm --prefix server test -- graph-run/scheduler.test.ts graph/state-machine.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/graph-run/scheduler.ts server/src/graph-run/scheduler.test.ts server/src/graph/state-machine.ts
git commit -m "feat(graph): schedule nodes from graph state"
```

### Task 5: Bind Agent Nodes to Durable Runs and Registered Worktrees

**Files:**
- Modify: `server/src/runs/types.ts`
- Modify: `server/src/runs/run-store.ts`
- Modify: `server/src/runs/run-orchestrator.ts`
- Modify: `server/src/runs/run-orchestrator.test.ts`
- Modify: `server/src/workspace/git-workspace-service.ts`
- Modify: `server/src/workspace/git-workspace-service.test.ts`
- Modify: `server/src/pty/pty-manager.ts`
- Modify: `server/src/pty/pty-manager.test.ts`
- Modify: `src/types/run.ts`

**Interfaces:**
- Extends `StartRunInput` with `graphRunId`, `nodeId`, `attemptId`, `allowedScope`, and required `isolation: 'worktree'` for graph nodes.
- Produces: `PtyManager.registerWorktreeRoot(root, ownerId)` and `unregisterWorktreeRoot(root, ownerId)`.
- Produces: `GitWorkspaceService.createAttemptWorkspace(graphRunId, nodeId, attemptId, slug)`.

- [ ] **Step 1: Write the worktree registration regression test**

```ts
it('registers the generated worktree before PTY spawn', async () => {
  await orchestrator.start(graphStartInput)
  expect(pty.registerWorktreeRoot).toHaveBeenCalledBefore(pty.spawn)
  expect(pty.spawn).toHaveBeenCalledWith(expect.objectContaining({ cwd: workspace.path }))
})
```

- [ ] **Step 2: Write ownership and cleanup tests**

```ts
it('does not unregister a worktree owned by another active attempt', () => {
  manager.registerWorktreeRoot(root, 'attempt-a')
  expect(() => manager.unregisterWorktreeRoot(root, 'attempt-b')).toThrow('owner')
})

it('creates a distinct branch and path for each retry attempt', async () => {
  expect((await workspace.createAttemptWorkspace('g1', 'ui', 'a1', 'ui')).path)
    .not.toBe((await workspace.createAttemptWorkspace('g1', 'ui', 'a2', 'ui')).path)
})
```

- [ ] **Step 3: Extend run provenance without breaking legacy runs**

Add optional graph provenance fields to stored `AgentRun`, but require them together for graph execution. Store CLI version detected at start. Validate graph/node/attempt IDs and bind allowed scope to the run snapshot.

- [ ] **Step 4: Register and unregister worktree roots transactionally**

After worktree creation and before adapter launch, register its canonical path with the PTY manager under the attempt ID. If adapter resolution or spawn fails, unregister it and preserve the worktree for review. On explicit safe cleanup, remove the worktree first and then unregister its root.

- [ ] **Step 5: Enforce changed-file scope after agent exit**

Compare worktree status paths against the node's normalized allowed scope. A scope violation produces a failed attempt with retained diff evidence; it cannot mark the node succeeded or flow into integration.

- [ ] **Step 6: Run run/workspace/PTY tests**

Run: `npm --prefix server test -- runs/run-orchestrator.test.ts workspace/git-workspace-service.test.ts pty/pty-manager.test.ts`

Expected: PASS including retry, registration order, ownership, and scope violation coverage.

- [ ] **Step 7: Commit**

```bash
git add server/src/runs/types.ts server/src/runs/run-store.ts server/src/runs/run-orchestrator.ts server/src/runs/run-orchestrator.test.ts server/src/workspace/git-workspace-service.ts server/src/workspace/git-workspace-service.test.ts server/src/pty/pty-manager.ts server/src/pty/pty-manager.test.ts src/types/run.ts
git commit -m "feat(graph): bind node attempts to isolated agent runs"
```

### Task 6: Orchestrate Graph Execution and Crash Recovery

**Files:**
- Create: `server/src/graph-run/orchestrator.ts`
- Create: `server/src/graph-run/orchestrator.test.ts`
- Create: `server/src/graph-run/recovery.ts`
- Create: `server/src/graph-run/recovery.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Consumes: `GraphRunStore`, `GraphScheduler`, `RunOrchestrator`, graph/definition stores, and adapter registry.
- Produces: `GraphRunOrchestrator.approveAndStart`, `pause`, `resume`, `cancel`, `retryNode`, `resolveApproval`, and `recoverAll`.

- [ ] **Step 1: Write failing orchestration tests**

```ts
it('dispatches ready nodes, waits for both, then dispatches their verifier', async () => {
  const run = await orchestrator.approveAndStart(graph.id, graph.revision)
  expect(agentRuns.startedNodeIds()).toEqual(['api', 'ui'])
  await agentRuns.succeed('api')
  expect(agentRuns.startedNodeIds()).toEqual(['api', 'ui'])
  await agentRuns.succeed('ui')
  expect(verifier.startedNodeIds()).toEqual(['tests'])
})

it('records interrupted state after recovery finds a missing process', async () => {
  await store.seed(runningSnapshot)
  await recovery.recoverAll()
  expect((await store.get(runId))?.nodeStates.ui).toBe('interrupted')
})
```

- [ ] **Step 2: Implement one serialized event queue per graph run**

Every external callback enters a graph-run queue. Append the causal event before updating the projection. Broadcast only the appended sequenced event. Duplicate child-run exit callbacks and repeated approval requests must be idempotent.

- [ ] **Step 3: Implement start, dispatch, pause, resume, cancellation, and retry**

Approval snapshots the graph and definition. Dispatch only the scheduler's current group. Pause stops new dispatch but does not kill running nodes. Cancel explicitly kills active node runs and marks pending nodes cancelled. Retry creates a new attempt and invokes staleness propagation.

- [ ] **Step 4: Implement child-run event projection**

Map child `run-created`, `process-output`, `check-completed`, and terminal events into graph-run events carrying `nodeId` and `attemptId`. A process exit of zero moves an agent node to a verification-ready state only after scope validation and expected-artifact capture.

- [ ] **Step 5: Implement startup recovery**

On runtime start, load nonterminal graph runs. If a recorded child PTY is absent, append `node-interrupted`. Preserve its worktree and artifacts. Re-evaluate the graph; do not auto-retry or auto-integrate. Present pending approval and cleanup actions to the client.

- [ ] **Step 6: Run orchestration and recovery tests**

Run: `npm --prefix server test -- graph-run/orchestrator.test.ts graph-run/recovery.test.ts runs/run-orchestrator.test.ts`

Expected: PASS including concurrent callbacks, duplicate exit, pause/resume, cancellation, retry, and process-loss recovery.

- [ ] **Step 7: Commit**

```bash
git add server/src/graph-run/orchestrator.ts server/src/graph-run/orchestrator.test.ts server/src/graph-run/recovery.ts server/src/graph-run/recovery.test.ts server/src/app.ts
git commit -m "feat(graph): orchestrate recoverable graph runs"
```

### Task 7: Integrate, Verify, Approve, and Deliver Locally

**Files:**
- Create: `server/src/graph-run/integration-service.ts`
- Create: `server/src/graph-run/integration-service.test.ts`
- Create: `server/src/graph-run/delivery-service.ts`
- Create: `server/src/graph-run/delivery-service.test.ts`
- Modify: `server/src/verification/verification-service.ts`
- Modify: `server/src/verification/verification-service.test.ts`
- Modify: `server/src/graph-run/orchestrator.ts`

**Interfaces:**
- Produces: `IntegrationService.prepare(graphRunId, sourceAttempts): Promise<IntegrationResult>`.
- Produces: `DeliveryService.commitIntegration(graphRunId, message, approvalId): Promise<DeliveryResult>`.
- Produces: approval kinds `execute_graph`, `integrate`, and `deliver_local`.

- [ ] **Step 1: Write failing conflict and active-branch safety tests**

```ts
it('integrates successful attempts into a dedicated integration worktree', async () => {
  const result = await service.prepare(graphRunId, [apiAttempt, uiAttempt])
  expect(result.branch).toMatch(/^mira\/integrate-/)
  expect(await currentBranch(projectRoot)).toBe('feature/user-work')
})

it('records conflicts without modifying the active checkout', async () => {
  const before = await status(projectRoot)
  const result = await service.prepare(graphRunId, conflictingAttempts)
  expect(result.status).toBe('conflicted')
  expect(await status(projectRoot)).toEqual(before)
})
```

- [ ] **Step 2: Implement deterministic integration order**

Create an integration worktree from the graph snapshot's base commit. Apply successful source commits in topological order using `git cherry-pick --no-commit`. On conflict, abort the operation, retain a conflict report and source diffs as artifacts, and mark the integration node blocked. Never resolve conflicts through unbounded model automation in the MVP.

- [ ] **Step 3: Bind verification to the integrated diff identity**

Each verification result records the integration tree hash and command specification. A later tree change makes the result stale. Verification commands continue to use `execFile` with known executable/args and a maximum timeout.

- [ ] **Step 4: Implement recorded approvals**

Create immutable approval requests containing graph/run/node IDs, graph revision, diff identity, requested operation, and visible summary. Resolve an approval exactly once. Reusing an approval for a different diff or operation fails.

- [ ] **Step 5: Implement local delivery only**

`commitIntegration` requires all mandatory verification nodes succeeded and a matching `deliver_local` approval. It creates a commit on the integration branch and returns its hash and branch. It does not push, open a PR, deploy, switch the active checkout, or merge automatically.

- [ ] **Step 6: Run integration, delivery, and verification tests**

Run: `npm --prefix server test -- graph-run/integration-service.test.ts graph-run/delivery-service.test.ts verification/verification-service.test.ts`

Expected: PASS in temporary Git repositories with clean, dirty, conflict, stale-evidence, replayed-approval, and no-change cases.

- [ ] **Step 7: Commit**

```bash
git add server/src/graph-run/integration-service.ts server/src/graph-run/integration-service.test.ts server/src/graph-run/delivery-service.ts server/src/graph-run/delivery-service.test.ts server/src/verification/verification-service.ts server/src/verification/verification-service.test.ts server/src/graph-run/orchestrator.ts
git commit -m "feat(graph): integrate and deliver verified local changes"
```

### Task 8: Expose Graph and Graph-Run APIs

**Files:**
- Create: `server/src/graph/index.ts`
- Create: `server/src/graph/index.test.ts`
- Create: `server/src/graph-run/index.ts`
- Create: `server/src/graph-run/index.test.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/runs/index.ts`

**Interfaces:**
- Produces graph routes: list, get, propose, create, replace, validate, and remove.
- Produces graph-run routes: approve/start, get/list, pause/resume/cancel, retry node, resolve approval, review, integrate, verify, and local delivery.
- Produces authenticated `/ws/graph-runs/:id` event replay using `afterSequence` parity with existing run events.

- [ ] **Step 1: Write failing route-contract tests**

```ts
it('returns 409 with the current graph for a stale replacement', async () => {
  const response = await request.replaceGraph({ ...graph, revision: 0 })
  expect(response.statusCode).toBe(409)
  expect(response.json().current.revision).toBe(1)
})

it('requires confirmed execution approval to start a graph run', async () => {
  const response = await request.startGraphRun(graph.id, { confirmed: false })
  expect(response.statusCode).toBe(400)
})

it('replays graph events before live events without duplicates', async () => {
  expect(await collectReplayAndLiveEvents(runId)).toEqual([1, 2, 3, 4])
})
```

- [ ] **Step 2: Register validated graph routes**

All graph mutations require expected revision. Proposal returns an unpersisted draft until the developer saves it. Validation returns structured node/edge errors. Remove requires confirmation and expected revision.

- [ ] **Step 3: Register graph-run command routes**

Every consequential command accepts an idempotency key and an explicit confirmation object. Map domain errors consistently: 400 invalid input, 404 unknown resource, 409 stale revision/state/approval, and 422 valid request blocked by graph policy.

- [ ] **Step 4: Implement replay-safe graph WebSocket events**

Use the same subscribe-before-replay pattern as hardened run events, buffer live events during replay, sort by sequence, and deduplicate by event ID. Runtime authentication from the desktop foundation applies before subscription.

- [ ] **Step 5: Remove graph-incompatible push routes from the MVP surface**

Keep legacy run push code inaccessible from graph delivery and hide or unregister `/api/runs/:id/push` in MVP mode. Tests must prove no graph route can invoke push.

- [ ] **Step 6: Run route and aggregate server tests**

Run: `npm --prefix server test -- graph/index.test.ts graph-run/index.test.ts`

Run: `npm run server:build && npm run test:server`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/graph/index.ts server/src/graph/index.test.ts server/src/graph-run/index.ts server/src/graph-run/index.test.ts server/src/app.ts server/src/runs/index.ts
git commit -m "feat(api): expose executable graph workflows"
```

## Stage Exit Criteria

- A confirmed Project Definition can generate a valid editable graph draft.
- Graph approval creates immutable graph and definition snapshots.
- Readiness, parallelism, retries, staleness, and approvals are deterministic and tested.
- Agent nodes run through the existing adapter/run system in registered isolated worktrees.
- Parallel results integrate only through a dedicated integration worktree.
- Verification evidence binds to the exact integrated diff.
- Delivery produces only an approved local branch/commit and never pushes or changes the active checkout automatically.
- Runtime restart reconstructs truthful `interrupted` state and preserves evidence.
- All graph, run, Git, PTY, verification, route, and aggregate server tests pass.
