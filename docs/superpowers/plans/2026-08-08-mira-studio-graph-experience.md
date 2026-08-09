# Mira Studio Graph Planning, Execution, and Review Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the focused macOS interface in which developers plan, edit, run, inspect, verify, and locally deliver an MVP through its executable feature graph.

**Architecture:** Replace the prototype's multi-panel workflow authority with a graph-first shell. A Zustand graph store consumes the runtime APIs and append-only graph-run events. A dependency-layered accessible canvas uses project-owned React/CSS/SVG code rather than a new graph dependency; the right inspector edits or controls the selected node, and the lower evidence drawer projects the selected attempt's terminal, diff, checks, artifacts, and events.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, CSS, SVG, xterm.js, Vitest 4, Testing Library, Playwright 1.58, Tauri 2 packaged application.

## Global Constraints

- Complete the desktop foundation, Project Interview, and executable graph runtime plans first.
- Do not add a graph-canvas production dependency without a separate approval.
- Keep one repository per project window.
- Preserve Plan, Run, and Review as the three top-level modes.
- The visual graph is a projection of canonical runtime state; never keep a second node-status authority in React.
- Feature nodes are collapsible building blocks and expose child status honestly.
- Status must use text and shape in addition to color.
- Core graph selection, navigation, editing, and approvals must be keyboard accessible.
- Hide Pair Mode, marketplace, autonomous SI, deployment, Spark Canvas, and disconnected generic dashboards from MVP navigation and commands.
- Do not delete deferred modules in this plan; remove exposure and document ownership for later cleanup.

## File Ownership Map

| Boundary | Files | Responsibility |
|---|---|---|
| Client graph state | `src/store/graph-store.ts`, `src/store/graph-run-store.ts` | API mutations, revisions, event projection, selection, and stale-response guards |
| Layout/canvas | `src/features/graph/graph-layout.ts`, `GraphCanvas.tsx`, `GraphNodeView.tsx`, `GraphEdgeView.tsx` | Deterministic layout and accessible visual graph |
| Editing | `src/features/graph/GraphInspector.tsx`, `GraphValidationPanel.tsx` | Typed node/edge editing and validation |
| Evidence | `src/features/evidence/*` | Terminal, diff, checks, artifacts, and event history for one selected attempt |
| Review/delivery | `src/features/review/*` | Integrated diff, approval, verification, and local delivery result |
| Product shell | `src/components/StudioShell.tsx`, `ProjectRail.tsx`, `ModeSwitcher.tsx` | Focused Plan/Run/Review composition and deferred-feature hiding |
| E2E/release | `e2e/specs/local-graph-mvp.spec.ts`, `scripts/desktop-golden-path.mjs` | New/existing project golden paths and packaged smoke evidence |

---

### Task 1: Add Graph and Graph-Run Client Stores

**Files:**
- Create: `src/store/graph-store.ts`
- Create: `src/store/graph-run-store.ts`
- Create: `src/hooks/useGraphRunSocket.ts`
- Create: `src/__tests__/graph-store.test.ts`
- Create: `src/__tests__/graph-run-store.test.ts`
- Modify: `src/types/graph.ts`
- Modify: `src/types/run.ts`

**Interfaces:**
- Produces graph actions: `fetchGraphs`, `selectGraph`, `proposeGraph`, `saveGraph`, `replaceGraph`, `validateGraph`, and `removeGraph`.
- Produces graph-run actions: `startGraphRun`, `pause`, `resume`, `cancel`, `retryNode`, `resolveApproval`, `integrate`, `verify`, `deliverLocal`, `ingestEvent`, and `fetchEvents`.
- Produces: `useGraphRunSocket(graphRunId)` with replay buffering and sequence deduplication.

- [ ] **Step 1: Write failing revision and event-projection tests**

```ts
it('does not replace a newer edited graph with a stale proposal response', async () => {
  const proposal = deferred<FeatureGraph>()
  api.propose.mockReturnValue(proposal.promise)
  const pending = store.getState().proposeGraph(input)
  store.getState().replaceLocalGraph({ ...graph, revision: 3 })
  proposal.resolve({ ...graph, revision: 1 })
  await pending
  expect(store.getState().activeGraph?.revision).toBe(3)
})

it('projects sequenced node events and ignores duplicates', () => {
  store.getState().ingestEvents(runId, [nodeRunning(1), nodeSucceeded(2), nodeSucceeded(2)])
  expect(store.getState().runs[runId].nodeStates.ui).toBe('succeeded')
  expect(store.getState().eventsByRun[runId]).toHaveLength(2)
})
```

- [ ] **Step 2: Implement graph API state with revision conflicts**

Track graph list, active graph/draft, validation issues, saving state, and a request generation. HTTP 409 replaces neither local edits nor selection automatically; store the server version in `conflict` and require a deliberate reload or comparison.

- [ ] **Step 3: Implement graph-run event projection**

Projection consumes the complete ordered event list and derives node state, attempt state, approvals, artifacts, checks, integration, and delivery. Optimistic UI may show an action pending but cannot invent a successful canonical state.

- [ ] **Step 4: Implement replay-safe graph sockets**

Subscribe, fetch after the last sequence, buffer live events while replaying, deduplicate by event ID, then project. Pass the authenticated WebSocket subprotocols from the desktop foundation.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- graph-store.test.ts graph-run-store.test.ts run-store.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/graph-store.ts src/store/graph-run-store.ts src/hooks/useGraphRunSocket.ts src/__tests__/graph-store.test.ts src/__tests__/graph-run-store.test.ts src/types/graph.ts src/types/run.ts
git commit -m "feat(graph-ui): project graph runtime state"
```

### Task 2: Build a Deterministic Accessible Graph Canvas

**Files:**
- Create: `src/features/graph/graph-layout.ts`
- Create: `src/features/graph/graph-layout.test.ts`
- Create: `src/features/graph/GraphCanvas.tsx`
- Create: `src/features/graph/GraphNodeView.tsx`
- Create: `src/features/graph/GraphEdgeView.tsx`
- Create: `src/features/graph/graph.css`
- Create: `src/__tests__/graph-canvas.test.tsx`

**Interfaces:**
- Consumes: `FeatureGraph`, node states, collapsed feature IDs, and active node ID.
- Produces: `layoutGraph(graph, options): GraphLayout`.
- Produces: `GraphCanvas` callbacks `onSelectNode`, `onToggleFeature`, and `onRequestEditEdge`.

- [ ] **Step 1: Write failing layout tests**

```ts
it('places dependencies in later columns and keeps output deterministic', () => {
  const first = layoutGraph(graph, { collapsedFeatureIds: [] })
  const second = layoutGraph(graph, { collapsedFeatureIds: [] })
  expect(first).toEqual(second)
  expect(first.nodes.api.x).toBeLessThan(first.nodes.tests.x)
})

it('collapses feature children into one aggregate node', () => {
  const layout = layoutGraph(graph, { collapsedFeatureIds: ['onboarding'] })
  expect(layout.nodes.onboarding).toBeDefined()
  expect(layout.nodes['onboarding-ui']).toBeUndefined()
})
```

- [ ] **Step 2: Implement layered DAG layout without a new dependency**

Use the shared topological order, assign each visible node a depth equal to the longest dependency path, group by depth, and order by stable node ID unless a persisted `visual.order` exists. Return node rectangles and edge anchor points; never mutate graph data.

- [ ] **Step 3: Render nodes as semantic buttons and edges as inert SVG**

Each node button includes type, title, textual state, blocked reason, agent owner, and verification summary. SVG edges carry labels in `<text>` and use `aria-hidden`; the equivalent dependency relation appears in the node's accessible description.

- [ ] **Step 4: Implement keyboard navigation**

Arrow Left/Right moves to nearest dependency/dependent; Up/Down moves within the visual column; Enter selects; Space collapses a feature; Home selects the goal; End selects delivery. Maintain a roving `tabIndex` with one tabbable node.

- [ ] **Step 5: Add zoom-to-fit and pointer pan without changing graph state**

Use local view transform state, bounded zoom from 0.5 to 1.5, and a **Fit** control. Node positions come from layout; drag-to-reorder is not part of this task and must not be implied.

- [ ] **Step 6: Run layout, component, and accessibility tests**

Run: `npm test -- graph-layout.test.ts graph-canvas.test.tsx`

Expected: PASS at 1440×900 and 900×600 viewport fixtures with keyboard traversal and non-color status labels.

- [ ] **Step 7: Commit**

```bash
git add src/features/graph/graph-layout.ts src/features/graph/graph-layout.test.ts src/features/graph/GraphCanvas.tsx src/features/graph/GraphNodeView.tsx src/features/graph/GraphEdgeView.tsx src/features/graph/graph.css src/__tests__/graph-canvas.test.tsx
git commit -m "feat(graph-ui): add the executable graph canvas"
```

### Task 3: Add Graph Editing, Validation, and Approval Preview

**Files:**
- Create: `src/features/graph/GraphInspector.tsx`
- Create: `src/features/graph/GraphValidationPanel.tsx`
- Create: `src/features/graph/GraphApprovalDialog.tsx`
- Create: `src/__tests__/graph-editor.test.tsx`
- Modify: `src/features/graph/GraphCanvas.tsx`
- Modify: `src/store/graph-store.ts`

**Interfaces:**
- Consumes: selected draft node/edge, graph validation results, and known agents/check commands.
- Produces local edit actions: `addNode`, `updateNode`, `removeNode`, `addEdge`, `removeEdge`, `setFeatureParent`, and `undoLastEdit`.
- Produces approved start request containing exact graph ID and revision.

- [ ] **Step 1: Write failing edit and validation tests**

```tsx
it('adds a dependency through the inspector and shows the server validation result', async () => {
  render(<GraphWorkspace />)
  await user.click(screen.getByRole('button', { name: /Onboarding UI/ }))
  await user.selectOptions(screen.getByLabelText('Depends on'), 'product-brief')
  await user.click(screen.getByRole('button', { name: 'Add dependency' }))
  expect(await screen.findByText('Graph is valid')).toBeVisible()
})

it('cannot approve a graph with a cycle', async () => {
  render(<GraphWorkspace graph={cycleGraph} />)
  expect(screen.getByRole('button', { name: 'Approve and run' })).toBeDisabled()
  expect(screen.getByRole('link', { name: /Cycle detected/ })).toBeVisible()
})
```

- [ ] **Step 2: Implement typed node editing**

The inspector renders fields by node discriminator. Agent nodes edit adapter, instructions, scope, expected artifacts, verifier links, timeout, and retry count. Verification nodes select from runtime-known commands. Approval, integration, and delivery policies are explicit controls rather than free-form JSON.

- [ ] **Step 3: Implement edge editing without direct canvas drawing**

For MVP reliability, add and remove typed relations through source/target selectors in the inspector. The canvas highlights the pending relation. This keeps keyboard parity and avoids a new drag-connection dependency while preserving full graph editability.

- [ ] **Step 4: Validate locally, then authoritatively on the server**

Run inexpensive shape checks on every edit and debounce server validation. Server errors link to the affected node/edge. Save uses the graph revision; conflict opens a comparison message and does not discard local edits.

- [ ] **Step 5: Build the approval preview**

Before execution show graph revision, Project Definition revision, node count, parallel groups, installed agents, all commands, allowed scopes, worktree count, verification gates, and delivery behavior. Require a checkbox acknowledging that local CLIs may contact their configured providers.

- [ ] **Step 6: Run editor tests**

Run: `npm test -- graph-editor.test.tsx graph-store.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/graph/GraphInspector.tsx src/features/graph/GraphValidationPanel.tsx src/features/graph/GraphApprovalDialog.tsx src/features/graph/GraphCanvas.tsx src/store/graph-store.ts src/__tests__/graph-editor.test.tsx
git commit -m "feat(graph-ui): edit and approve feature graphs"
```

### Task 4: Show Live Node Execution and Evidence

**Files:**
- Create: `src/features/evidence/EvidenceDrawer.tsx`
- Create: `src/features/evidence/AttemptTerminal.tsx`
- Create: `src/features/evidence/AttemptDiff.tsx`
- Create: `src/features/evidence/AttemptChecks.tsx`
- Create: `src/features/evidence/AttemptArtifacts.tsx`
- Create: `src/features/evidence/AttemptEvents.tsx`
- Create: `src/features/evidence/evidence.css`
- Create: `src/__tests__/evidence-drawer.test.tsx`
- Modify: `src/panels/terminal/useTerminal.ts`

**Interfaces:**
- Consumes: selected graph node, selected attempt, child run ID, graph events, review API, and PTY socket.
- Produces: bottom drawer tabs `Terminal`, `Diff`, `Checks`, `Artifacts`, and `Events`.

- [ ] **Step 1: Write failing selection and evidence tests**

```tsx
it('switches evidence when a different node attempt is selected', async () => {
  render(<EvidenceDrawer nodeId="ui" attemptId="a2" />)
  expect(await screen.findByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Attempt 2')).toBeVisible()
})

it('labels retained output as partial when an attempt fails', () => {
  render(<AttemptArtifacts attempt={failedAttempt} />)
  expect(screen.getByText('Retained partial artifact')).toBeVisible()
})
```

- [ ] **Step 2: Reuse the existing terminal attachment for child runs**

Attach to the selected attempt's child `sessionId`; do not spawn a new terminal from the evidence drawer. Reconnect replays the PTY buffer and graph events. Switching selection detaches listeners without killing the process.

- [ ] **Step 3: Render attempt-scoped diff, checks, artifacts, and events**

Every evidence item displays node ID, attempt number, graph revision, and diff identity where applicable. Stale evidence remains visible with a textual `Stale` label and cannot satisfy current delivery gates.

- [ ] **Step 4: Add run controls to the selected node inspector**

Show Pause graph, Resume graph, Cancel node/graph, Retry node, and Resolve approval only when permitted by canonical state. Each consequential action opens a focused confirmation dialog and disables repeat submission until the server responds.

- [ ] **Step 5: Run evidence tests**

Run: `npm test -- evidence-drawer.test.tsx run-components.test.tsx`

Expected: PASS for running, failed, interrupted, retried, stale, and approval-waiting attempts.

- [ ] **Step 6: Commit**

```bash
git add src/features/evidence src/__tests__/evidence-drawer.test.tsx src/panels/terminal/useTerminal.ts
git commit -m "feat(graph-ui): expose node execution evidence"
```

### Task 5: Build Integrated Review and Local Delivery

**Files:**
- Create: `src/features/review/GraphReviewWorkspace.tsx`
- Create: `src/features/review/IntegratedDiffSummary.tsx`
- Create: `src/features/review/VerificationSummary.tsx`
- Create: `src/features/review/DeliveryApprovalDialog.tsx`
- Create: `src/__tests__/graph-review.test.tsx`
- Modify: `src/panels/review/ReviewPanel.tsx`
- Modify: `src/store/graph-run-store.ts`

**Interfaces:**
- Consumes: graph-run review, integration, verification, approval, and local-delivery APIs.
- Produces: Review mode and delivery result containing local branch and commit hash.

- [ ] **Step 1: Write failing ship-gate tests**

```tsx
it('blocks delivery when a mandatory verification is stale', () => {
  render(<GraphReviewWorkspace run={runWithStaleCheck} />)
  expect(screen.getByRole('button', { name: 'Deliver locally' })).toBeDisabled()
  expect(screen.getByText('Acceptance tests are stale')).toBeVisible()
})

it('shows the exact branch and commit after approved local delivery', async () => {
  render(<GraphReviewWorkspace run={readyRun} />)
  await approveDelivery(user)
  expect(await screen.findByText('mira/integrate-onboarding')).toBeVisible()
  expect(screen.getByText(/^[0-9a-f]{7,40}$/)).toBeVisible()
})
```

- [ ] **Step 2: Build the integrated review summary**

Show combined changed files, additions/deletions, source node attempts, conflicts, mandatory and optional checks, stale evidence, unresolved risks, and approvals. Do not collapse a failed check into an aggregate green state.

- [ ] **Step 3: Implement integration and verification actions**

Integration requires its approval dialog. Verification actions show exact executable, arguments, working directory, and timeout before running. Results refresh from graph events rather than optimistic success.

- [ ] **Step 4: Implement local delivery approval**

The dialog shows graph/diff identity, target integration branch, commit message, and the statement that Mira will not push, open a PR, deploy, switch branches, or merge the active checkout. The returned branch and hash remain copyable in run history.

- [ ] **Step 5: Remove push from the visible review surface**

Retire the legacy `Push branch` UI from the MVP. Keep legacy code isolated if required for migration tests, but no graph or Review mode control can invoke it.

- [ ] **Step 6: Run review tests**

Run: `npm test -- graph-review.test.tsx run-components.test.tsx`

Expected: PASS for ready, failed, stale, conflicted, cancelled, delivered, and repeated-confirmation states.

- [ ] **Step 7: Commit**

```bash
git add src/features/review src/__tests__/graph-review.test.tsx src/panels/review/ReviewPanel.tsx src/store/graph-run-store.ts
git commit -m "feat(graph-ui): review and deliver verified graphs"
```

### Task 6: Consolidate the Product Shell Around Plan, Run, and Review

**Files:**
- Create: `src/components/StudioShell.tsx`
- Create: `src/components/ProjectRail.tsx`
- Create: `src/components/ModeSwitcher.tsx`
- Create: `src/components/NodeInspectorPane.tsx`
- Create: `src/__tests__/studio-shell.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/CommandPalette.tsx`
- Modify: `src/components/LayoutEngine.tsx`
- Modify: `src/index.css`
- Modify: `src/types/panel.ts`

**Interfaces:**
- Consumes: Project Interview workspace, graph canvas/editor, graph-run state, evidence drawer, and graph review.
- Produces: the MVP application shell with top-level modes `plan`, `run`, and `review`.

- [ ] **Step 1: Write failing shell focus tests**

```tsx
it('shows only the graph workflow in MVP navigation', () => {
  render(<StudioShell />)
  expect(screen.getByRole('button', { name: 'Plan' })).toBeVisible()
  expect(screen.queryByText('Pair Mode')).not.toBeInTheDocument()
  expect(screen.queryByText('Marketplace')).not.toBeInTheDocument()
  expect(screen.queryByText('Deploy')).not.toBeInTheDocument()
})

it('preserves selected graph and node when switching modes', async () => {
  render(<StudioShell />)
  await user.click(screen.getByRole('button', { name: /Onboarding UI/ }))
  await user.click(screen.getByRole('button', { name: 'Review' }))
  await user.click(screen.getByRole('button', { name: 'Run' }))
  expect(screen.getByRole('button', { name: /Onboarding UI/ })).toHaveAttribute('aria-current', 'true')
})
```

- [ ] **Step 2: Compose the approved desktop layout**

Top bar: project, branch, local-only status, run health. Left rail: graphs and recent graph runs. Center: planning workspace or graph. Right: selected definition/node inspector. Bottom: evidence drawer. Use CSS grid with a 900×600 minimum layout and no dashboard cards unrelated to the active workflow.

- [ ] **Step 3: Register only MVP commands and navigation**

Command Palette includes open/new project, new graph, switch Plan/Run/Review, find node, pause/resume, review, and local delivery. Remove deferred panels, Pair, registry, SI, deploy, Spark, generic layout, and broadcast commands from registration.

- [ ] **Step 4: Preserve deferred code without exposing dual authorities**

Stop mounting `LayoutEngine`, generic Sidebar, Kanban, and Spark as active workflow state. Keep migration adapters only where they translate existing work items into graph drafts; no background hook may auto-move Kanban from agent status.

- [ ] **Step 5: Add keyboard and reduced-motion behavior**

Mode buttons form a tablist. Focus returns to the invoking node after dialogs. Respect `prefers-reduced-motion`; graph state changes do not animate spatially when enabled. Announce node state changes through one throttled live region.

- [ ] **Step 6: Run shell, component, and build checks**

Run: `npm test -- studio-shell.test.tsx graph-canvas.test.tsx planning-workspace.test.tsx graph-review.test.tsx`

Run: `npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/StudioShell.tsx src/components/ProjectRail.tsx src/components/ModeSwitcher.tsx src/components/NodeInspectorPane.tsx src/__tests__/studio-shell.test.tsx src/App.tsx src/components/AppShell.tsx src/components/Sidebar.tsx src/components/CommandPalette.tsx src/components/LayoutEngine.tsx src/index.css src/types/panel.ts
git commit -m "feat(ui): focus Mira on the graph delivery workflow"
```

### Task 7: Verify New-App and Existing-Repository Golden Paths

**Files:**
- Create: `e2e/fixtures/fake-agent.ts`
- Create: `e2e/specs/local-graph-mvp.spec.ts`
- Create: `e2e-desktop/wdio.conf.ts`
- Create: `e2e-desktop/specs/local-graph-mvp.desktop.ts`
- Create: `scripts/desktop-golden-path.mjs`
- Create: `docs/testing/local-graph-mvp.md`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/src/lib.rs`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: the complete local graph MVP.
- Produces: `npm run test:e2e:graph` and `npm run desktop:golden-path`.

- [ ] **Step 1: Build a deterministic fake installed-agent fixture**

The fake executable must implement `--version`, structured planning output, interactive PTY output, configurable file edits, deliberate failure, delayed completion, and cancellation. It writes only beneath its provided working directory and never calls a network service.

- [ ] **Step 2: Write the new-application golden path**

```ts
test('new project: interview to verified local delivery', async ({ mira }) => {
  await mira.createProject(emptyDirectory)
  await mira.completeQuickInterview(newAppAnswers)
  await mira.generateAndApproveGraph()
  await mira.waitForNode('onboarding-ui', 'succeeded')
  await mira.integrateAndVerify()
  const delivery = await mira.deliverLocally()
  expect(delivery.branch).toMatch(/^mira\/integrate-/)
  expect(await gitBranch(emptyDirectory)).not.toBe(delivery.branch)
})
```

- [ ] **Step 3: Write the existing dirty-repository golden path**

Open a fixture repository with one uncommitted user file. Complete a short gap interview, generate and edit the graph, run two isolated fake agents, force one retry, integrate, verify, restart the runtime during the run, recover it, and deliver locally. Assert the original branch, file bytes, index, and uncommitted status are unchanged.

- [ ] **Step 4: Write security and failure E2E cases**

Cover missing CLI, wrong runtime token, disallowed origin, attempted path escape, overlapping-scope serialization, agent scope violation, integration conflict, stale verification, cancelled node, interrupted runtime, and repeated delivery approval.

- [ ] **Step 5: Add a test-only embedded macOS WebDriver**

Install WebdriverIO tooling as development dependencies:

```bash
npm install --save-dev --legacy-peer-deps @wdio/cli @wdio/local-runner @wdio/mocha-framework @wdio/spec-reporter @wdio/tauri-service
cd src-tauri
cargo add tauri-plugin-wdio-webdriver --optional
cargo add tauri-plugin-wdio --optional
```

Define a Cargo feature that is absent from normal builds:

```toml
[features]
e2e = ["dep:tauri-plugin-wdio-webdriver", "dep:tauri-plugin-wdio"]
```

Register both plugins only under `#[cfg(feature = "e2e")]`. A normal `npm run desktop:build` must not contain an embedded WebDriver server or WDIO backend command surface.

- [ ] **Step 6: Configure WebdriverIO against the packaged E2E app**

```ts
export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./specs/**/*.desktop.ts'],
  framework: 'mocha',
  reporters: ['spec'],
  services: [[
    'tauri',
    {
      appBinaryPath: '../src-tauri/target/release/bundle/macos/Mira Studio.app/Contents/MacOS/mira-studio',
      driverProvider: 'embedded',
    },
  ]],
  maxInstances: 1,
}
```

`desktop-golden-path.mjs` must create temporary new/dirty repositories and fake CLI executables, build with `npx tauri build --features e2e --bundles app`, launch WDIO with the fake CLI directory first on PATH and `/usr/bin:/bin` after it, capture frontend/backend logs, drive every Plan → Run → Review control, then assert Git and child-process state. The test fails if any UI step cannot be driven; there is no manual-success fallback.

- [ ] **Step 7: Update product documentation truthfully**

README must describe Mira as a local macOS graph-engineering app, list installed Codex/Claude authentication as user-owned, show Plan → Run → Review, and explicitly state no Mira SaaS, hosted inference, push, PR, or deployment. Remove claims for hidden prototype modules from the primary feature list.

- [ ] **Step 8: Run the complete release gate**

Run: `npm run check:full`

Run: `cd src-tauri && cargo fmt --check && cargo test && cargo clippy -- -D warnings`

Run: `npm run desktop:build`

Run: `npm run desktop:verify -- "src-tauri/target/release/bundle/macos/Mira Studio.app"`

Run: `npm run desktop:golden-path`

Expected: all automated checks pass. The normal release bundle has no WDIO plugins; the separate E2E-feature bundle drives every UI step through the embedded macOS driver.

- [ ] **Step 9: Commit**

```bash
git add e2e/fixtures/fake-agent.ts e2e/specs/local-graph-mvp.spec.ts e2e-desktop/wdio.conf.ts e2e-desktop/specs/local-graph-mvp.desktop.ts scripts/desktop-golden-path.mjs docs/testing/local-graph-mvp.md playwright.config.ts package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs .github/workflows/ci.yml README.md
git commit -m "test(mvp): verify local graph delivery end to end"
```

## Stage Exit Criteria

- The interface presents one coherent Plan → Run → Review workflow.
- Project Interview and Project Definition feed graph generation directly.
- Every feature building block is visible, expandable, selectable, and backed by canonical runtime state.
- The selected node exposes its agent attempt, terminal, artifacts, diff, checks, and history.
- Integrated delivery cannot proceed with failed or stale mandatory evidence.
- Deferred prototype modules are absent from MVP navigation and commands.
- New-app and existing dirty-repository golden paths pass with deterministic fake agents.
- The packaged macOS application passes the complete release gate without a system Node dependency.
