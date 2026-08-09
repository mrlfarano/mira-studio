# Mira Studio Project Interview and Definition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive, resumable Project Interview that turns new-app intent or an existing repository into a sourced, editable, portable Project Definition.

**Architecture:** Build a validated project-definition domain and atomic YAML store in the local runtime. A bounded repository inspector supplies detected facts; a structured one-shot Codex or Claude CLI service proposes the next question and definition patch. React Plan mode presents one question at a time beside the live definition, and every model-authored change remains a recommendation until the developer confirms it.

**Tech Stack:** TypeScript 5.9, Fastify 5, `js-yaml`, Node child processes, React 19, Zustand 5, Vitest 4, Testing Library, Playwright.

## Global Constraints

- Complete the secure desktop foundation plan first.
- Do not call OpenAI, Anthropic, or another provider API directly.
- Use only installed, already-authenticated Codex or Claude Code CLIs.
- Never send repository file contents beyond the bounded context explicitly assembled for the selected CLI.
- Store the canonical portable definition at `.mira/project-definition.yml`.
- Preserve unknown YAML fields where practical and never store credentials.
- Label each meaningful value as `developer`, `repository`, `import`, or `mira`.
- Ask one high-value question at a time and allow pause, resume, edit, skip, and confirmation.
- Do not add a schema-validation production dependency; implement explicit validators and tests.

## File Ownership Map

| Boundary | Files | Responsibility |
|---|---|---|
| Domain | `server/src/project-definition/types.ts`, `validation.ts` | Versioned Project Definition types, sources, and validation |
| Persistence | `server/src/project-definition/store.ts` | Atomic YAML read/write, corruption handling, and revisions |
| Repository facts | `server/src/project/repository-inspector.ts` | Bounded read-only stack, script, architecture, and Git inspection |
| Structured CLI | `server/src/agents/structured-agent.ts` | One-shot schema-constrained Codex/Claude requests |
| Interview | `server/src/interview/*` | Session state, question selection, patches, confirmation, and routes |
| Plan UI | `src/features/planning/*`, `src/store/project-definition-store.ts` | Interview and live definition experience |

---

### Task 1: Define and Validate the Project Definition

**Files:**
- Create: `server/src/project-definition/types.ts`
- Create: `server/src/project-definition/validation.ts`
- Create: `server/src/project-definition/validation.test.ts`
- Create: `src/types/project-definition.ts`

**Interfaces:**
- Produces: `ProjectDefinition`, `SourcedValue<T>`, `DefinitionDecision`, `DefinitionQuestion`, and `ProjectDefinitionPatch`.
- Produces: `validateProjectDefinition(value: unknown): ProjectDefinition`.
- Produces: `applyDefinitionPatch(current, patch): ProjectDefinition`.

- [ ] **Step 1: Write failing validation and source tests**

```ts
it('rejects an MVP feature without a source', () => {
  const value = validDefinition()
  value.mvp.features = [{ id: 'auth', value: 'Authentication' }]
  expect(() => validateProjectDefinition(value)).toThrow('mvp.features[0].source')
})

it('does not allow a Mira recommendation to become confirmed implicitly', () => {
  const next = applyDefinitionPatch(validDefinition(), {
    baseRevision: 2,
    operations: [{ op: 'replace', path: '/stack/frontend', value: sourced('Next.js', 'mira') }],
  })
  expect(next.stack.frontend.confirmed).toBe(false)
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm --prefix server test -- project-definition/validation.test.ts`

Expected: FAIL because the domain does not exist.

- [ ] **Step 3: Implement the shared domain**

```ts
export type DefinitionSource = 'developer' | 'repository' | 'import' | 'mira'

export interface SourcedValue<T> {
  value: T
  source: DefinitionSource
  confirmed: boolean
  evidence?: string
}

export interface ProjectDefinition {
  schemaVersion: 1
  id: string
  revision: number
  updatedAt: string
  vision: SourcedValue<string> | null
  targetUser: SourcedValue<string> | null
  problem: SourcedValue<string> | null
  workflows: Array<SourcedValue<string> & { id: string }>
  mvp: {
    features: Array<SourcedValue<string> & { id: string }>
    nonGoals: Array<SourcedValue<string> & { id: string }>
  }
  stack: Record<string, SourcedValue<string>>
  constraints: Array<SourcedValue<string> & { id: string }>
  integrations: Array<SourcedValue<string> & { id: string }>
  acceptanceCriteria: Array<SourcedValue<string> & { id: string }>
  deliveryCriteria: Array<SourcedValue<string> & { id: string }>
  openQuestions: DefinitionQuestion[]
}
```

Mirror public types in `src/types/project-definition.ts`. The validator must reject unknown schema versions, duplicate IDs, invalid sources, oversized strings, invalid revisions, and malformed patch paths. Patches use a small explicit operation set: `add`, `replace`, `remove`, and `confirm`; do not implement general JSON Patch.

- [ ] **Step 4: Run focused tests and TypeScript builds**

Run: `npm --prefix server test -- project-definition/validation.test.ts && npm run server:build && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/project-definition/types.ts server/src/project-definition/validation.ts server/src/project-definition/validation.test.ts src/types/project-definition.ts
git commit -m "feat(planning): define sourced project definitions"
```

### Task 2: Persist Project Definitions Safely

**Files:**
- Create: `server/src/project-definition/store.ts`
- Create: `server/src/project-definition/store.test.ts`
- Create: `server/src/project-definition/index.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: validators and patch application from Task 1.
- Produces: `ProjectDefinitionStore.load(): Promise<ProjectDefinition | null>`.
- Produces: `ProjectDefinitionStore.create(input): Promise<ProjectDefinition>`.
- Produces: `ProjectDefinitionStore.patch(patch): Promise<ProjectDefinition>`.
- Produces: `ProjectDefinitionStore.confirm(paths, baseRevision): Promise<ProjectDefinition>`.

- [ ] **Step 1: Write failing round-trip, concurrency, and corruption tests**

```ts
it('round-trips sourced values through YAML', async () => {
  await store.create(definition)
  expect(await store.load()).toEqual(definition)
})

it('rejects a stale revision', async () => {
  await store.create(definition)
  await expect(store.patch({ baseRevision: 0, operations: [] })).rejects.toThrow(
    'Project Definition revision conflict',
  )
})

it('retains malformed bytes in a timestamped recovery copy', async () => {
  await writeFile(definitionPath, ': invalid yaml')
  await expect(store.load()).rejects.toThrow('Project Definition is corrupt')
  expect(await recoveryCopies(projectRoot)).toHaveLength(1)
})
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm --prefix server test -- project-definition/store.test.ts`

Expected: FAIL because the store does not exist.

- [ ] **Step 3: Implement serialized, atomic YAML persistence**

Use one promise queue per canonical definition path. Write to a sibling temporary file with mode `0600`, `fsync` the file, rename it atomically, and preserve the existing document on validation failure. Increment `revision` and `updatedAt` inside the serialized mutation, not in route code.

```ts
export class ProjectDefinitionStore {
  constructor(private readonly projectRoot: string) {}
  load(): Promise<ProjectDefinition | null>
  create(input: ProjectDefinition): Promise<ProjectDefinition>
  patch(patch: ProjectDefinitionPatch): Promise<ProjectDefinition>
  confirm(paths: string[], baseRevision: number): Promise<ProjectDefinition>
}
```

- [ ] **Step 4: Ensure local recovery files are ignored**

Store recovery copies beneath `.mira/local/recovery/project-definition/` and add `.mira/local/` to the project-local ignore initializer without rewriting an existing `.gitignore` unnecessarily.

- [ ] **Step 5: Run focused tests**

Run: `npm --prefix server test -- project-definition/store.test.ts config-engine.test.ts`

Expected: PASS including concurrent patch serialization and valid YAML round trips.

- [ ] **Step 6: Commit**

```bash
git add server/src/project-definition/store.ts server/src/project-definition/store.test.ts server/src/project-definition/index.ts .gitignore
git commit -m "feat(planning): persist portable project definitions"
```

### Task 3: Inspect Repositories and Imports Read-Only

**Files:**
- Create: `server/src/project/repository-inspector.ts`
- Create: `server/src/project/repository-inspector.test.ts`
- Create: `server/src/project-definition/importer.ts`
- Create: `server/src/project-definition/importer.test.ts`
- Modify: `server/src/project/project-context.ts`

**Interfaces:**
- Produces: `RepositorySnapshot` with bounded detected facts and evidence paths.
- Produces: `RepositoryInspector.inspect(): Promise<RepositorySnapshot>`.
- Produces: `importDefinitionSource(path, projectRoot): Promise<ImportedDefinitionSource>`.

- [ ] **Step 1: Write failing bounded-inspection tests**

```ts
it('detects package scripts without reading env or credential files', async () => {
  const snapshot = await new RepositoryInspector(root).inspect()
  expect(snapshot.scripts).toContain('test')
  expect(snapshot.examinedPaths).not.toContain('.env')
  expect(snapshot.examinedPaths.some((value) => value.includes('.ssh'))).toBe(false)
})

it('marks architecture signals as repository facts with evidence', async () => {
  const snapshot = await new RepositoryInspector(root).inspect()
  expect(snapshot.facts.find((fact) => fact.key === 'framework')).toMatchObject({
    source: 'repository',
    evidence: 'package.json',
  })
})
```

- [ ] **Step 2: Implement the bounded inspector**

Inspect only allowlisted metadata: Git status/branch, top-level file names, `package.json` scripts and declared packages, supported lockfiles, `tsconfig.json`, `vite.config.*`, framework configuration names, `Cargo.toml`, `pyproject.toml`, `go.mod`, `README*` up to 64 KiB, root `AGENTS.md` up to 64 KiB, and existing `.mira` portable schemas. Never read `.env*`, key stores, credential directories, arbitrary source trees, or files outside the canonical project root.

- [ ] **Step 3: Write import confinement tests**

```ts
it('imports an explicitly selected local markdown file', async () => {
  expect((await importDefinitionSource(prdPath, root)).text).toContain('Product')
})

it('rejects files over one megabyte and non-text content', async () => {
  await expect(importDefinitionSource(largePath, root)).rejects.toThrow('Import exceeds 1 MiB')
})
```

- [ ] **Step 4: Implement explicit import parsing**

Accept UTF-8 Markdown, text, YAML, and JSON selected through the native file dialog. Limit imports to 1 MiB, retain the source path only in local state, hash the content for provenance, and send only the parsed text chosen by the developer to the interview service.

- [ ] **Step 5: Run focused tests**

Run: `npm --prefix server test -- project/repository-inspector.test.ts project-definition/importer.test.ts project-context.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/project/repository-inspector.ts server/src/project/repository-inspector.test.ts server/src/project-definition/importer.ts server/src/project-definition/importer.test.ts server/src/project/project-context.ts
git commit -m "feat(planning): inspect project context safely"
```

### Task 4: Add Schema-Constrained One-Shot Agent Requests

**Files:**
- Create: `server/src/agents/structured-agent.ts`
- Create: `server/src/agents/structured-agent.test.ts`
- Modify: `server/src/agents/types.ts`
- Modify: `server/src/agents/codex-adapter.ts`
- Modify: `server/src/agents/claude-adapter.ts`
- Modify: `server/src/agents/agent-registry.ts`

**Interfaces:**
- Produces: `StructuredAgent.request<T>(request: StructuredAgentRequest<T>): Promise<StructuredAgentResult<T>>`.
- Produces: `AgentAdapter.structuredLaunch(input): StructuredLaunchSpec` for Codex and Claude; shell has no structured mode.

- [ ] **Step 1: Write failing command-shape and output tests**

```ts
it('launches Codex in ephemeral read-only structured mode', () => {
  expect(codex.structuredLaunch(input).args).toEqual(expect.arrayContaining([
    'exec', '--ephemeral', '--sandbox', 'read-only', '--output-schema', schemaPath,
  ]))
})

it('launches Claude without write-capable tools or session persistence', () => {
  expect(claude.structuredLaunch(input).args).toEqual(expect.arrayContaining([
    '--print', '--permission-mode', 'plan', '--no-session-persistence', '--json-schema', schemaJson,
  ]))
})

it('rejects output that does not satisfy the domain validator', async () => {
  await expect(agent.request(requestWithOutput('{"unexpected":true}'))).rejects.toThrow(
    'Structured agent output is invalid',
  )
})
```

- [ ] **Step 2: Extend the adapter contract**

```ts
export interface StructuredAgentRequest<T> {
  adapterId: Extract<AgentId, 'codex' | 'claude'>
  cwd: string
  prompt: string
  jsonSchema: Record<string, unknown>
  validate(value: unknown): T
  timeoutMs: number
}

export interface StructuredLaunchSpec {
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
  stdin: string
}
```

- [ ] **Step 3: Implement bounded child-process execution**

Use `spawn`, write the prompt to stdin, cap stdout and stderr at 1 MiB each, enforce the timeout, terminate the process group on cancellation, parse only the documented final structured payload, and pass it through the request validator. Temporary schema/output files live under `.mira/local/tmp/<request-id>/` with mode `0600` and are deleted in `finally`.

Codex arguments use `codex exec --ephemeral --sandbox read-only --output-schema <file> --output-last-message <file> -`. Claude arguments use `claude --print --permission-mode plan --no-session-persistence --output-format json --json-schema <schema>`. Do not use bypass-permission flags.

- [ ] **Step 4: Add cancellation and redaction coverage**

Test timeout, abort signal, malformed JSON, oversized output, missing executable, nonzero exit, and stderr containing a token-like string. Returned errors may include a bounded diagnostic but must not include environment values.

- [ ] **Step 5: Run agent tests**

Run: `npm --prefix server test -- agents/structured-agent.test.ts agents/agent-registry.test.ts`

Expected: PASS using fake executables only; no live provider call occurs.

- [ ] **Step 6: Commit**

```bash
git add server/src/agents/structured-agent.ts server/src/agents/structured-agent.test.ts server/src/agents/types.ts server/src/agents/codex-adapter.ts server/src/agents/claude-adapter.ts server/src/agents/agent-registry.ts
git commit -m "feat(agents): add structured local planning requests"
```

### Task 5: Implement the Adaptive Interview Service and Routes

**Files:**
- Create: `server/src/interview/types.ts`
- Create: `server/src/interview/interview-service.ts`
- Create: `server/src/interview/interview-service.test.ts`
- Create: `server/src/interview/index.ts`
- Create: `server/src/interview/index.test.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Consumes: `ProjectDefinitionStore`, `RepositoryInspector`, importer, and `StructuredAgent`.
- Produces: `InterviewSession`, `InterviewTurn`, and `InterviewService`.
- Produces routes: `POST /api/interviews`, `GET /api/interviews/:id`, `POST /api/interviews/:id/answers`, `POST /api/interviews/:id/skip`, `POST /api/interviews/:id/confirm`, and `POST /api/interviews/:id/cancel`.

- [ ] **Step 1: Write failing interview behavior tests**

```ts
it('asks one question and persists its proposed definition patch', async () => {
  const session = await service.start({ mode: 'quick', adapterId: 'codex' })
  expect(session.currentQuestion).toMatchObject({ id: expect.any(String) })
  expect(session.turns).toHaveLength(1)
})

it('does not ask for a framework already confirmed from the repository', async () => {
  const session = await service.start({ mode: 'guided', adapterId: 'claude' })
  expect(session.currentQuestion?.topic).not.toBe('frontend-framework')
})

it('requires developer confirmation before completing', async () => {
  await expect(service.confirm(session.id, { paths: [] })).rejects.toThrow(
    'Unresolved required decisions',
  )
})
```

- [ ] **Step 2: Define durable local interview state**

Store resumable sessions at `.mira/local/interviews/<session-id>.json`. Each turn includes question, answer or skip, proposed patch, accepted patch, timestamps, and adapter. Answers are local runtime state; confirmed decisions are copied into the portable Project Definition.

- [ ] **Step 3: Implement deterministic question priority before model generation**

Required topics are vision, target user, problem, MVP workflow, MVP boundary, constraints, and delivery criteria. If one is missing, request exactly one question and patch from the structured agent. Stop when required topics are confirmed or the developer chooses to continue with explicitly recorded open questions. Quick mode caps generated questions at 7; guided mode has no numeric promise but stops asking questions that do not change the definition.

- [ ] **Step 4: Implement route validation and revision conflicts**

All mutating requests include `baseRevision`. Return HTTP 409 with the latest definition on stale writes. Return 400 for invalid modes, adapters, answers, imports, or confirmation paths. Cancellation preserves the session and definition draft.

- [ ] **Step 5: Run service and route tests**

Run: `npm --prefix server test -- interview/interview-service.test.ts interview/index.test.ts`

Expected: PASS with fake structured-agent responses.

- [ ] **Step 6: Commit**

```bash
git add server/src/interview/types.ts server/src/interview/interview-service.ts server/src/interview/interview-service.test.ts server/src/interview/index.ts server/src/interview/index.test.ts server/src/app.ts
git commit -m "feat(planning): add adaptive project interviews"
```

### Task 6: Build Plan Mode and the Live Project Definition

**Files:**
- Create: `src/features/planning/PlanningWorkspace.tsx`
- Create: `src/features/planning/InterviewPane.tsx`
- Create: `src/features/planning/ProjectDefinitionPane.tsx`
- Create: `src/features/planning/SourceLabel.tsx`
- Create: `src/features/planning/planning.css`
- Create: `src/store/project-definition-store.ts`
- Create: `src/__tests__/planning-workspace.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/OnboardingWizard.tsx`
- Modify: `src/index.css`
- Test: `e2e/specs/onboarding.spec.ts`

**Interfaces:**
- Consumes: interview routes and Project Definition types from Tasks 1 and 5.
- Produces: frontend store actions `startInterview`, `answerCurrent`, `skipCurrent`, `patchDefinition`, `confirmPaths`, `resumeInterview`, and `cancelInterview`.
- Produces: Plan-mode route/state that later graph planning consumes.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it('shows one question beside the live sourced definition', async () => {
  render(<PlanningWorkspace />)
  expect(await screen.findByRole('heading', { name: 'Project interview' })).toBeVisible()
  expect(screen.getByText('Detected from repository')).toBeVisible()
  expect(screen.getAllByRole('textbox')).toHaveLength(1)
})

it('keeps a Mira recommendation unconfirmed until accepted', async () => {
  render(<PlanningWorkspace />)
  await user.click(await screen.findByRole('button', { name: 'Review recommendation' }))
  expect(screen.getByText('Mira recommendation')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirm decision' })).toBeEnabled()
})
```

- [ ] **Step 2: Implement the Zustand store with stale-request guards**

Track `definition`, `session`, `status`, `error`, and an incrementing request ID. Ignore responses for an interview or revision that is no longer active. On HTTP 409, load the returned current definition and show a non-destructive conflict message.

- [ ] **Step 3: Build the three-entry planning start screen**

Present **Quick interview**, **Guided interview**, and **Import existing definition**. Import invokes the native file picker and shows the selected file name and content hash before sending it. Do not show provider keys, pricing, accounts, or hosted options.

- [ ] **Step 4: Build the interview and definition panes**

The interview pane shows one question, answer field, Answer, Skip, Pause, and Back-to-definition controls. The definition pane groups confirmed decisions, detected facts, recommendations, assumptions, and open questions. Every value has a text source label; color is supplementary.

- [ ] **Step 5: Replace prototype onboarding with project planning entry**

Opening a project without a confirmed definition enters Plan mode. Existing onboarding state may be migrated into unconfirmed developer-sourced fields once; do not keep two onboarding authorities.

- [ ] **Step 6: Run frontend, accessibility, and E2E tests**

Run: `npm test -- planning-workspace.test.tsx project-context.test.tsx stores.test.ts`

Run: `CI=true npx playwright test e2e/specs/onboarding.spec.ts`

Expected: PASS for quick, guided, import, pause/resume, source labeling, keyboard flow, and revision conflict behavior.

- [ ] **Step 7: Commit**

```bash
git add src/features/planning src/store/project-definition-store.ts src/__tests__/planning-workspace.test.tsx src/App.tsx src/components/AppShell.tsx src/components/OnboardingWizard.tsx src/index.css e2e/specs/onboarding.spec.ts
git commit -m "feat(planning): add the Project Interview workspace"
```

## Stage Exit Criteria

- New and existing projects can create a sourced Project Definition.
- Quick, guided, and local-import interviews are resumable and ask one question at a time.
- Repository facts are bounded, read-only, and visually distinct from recommendations.
- Mira recommendations remain unconfirmed until the developer acts.
- The portable YAML survives round trips and conflicting writes safely.
- All agent calls go through installed CLIs and deterministic fake-agent tests; no direct provider API exists.
- Frontend, server, accessibility, and interview E2E tests pass.
